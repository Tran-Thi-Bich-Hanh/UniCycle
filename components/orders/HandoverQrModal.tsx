"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

interface HandoverQrPayload {
  handoverUrl: string;
  handoverPath: string;
  qrUrl: string;
  expiresAt: string;
  ttlSeconds: number;
  orderStatus: string;
  listingTitle: string;
  proposedPrice: number;
  isFree: boolean;
}

interface HandoverQrModalProps {
  isOpen: boolean;
  orderId: string;
  onClose: () => void;
  onCompleted: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

async function requestHandoverQrPayload(
  orderId: string,
  signal?: AbortSignal
): Promise<{ payload: HandoverQrPayload; diffSeconds: number }> {
  const res = await fetch(`/api/orders/${orderId}/handover`, {
    cache: "no-store",
    signal,
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Không thể tạo mã QR giao nhận.");
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.parse(data.expiresAt) - Date.now()) / 1000)
  );
  return { payload: data as HandoverQrPayload, diffSeconds };
}

export function HandoverQrModal({
  isOpen,
  orderId,
  onClose,
  onCompleted,
}: HandoverQrModalProps) {
  const [loading, setLoading] = useState(isOpen);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<HandoverQrPayload | null>(null);
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [completedByScan, setCompletedByScan] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  const onCompletedRef = useRef(onCompleted);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
    onCompletedRef.current = onCompleted;
  }, [onClose, onCompleted]);

  const handleRefreshQr = useCallback(async () => {
    setCompletedByScan(false);
    setLoading(true);
    setError(null);
    setImgState("loading");
    setRetryKey(0);
    setCopied(false);

    try {
      const { payload, diffSeconds } = await requestHandoverQrPayload(orderId);
      setQrData(payload);
      setRemainingSeconds(diffSeconds);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Lỗi kết nối máy chủ khi tạo mã QR giao nhận."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const controller = new AbortController();

    requestHandoverQrPayload(orderId, controller.signal)
      .then(({ payload, diffSeconds }) => {
        if (!active) return;
        setQrData(payload);
        setRemainingSeconds(diffSeconds);
      })
      .catch((err) => {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Lỗi kết nối máy chủ khi tạo mã QR giao nhận."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const previousOverflow = document.body.style.overflow;
    const openerElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const frameId = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      active = false;
      controller.abort();
      cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      openerElement?.focus();
    };
  }, [isOpen, orderId]);

  // Đếm ngược thời hạn token 15 phút
  useEffect(() => {
    if (!isOpen || !qrData?.expiresAt || completedByScan) return;

    const timer = setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((Date.parse(qrData.expiresAt) - Date.now()) / 1000)
      );
      setRemainingSeconds(diff);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, qrData?.expiresAt, completedByScan]);

  // Tự động kiểm tra xem người mua đã quét & xác nhận xong chưa (4 giây/lần)
  useEffect(() => {
    if (!isOpen || completedByScan) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const status = data.order?.status;
        if (status === "COMPLETED" || status === "AUTO_COMPLETED") {
          setCompletedByScan(true);
          onCompletedRef.current();
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời khi polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, orderId, completedByScan]);

  const handleCopyLink = async () => {
    if (!qrData) return;

    const urlToCopy =
      typeof window !== "undefined"
        ? `${window.location.origin}${qrData.handoverPath}`
        : qrData.handoverUrl;

    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 2000);
    } catch {
      setError("Không thể sao chép liên kết. Bạn có thể cho người mua quét trực tiếp mã QR.");
    }
  };

  if (!isOpen) return null;

  const isExpired = Boolean(qrData) && remainingSeconds <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="handover-qr-modal-title"
        className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#D6E8EE] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3
              id="handover-qr-modal-title"
              className="font-extrabold text-[#001B48] text-base"
            >
              Mở mã QR giao nhận
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dành cho người mua quét khi gặp mặt nhận đồ
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại QR giao nhận"
            className="w-9 h-9 -mr-1 rounded-xl text-slate-500 hover:text-[#001B48] hover:bg-slate-100 inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {completedByScan ? (
          <div className="py-5 px-3 text-center space-y-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-extrabold text-emerald-950">
                Giao dịch hoàn tất thành công
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Người mua đã quét mã QR và xác nhận nhận hàng. Quyền sở hữu Digital
                Product Passport đã được chuyển giao.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng và tiếp tục đánh giá
            </button>
          </div>
        ) : loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang khởi tạo mã QR bảo mật...
            </span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
            <p className="text-xs font-semibold text-rose-800 leading-relaxed">
              {error}
            </p>
            <button
              type="button"
              onClick={handleRefreshQr}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : qrData ? (
          <>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-[#001B48] line-clamp-2">
                {qrData.listingTitle}
              </p>
              <p className="text-xs font-extrabold text-[#018ABE] tabular-nums">
                {qrData.isFree || qrData.proposedPrice === 0
                  ? "Miễn phí 0đ"
                  : `${qrData.proposedPrice.toLocaleString("vi-VN")} ₫`}
              </p>
            </div>

            {/* Khung mã QR */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE] p-3 flex items-center justify-center overflow-hidden">
              {isExpired ? (
                <div className="text-center space-y-2.5 px-3">
                  <p className="text-xs font-bold text-amber-800">
                    Mã QR này đã hết hạn
                  </p>
                  <button
                    type="button"
                    onClick={handleRefreshQr}
                    className="px-3.5 py-2 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tạo mã QR mới
                  </button>
                </div>
              ) : imgState === "error" ? (
                <div className="text-center space-y-2.5 px-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Không tải được ảnh QR. Bạn có thể sao chép liên kết bên dưới gửi cho
                    người mua.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setImgState("loading");
                      setRetryKey((k) => k + 1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#E3F1F9] hover:bg-[#BAE6FD]/70 text-[#02457A] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Tải lại ảnh QR
                  </button>
                </div>
              ) : (
                <>
                  {imgState === "loading" && (
                    <div
                      className="absolute inset-3 rounded-xl bg-slate-200/70 motion-safe:animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                  <Image
                    key={`${qrData.expiresAt}-${retryKey}`}
                    src={
                      retryKey > 0
                        ? `${qrData.qrUrl}&retry=${retryKey}`
                        : qrData.qrUrl
                    }
                    alt={`Mã QR giao nhận đơn ${orderId}`}
                    fill
                    sizes="256px"
                    className={`object-contain p-3 transition-opacity duration-200 ${
                      imgState === "loaded" ? "opacity-100" : "opacity-0"
                    }`}
                    unoptimized
                    onLoad={() => setImgState("loaded")}
                    onError={() => setImgState("error")}
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border tabular-nums ${
                  isExpired
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-[#F4F9FB] text-[#02457A] border-[#D6E8EE]"
                }`}
              >
                <span>
                  {isExpired
                    ? "Mã QR đã hết hạn"
                    : `Có hiệu lực: ${formatCountdown(remainingSeconds)}`}
                </span>
              </span>
            </div>

            <p className="text-xs text-slate-600 text-center leading-relaxed">
              Đưa mã QR này cho người mua quét trực tiếp tại điểm hẹn. Khi người mua
              bấm xác nhận, giao dịch sẽ tự động hoàn tất và chuyển Passport.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={isExpired}
                className={`flex-1 h-10 px-3.5 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 ${
                  copied
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-[#F4F9FB] hover:bg-[#D6E8EE]/70 text-[#001B48] border-[#D6E8EE]"
                }`}
              >
                <span>{copied ? "✓ Đã sao chép link" : "Sao chép liên kết"}</span>
              </button>

              <button
                type="button"
                onClick={handleRefreshQr}
                className="h-10 px-3.5 rounded-xl border border-[#D6E8EE] bg-white hover:bg-slate-50 text-[#02457A] text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
              >
                Làm mới QR
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
