"use client";

import React, { useState } from "react";

interface ReviewModalProps {
  isOpen: boolean;
  orderId: string;
  orderTitle: string;
  partnerName: string;
  isSellerRole: boolean; // true nếu user hiện tại là người bán (đang đánh giá người mua), false nếu là người mua
  onClose: () => void;
  onSuccess: (isUnlocked: boolean, message: string) => void;
}

const BUYER_REVIEWING_SELLER_TAGS = [
  "Đồ đúng mô tả",
  "Giá tốt sinh viên",
  "Đúng giờ hẹn",
  "Thân thiện nhiệt tình",
  "Nhiệt tình hướng dẫn",
  "Đóng gói cẩn thận",
];

const SELLER_REVIEWING_BUYER_TAGS = [
  "Giao dịch nhanh gọn",
  "Đúng giờ hẹn",
  "Lịch sự thân thiện",
  "Thanh toán sòng phẳng",
  "Giao tiếp rõ ràng",
  "Đáng tin cậy",
];

const RATING_LABELS: Record<number, string> = {
  1: "1★ Cần cải thiện",
  2: "2★ Tạm được",
  3: "3★ Bình thường",
  4: "4★ Hài lòng",
  5: "5★ Rất tuyệt vời!",
};

export function ReviewModal({
  isOpen,
  orderId,
  orderTitle,
  partnerName,
  isSellerRole,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickTags = isSellerRole
    ? SELLER_REVIEWING_BUYER_TAGS
    : BUYER_REVIEWING_SELLER_TAGS;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length >= 5) return;
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 3) {
      setError("Vui lòng nhập nhận xét ít nhất 3 ký tự.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          rating,
          comment: comment.trim(),
          tags: selectedTags,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể gửi đánh giá.");
        return;
      }

      onSuccess(Boolean(data.isUnlocked), data.message);
    } catch {
      setError("Lỗi kết nối khi gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeStar = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 transform transition-all">
        {/* Header Modal */}
        <div className="p-6 bg-gradient-to-r from-[#001B48] to-[#02457A] text-white relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">⭐</span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
              Đánh Giá Uy Tín Sinh Viên
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">
            Đánh Giá Giao Dịch
          </h2>
          <p className="text-xs text-sky-100/90 mt-1 line-clamp-1">
            Món đồ: <strong>{orderTitle}</strong>
          </p>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Người được đánh giá */}
          <div className="text-xs text-[#02457A] bg-sky-50/70 p-3 rounded-xl border border-sky-100 flex items-center justify-between">
            <span>
              Đối tác giao dịch: <strong>{partnerName}</strong>
            </span>
            <span className="font-semibold text-[#018ABE]">
              {isSellerRole ? "Vai trò: Người mua" : "Vai trò: Người bán"}
            </span>
          </div>

          {/* 1. Chọn số sao đánh giá (1-5 sao) */}
          <div className="text-center py-2">
            <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
              Mức độ hài lòng của bạn
            </label>
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 hover:scale-125 transition-transform cursor-pointer focus:outline-hidden"
                >
                  <svg
                    className={`w-9 h-9 transition-colors ${
                      star <= activeStar
                        ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                        : "text-slate-200 fill-slate-200"
                    }`}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-[#018ABE]">
              {RATING_LABELS[activeStar] || ""}
            </span>
          </div>

          {/* 2. Chọn Quick Tags */}
          <div>
            <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
              Điểm cộng nổi bật (chọn nhanh)
            </label>
            <div className="flex flex-wrap gap-2">
              {quickTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#018ABE] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-[#D6E8EE]/60"
                    }`}
                  >
                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Nhận xét chi tiết */}
          <div>
            <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
              Nhận xét chi tiết
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm trao đổi đồ dùng với bạn ấy (thái độ, chất lượng đồ dùng, sự đúng giờ...)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#018ABE]/30 focus:border-[#018ABE] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
              <span>Tối thiểu 3 ký tự</span>
              <span>{comment.length}/500</span>
            </div>
          </div>

          {/* 4. Banner giải thích cơ chế Blind Review 48h (BR14) */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
            <span className="text-base shrink-0">🛡️</span>
            <div>
              <strong className="block text-[11px] uppercase tracking-wider text-amber-950 font-extrabold mb-0.5">
                Cơ chế Đánh Giá Bí Mật 48 Giờ (Blind Review - BR14)
              </strong>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                Nhận xét của bạn được giữ kín và chỉ mở khóa khi cả hai bên cùng nộp đánh giá (hoặc tự động sau 48h) nhằm ngăn chặn việc trả đũa đánh giá xấu. Hãy an tâm nhận xét thật lòng!
              </p>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Để sau
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <span>🔒 Gửi đánh giá bí mật</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

