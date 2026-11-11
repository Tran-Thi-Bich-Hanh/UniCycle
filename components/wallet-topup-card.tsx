"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconCheck,
  IconArrowRight,
  IconCopy,
  IconClock,
  IconShieldCheck,
} from "./icons";
import { formatCurrencyVND } from "@/lib/utils";

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000, 500000];
const MIN_AMOUNT = 10000;
const MAX_AMOUNT = 5000000;

export interface PendingTopupItem {
  id: string;
  amount: number;
  reference_code: string;
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  expires_at: string;
  created_at: string;
}

interface ActiveTopupSession {
  requestId?: string;
  referenceCode: string;
  amountVnd: number;
  amountUnip: number;
  expiresAt?: string;
}

interface WalletTopupCardProps {
  initialAmount?: number;
  returnUrl?: string | null;
  pendingTopup?: PendingTopupItem | null;
  onTopupSuccess: (message: string, amountAdded: number) => void;
  onTopupError: (error: string) => void;
  onPendingChanged?: () => void;
}

function formatExpiryCountdown(expiresAt?: string): string {
  if (!expiresAt) return "Hiệu lực 15 phút";
  const diffSec = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  if (diffSec <= 0) return "Đã hết hạn";
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `Còn ${mins}:${secs.toString().padStart(2, "0")} hiệu lực`;
}

