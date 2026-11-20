/**
 * Tiện ích định dạng hiển thị uy tín và hoạt động người dùng trên Client (pure TypeScript).
 * Tuyệt đối KHÔNG import Prisma hoặc module server tại đây.
 */

export interface ReputationSummary {
  hasReviews: boolean;
  label: string;
  shortLabel: string;
  scoreText: string | null;
  reviewCount: number;
}

/**
 * Định dạng hiển thị điểm uy tín dựa trên số lượng đánh giá công khai thực tế.
 * Nếu chưa có đánh giá (`reviewCount <= 0`), trả về trạng thái chưa có đánh giá thay vì hiện 5.0 mặc định.
 */
export function formatReputationSummary(
  reputationScore?: number | null,
  reviewCount?: number | null
): ReputationSummary {
  const safeCount =
    typeof reviewCount === "number" && Number.isFinite(reviewCount) && reviewCount > 0
      ? Math.floor(reviewCount)
      : 0;

  if (safeCount === 0) {
    return {
      hasReviews: false,
      label: "Chưa có đánh giá",
      shortLabel: "Thành viên mới",
      scoreText: null,
      reviewCount: 0,
    };
  }

  const numericScore =
    typeof reputationScore === "number" && Number.isFinite(reputationScore)
      ? reputationScore
      : 5.0;
  const scoreText = numericScore.toFixed(1);

  return {
    hasReviews: true,
    label: `${scoreText} (${safeCount} đánh giá)`,
    shortLabel: `${scoreText} (${safeCount})`,
    scoreText,
    reviewCount: safeCount,
  };
}

/**
 * Định dạng nhãn số giao dịch hoàn tất thực tế của sinh viên.
 */
export function formatCompletedOrdersLabel(
  completedOrdersCount?: number | null
): string {
  const safeCount =
    typeof completedOrdersCount === "number" &&
    Number.isFinite(completedOrdersCount) &&
    completedOrdersCount > 0
      ? Math.floor(completedOrdersCount)
      : 0;

  return safeCount > 0
    ? `${safeCount} giao dịch hoàn tất`
    : "Thành viên mới";
}
