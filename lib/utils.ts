export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export const CONDITION_LABELS: Record<string, { label: string; badgeClass: string; desc: string }> = {
  NEW: {
    label: "Mới 100%",
    badgeClass: "bg-[#E6F4F1] text-[#174A61] border-[#A9D8CF]",
    desc: "Chưa qua sử dụng, còn nguyên bao bì/tag",
  },
  LIKE_NEW: {
    label: "Như mới (99%)",
    badgeClass: "bg-[#EAF2F4] text-[#1F5E7A] border-[#B8D2DA]",
    desc: "Sử dụng rất ít, không vết trầy, đầy đủ phụ kiện",
  },
  GOOD: {
    label: "Còn tốt (85-90%)",
    badgeClass: "bg-[#E6F4F1] text-[#174A61] border-[#A9D8CF]",
    desc: "Còn hoạt động hoàn hảo, chỉ có vết xước nhẹ không đáng kể",
  },
  FAIR: {
    label: "Khá (70-80%)",
    badgeClass: "bg-amber-50 text-[#8D5A16] border-amber-300",
    desc: "Đã dùng lâu nhưng vẫn phục vụ tốt nhu cầu sinh hoạt",
  },
  POOR: {
    label: "Cũ",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    desc: "Có khuyết điểm rõ rệt, thích hợp để sửa lại hoặc lấy phụ tùng",
  },
};

export const STATUS_LABELS: Record<string, { label: string; colorClass: string }> = {
  ACTIVE: { label: "Đang bán", colorClass: "bg-[#1F5E7A] text-white" },
  RESERVED: { label: "Đang giữ chỗ", colorClass: "bg-[#B7791F] text-white" },
  SOLD: { label: "Đã bán", colorClass: "bg-slate-500 text-white" },
  HIDDEN: { label: "Tạm ẩn", colorClass: "bg-slate-400 text-white" },
};
