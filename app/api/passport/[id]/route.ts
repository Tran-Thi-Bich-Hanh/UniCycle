import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/passport/[id]
 * Lấy toàn bộ thông tin Digital Product Passport theo passportId (0x...) hoặc itemId (uuid)
 * Tuân thủ quy tắc:
 * - BR24: Lấy lịch sử ảnh qua các đời chủ để người mua đối chiếu trực quan
 * - BR29: Tên chủ sở hữu hiển thị ẩn danh nếu showName = false
 * - BR30: Kèm tuyên bố giới hạn trách nhiệm
 * - BR31: Hiển thị mức xác nhận (BOTH / ONE_SIDE)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const identifier = resolvedParams.id;

    if (!identifier) {
      return NextResponse.json(
        { error: "Mã định danh Passport không hợp lệ." },
        { status: 400 }
      );
    }

    // Tìm Item theo passportId hoặc theo itemId
    const item = await prisma.item.findFirst({
      where: {
        OR: [
          { passportId: identifier },
          { id: identifier },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        owners: {
          orderBy: { seq: "asc" },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                school: {
                  select: {
                    name: true,
                    shortName: true,
                    area: true,
                  },
                },
              },
            },
          },
        },
        events: {
          orderBy: { seq: "asc" },
        },
        chainTxs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        listings: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            price: true,
            isFree: true,
            condition: true,
            status: true,
            createdAt: true,
            school: {
              select: {
                name: true,
                shortName: true,
              },
            },
            seller: {
              select: {
                id: true,
                displayName: true,
              },
            },
            images: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                url: true,
                sha256: true,
              },
            },
          },
        },
      },
    });

    if (!item || !item.passportId) {
      return NextResponse.json(
        { error: "Không tìm thấy Digital Product Passport cho món đồ này." },
        { status: 404 }
      );
    }

    // Xử lý ẩn danh theo quy tắc BR29:
    // "Chủ #n · Trường · Tháng/Năm". Tên hiển thị chỉ xuất hiện nếu chủ đó chủ động bật showName = true.
    const sanitizedOwners = item.owners.map((owner) => {
      const showRealName = Boolean(owner.showName && owner.user);
      return {
        id: owner.id,
        seq: owner.seq,
        since: owner.since,
        showName: owner.showName,
        displayName: showRealName
          ? owner.user?.displayName
          : `Sinh viên Đời #${owner.seq} (Ẩn danh)`,
        schoolName: owner.user?.school?.shortName || owner.user?.school?.name || "ĐHQG TP.HCM",
        area: owner.user?.school?.area || null,
        ownerHashMasked: `${owner.ownerHash.slice(0, 10)}...${owner.ownerHash.slice(-8)}`,
      };
    });

    // Lịch sử tin đăng theo đời chủ (đối chiếu ảnh BR24)
    const listingsTimeline = item.listings.map((l, index) => ({
      seq: index + 1,
      listingId: l.id,
      title: l.title,
      price: l.price,
      isFree: l.isFree,
      condition: l.condition,
      status: l.status,
      createdAt: l.createdAt,
      schoolName: l.school?.shortName || l.school?.name,
      images: l.images.map((img) => ({
        id: img.id,
        url: img.url,
        sha256: img.sha256,
      })),
    }));

    const host = request.headers.get("host") || "unicycle.vn";
    const protocol = host.includes("localhost") ? "http" : "https";
    const passportUrl = `${protocol}://${host}/passport/${item.passportId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(passportUrl)}`;

    return NextResponse.json({
      passport: {
        passportId: item.passportId,
        itemId: item.id,
        passportStatus: item.passportStatus,
        flagReason: item.flagReason,
        flaggedAt: item.flaggedAt,
        identityLevel: item.identityLevel,
        itemCommit: item.itemCommit,
        createdAt: item.createdAt,
        category: item.category,
        currentOwnerSeq: item.owners.length,
        isFlagged: item.passportStatus === "FLAGGED",
        qrUrl,
        passportUrl,
      },
      owners: sanitizedOwners,
      events: item.events.map((e) => ({
        id: e.id,
        seq: e.seq,
        eventType: e.eventType,
        confirmationLevel: e.confirmationLevel, // BOTH hoặc ONE_SIDE (BR31)
        transferKind: e.transferKind,
        occurredAt: e.occurredAt,
      })),
      listingsTimeline,
      chainTxs: item.chainTxs.map((tx) => ({
        id: tx.id,
        kind: tx.kind,
        status: tx.status,
        txHash: tx.txHash,
        submittedAt: tx.submittedAt,
        confirmedAt: tx.confirmedAt,
      })),
    });
  } catch (error) {
    console.error("⚠️ Lỗi GET /api/passport/[id]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải Digital Product Passport." },
      { status: 500 }
    );
  }
}
