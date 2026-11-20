import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/my-items
 * Lấy danh sách các món đồ hiện đang thuộc quyền sở hữu của sinh viên đăng nhập
 * Hỗ trợ quản lý Digital Product Passport, bật/tắt hiển thị tên (BR29) và Bán lại 1-chạm (BR25)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xem danh sách đồ của bạn." },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email }] },
      select: { id: true },
    });
    const resolvedUserId = dbUser?.id || user.id;

    const items = await prisma.item.findMany({
      where: {
        currentOwnerId: resolvedUserId,
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
          select: {
            id: true,
            seq: true,
            userId: true,
            showName: true,
            since: true,
            ownerHash: true,
            user: {
              select: {
                displayName: true,
                school: {
                  select: {
                    shortName: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        listings: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            title: true,
            price: true,
            isFree: true,
            status: true,
            images: {
              orderBy: { position: "asc" },
              take: 1,
              select: { url: true },
            },
          },
        },
        chainTxs: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            kind: true,
            status: true,
            txHash: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const host = request.headers.get("host") || "unicycle.vn";
    const protocol = host.includes("localhost") ? "http" : "https";

    const formattedItems = items.map((item) => {
      const currentOwnerRecord = [...item.owners].reverse().find((o) => o.userId === resolvedUserId);
      const latestListing = item.listings[0] || null;
      const isCurrentlyListed = latestListing
        ? ["AVAILABLE", "RESERVED"].includes(latestListing.status)
        : false;

      const passportUrl = item.passportId
        ? `${protocol}://${host}/passport/${item.passportId}`
        : null;

      const latestChainTx =
        item.chainTxs.length > 0 ? item.chainTxs[item.chainTxs.length - 1] : null;
      const registerTx = item.chainTxs.find(
        (t) => t.kind === "REGISTER" && Boolean(t.txHash)
      );
      const transferTxs = item.chainTxs.filter(
        (t) => t.kind === "TRANSFER" && Boolean(t.txHash)
      );

      return {
        id: item.id,
        passportId: item.passportId,
        passportStatus: item.passportStatus,
        identityLevel: item.identityLevel,
        category: item.category,
        title: latestListing?.title || "Món đồ sinh viên đã kích hoạt Passport",
        thumbnail:
          latestListing?.images[0]?.url ||
          "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400",
        totalOwners: item.owners.length,
        myOwnerSeq: currentOwnerRecord?.seq || item.owners.length,
        showNameOnPassport: currentOwnerRecord?.showName ?? false,
        ownedSince: currentOwnerRecord?.since || item.createdAt,
        isCurrentlyListed,
        latestListingId: latestListing?.id || null,
        latestListingStatus: latestListing?.status || null,
        passportUrl,
        chainTx: latestChainTx
          ? {
              id: latestChainTx.id,
              status: latestChainTx.status,
              txHash: latestChainTx.txHash,
            }
          : null,
        owners: item.owners.map((o) => {
          const schoolShortName =
            o.user?.school?.shortName || o.user?.school?.name || null;
          const isMe = o.userId === resolvedUserId;
          return {
            seq: o.seq,
            isMe,
            showName: o.showName,
            displayName:
              o.showName && o.user
                ? o.user.displayName
                : `Sinh viên ẩn danh (${schoolShortName || "UniCycle"})`,
            realDisplayName: isMe && o.user ? o.user.displayName : null,
            since: o.since.toISOString(),
            schoolShortName,
            txHash:
              o.seq === 1
                ? registerTx?.txHash || null
                : transferTxs[o.seq - 2]?.txHash || null,
          };
        }),
      };
    });

    return NextResponse.json({
      items: formattedItems,
      total: formattedItems.length,
    });
  } catch (error) {
    console.error("⚠️ Lỗi GET /api/my-items:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách đồ của bạn." },
      { status: 500 }
    );
  }
}

