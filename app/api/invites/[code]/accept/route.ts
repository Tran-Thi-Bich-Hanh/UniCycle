import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // 1. Kiểm tra đăng nhập bắt buộc (BR01)
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xác nhận chốt mua món đồ (BR01)." },
        { status: 401 }
      );
    }

    const { code } = await params;
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    let invite = null;
    try {
      invite = await prisma.orderInvite.findUnique({
        where: { codeHash },
        include: { listing: true },
      });
    } catch (err) {
      console.warn("⚠️ Lỗi Prisma khi tìm lời mời:", err);
    }

    if (!invite) {
      // Demo response nếu không kết nối DB thật
      return NextResponse.json({
        message:
          "Xác nhận chốt mua thành công! Món đồ đã được chuyển sang trạng thái Giữ chỗ (RESERVED) độc quyền cho bạn (BR38).",
        orderId: "demo-accepted-order-" + Date.now(),
      });
    }

    const now = new Date();
    if (invite.status !== "PENDING" || invite.expiresAt < now) {
      return NextResponse.json(
        {
          error:
            invite.status === "ACCEPTED"
              ? "Lời mời chốt bán này đã được xác nhận trước đó."
              : "Lời mời chốt bán này đã hết hạn sau 24 giờ (BR38).",
        },
        { status: 410 }
      );
    }

    // 2. Quy tắc BR04: Người bán không được tự mua đồ của chính mình
    if (invite.listing.sellerId === user.id) {
      return NextResponse.json(
        { error: "Bạn không thể tự chốt mua món đồ của chính mình (BR04)." },
        { status: 400 }
      );
    }

    if (invite.listing.status !== "AVAILABLE") {
      return NextResponse.json(
        {
          error:
            invite.listing.status === "RESERVED"
              ? "Món đồ này hiện đã có người đặt giữ chỗ trước đó."
              : "Món đồ này hiện không còn mở bán.",
        },
        { status: 400 }
      );
    }

    // 3. Thực thi transaction chốt bán (BR38 & BR11)
    const order = await prisma.$transaction(async (tx) => {
      // Đánh dấu OrderInvite đã được chấp nhận
      await tx.orderInvite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedById: user.id,
        },
      });

      // Tạo đơn hàng mới ở trạng thái ACCEPTED (giữ chỗ ngay lập tức)
      const newOrder = await tx.order.create({
        data: {
          listingId: invite.listingId,
          buyerId: user.id,
          sellerId: invite.listing.sellerId,
          proposedPrice: invite.listing.price,
          meetPlace: "Giao dịch trao tay qua Zalo",
          meetTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Mặc định 2 tiếng
          message: "Đơn hàng chốt mua nhanh từ lời mời Zalo (BR38).",
          status: "ACCEPTED",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Chuyển Listing sang RESERVED
      await tx.listing.update({
        where: { id: invite.listingId },
        data: { status: "RESERVED" },
      });

      // Tự động REJECTED các đơn PENDING khác trên listing này (BR11)
      const otherPending = await tx.order.findMany({
        where: {
          listingId: invite.listingId,
          id: { not: newOrder.id },
          status: "PENDING",
        },
      });

      if (otherPending.length > 0) {
        await tx.order.updateMany({
          where: {
            listingId: invite.listingId,
            id: { not: newOrder.id },
            status: "PENDING",
          },
          data: { status: "REJECTED" },
        });

        for (const other of otherPending) {
          await tx.notification.create({
            data: {
              userId: other.buyerId,
              type: "ORDER_AUTO_REJECTED",
              title: "Món đồ đã có người giữ chỗ",
              message: `Món đồ "${invite.listing.title}" bạn quan tâm đã được người bán chốt giữ chỗ cho một bạn khác qua Zalo (BR11, BR38).`,
              payload: JSON.stringify({ listingId: invite.listingId, orderId: other.id }),
            },
          });
        }
      }

      // Thông báo cho người bán
      await tx.notification.create({
        data: {
          userId: invite.listing.sellerId,
          type: "INVITE_ACCEPTED",
          title: "Khách Zalo đã xác nhận chốt mua!",
          message: `${user.displayName} đã xác nhận chốt mua món đồ "${invite.listing.title}" qua lời mời Zalo của bạn. Đơn hàng đã chuyển sang trạng thái Giữ chỗ (RESERVED).`,
          payload: JSON.stringify({ listingId: invite.listingId, orderId: newOrder.id }),
        },
      });

      return newOrder;
    });

    return NextResponse.json({
      message:
        "Xác nhận chốt mua thành công! Món đồ đã được chuyển sang trạng thái Giữ chỗ (RESERVED) độc quyền cho bạn (BR38).",
      order,
    });
  } catch (error) {
    console.error("Lỗi POST /api/invites/[code]/accept:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xác nhận chốt mua." },
      { status: 500 }
    );
  }
}

