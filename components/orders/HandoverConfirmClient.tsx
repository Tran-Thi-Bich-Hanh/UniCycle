"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatReputationSummary } from "@/lib/utils/reputation-display";

interface HandoverSummaryPayload {
  role: "BUYER" | "SELLER";
  order: {
    id: string;
    status: string;
    proposedPrice: number;
    meetPlace: string;
    meetTime: string;
    buyerConfirmedAt: string | null;
    sellerConfirmedAt: string | null;
  };
  product: {
    listingId: string;
    title: string;
    isFree: boolean;
    condition: string;
    thumbnail: string;
    schoolShortName: string | null;
  };
  seller: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isStudentVerified: boolean;
    reputationScore: number;
    reviewCount: number;
    dorm: string | null;
  };
  passport: {
    enabled: boolean;
    passportId: string | null;
    status: string;
    isFlagged: boolean;
    flagReason: string | null;
    ownersCount: number;
  };
  tokenExpiresAt: string;
}

interface HandoverConfirmClientProps {
  orderId: string;
}

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

export function HandoverConfirmClient({
  orderId,
}: HandoverConfirmClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HandoverSummaryPayload | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<{
    message: string;
    passportId: string | null;
    transferredOwnerSeq: number | null;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      if (!token) {
        if (active) {
          setError(
            "Liên kết giao nhận thiếu mã xác thực. Vui lòng quét lại mã QR từ màn hình người bán."
          );
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/orders/${orderId}/handover?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );

        if (res.status === 401) {
          const returnTo = `/orders/${orderId}/handover?token=${encodeURIComponent(token)}`;
          router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        const json = await res.json();
        if (!active) return;

        if (!res.ok) {
          setError(json.error || "Không thể đọc thông tin giao nhận.");
          return;
        }

        setData(json);
      } catch {
        if (active) {
          setError("Lỗi kết nối máy chủ khi tải thông tin giao nhận.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      active = false;
    };
  }, [orderId, token, router]);

  const handleConfirmReceipt = async () => {
    if (!token || confirming) return;
    setConfirming(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.status === 401) {
        const returnTo = `/orders/${orderId}/handover?token=${encodeURIComponent(token)}`;
        router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error || "Không thể xác nhận đã nhận hàng.");
        return;
      }

      window.dispatchEvent(new Event("unicycle-auth-change"));
      window.dispatchEvent(new Event("unicycle-listings-change"));

      setCompletedResult({
        message:
          json.message ||
          "Đã xác nhận nhận hàng và chuyển giao quyền sở hữu thành công!",
        passportId: json.passportId ?? data?.passport.passportId ?? null,
        transferredOwnerSeq:
          typeof json.transferredOwnerSeq === "number"
            ? json.transferredOwnerSeq
            : null,
      });
    } catch {
      setSubmitError("Lỗi kết nối máy chủ khi xác nhận nhận hàng.");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-[#02457A]">
          Đang kiểm tra thông tin giao nhận...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E8EE] shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.9}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-extrabold text-[#001B48]">
            Không thể xác thực mã QR giao nhận
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {error || "Liên kết không hợp lệ hoặc đã hết hạn."}
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold transition-colors"
          >
            Quay lại Đơn hẹn của tôi
          </Link>
        </div>
      </div>
    );
  }

  // Trường hợp chính người bán tự mở link QR
  if (data.role === "SELLER") {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 sm:py-14">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E8EE] shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E3F1F9] text-[#018ABE] border border-[#BAE6FD] flex items-center justify-center mx-auto">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-extrabold text-[#001B48]">
            Bạn đang mở bằng tài khoản người bán
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Hãy để <strong>người mua</strong> quét mã QR trên màn hình của bạn để kiểm
            tra thông tin món đồ và bấm xác nhận đã nhận hàng.
          </p>
          <Link
            href={`/orders/${orderId}`}
            className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold transition-colors"
          >
            ← Quay lại chi tiết đơn hẹn
          </Link>
        </div>
      </div>
    );
  }

  const isAlreadyCompleted =
    Boolean(completedResult) ||
    ["COMPLETED", "AUTO_COMPLETED"].includes(data.order.status);

  if (isAlreadyCompleted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 sm:py-14">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.4}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              Bước 4: Hoàn tất
            </span>
            <h1 className="text-xl font-extrabold text-[#001B48]">
              Giao dịch hoàn tất thành công
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {completedResult?.message ||
                "Giao dịch trao tay đã hoàn tất và quyền sở hữu Digital Product Passport đã được chuyển sang bạn."}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE] flex items-center gap-3 text-left">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white">
              <Image
                src={data.product.thumbnail}
                alt={data.product.title}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#001B48] line-clamp-2">
                {data.product.title}
              </p>
              <p className="text-xs font-extrabold text-[#018ABE] mt-0.5 tabular-nums">
                {data.product.isFree || data.order.proposedPrice === 0
                  ? "Miễn phí 0đ"
                  : `${data.order.proposedPrice.toLocaleString("vi-VN")} ₫`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Link
              href={`/orders/${orderId}`}
              className="flex-1 h-11 px-4 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center transition-colors"
            >
              Xem đơn &amp; Đánh giá ngay
            </Link>
            <Link
              href="/my-items"
              className="flex-1 h-11 px-4 rounded-xl bg-[#E3F1F9] hover:bg-[#D6E8EE] text-[#001B48] text-xs sm:text-sm font-bold inline-flex items-center justify-center transition-colors"
            >
              Mở Đồ của tôi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sellerReputation = formatReputationSummary(
    data.seller.reputationScore,
    data.seller.reviewCount
  );
  const priceLabel =
    data.product.isFree || data.order.proposedPrice === 0
      ? "Miễn phí 0đ"
      : `${data.order.proposedPrice.toLocaleString("vi-VN")} ₫`;
  const isActionableOrder = ["ACCEPTED", "WAITING_CONFIRMATION"].includes(
    data.order.status
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-8 sm:py-12 space-y-5">
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D6E8EE] shadow-sm space-y-5">
        {/* Tiêu đề gọn cho Bước 3 */}
        <div className="space-y-1 pb-4 border-b border-slate-100">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E3F1F9] text-[#02457A] border border-[#BAE6FD]">
            Kiểm tra giao nhận trực tiếp
          </span>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#001B48] leading-snug pt-1">
            Xác nhận nhận hàng tại điểm hẹn
          </h1>
          <p className="text-xs text-slate-500">
            Đối chiếu kỹ món đồ thực tế trước khi bấm xác nhận bên dưới.
          </p>
        </div>

        {/* 1 & 2. Tên, hình ảnh sản phẩm & Giá giao dịch */}
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE] flex items-start gap-3.5">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white">
            <Image
              src={data.product.thumbnail}
              alt={data.product.title}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-sm sm:text-[15px] font-bold text-[#001B48] line-clamp-2 leading-snug">
              {data.product.title}
            </h2>
            <p className="text-base sm:text-lg font-black text-[#018ABE] tabular-nums">
              {priceLabel}
            </p>
            <p className="text-xs text-slate-600">{data.product.condition}</p>
          </div>
        </div>

        {/* 3. Thông tin người bán */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#D6E8EE] flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
            <Image
              src={data.seller.avatarUrl || DEFAULT_AVATAR}
              alt={data.seller.displayName}
              fill
              sizes="44px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-[#001B48] truncate">
                {data.seller.displayName}
              </span>
              {data.seller.isStudentVerified && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold whitespace-nowrap">
                  ✓ SV đã duyệt
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 mt-0.5">
              <span className="truncate">
                {data.seller.dorm || data.product.schoolShortName || "Sinh viên KTX"}
              </span>
              <span aria-hidden="true">•</span>
              {sellerReputation.hasReviews ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#001B48]">
                  <svg
                    className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{sellerReputation.label}</span>
                </span>
              ) : (
                <span className="text-slate-500 font-medium">
                  {sellerReputation.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4 & 5. Trạng thái Passport + Nút xem lịch sử Passport nếu cần */}
        <div
          className={`p-4 rounded-2xl border space-y-3 ${
            data.passport.isFlagged
              ? "bg-rose-50 border-rose-200"
              : "bg-emerald-50/70 border-emerald-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Trạng thái Digital Product Passport
              </span>
              {data.passport.isFlagged ? (
                <p className="text-xs sm:text-sm font-extrabold text-rose-800">
                  Có cảnh báo vi phạm — Không nên nhận hàng
                </p>
              ) : (
                <p className="text-xs sm:text-sm font-extrabold text-emerald-900">
                  Bình thường · Digital Product Passport hợp lệ (Đời chủ #{data.passport.ownersCount})
                </p>
              )}
              {data.passport.isFlagged && data.passport.flagReason && (
                <p className="text-xs text-rose-700 leading-relaxed">
                  Lý do: {data.passport.flagReason}
                </p>
              )}
            </div>

            <span
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                data.passport.isFlagged
                  ? "bg-rose-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {data.passport.isFlagged ? "Cảnh báo" : "Bình thường"}
            </span>
          </div>

          {data.passport.passportId && (
            <div className="pt-1">
              <Link
                href={`/passport/${data.passport.passportId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#02457A] hover:text-[#018ABE] hover:underline"
              >
                <span>Xem Digital Product Passport chi tiết ↗</span>
              </Link>
            </div>
          )}
        </div>

        {submitError && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800"
          >
            {submitError}
          </div>
        )}

        {/* Bước 4: Xác nhận nhận hàng */}
        <div className="space-y-2.5 pt-1">
          {!isActionableOrder ? (
            <div className="p-3.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 text-center">
              Đơn hẹn này hiện đang ở trạng thái {data.order.status}, không thể xác
              nhận nhận hàng qua QR.
            </div>
          ) : (
            <button
              type="button"
              disabled={confirming || data.passport.isFlagged}
              onClick={handleConfirmReceipt}
              className="w-full h-12 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              {confirming ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xác nhận giao nhận...</span>
                </>
              ) : (
                <span>Xác nhận đã nhận hàng</span>
              )}
            </button>
          )}

          <div className="text-center pt-1">
            <Link
              href={`/orders/${orderId}`}
              className="text-xs font-semibold text-slate-500 hover:text-[#02457A] hover:underline"
            >
              Gặp sự cố hoặc muốn khiếu nại? Xem chi tiết đơn hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
