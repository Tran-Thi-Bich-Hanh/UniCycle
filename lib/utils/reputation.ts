/**
 * Tiện ích tính điểm uy tín sinh viên và xử lý mở khóa đánh giá bí mật 48 giờ (Blind Review)
 * Tuân thủ các quy tắc nghiệp vụ:
 * - BR08 & BR09: Đánh giá 1-5 sao, 1 lần duy nhất cho mỗi đơn hàng đã hoàn tất
 * - BR14: Cơ chế Blind Review giữ kín 48h hoặc mở khóa khi cả hai bên cùng nộp
 * - BR23: Điểm uy tín bằng trung bình cộng các đánh giá công khai
 * - BR35: Chặn cày điểm ảo - chỉ tính tối đa 2 giao dịch đầu tiên giữa cùng một cặp tài khoản
 */

import prisma from "@/lib/prisma";

/**
 * Tính lại và cập nhật điểm uy tín (reputationScore) của người dùng
 * Chặn cày điểm ảo theo BR35: giữa cùng cặp (reviewer, reviewee), chỉ tính tối đa 2 lần đầu.
 */
export async function calculateAndSyncReputationScore(userId: string): Promise<number> {
  try {
    // Lấy tất cả các đánh giá công khai gửi tới userId này
    const publicReviews = await prisma.review.findMany({
      where: {
        revieweeId: userId,
        visibleAt: {
          not: null,
        },
      },
      orderBy: {
        submittedAt: "asc",
      },
    });

    if (!publicReviews || publicReviews.length === 0) {
      // Mặc định sinh viên mới là 5.0
      await prisma.user.update({
        where: { id: userId },
        data: { reputationScore: 5.0 },
      });
      return 5.0;
    }

    // Áp dụng quy tắc BR35: Đếm số lần đánh giá của từng reviewer đối với userId này
    // Chỉ lấy tối đa 2 review đầu tiên từ cùng một reviewer
    const reviewerCounts: Record<string, number> = {};
    const validReviews: typeof publicReviews = [];

    for (const review of publicReviews) {
      const count = reviewerCounts[review.reviewerId] || 0;
      if (count < 2) {
        validReviews.push(review);
        reviewerCounts[review.reviewerId] = count + 1;
      }
    }

    if (validReviews.length === 0) {
      return 5.0;
    }

    const totalStars = validReviews.reduce((sum, r) => sum + r.rating, 0);
    const average = totalStars / validReviews.length;
    // Làm tròn 1 chữ số thập phân (VD: 4.8 / 5.0)
    const roundedScore = Math.round(average * 10) / 10;
    const clampedScore = Math.min(5.0, Math.max(1.0, roundedScore));

    await prisma.user.update({
      where: { id: userId },
      data: { reputationScore: clampedScore },
    });

    return clampedScore;
  } catch (error) {
    console.error(`⚠️ Lỗi tính điểm uy tín cho user ${userId}:`, error);
    return 5.0;
  }
}

/**
 * Mở khóa các đánh giá bí mật đã quá 48 giờ kể từ khi nộp mà đối tác không nộp đánh giá đối ứng (BR14)
 */
export async function reconcileBlindReviews48h(orderId?: string): Promise<void> {
  try {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Tìm các review chưa công khai mà đã nộp quá 48h
    const pendingReviews = await prisma.review.findMany({
      where: {
        visibleAt: null,
        submittedAt: {
          lt: twoDaysAgo,
        },
        ...(orderId ? { orderId } : {}),
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            listing: { select: { title: true } },
          },
        },
      },
    });

    for (const review of pendingReviews) {
      const now = new Date();
      // Mở khóa đánh giá
      await prisma.review.update({
        where: { id: review.id },
        data: { visibleAt: now },
      });

      // Cập nhật lại điểm uy tín cho người nhận đánh giá
      await calculateAndSyncReputationScore(review.revieweeId);

      // Gửi thông báo cho người nhận biết đánh giá đã tự mở khóa theo BR14
      try {
        await prisma.notification.create({
          data: {
            userId: review.revieweeId,
            type: "REVIEW_UNLOCKED_TIMEOUT",
            title: "Đánh giá giao dịch đã tự động mở khóa (BR14)",
            message: `Đánh giá cho món đồ "${review.order.listing.title}" đã được công khai tự động sau 48 giờ theo quy tắc Blind Review (BR14).`,
            payload: JSON.stringify({ orderId: review.orderId, reviewId: review.id }),
          },
        });
      } catch {
        // Bỏ qua lỗi thông báo nếu có
      }
    }
  } catch (error) {
    console.error("⚠️ Lỗi dọn dẹp Blind Review 48h:", error);
  }
}

