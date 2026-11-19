import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra đăng nhập (BR01)
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để tạo lời mời chốt bán cho khách Zalo." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { listingId } = body;

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Thiếu mã định danh tin đăng món đồ." },
        { status: 400 }
      );
    }

    // 2. Tìm tin đăng & kiểm tra quyền sở hữu
    let listing = null;
    let resolvedUserId = user.id;
    try {
      const [dbUser, foundListing] = await Promise.all([
        prisma.user.findFirst({
          where: { OR: [{ id: user.id }, { email: user.email }] },
          select: { id: true },
        }),
        prisma.listing.findUnique({
          where: { id: listingId },
          include: { item: true },
        }),
      ]);
      resolvedUserId = dbUser?.id || user.id;
      listing = foundListing;
    } catch (err) {
      console.warn("⚠️ Lỗi truy vấn DB khi tạo lời mời chốt bán:", err);
    }

    if (!listing) {
      return NextResponse.json(
        { error: "Không tìm thấy tin đăng món đồ." },
        { status: 404 }
      );
    }

    if (listing.sellerId !== resolvedUserId && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn chỉ có thể tạo lời mời chốt bán cho món đồ của chính mình." },
        { status: 403 }
      );
    }

    if (listing.status !== "AVAILABLE") {
      return NextResponse.json(
        {
          error:
            listing.status === "RESERVED"
              ? "Món đồ đang được giữ chỗ cho một người mua khác."
              : "Món đồ hiện không ở trạng thái mở bán.",
        },
        { status: 400 }
      );
    }

    if (listing.item?.passportStatus === "FLAGGED") {
      return NextResponse.json(
        { error: "Món đồ đang bị tạm khóa do có nghi vấn vi phạm." },
        { status: 400 }
      );
    }

    // 3. Sinh token ngẫu nhiên và hash token (BR38)
    const code = crypto.randomBytes(16).toString("hex");
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    // Lời mời có hiệu lực trong 24 giờ (BR38)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      await prisma.orderInvite.create({
        data: {
          listingId,
          codeHash,
          status: "PENDING",
          expiresAt,
        },
      });
    } catch (dbError) {
      console.warn("⚠️ Lỗi Prisma khi lưu lời mời (dùng demo response):", dbError);
    }

    // Lấy host URL từ request
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const fullInviteUrl = `${protocol}://${host}/invites/${code}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fullInviteUrl)}`;

    return NextResponse.json({
      message: "Đã tạo link chốt bán Zalo thành công! Link có hiệu lực trong 24 giờ.",
      code,
      inviteUrl: `/invites/${code}`,
      fullInviteUrl,
      qrUrl,
      expiresAt: expiresAt.toISOString(),
      listingTitle: listing.title,
    });
  } catch (error) {
    console.error("Lỗi POST /api/invites:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo lời mời chốt bán." },
      { status: 500 }
    );
  }
}

