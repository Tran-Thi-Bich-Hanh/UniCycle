/**
 * Tiện ích dọn dẹp và cập nhật trạng thái tự động cho các đơn hẹn và lời mời hết hạn
 * Tuân thủ quy tắc BR12 (đơn PENDING 48h) và BR37 (đơn ACCEPTED quá meet_time + 24h)
 */

import prisma from "@/lib/prisma";

export async function reconcileExpiredOrders(): Promise<void> {
  try {
    const now = new Date();

    // 1. Quy tắc BR12: Yêu cầu PENDING quá 48 giờ không được phản hồi sẽ tự động EXPIRED
    await prisma.order.updateMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    // 2. Quy tắc BR37: Quá thời gian hẹn (meetTime) + 24 giờ mà cả hai im lặng:
    // Đơn ACCEPTED chuyển EXPIRED và sản phẩm tự động nhả RESERVED về AVAILABLE
    const yesterdayFromNow = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const expiredAcceptedOrders = await prisma.order.findMany({
      where: {
        status: "ACCEPTED",
        meetTime: {
          lt: yesterdayFromNow,
        },
      },
      include: {
        listing: { select: { id: true, title: true, status: true } },
      },
    });

    for (const order of expiredAcceptedOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Cập nhật đơn thành EXPIRED
          await tx.order.update({
            where: { id: order.id },
            data: { status: "EXPIRED" },
          });

          // Nhả trạng thái Listing về AVAILABLE nếu đang RESERVED
          if (order.listing.status === "RESERVED") {
            await tx.listing.update({
              where: { id: order.listing.id },
              data: { status: "AVAILABLE" },
            });
          }

          // Gửi thông báo cho hai bên
          await tx.notification.createMany({
            data: [
              {
                userId: order.buyerId,
                type: "ORDER_TIMEOUT_EXPIRED",
                title: "Lịch hẹn đã tự động hết hạn (BR37)",
                message: `Lịch hẹn xem món đồ "${order.listing.title}" đã tự động hết hạn do quá 24h sau giờ hẹn mà chưa có xác nhận bàn giao. Món đồ đã được mở bán lại trên sàn.`,
                payload: JSON.stringify({ listingId: order.listing.id, orderId: order.id }),
              },
              {
                userId: order.sellerId,
                type: "ORDER_TIMEOUT_EXPIRED",
                title: "Lịch hẹn đã tự động hết hạn (BR37)",
                message: `Lịch hẹn xem món đồ "${order.listing.title}" đã tự động hết hạn do quá 24h sau giờ hẹn mà chưa có xác nhận bàn giao. Món đồ đã được mở bán lại trên sàn.`,
                payload: JSON.stringify({ listingId: order.listing.id, orderId: order.id }),
              },
            ],
          });
        });
      } catch (err) {
        console.warn(`⚠️ Lỗi xử lý timeout đơn hẹn ${order.id}:`, err);
      }
    }

    // 3. Quy tắc BR38: Lời mời chốt bán Zalo hết hạn sau 24 giờ
    await prisma.orderInvite.updateMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });
  } catch (error) {
    // Không làm gián đoạn luồng chính nếu DB offline
    console.warn("⚠️ Bỏ qua reconcileExpiredOrders do lỗi truy vấn DB:", error);
  }
}

