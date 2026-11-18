"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export type ReportTargetType = "LISTING" | "USER" | "PASSPORT";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
}

const PRESET_REASONS: Record<ReportTargetType, string[]> = {
  LISTING: [
    "Sản phẩm thuộc danh mục hàng cấm học đường (BR17: cồn, thuốc, chất cấm, tài liệu lậu...)",
    "Người bán yêu cầu chuyển tiền cọc trước, có dấu hiệu lừa đảo",
    "Hình ảnh hoặc thông tin mô tả không đúng sự thật",
    "Tin đăng spam, trùng lặp hoặc giá ảo",
  ],
  PASSPORT: [
    "Đồ vật bị nghi ngờ mất cắp hoặc đang có tranh chấp quyền sở hữu (BR32)",
    "Ảnh hiện tại có dấu hiệu sao chép lại từ đời chủ cũ, không phản ánh đúng thực trạng",
    "Nghi ngờ làm giả thông tin cam kết / serial sản phẩm",
  ],
  USER: [
    "Người dùng có hành vi gian lận, lừa đảo đặt cọc",
    "Hủy hẹn nhiều lần không lý do hoặc thái độ thiếu tôn trọng",
    "Tạo nhiều tài khoản ảo để thao túng đánh giá uy tín",
  ],
};

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: ReportModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const presets = PRESET_REASONS[targetType] || PRESET_REASONS.LISTING;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        onClose();
        router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Không thể gửi báo cáo." });
        return;
      }

      setFeedback({
        type: "success",
        message: data.message || "Đã ghi nhận báo cáo vi phạm!",
      });
      setReason("");
      setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 1500);
    } catch {
      setFeedback({
        type: "error",
        message: "Lỗi kết nối máy chủ khi gửi báo cáo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#D6E8EE] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-600">
              <span>🚩</span>
              <span>Báo cáo vi phạm cộng đồng</span>
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-[#001B48] mt-1">
              {targetLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại báo cáo"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <span className="block text-xs font-bold text-[#001B48]">
              Chọn nhanh lý do (tùy chọn):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`text-left text-[11px] px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                    reason === preset
                      ? "bg-rose-50 border-rose-300 text-rose-900 font-bold"
                      : "bg-[#F8FAFC] border-slate-200 text-slate-700 hover:border-[#97CADB]"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="report-reason-textarea" className="block text-xs font-bold text-[#001B48] mb-1.5">
              Chi tiết lý do báo cáo <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="report-reason-textarea"
              rows={3}
              required
              minLength={10}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mô tả rõ dấu hiệu vi phạm (tối thiểu 10 ký tự) để Ban Quản Trị xem xét..."
              className="w-full p-3.5 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-xs sm:text-sm text-[#001B48]"
            />
          </div>

          {feedback && (
            <div
              role="alert"
              className={`p-3 rounded-xl text-xs font-semibold border ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || reason.trim().length < 10}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Đang gửi báo cáo..." : "Gửi báo cáo cho Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
