"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { IconCheck, IconArrowLeft, IconArrowRight } from "./icons";
import { formatCurrencyVND } from "@/lib/utils";

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000, 500000];
const MIN_AMOUNT = 10000;
const MAX_AMOUNT = 5000000;

interface MomoSession {
  momoOrderId: string;
  amountVnd: number;
  amountUnip: number;
  transferNote: string;
}

interface WalletTopupCardProps {
  initialAmount?: number;
  returnUrl?: string | null;
  onTopupSuccess: (message: string, amountAdded: number) => void;
  onTopupError: (error: string) => void;
}

export function WalletTopupCard({
  initialAmount,
  returnUrl,
  onTopupSuccess,
  onTopupError,
}: WalletTopupCardProps) {
  const [amountInput, setAmountInput] = useState<string>(
    String(initialAmount && initialAmount >= MIN_AMOUNT ? initialAmount : 50000)
  );
  const [momoSession, setMomoSession] = useState<MomoSession | null>(null);
  const [loadingStep, setLoadingStep] = useState<"INIT" | "CONFIRM" | null>(null);
  const [justCompletedAmount, setJustCompletedAmount] = useState<number | null>(null);

  useEffect(() => {
    if (initialAmount && initialAmount >= MIN_AMOUNT) {
      setAmountInput(String(Math.max(MIN_AMOUNT, Math.ceil(initialAmount / 1000) * 1000)));
    }
  }, [initialAmount]);

  const numericAmount = Number(amountInput.replace(/\D/g, "")) || 0;
  const isValidAmount = numericAmount >= MIN_AMOUNT && numericAmount <= MAX_AMOUNT;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (rawDigits.length <= 7) {
      setAmountInput(rawDigits);
      setJustCompletedAmount(null);
    }
  };

  const handleOpenQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount) {
      onTopupError("Số tiền nạp từ 10.000đ đến 5.000.000đ.");
      return;
    }
    setLoadingStep("INIT");
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, action: "INIT" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo mã thanh toán.");
      setMomoSession(data.momoSession);
    } catch (err: any) {
      onTopupError(err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!momoSession) return;
    setLoadingStep("CONFIRM");
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: momoSession.amountVnd,
          momoOrderId: momoSession.momoOrderId,
          action: "CONFIRM",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nạp điểm không thành công.");

      const added = momoSession.amountUnip;
      setMomoSession(null);
      setJustCompletedAmount(added);
      onTopupSuccess(`+${added.toLocaleString("vi-VN")} UNIP đã vào ví`, added);
    } catch (err: any) {
      onTopupError(err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  // Màn hình 2: Quét mã QR MoMo (Tách riêng bước thanh toán, không để chung với form nhập)
  if (momoSession) {
    return (
      <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between border-b border-[#D6E8EE] pb-3.5">
          <button
            type="button"
            onClick={() => setMomoSession(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#02457A] hover:text-[#018ABE] cursor-pointer"
          >
            <IconArrowLeft className="w-4 h-4" />
            <span>Đổi số tiền</span>
          </button>
          <span className="text-xs font-bold text-[#02457A]">Bước 2 / 2 • Quét mã MoMo</span>
        </div>

        <div className="text-center space-y-1">
          <div className="text-2xl font-extrabold text-[#001B48]">
            {formatCurrencyVND(momoSession.amountVnd)}
          </div>
          <div className="text-xs font-bold text-[#018ABE]">
            Nhận +{momoSession.amountUnip.toLocaleString("vi-VN")} UNIP
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-[#D6E8EE]/25 p-5 rounded-2xl border border-[#D6E8EE]">
          <div className="bg-white p-3 rounded-xl border border-[#D6E8EE] shadow-2xs">
            <svg
              viewBox="0 0 120 120"
              className="w-32 h-32 text-[#001B48]"
              role="img"
              aria-label="Mã QR thanh toán MoMo"
            >
              <rect width="120" height="120" rx="8" fill="#FFFFFF" />
              <path
                fill="currentColor"
                d="M12 12h32v32H12V12zm6 6v20h20V18H18zm6 6h8v8h-8v-8zm52-12h32v32H76V12zm6 6v20h20V18H82zm6 6h8v8h-8v-8zM12 76h32v32H12V76zm6 6v20h20V82H18zm6 6h8v8h-8v-8zm30-70h8v16h-8V18zm12 8h8v20h-8V26zM52 52h16v16H52V52zm-28 0h16v8H24v-8zm56 0h28v8H80v-8zm-8 24h16v16H72V76zm20 12h16v20H92V88zm-40 4h12v16H52V92z"
              />
            </svg>
          </div>
          <div className="mt-3 text-xs text-[#02457A]">
            Nội dung: <strong className="font-mono text-[#001B48]">{momoSession.transferNote}</strong>
          </div>
        </div>

        <button
          type="button"
          disabled={loadingStep === "CONFIRM"}
          onClick={handleConfirmPayment}
          className="w-full py-3.5 px-5 rounded-xl font-extrabold text-sm bg-[#02457A] text-white hover:bg-[#001B48] transition-colors shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <IconCheck className="w-4 h-4" />
          <span>
            {loadingStep === "CONFIRM" ? "Đang xử lý..." : "Xác nhận đã chuyển khoản"}
          </span>
        </button>
      </section>
    );
  }

  // Màn hình 1: Nhập số tiền cần nạp (Hỗ trợ cả tự nhập và chọn nhanh)
  return (
    <form
      onSubmit={handleOpenQr}
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
            <span>Quay lại đặt cọc</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div>
        <label
          htmlFor="topup-amount-input"
          className="block text-xs font-extrabold uppercase tracking-wider text-[#02457A] mb-2"
        >
          Nhập số tiền cần nạp (VNĐ)
        </label>
        <div className="relative">
          <input
            id="topup-amount-input"
            type="text"
            inputMode="numeric"
            value={numericAmount > 0 ? numericAmount.toLocaleString("vi-VN") : ""}
            onChange={handleAmountChange}
            placeholder="Ví dụ: 65.000"
            className="w-full px-4 py-3.5 pr-24 rounded-xl border-2 border-[#97CADB] focus:border-[#018ABE] focus:outline-hidden text-xl sm:text-2xl font-extrabold text-[#001B48] bg-white transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold px-2.5 py-1 rounded-md bg-[#D6E8EE] text-[#02457A]">
            = {numericAmount.toLocaleString("vi-VN")} UNIP
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[11px] text-[#02457A]">
          <span>Tối thiểu 10.000đ • Tỷ lệ 1đ = 1 UNIP</span>
          {!isValidAmount && numericAmount > 0 && (
            <span className="text-red-600 font-bold">Nhập từ 10.000đ - 5.000.000đ</span>
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
        {loadingStep === "INIT"
          ? "Đang tạo mã QR..."
          : `Tiếp tục nạp ${numericAmount > 0 ? formatCurrencyVND(numericAmount) : ""}`}
      </button>
    </form>
  );
}
