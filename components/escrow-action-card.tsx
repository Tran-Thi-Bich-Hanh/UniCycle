"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  IconLock,
  IconWallet,
  IconCheck,
  IconExternalLink,
  IconShieldCheck,
  IconArrowRight,
} from "./icons";

interface EscrowDetail {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  buyer_name?: string;
  seller_name?: string;
  amount: number;
  passport_hash: string;
  status: "LOCKED" | "RELEASED" | "REFUNDED";
  lock_tx_hash: string | null;
  settle_tx_hash: string | null;
  lockExplorerUrl: string | null;
  settleExplorerUrl: string | null;
}

interface ViewerWallet {
  userId: string;
  address: string;
  pointBalance: number;
}

interface EscrowActionCardProps {
  productId: string;
  price: number;
  productStatus: "ACTIVE" | "RESERVED" | "SOLD" | "HIDDEN";
  sellerId: string;
  currentUserId: string | null;
  onEscrowUpdated: () => void;
  onNotify: (msg: string, type?: "success" | "error") => void;
}

export function EscrowActionCard({
  productId,
  price,
  productStatus,
  sellerId,
  currentUserId,
  onEscrowUpdated,
  onNotify,
}: EscrowActionCardProps) {
  const [escrow, setEscrow] = useState<EscrowDetail | null>(null);
  const [viewerWallet, setViewerWallet] = useState<ViewerWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"LOCK" | "RELEASE" | "REFUND" | null>(null);

  const requiredUnip = Math.round(Number(price || 0));

  const fetchEscrowState = useCallback(async () => {
    try {
      const res = await fetch(`/api/escrow?productId=${encodeURIComponent(productId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setEscrow(data.escrow || null);
      setViewerWallet(data.viewerWallet || null);
    } catch {
      // Bỏ qua lỗi mạng tạm thời
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchEscrowState();
  }, [fetchEscrowState, productStatus, currentUserId]);

  const handleLockEscrow = async () => {
    setSubmitting("LOCK");
    try {
      const res = await fetch("/api/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể đặt cọc giữ chỗ món đồ.");
      }
      onNotify(data.message || "Đã khóa cọc UNIP thành công!");
      window.dispatchEvent(new Event("unicycle:wallet-updated"));
      await fetchEscrowState();
      onEscrowUpdated();
    } catch (err: any) {
      onNotify(err.message, "error");
    } finally {
      setSubmitting(null);
    }
  };

  const handleSettleEscrow = async (action: "RELEASE" | "REFUND") => {
    if (!escrow) return;
    setSubmitting(action);
    try {
      const res = await fetch(`/api/escrow/${escrow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể xử lý đơn đặt cọc.");
      }
      onNotify(data.message);
      window.dispatchEvent(new Event("unicycle:wallet-updated"));
      await fetchEscrowState();
      onEscrowUpdated();
    } catch (err: any) {
      onNotify(err.message, "error");
    } finally {
      setSubmitting(null);
    }
  };

  if (requiredUnip <= 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#D6E8EE] bg-white p-5 animate-pulse space-y-3">
        <div className="h-4 bg-[#D6E8EE] rounded w-1/2" />
        <div className="h-10 bg-[#D6E8EE]/60 rounded-xl w-full" />
      </div>
    );
  }

  const isSeller = currentUserId === sellerId;
  const isEscrowBuyer = Boolean(currentUserId && escrow?.buyer_id === currentUserId);
  const currentBalance = viewerWallet?.pointBalance ?? 0;
  const hasEnoughUnip = currentBalance >= requiredUnip;

  return (
    <section
      className="bg-white rounded-2xl border-2 border-[#018ABE] p-5 shadow-2xs space-y-4"
      aria-label="Đặt cọc an toàn qua Smart Contract"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#D6E8EE] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#018ABE]/15 text-[#018ABE] flex items-center justify-center shrink-0">
            <IconLock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#001B48]">
              Đặt cọc Smart Escrow (Avalanche Fuji)
            </h2>
            <p className="text-[11px] text-[#02457A]">
              Giữ điểm trung gian kèm mã băm Sổ đỏ, nhận đúng đồ mới giải ngân
            </p>
          </div>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-[#D6E8EE]/70 text-[#001B48] text-xs font-extrabold">
          {requiredUnip.toLocaleString("vi-VN")} UNIP
        </span>
      </div>

      {/* TRƯỜNG HỢP 1: MÓN ĐỒ ĐANG ĐƯỢC GIỮ CHỖ (RESERVED / LOCKED) */}
      {(productStatus === "RESERVED" || escrow?.status === "LOCKED") && escrow ? (
        <div className="space-y-4" role="status" aria-atomic="true">
          {/* Thanh tiến trình 3 bước */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold text-center">
            <div className="py-1.5 px-2 rounded-lg bg-[#02457A] text-white">
              1. Đã khóa {escrow.amount.toLocaleString("vi-VN")} UNIP
            </div>
            <div className="py-1.5 px-2 rounded-lg bg-[#018ABE] text-white">
              2. Gặp kiểm tra đồ
            </div>
            <div className="py-1.5 px-2 rounded-lg bg-[#D6E8EE] text-[#02457A]">
              3. Giải ngân & Sang tên
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#D6E8EE]/35 border border-[#97CADB] space-y-1.5 text-xs">
            <div className="font-bold text-[#001B48]">
              {isEscrowBuyer
                ? "Bạn đang đặt cọc giữ chỗ món đồ này"
                : isSeller
                ? `Sinh viên ${escrow.buyer_name || "Người mua"} đã đặt cọc ${escrow.amount.toLocaleString("vi-VN")} UNIP`
                : `Đang được giữ chỗ bởi ${escrow.buyer_name || "một bạn sinh viên"}`}
            </div>
            <p className="text-[11px] text-[#02457A] leading-relaxed">
              {isEscrowBuyer
                ? "Hãy hẹn gặp người bán nhận đồ và đối chiếu với Sổ đỏ UniCycle Passport. Khi bạn bấm xác nhận bên dưới, điểm UNIP mới chuyển sang ví người bán."
                : isSeller
                ? "Bài đăng tạm khóa chỉnh sửa để bảo toàn mã băm Sổ đỏ. Khi người mua xác nhận đã nhận hàng, điểm UNIP sẽ cộng thẳng vào Ví UniCycle của bạn."
                : "Điểm cọc đang được khóa trên hợp đồng thông minh UniCyclePoint."}
            </p>
            {escrow.lockExplorerUrl && (
              <a
                href={escrow.lockExplorerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#018ABE] hover:underline pt-1"
              >
                <span>Xem lệnh khóa cọc trên Snowtrace Fuji</span>
                <IconExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Nút thao tác cho Người mua đã đặt cọc */}
          {isEscrowBuyer && (
            <div className="space-y-2">
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleSettleEscrow("RELEASE")}
                className="w-full py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-[#02457A] text-white hover:bg-[#001B48] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <IconCheck className="w-4 h-4" />
                <span>
                  {submitting === "RELEASE"
                    ? "Đang giải ngân UNIP & Sang tên Sổ đỏ..."
                    : "Đã nhận đúng đồ - Giải ngân cho người bán"}
                </span>
              </button>

              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleSettleEscrow("REFUND")}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-[#02457A] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting === "REFUND"
                  ? "Đang hoàn trả điểm UNIP..."
                  : "Hủy kèo & Nhận lại 100% điểm UNIP"}
              </button>
            </div>
          )}

          {/* Nút hủy giữ chỗ cho Người bán nếu người mua không đến */}
          {isSeller && (
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleSettleEscrow("REFUND")}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-[#02457A] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting === "REFUND"
                ? "Đang hoàn trả cọc và mở bán lại..."
                : "Hủy giữ chỗ & Hoàn trả điểm cho người mua"}
            </button>
          )}
        </div>
      ) : productStatus === "SOLD" ? (
        /* TRƯỜNG HỢP 2: MÓN ĐỒ ĐÃ BÁN (SOLD) */
        <div className="p-4 rounded-xl bg-[#D6E8EE]/35 border border-[#97CADB] space-y-2 text-xs">
          <div className="font-extrabold text-[#001B48] flex items-center gap-1.5">
            <IconShieldCheck className="w-4 h-4 text-[#018ABE]" />
            <span>Món đồ đã giao dịch hoàn tất</span>
          </div>
          {escrow && escrow.status === "RELEASED" ? (
            <>
              <p className="text-[11px] text-[#02457A] leading-relaxed">
                Đã giải ngân <strong>{escrow.amount.toLocaleString("vi-VN")} UNIP</strong> cho người bán và tự động sang tên chủ sở hữu mới{" "}
                <strong>{escrow.buyer_name}</strong> vào Sổ đỏ sản phẩm.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {escrow.settleExplorerUrl && (
                  <a
                    href={escrow.settleExplorerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#018ABE] hover:underline"
                  >
                    <span>Biên lai Snowtrace</span>
                    <IconExternalLink className="w-3 h-3" />
                  </a>
                )}
                <Link
                  href={`/products/${productId}/passport`}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#02457A] hover:text-[#018ABE]"
                >
                  <span>Xem Sổ đỏ đã sang tên</span>
                  <IconArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-[#02457A]">
              Món đồ này đã được người bán đánh dấu hoàn tất giao dịch.
            </p>
          )}
        </div>
      ) : isSeller ? (
        /* TRƯỜNG HỢP 3: NGƯỜI XEM LÀ CHỦ BÀI ĐĂNG KHI ĐANG BÁN (ACTIVE) */
        <div className="p-3.5 rounded-xl bg-[#D6E8EE]/25 border border-[#D6E8EE] text-xs text-[#02457A] leading-relaxed">
          Bài đăng của bạn đang sẵn sàng nhận đặt cọc <strong>{requiredUnip.toLocaleString("vi-VN")} UNIP</strong>. Khi có người mua đặt cọc giữ chỗ, hệ thống sẽ thông báo tại đây.
        </div>
      ) : !currentUserId ? (
        /* TRƯỜNG HỢP 4: KHÁCH CHƯA ĐĂNG NHẬP */
        <div className="space-y-3">
          <p className="text-xs text-[#02457A] leading-relaxed">
            Đặt cọc giữ chỗ bằng điểm <strong>UniPoint (1 VNĐ = 1 UNIP)</strong> để không bị người khác mua mất. Điểm được giữ trên Smart Contract cho tới khi bạn gặp mặt nhận đúng đồ.
          </p>
          <Link
            href={`/login?redirect=${encodeURIComponent(`/products/${productId}`)}`}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#02457A] text-white hover:bg-[#001B48] flex items-center justify-center gap-2 transition-colors"
          >
            <IconWallet className="w-4 h-4" />
            <span>Đăng nhập để đặt cọc bằng Ví UniCycle</span>
          </Link>
        </div>
      ) : (
        /* TRƯỜNG HỢP 5: SINH VIÊN MUA HÀNG (ĐÃ ĐĂNG NHẬP, MÓN ĐỒ ĐANG ACTIVE) */
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#D6E8EE]/35 border border-[#D6E8EE] text-xs">
            <span className="text-[#02457A] font-medium inline-flex items-center gap-1.5">
              <IconWallet className="w-4 h-4 text-[#018ABE]" />
              <span>Số dư Ví UniCycle của bạn:</span>
            </span>
            <span className="font-extrabold text-[#001B48]" role="status" aria-atomic="true">
              {currentBalance.toLocaleString("vi-VN")} UNIP
            </span>
          </div>

          {hasEnoughUnip ? (
            <button
              type="button"
              disabled={submitting !== null}
              onClick={handleLockEscrow}
              className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm bg-gradient-to-r from-[#02457A] to-[#018ABE] hover:from-[#001B48] hover:to-[#02457A] text-white shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <IconLock className="w-4 h-4" />
              <span>
                {submitting === "LOCK"
                  ? "Đang khóa cọc UNIP trên Avalanche Fuji..."
                  : `Đặt cọc giữ chỗ ngay (${requiredUnip.toLocaleString("vi-VN")} UNIP)`}
              </span>
            </button>
          ) : (
            <div className="space-y-2.5">
              <div className="text-[11px] text-[#02457A] bg-[#D6E8EE]/25 rounded-lg px-3 py-2 border border-[#97CADB]/60">
                Bạn cần thêm{" "}
                <strong className="text-[#001B48]">
                  {(requiredUnip - currentBalance).toLocaleString("vi-VN")} UNIP
                </strong>{" "}
                để đặt cọc giữ chỗ món đồ này.
              </div>
              <Link
                href="/wallet"
                className="w-full py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <IconWallet className="w-4 h-4" />
                <span>Nạp thêm UNIP qua MoMo Test tại Ví UniCycle →</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