export function WalletTopupCard({
  initialAmount,
  returnUrl,
  pendingTopup,
  onTopupSuccess,
  onTopupError,
  onPendingChanged,
}: WalletTopupCardProps) {
  const [amountInput, setAmountInput] = useState<string>(
    String(
      initialAmount && initialAmount >= MIN_AMOUNT
        ? Math.ceil(initialAmount / 1000) * 1000
        : 50000
    )
  );
  const [activeSession, setActiveSession] = useState<ActiveTopupSession | null>(null);
  const [loadingStep, setLoadingStep] = useState<
    "CREATE_INTENT" | "CONFIRM_TOPUP" | "CANCEL_TOPUP" | null
  >(null);
  const [justCompletedAmount, setJustCompletedAmount] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (initialAmount && initialAmount >= MIN_AMOUNT) {
      setAmountInput(String(Math.max(MIN_AMOUNT, Math.ceil(initialAmount / 1000) * 1000)));
    }
  }, [initialAmount]);

  // Tự động khôi phục lệnh nạp PENDING nếu người dùng tải lại trang
  useEffect(() => {
    if (pendingTopup && pendingTopup.status === "PENDING") {
      if (Date.parse(pendingTopup.expires_at) > Date.now()) {
        setActiveSession({
          requestId: pendingTopup.id,
          referenceCode: pendingTopup.reference_code,
          amountVnd: pendingTopup.amount,
          amountUnip: pendingTopup.amount,
          expiresAt: pendingTopup.expires_at,
        });
      }
    }
  }, [pendingTopup]);

  // Cập nhật đồng hồ đếm ngược mỗi giây khi đang ở bước 2
  useEffect(() => {
    if (!activeSession?.expiresAt) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [activeSession?.expiresAt]);

  const numericAmount = Number(amountInput.replace(/\D/g, "")) || 0;
  const isInRange = numericAmount >= MIN_AMOUNT && numericAmount <= MAX_AMOUNT;
  const isMultipleOfThousand = numericAmount % 1000 === 0;
  const isValidAmount = isInRange && isMultipleOfThousand;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (rawDigits.length <= 7) {
      setAmountInput(rawDigits);
      setJustCompletedAmount(null);
    }
  };

  const handleCreateTopupIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInRange) {
      onTopupError("Số tiền nạp phải từ 10.000đ đến 5.000.000đ.");
      return;
    }
    if (!isMultipleOfThousand) {
      onTopupError("Số tiền nạp cần là bội số của 1.000đ (ví dụ: 25.000đ, 50.000đ).");
      return;
    }
    setLoadingStep("CREATE_INTENT");
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, action: "CREATE_INTENT" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo mã nạp điểm.");

      const req = data.topupRequest || data.momoSession;
      setActiveSession({
        requestId: req.id || req.requestId,
        referenceCode: req.referenceCode || req.momoOrderId,
        amountVnd: req.amountVnd,
        amountUnip: req.amountUnip,
        expiresAt: req.expiresAt,
      });
      onPendingChanged?.();
    } catch (err: any) {
      onTopupError(err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!activeSession) return;
    setLoadingStep("CONFIRM_TOPUP");
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: activeSession.requestId,
          referenceCode: activeSession.referenceCode,
          momoOrderId: activeSession.referenceCode,
          amount: activeSession.amountVnd,
          action: "CONFIRM_TOPUP",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xác nhận nạp điểm không thành công.");

      const added = activeSession.amountUnip;
      setActiveSession(null);
      setJustCompletedAmount(added);
      onTopupSuccess(
        data.message || `Đã cộng +${added.toLocaleString("vi-VN")} UNIP vào Số dư khả dụng!`,
        added
      );
    } catch (err: any) {
      onTopupError(err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleCancelIntent = async () => {
    if (!activeSession) return;
    setLoadingStep("CANCEL_TOPUP");
    try {
      await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: activeSession.requestId,
          referenceCode: activeSession.referenceCode,
          action: "CANCEL_TOPUP",
        }),
      });
      setActiveSession(null);
      onPendingChanged?.();
    } catch {
      setActiveSession(null);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleCopyCode = async () => {
    if (!activeSession?.referenceCode) return;
    try {
      await navigator.clipboard.writeText(activeSession.referenceCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Bỏ qua lỗi clipboard
    }
  };

  // =========================================================================
  // MÀN HÌNH 2: XÁC THỰC LỆNH NẠP PENDING (CÓ MÃ ĐỐI SOÁT UC-XXXXXX & HẠN 15P)
  // =========================================================================
  if (activeSession) {
    const countdownText = formatExpiryCountdown(activeSession.expiresAt);
    const isExpired = countdownText === "Đã hết hạn";

    return (
      <section className="bg-white rounded-2xl border border-[#97CADB] p-6 shadow-2xs max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between border-b border-[#D6E8EE] pb-3.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#001B48]">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[11px]">
              PENDING
            </span>
            <span>Bước 2 / 2 • Chờ xác nhận nạp điểm</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#02457A]">
            <IconClock className="w-3.5 h-3.5 text-[#018ABE]" />
            <span>{countdownText}</span>
          </span>
        </div>

        <div className="text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#001B48]">
            {formatCurrencyVND(activeSession.amountVnd)}
          </div>
          <div className="text-xs font-bold text-[#018ABE]">
            Cộng +{activeSession.amountUnip.toLocaleString("vi-VN")} UNIP vào Số dư khả dụng
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-[#D6E8EE]/25 p-5 rounded-2xl border border-[#D6E8EE] space-y-3">
          <div className="bg-white p-3 rounded-xl border border-[#D6E8EE] shadow-2xs">
            <svg
              viewBox="0 0 120 120"
              className="w-32 h-32 text-[#001B48]"
              role="img"
              aria-label="Mã QR nạp điểm UniCycle"
            >
              <rect width="120" height="120" rx="8" fill="#FFFFFF" />
              <path
                fill="currentColor"
                d="M12 12h32v32H12V12zm6 6v20h20V18H18zm6 6h8v8h-8v-8zm52-12h32v32H76V12zm6 6v20h20V18H82zm6 6h8v8h-8v-8zM12 76h32v32H12V76zm6 6v20h20V82H18zm6 6h8v8h-8v-8zm30-70h8v16h-8V18zm12 8h8v20h-8V26zM52 52h16v16H52V52zm-28 0h16v8H24v-8zm56 0h28v8H80v-8zm-8 24h16v16H72V76zm20 12h16v20H92V88zm-40 4h12v16H52V92z"
              />
            </svg>
          </div>

          <div className="w-full max-w-xs bg-white px-3.5 py-2.5 rounded-xl border border-[#97CADB] flex items-center justify-between gap-2">
            <div className="text-xs">
              <span className="text-[#02457A] block text-[10px]">Nội dung chuyển khoản:</span>
              <strong className="font-mono text-sm text-[#001B48]">
                {activeSession.referenceCode}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#D6E8EE]/50 text-[#02457A] hover:bg-[#D6E8EE] inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedCode ? (
                <IconCheck className="w-3.5 h-3.5 text-[#018ABE]" />
              ) : (
                <IconCopy className="w-3.5 h-3.5" />
              )}
              <span>{copiedCode ? "Đã chép" : "Sao chép"}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={loadingStep !== null || isExpired}
            onClick={handleConfirmPayment}
            className="w-full py-3.5 px-5 rounded-xl font-extrabold text-sm bg-[#02457A] text-white hover:bg-[#001B48] transition-colors shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <IconCheck className="w-4 h-4" />
            <span>
              {loadingStep === "CONFIRM_TOPUP"
                ? "Đang xác thực & cộng điểm..."
                : "Tôi đã chuyển khoản — Xác nhận nạp điểm"}
            </span>
          </button>

          <button
            type="button"
            disabled={loadingStep !== null}
            onClick={handleCancelIntent}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-[#02457A] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors cursor-pointer"
          >
            {loadingStep === "CANCEL_TOPUP"
              ? "Đang hủy mã nạp..."
              : "Hủy lệnh nạp / Đổi số tiền khác"}
          </button>
        </div>
      </section>
    );
  }

  // =========================================================================
  // MÀN HÌNH 1: NHẬP SỐ TIỀN CẦN NẠP & TẠO LỆNH NẠP (BƯỚC 1 / 2)
  // =========================================================================
  return (
    <form
      onSubmit={handleCreateTopupIntent}
      className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs max-w-lg mx-auto space-y-5"
    >
      {justCompletedAmount && returnUrl && (
        <div className="p-4 rounded-xl bg-[#D6E8EE]/50 border border-[#018ABE] flex items-center justify-between gap-3">
          <div className="text-xs font-bold text-[#001B48]">
            Đã nạp +{justCompletedAmount.toLocaleString("vi-VN")} UNIP thành công!
          </div>
          <Link
            href={returnUrl}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors"
          >
            <span>Quay lại giữ chỗ món đồ</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="topup-amount-input"
            className="block text-xs font-extrabold uppercase tracking-wider text-[#02457A]"
          >
            Nhập số tiền cần nạp (VNĐ)
          </label>
          <span className="text-[11px] font-bold text-[#018ABE]">Bước 1 / 2</span>
        </div>

        <div className="relative">
          <input
            id="topup-amount-input"
            type="text"
            inputMode="numeric"
            value={numericAmount > 0 ? numericAmount.toLocaleString("vi-VN") : ""}
            onChange={handleAmountChange}
            placeholder="Ví dụ: 50.000"
            className="w-full px-4 py-3.5 pr-28 rounded-xl border-2 border-[#97CADB] focus:border-[#018ABE] focus:outline-hidden text-xl sm:text-2xl font-extrabold text-[#001B48] bg-white transition-colors"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold px-2.5 py-1 rounded-md bg-[#D6E8EE] text-[#02457A]">
            = {numericAmount.toLocaleString("vi-VN")} UNIP
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-[11px] text-[#02457A]">
          <span>Tối thiểu 10.000đ • Bội số 1.000đ (1 VNĐ = 1 UNIP)</span>
          {!isInRange && numericAmount > 0 && (
            <span className="text-red-600 font-bold">Nhập từ 10.000đ - 5.000.000đ</span>
          )}
          {isInRange && !isMultipleOfThousand && (
            <button
              type="button"
              onClick={() =>
                setAmountInput(String(Math.ceil(numericAmount / 1000) * 1000))
              }
              className="text-[#018ABE] font-extrabold underline cursor-pointer"
            >
              Làm tròn thành {(Math.ceil(numericAmount / 1000) * 1000).toLocaleString("vi-VN")}đ
            </button>
          )}
        </div>
      </div>

      {/* Các nút chọn mệnh giá nhanh */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {PRESET_AMOUNTS.map((amt) => {
          const active = numericAmount === amt;
          return (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setAmountInput(String(amt));
                setJustCompletedAmount(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                active
                  ? "bg-[#02457A] text-white border-[#02457A]"
                  : "bg-[#D6E8EE]/25 text-[#001B48] border-[#D6E8EE] hover:border-[#018ABE]"
              }`}
            >
              {amt.toLocaleString("vi-VN")}đ
            </button>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={!isValidAmount || loadingStep !== null}
        className="w-full py-3.5 px-5 rounded-xl font-extrabold text-sm bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
      >
        {loadingStep === "CREATE_INTENT"
          ? "Đang tạo mã đối soát..."
          : `Tạo mã nạp ${numericAmount > 0 ? formatCurrencyVND(numericAmount) : ""}`}
      </button>

      <div className="p-3 rounded-xl bg-[#D6E8EE]/30 border border-[#D6E8EE] flex items-start gap-2.5 text-[11px] text-[#02457A] leading-relaxed">
        <IconShieldCheck className="w-4 h-4 text-[#018ABE] shrink-0 mt-0.5" />
        <span>
          Điểm <strong>UNIP</strong> dùng để thanh toán & giữ chỗ an toàn qua hợp đồng Escrow trong khuôn viên trường. Nếu đơn giữ chỗ hủy hợp lệ, 100% điểm được hoàn lại ngay vào <strong>Số dư khả dụng</strong>.
        </span>
      </div>
    </form>
  );
}
