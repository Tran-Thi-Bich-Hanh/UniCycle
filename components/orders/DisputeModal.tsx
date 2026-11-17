"use client";

import React, { useState } from "react";

interface DisputeModalProps {
  isOpen: boolean;
  orderTitle: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const DISPUTE_PRESETS = [
  "Mình chưa hề nhận được hàng nhưng người bán đã bấm xác nhận bàn giao",
  "Hai bên chưa gặp mặt trực tiếp, xin tạm giữ đơn để kiểm tra lại",
  "Không liên lạc được với người bán tại thời điểm hẹn trao tay",
];

export function DisputeModal({
  isOpen,
  orderTitle,
  submitting,
  error,
  onClose,
  onSubmit,
}: DisputeModalProps) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setLocalError("Vui lòng mô tả rõ lý do khiếu nại (ít nhất 10 ký tự).");
      return;
    }
    setLocalError(null);
    onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg">
              🚨
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#001B48]">
                Khiếu Nại: Tôi Chưa Nhận Hàng
              </h3>
              <p className="text-xs text-slate-500">
                Chặn tự động hoàn tất 48h theo quy tắc an toàn BR13
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
          <p className="font-bold">Sản phẩm: {orderTitle}</p>
          <p>
            Khi gửi khiếu nại, đơn hàng sẽ lập tức chuyển sang trạng thái{" "}
            <strong>DISPUTED</strong>, chặn hoàn toàn việc tự động xác nhận và chuyển Ban Quản Trị xử lý trong vòng 72 giờ.
          </p>
        </div>

        {(localError || error) && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#001B48] mb-1.5">
              Chọn nhanh lý do phổ biến:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {DISPUTE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setReason(preset);
                    setLocalError(null);
                  }}
                  className="text-[11px] text-left px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-[#001B48] border border-slate-200 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold text-[#001B48] mb-1">
              Lý do chi tiết (ít nhất 10 ký tự) <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Mô tả rõ tình trạng gặp mặt hoặc lý do bạn chưa nhận được món đồ..."
              className="w-full p-3 rounded-xl border border-[#D6E8EE] text-xs sm:text-sm text-[#001B48] focus:border-rose-500 outline-none resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Đang gửi khiếu nại..." : "🚨 Gửi Khiếu Nại & Chặn Hoàn Tất"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

