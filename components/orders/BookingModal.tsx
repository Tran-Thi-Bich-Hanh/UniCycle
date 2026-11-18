"use client";

import React, { useState } from "react";
import Image from "next/image";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    price: number;
    isFree?: boolean;
    schoolName?: string;
    imageUrl?: string;
    sellerName: string;
  };
  onSuccess: (orderId: string) => void;
}

const MEET_PLACES_PRESETS = [
  "Cổng KTX Khu B (ĐHQG)",
  "Cổng KTX Khu A (ĐHQG)",
  "Sảnh Thư viện Trung tâm",
  "Căng tin trường ĐH Bách Khoa",
  "Cổng trường ĐH Khoa học Tự nhiên",
  "Trường ĐH Kinh tế TP.HCM (UEH)",
];

export function BookingModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: BookingModalProps) {
  const [proposedPrice, setProposedPrice] = useState<string>(
    product.isFree ? "0" : product.price.toString()
  );
  const [meetPlace, setMeetPlace] = useState(
    product.schoolName ? `Cổng ${product.schoolName}` : MEET_PLACES_PRESETS[0]
  );
  const [meetDate, setMeetDate] = useState(() => {
    // Ngày mai
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [meetTimeSlot, setMeetTimeSlot] = useState("10:00");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!meetPlace.trim()) {
      setError("Vui lòng chọn hoặc nhập địa điểm gặp mặt công cộng.");
      return;
    }

    if (!meetDate || !meetTimeSlot) {
      setError("Vui lòng chọn thời gian hẹn gặp.");
      return;
    }

    // Ghép ngày & giờ
    const combinedDateTime = new Date(`${meetDate}T${meetTimeSlot}:00`);
    if (isNaN(combinedDateTime.getTime())) {
      setError("Thời gian hẹn không hợp lệ.");
      return;
    }

    if (combinedDateTime.getTime() <= Date.now()) {
      setError("Thời gian hẹn gặp mặt phải ở thời điểm tương lai.");
      return;
    }

    const priceNum = product.isFree ? 0 : parseInt(proposedPrice) || 0;
    if (priceNum < 0) {
      setError("Giá đề xuất không hợp lệ.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: product.id,
          proposedPrice: priceNum,
          meetPlace: meetPlace.trim(),
          meetTime: combinedDateTime.toISOString(),
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể gửi yêu cầu đặt hẹn. Vui lòng thử lại.");
        return;
      }

      onSuccess(data.order.id);
    } catch {
      setError("Đã xảy ra lỗi kết nối khi gửi yêu cầu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#018ABE]/10 text-[#018ABE] flex items-center justify-center">
              <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#001B48]">
                Đặt Lịch Hẹn Xem Hàng
              </h3>
              <p className="text-xs text-slate-500">
                Gặp mặt trao tay trực tiếp tại khuôn viên trường / KTX
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tóm tắt món đồ */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3 mb-5">
          {product.imageUrl && (
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200">
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-[#001B48] truncate">
              {product.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-[#02457A] mt-0.5">
              <span>Người bán: <strong>{product.sellerName}</strong></span>
              <span>•</span>
              <span className="font-extrabold text-[#018ABE]">
                {product.isFree ? "0đ (Cho tặng)" : `${product.price.toLocaleString("vi-VN")} đ`}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Giá đề xuất */}
          <div>
            <label className="block text-xs font-bold text-[#001B48] mb-1">
              Giá thương lượng đề xuất (VNĐ)
            </label>
            <div className="relative">
              <input
                type="number"
                disabled={product.isFree}
                value={product.isFree ? 0 : proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                min={0}
                step={5000}
                className="w-full h-11 px-3.5 pr-14 rounded-xl border border-[#D6E8EE] text-sm font-bold text-[#001B48] focus:border-[#018ABE] outline-none disabled:bg-slate-100"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                VNĐ
              </span>
            </div>
            {!product.isFree && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Giá gốc: {product.price.toLocaleString("vi-VN")} đ. Bạn có thể đề xuất mức giá mong muốn.
              </span>
            )}
          </div>

          {/* Địa điểm gặp mặt công cộng */}
          <div>
            <label className="block text-xs font-bold text-[#001B48] mb-1">
              Địa điểm hẹn gặp mặt (Nơi công cộng an toàn) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={meetPlace}
              onChange={(e) => setMeetPlace(e.target.value)}
              placeholder="VD: Cổng KTX Khu B, Căng tin trường Bách Khoa..."
              className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] text-sm font-medium text-[#001B48] focus:border-[#018ABE] outline-none mb-2"
              required
            />
            {/* Chip chọn nhanh */}
            <div className="flex flex-wrap gap-1.5">
              {MEET_PLACES_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMeetPlace(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#D6E8EE]/60 text-[#001B48] transition-colors border border-slate-200 cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Thời gian hẹn: Ngày & Khung giờ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-1">
                Ngày hẹn <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={meetDate}
                onChange={(e) => setMeetDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#D6E8EE] text-xs font-semibold text-[#001B48] focus:border-[#018ABE] outline-none cursor-pointer"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-1">
                Giờ hẹn dự kiến <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={meetTimeSlot}
                onChange={(e) => setMeetTimeSlot(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#D6E8EE] text-xs font-semibold text-[#001B48] focus:border-[#018ABE] outline-none cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Lời nhắn gửi người bán */}
          <div>
            <label className="block text-xs font-bold text-[#001B48] mb-1">
              Lời nhắn gửi người bán (Tùy chọn)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="VD: Mình là sinh viên năm nhất ở KTX B4, giờ đó mình rảnh bạn đem đồ ra cổng giúp mình nhé..."
              rows={2}
              className="w-full p-3 rounded-xl border border-[#D6E8EE] text-xs text-[#001B48] placeholder:text-slate-400 focus:border-[#018ABE] outline-none resize-none"
            />
          </div>

          {/* Lưu ý an toàn */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
            <span className="font-bold block">💡 Quy tắc đặt hẹn UniCycle:</span>
            <span>
              - Đơn hẹn có hiệu lực phản hồi trong vòng <strong>48 giờ</strong> (BR12).
            </span>
            <span>
              - Khi người bán chấp nhận, món đồ sẽ tự động chuyển sang trạng thái <strong>Giữ chỗ (RESERVED)</strong> độc quyền cho bạn (BR11).
            </span>
          </div>

          {/* Nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <span>🚀 Gửi Yêu Cầu Hẹn</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

