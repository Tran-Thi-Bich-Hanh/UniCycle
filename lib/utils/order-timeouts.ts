/**
 * Tiện ích dọn dẹp và cập nhật trạng thái tự động cho các đơn hẹn và lời mời hết hạn
 * Tuân thủ quy tắc BR12 (đơn PENDING 48h) và BR37 (đơn ACCEPTED quá meet_time + 24h)
 */

import prisma from "@/lib/prisma";
import { executeOrderCompletionAndPassportTransfer } from "@/lib/utils/passport-transfer";
import { reconcileBlindReviews48h } from "@/lib/utils/reputation";

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

    // 4. Quy tắc BR13 & BR31: Đơn WAITING_CONFIRMATION quá 48 giờ mà đối tác im lặng (không khiếu nại)
    // Tự động chuyển AUTO_COMPLETED, Listing thành SOLD (BR10) và chuyển giao Passport mức ONE_SIDE
    const autoCompletableOrders = await prisma.order.findMany({
      where: {
        status: "WAITING_CONFIRMATION",
        expiresAt: {
          lt: now,
        },
      },
      select: { id: true },
    });

    for (const pendingConfirmOrder of autoCompletableOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          await executeOrderCompletionAndPassportTransfer(
            tx,
            pendingConfirmOrder.id,
            "AUTO_COMPLETED"
          );
        });
      } catch (err) {
        console.warn(`⚠️ Lỗi tự động hoàn tất đơn ${pendingConfirmOrder.id}:`, err);
      }
    }

    // 5. Quy tắc BR14: Tự động mở khóa các đánh giá Blind Review đã nộp quá 48h
    await reconcileBlindReviews48h();

    // 6. Quy tắc BR15: Tin đăng quá hạn 30 ngày tự động chuyển EXPIRED
    await prisma.listing.updateMany({
      where: {
        status: "AVAILABLE",
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    // 7. SLA 72 giờ cho đơn DISPUTED (Mục 7.2 system-design.md):
    // Quá 72 giờ kể từ disputedAt mà chưa có kết luận phân giải của Admin ->
    // Tự động chuyển đơn sang CANCELLED và nhả Listing về AVAILABLE (nếu không bị Flag)
    const disputedDeadline = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const overdueDisputedOrders = await prisma.order.findMany({
      where: {
        status: "DISPUTED",
        disputedAt: {
          lt: disputedDeadline,
        },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            status: true,
            item: { select: { passportStatus: true } },
          },
        },
      },
    });

    for (const disputedOrder of overdueDisputedOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: disputedOrder.id },
            data: {
              status: "CANCELLED",
              resolvedAt: now,
              resolutionNote:
                "Tự động hủy do quá SLA 72 giờ chưa chứng minh được việc bàn giao (Hệ thống đối soát định kỳ).",
            },
          });

          if (
            disputedOrder.listing.status === "RESERVED" &&
            disputedOrder.listing.item?.passportStatus !== "FLAGGED"
          ) {
            await tx.listing.update({
              where: { id: disputedOrder.listing.id },
              data: { status: "AVAILABLE" },
            });
          }

          await tx.notification.createMany({
            data: [
              {
                userId: disputedOrder.buyerId,
                type: "DISPUTE_SLA_EXPIRED",
                title: "Khiếu nại đơn hàng đã đóng (SLA 72h)",
                message: `Đơn hàng "${disputedOrder.listing.title}" đã quá hạn xử lý 72 giờ mà chưa chứng minh được việc bàn giao, hệ thống tự động hủy đơn.`,
                payload: JSON.stringify({
                  listingId: disputedOrder.listing.id,
                  orderId: disputedOrder.id,
                }),
              },
              {
                userId: disputedOrder.sellerId,
                type: "DISPUTE_SLA_EXPIRED",
                title: "Khiếu nại đơn hàng đã đóng (SLA 72h)",
                message: `Đơn hàng "${disputedOrder.listing.title}" đã quá hạn xử lý 72 giờ, hệ thống tự động hủy đơn và mở lại trạng thái tin đăng.`,
                payload: JSON.stringify({
                  listingId: disputedOrder.listing.id,
                  orderId: disputedOrder.id,
                }),
              },
            ],
          });
        });
      } catch (err) {
        console.warn(`⚠️ Lỗi xử lý SLA 72h đơn DISPUTED ${disputedOrder.id}:`, err);
      }
    }
  } catch (error) {
    // Không làm gián đoạn luồng chính nếu DB offline
    console.warn("⚠️ Bỏ qua reconcileExpiredOrders do lỗi truy vấn DB:", error);
  }
}

