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
  status: "LOCKED" | "RELEASED" | "REFUNDED";
  chain_mode?: "ONCHAIN" | "SIMULATED";
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
  const [confirmAction, setConfirmAction] = useState<"RELEASE" | "REFUND" | null>(null);

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
      onNotify(data.message || "Đã đặt cọc giữ chỗ thành công!");
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
      setConfirmAction(null);
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
      <div className="rounded-2xl border border-[#D6E8EE] bg-white p-4 animate-pulse">
        <div className="h-10 bg-[#D6E8EE]/60 rounded-xl w-full" />
      </div>
    );
  }

  const isSeller = currentUserId === sellerId;
  const isEscrowBuyer = Boolean(currentUserId && escrow?.buyer_id === currentUserId);
  const currentBalance = viewerWallet?.pointBalance ?? 0;
  const missingUnip = Math.max(0, requiredUnip - currentBalance);
  const hasEnoughUnip = currentBalance >= requiredUnip;
  const isLiveEscrow = escrow?.chain_mode === "ONCHAIN";

  // Ẩn khung này đối với chủ bài đăng khi món đồ đang bán bình thường (tránh dư thừa hộp thông báo)
  if (isSeller && productStatus === "ACTIVE" && !escrow) {
    return null;
  }

  return (
    <section
      className="bg-white rounded-2xl border border-[#97CADB] p-5 shadow-2xs space-y-3.5"
      aria-label="Đặt cọc giữ chỗ"
    >
      {/* TRƯỜNG HỢP 1: ĐANG GIỮ CHỖ (RESERVED / LOCKED) */}
      {(productStatus === "RESERVED" || escrow?.status === "LOCKED") && escrow ? (
        <div className="space-y-3.5" role="status" aria-atomic="true">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#02457A]">
              <IconLock className="w-4 h-4 text-[#018ABE]" />
              {isEscrowBuyer
                ? "Đã giữ chỗ cho bạn"
                : `Đang giữ chỗ (${escrow.buyer_name || "Sinh viên"})`}
            </span>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#D6E8EE] text-[#001B48]">
              {escrow.amount.toLocaleString("vi-VN")} UNIP
            </span>
          </div>

          {isEscrowBuyer && !confirmAction && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => setConfirmAction("RELEASE")}
                className="py-2.5 px-3 rounded-xl font-extrabold text-xs bg-[#02457A] text-white hover:bg-[#001B48] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <IconCheck className="w-3.5 h-3.5" />
                <span>Đã nhận đúng đồ</span>
              </button>

              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => setConfirmAction("REFUND")}
                className="py-2.5 px-3 rounded-xl font-bold text-xs bg-white text-[#02457A] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors cursor-pointer"
              >
                Hủy & Hoàn điểm
              </button>
            </div>
          )}

          {isSeller && !confirmAction && (
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => setConfirmAction("REFUND")}
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-white text-[#02457A] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors cursor-pointer"
            >
              Hủy giữ chỗ & Hoàn điểm cho người mua
            </button>
          )}

          {/* Bước xác nhận tránh bấm nhầm */}
          {confirmAction && (
            <div className="p-3.5 rounded-xl bg-[#D6E8EE]/40 border border-[#018ABE] space-y-2.5">
              <div className="text-xs font-bold text-[#001B48]">
                {confirmAction === "RELEASE"
                  ? `Xác nhận chuyển ${escrow.amount.toLocaleString("vi-VN")} UNIP cho người bán?`
                  : `Xác nhận hủy giữ chỗ và hoàn ${escrow.amount.toLocaleString("vi-VN")} UNIP?`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => handleSettleEscrow(confirmAction)}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-extrabold bg-[#02457A] text-white hover:bg-[#001B48] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Đang xử lý..." : "Đồng ý"}
                </button>
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => setConfirmAction(null)}
                  className="py-2 px-3 rounded-lg text-xs font-bold bg-white text-[#02457A] border border-[#97CADB] cursor-pointer"
                >
                  Quay lại
                </button>
              </div>
            </div>
          )}
        </div>
      ) : productStatus === "SOLD" ? (
        /* TRƯỜNG HỢP 2: ĐÃ BÁN (SOLD) */
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#001B48] inline-flex items-center gap-1.5">
            <IconShieldCheck className="w-4 h-4 text-[#018ABE]" />
            <span>Đã sang tên cho {escrow?.buyer_name || "chủ mới"}</span>
          </span>
          <div className="flex items-center gap-3">
            {isLiveEscrow && escrow?.settleExplorerUrl && (
              <a
                href={escrow.settleExplorerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="font-bold text-[#018ABE] hover:underline inline-flex items-center gap-1"
              >
                <span>Chứng từ</span>
                <IconExternalLink className="w-3 h-3" />
              </a>
            )}
            <Link
              href={`/products/${productId}/passport`}
              className="font-extrabold text-[#02457A] hover:text-[#018ABE] inline-flex items-center gap-1"
            >
              <span>Sổ đỏ</span>
              <IconArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : !currentUserId ? (
        /* TRƯỜNG HỢP 3: CHƯA ĐĂNG NHẬP */
        <Link
          href={`/login?redirect=${encodeURIComponent(`/products/${productId}`)}`}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#02457A] text-white hover:bg-[#001B48] flex items-center justify-center gap-2 transition-colors"
        >
          <IconLock className="w-4 h-4" />
          <span>Đặt cọc giữ chỗ ({requiredUnip.toLocaleString("vi-VN")} UNIP)</span>
        </Link>
      ) : (
        /* TRƯỜNG HỢP 4: NGƯỜI MUA ĐÃ ĐĂNG NHẬP */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#02457A] font-medium inline-flex items-center gap-1.5">
              <IconWallet className="w-3.5 h-3.5 text-[#018ABE]" />
              <span>Số dư ví:</span>
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
              className="w-full py-3 px-4 rounded-xl font-extrabold text-sm bg-[#02457A] hover:bg-[#001B48] text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <IconLock className="w-4 h-4" />
              <span>
                {submitting === "LOCK"
                  ? "Đang giữ chỗ..."
                  : `Đặt cọc giữ chỗ (${requiredUnip.toLocaleString("vi-VN")} UNIP)`}
              </span>
            </button>
          ) : (
            <Link
              href={`/wallet?amount=${Math.max(10000, missingUnip)}&returnUrl=${encodeURIComponent(
                `/products/${productId}`
              )}`}
              className="w-full py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors flex items-center justify-center gap-2"
            >
              <IconWallet className="w-4 h-4" />
              <span>Nạp thêm {missingUnip.toLocaleString("vi-VN")} UNIP để giữ chỗ →</span>
            </Link>
          )}

          <p className="text-[11px] text-[#02457A] text-center">
            Nhận đúng đồ mới trừ điểm • Hoàn 100% nếu hủy hẹn
          </p>
        </div>
      )}
    </section>
  );
}
