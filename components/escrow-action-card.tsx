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
  IconClock,
  IconAlert,
  IconMapPin,
} from "./icons";

interface EscrowDetail {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  buyer_name?: string;
  buyer_university?: string;
  buyer_campus?: string;
  buyer_phone?: string | null;
  seller_name?: string;
  seller_university?: string;
  seller_campus?: string;
  seller_phone?: string | null;
  amount: number;
  status: "LOCKED" | "CANCEL_REQUESTED" | "RELEASED" | "COMPLETED" | "REFUNDED";
  chain_mode?: "ONCHAIN" | "SIMULATED";
  expires_at?: string | null;
  extended_count?: number;
  meeting_note?: string | null;
  cancel_reason?: string | null;
  cancel_requested_by?: string | null;
  cancel_requested_at?: string | null;
  inspection_checked?: number;
  isExpired?: boolean;
  lockExplorerUrl: string | null;
  settleExplorerUrl: string | null;
}

interface ViewerWallet {
  userId: string;
  address: string;
  pointBalance: number;
  availableBalance?: number;
  lockedBalance?: number;
  totalBalance?: number;
}

interface EscrowActionCardProps {
  productId: string;
  price: number;
  pickupLocation?: string;
  productStatus: "ACTIVE" | "RESERVED" | "SOLD" | "HIDDEN";
  sellerId: string;
  currentUserId: string | null;
  onEscrowUpdated: () => void;
  onNotify: (msg: string, type?: "success" | "error") => void;
}

const CANCEL_REASON_PRESETS = [
  "Sản phẩm thực tế không đúng mô tả / thông số Passport",
  "Không liên lạc được với người bán để hẹn gặp",
  "Hai bên thống nhất hủy hẹn / dời sang dịp khác",
];

function formatRemainingHoldTime(expiresAt?: string | null): {
  text: string;
  isExpired: boolean;
  isUrgent: boolean;
} {
  if (!expiresAt) {
    return { text: "Thời hạn tiêu chuẩn 48 giờ", isExpired: false, isUrgent: false };
  }
  const diffMs = Date.parse(expiresAt) - Date.now();
  if (diffMs <= 0) {
    return { text: "Đã quá hạn giữ chỗ 48h", isExpired: true, isUrgent: true };
  }
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    text: hours > 0 ? `Còn ${hours}h ${minutes}p giữ chỗ` : `Còn ${minutes} phút giữ chỗ`,
    isExpired: false,
    isUrgent: hours < 6,
  };
}

export function EscrowActionCard({
  productId,
  price,
  pickupLocation,
  productStatus,
  sellerId,
  currentUserId,
  onEscrowUpdated,
  onNotify,
}: EscrowActionCardProps) {
  const [escrow, setEscrow] = useState<EscrowDetail | null>(null);
  const [viewerWallet, setViewerWallet] = useState<ViewerWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Ghi chú điểm hẹn khi bắt đầu giữ chỗ hoặc cập nhật trong đơn
  const [meetingNoteInput, setMeetingNoteInput] = useState("");
  const [editingNote, setEditingNote] = useState(false);

  // Panel đang mở của người mua / người bán: "INSPECT_RELEASE" | "REQUEST_CANCEL" | "SELLER_CANCEL" | null
  const [activePanel, setActivePanel] = useState<
    "INSPECT_RELEASE" | "REQUEST_CANCEL" | "SELLER_CANCEL" | null
  >(null);

  // 3 mục checklist kiểm tra hàng thực tế bắt buộc trước khi giải ngân
  const [checkAppearance, setCheckAppearance] = useState(false);
  const [checkPassportSpecs, setCheckPassportSpecs] = useState(false);
  const [checkFinalIrreversible, setCheckFinalIrreversible] = useState(false);

  // Lý do yêu cầu hủy / báo hàng lệch mô tả
  const [cancelReason, setCancelReason] = useState(CANCEL_REASON_PRESETS[0]);

  const requiredUnip = Math.round(Number(price || 0));

  const fetchEscrowState = useCallback(async () => {
    try {
      const res = await fetch(`/api/escrow?productId=${encodeURIComponent(productId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setEscrow(data.escrow || null);
      if (data.escrow?.meeting_note) {
        setMeetingNoteInput(data.escrow.meeting_note);
      }
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
        body: JSON.stringify({
          productId,
          meetingNote: meetingNoteInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể thanh toán giữ chỗ món đồ.");
      }
      onNotify(data.message || "Đã khóa điểm giữ chỗ thành công!");
      window.dispatchEvent(new Event("unicycle:wallet-updated"));
      await fetchEscrowState();
      onEscrowUpdated();
    } catch (err: any) {
      onNotify(err.message, "error");
    } finally {
      setSubmitting(null);
    }
  };

  const handleEscrowAction = async (
    action:
      | "CONFIRM_RECEIPT"
      | "REQUEST_CANCEL"
      | "WITHDRAW_CANCEL"
      | "APPROVE_CANCEL"
      | "SELLER_CANCEL"
      | "EXTEND_HOLD"
      | "CLAIM_EXPIRED_REFUND"
      | "UPDATE_MEETING_NOTE",
    extraPayload: Record<string, any> = {}
  ) => {
    if (!escrow) return;
    setSubmitting(action);
    try {
      const res = await fetch(`/api/escrow/${escrow.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraPayload }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể thực hiện thao tác trên đơn giữ chỗ.");
      }
      setActivePanel(null);
      setEditingNote(false);
      onNotify(data.message || "Đã cập nhật đơn giữ chỗ thành công!");
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
      <div className="rounded-xl border border-[#D6E8EE] bg-[#D6E8EE]/20 p-4 animate-pulse">
        <div className="h-11 bg-[#D6E8EE]/70 rounded-xl w-full" />
      </div>
    );
  }

  const isSeller = currentUserId === sellerId;
  const isEscrowBuyer = Boolean(currentUserId && escrow?.buyer_id === currentUserId);
  const availableBalance =
    viewerWallet?.availableBalance ?? viewerWallet?.pointBalance ?? 0;
  const missingUnip = Math.max(0, requiredUnip - availableBalance);
  const hasEnoughUnip = availableBalance >= requiredUnip;
  const isLiveEscrow = escrow?.chain_mode === "ONCHAIN";
  const isOrderActive =
    productStatus === "RESERVED" ||
    escrow?.status === "LOCKED" ||
    escrow?.status === "CANCEL_REQUESTED";

  // Ẩn khung giao dịch đối với chủ bài đăng khi món đồ đang rao bán bình thường chưa có người đặt
  if (isSeller && productStatus === "ACTIVE" && !isOrderActive) {
    return null;
  }

  const holdTimeInfo = formatRemainingHoldTime(escrow?.expires_at);
  const isExpired = Boolean(escrow?.isExpired || holdTimeInfo.isExpired);
  const canExtend = Number(escrow?.extended_count || 0) < 1;
  const allInspectionChecked =
    checkAppearance && checkPassportSpecs && checkFinalIrreversible;

  return (
    <div
      className="rounded-2xl border border-[#97CADB] bg-[#D6E8EE]/20 p-4 sm:p-5 space-y-4"
      aria-label="Thanh toán và giữ chỗ Escrow"
    >
      {/* =====================================================================
          TRƯỜNG HỢP 1: ĐANG GIỮ CHỖ (LOCKED / CANCEL_REQUESTED)
         ===================================================================== */}
      {isOrderActive && escrow ? (
        <div className="space-y-4" role="status" aria-atomic="true">
          {/* Header trạng thái + Số điểm đang bảo vệ */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#001B48]">
              <span className="w-6 h-6 rounded-lg bg-[#02457A] text-white flex items-center justify-center">
                <IconLock className="w-3.5 h-3.5" />
              </span>
              <span>
                {escrow.status === "CANCEL_REQUESTED"
                  ? "Đang chờ phản hồi yêu cầu hủy"
                  : isEscrowBuyer
                  ? "Đang giữ chỗ cho bạn (Escrow 100%)"
                  : isSeller
                  ? `Khách đặt giữ chỗ: ${escrow.buyer_name || "Sinh viên"}`
                  : `Đang được giữ chỗ bởi ${escrow.buyer_name || "Sinh viên"}`}
              </span>
            </div>

            <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#001B48] text-white">
              {escrow.amount.toLocaleString("vi-VN")} UNIP
            </span>
          </div>

          {/* Thanh tiến trình 3 bước trực quan */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5" aria-label="Tiến độ giao dịch">
            <div className="rounded-lg bg-[#02457A] text-white px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1.5">
              <IconCheck className="w-3.5 h-3.5 shrink-0 text-[#97CADB]" />
              <span className="truncate">1. Đã khóa điểm</span>
            </div>
            <div
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1.5 border ${
                escrow.status === "CANCEL_REQUESTED"
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-white border-[#018ABE] text-[#001B48]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#018ABE] shrink-0" />
              <span className="truncate">
                {escrow.status === "CANCEL_REQUESTED" ? "2. Chờ duyệt hủy" : "2. Gặp & Kiểm tra"}
              </span>
            </div>
            <div className="rounded-lg bg-white/70 border border-[#D6E8EE] text-[#02457A]/70 px-2.5 py-1.5 text-[11px] font-semibold flex items-center gap-1.5">
              <span className="truncate">3. Giải ngân</span>
            </div>
          </div>

          {/* Đồng hồ đếm ngược 48h & nút Gia hạn +24h */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-[#D6E8EE] text-xs">
            <div
              className={`inline-flex items-center gap-1.5 font-bold ${
                isExpired || holdTimeInfo.isUrgent ? "text-amber-700" : "text-[#02457A]"
              }`}
            >
              <IconClock className="w-3.5 h-3.5 text-[#018ABE]" />
              <span>{holdTimeInfo.text}</span>
              {Number(escrow.extended_count || 0) > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#D6E8EE] text-[#001B48]">
                  Đã +24h
                </span>
              )}
            </div>

            {(isEscrowBuyer || isSeller) && canExtend && !isExpired && (
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleEscrowAction("EXTEND_HOLD")}
                className="text-[11px] font-extrabold text-[#018ABE] hover:text-[#02457A] underline cursor-pointer disabled:opacity-50"
              >
                {submitting === "EXTEND_HOLD" ? "Đang gia hạn..." : "+ Gia hạn thêm 24h"}
              </button>
            )}
          </div>

          {/* Ghi chú điểm hẹn KTX / Cơ sở trường dành cho Người mua & Người bán */}
          {(isEscrowBuyer || isSeller) && (
            <div className="p-3 rounded-xl bg-white border border-[#D6E8EE] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold text-[#001B48] inline-flex items-center gap-1">
                  <IconMapPin className="w-3.5 h-3.5 text-[#018ABE]" />
                  <span>Điểm hẹn & Ghi chú giao nhận:</span>
                </span>
                {!editingNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingNoteInput(escrow.meeting_note || "");
                      setEditingNote(true);
                    }}
                    className="text-[11px] font-bold text-[#018ABE] hover:underline cursor-pointer"
                  >
                    {escrow.meeting_note ? "Sửa lịch hẹn" : "+ Thêm lịch hẹn"}
                  </button>
                )}
              </div>

              {editingNote ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={meetingNoteInput}
                    onChange={(e) => setMeetingNoteInput(e.target.value)}
                    placeholder={`VD: Hẹn 18h30 tại ${pickupLocation || "sảnh KTX"}`}
                    maxLength={250}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#97CADB] bg-white text-[#001B48] focus:outline-none focus:border-[#018ABE]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() =>
                        handleEscrowAction("UPDATE_MEETING_NOTE", {
                          meetingNote: meetingNoteInput,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#02457A] text-white hover:bg-[#001B48] cursor-pointer"
                    >
                      Lưu ghi chú
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNote(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#02457A] hover:bg-[#D6E8EE]/50 cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#02457A] leading-relaxed">
                  {escrow.meeting_note ? (
                    <span className="font-semibold text-[#001B48]">{escrow.meeting_note}</span>
                  ) : (
                    <span>
                      Nơi nhận: <strong>{pickupLocation || "Trong khuôn viên trường/KTX"}</strong>. Hai bạn hãy liên hệ SĐT bên dưới để chốt giờ gặp.
                    </span>
                  )}
                </p>
              )}

              {/* Hiển thị SĐT người mua cho người bán để chủ động liên hệ */}
              {isSeller && escrow.buyer_phone && (
                <div className="pt-1.5 border-t border-[#D6E8EE] flex items-center justify-between text-xs">
                  <span className="text-[#02457A]">SĐT người mua ({escrow.buyer_name}):</span>
                  <a
                    href={`tel:${escrow.buyer_phone}`}
                    className="font-extrabold text-[#018ABE] hover:underline"
                  >
                    {escrow.buyer_phone}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Thông báo khi đang có YÊU CẦU HỦY (CANCEL_REQUESTED) */}
          {escrow.status === "CANCEL_REQUESTED" && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5">
              <div className="flex items-start gap-2">
                <IconAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-extrabold text-amber-950">
                    Người mua đã gửi yêu cầu hủy / báo cáo vấn đề
                  </div>
                  <p className="text-xs text-amber-900">
                    Lý do: <strong>{escrow.cancel_reason || "Thay đổi lịch hẹn / Hàng không đúng mô tả"}</strong>
                  </p>
                </div>
              </div>

              {isSeller && (
                <div className="pt-1 space-y-2">
                  <p className="text-[11px] text-amber-900">
                    Nếu hai bên không thể giao dịch, hãy bấm đồng ý bên dưới để hoàn trả 100% điểm cho người mua và mở bán lại món đồ ngay:
                  </p>
                  <button
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => handleEscrowAction("APPROVE_CANCEL")}
                    className="w-full py-2.5 px-3 rounded-xl font-extrabold text-xs bg-[#02457A] text-white hover:bg-[#001B48] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting === "APPROVE_CANCEL"
                      ? "Đang hoàn tiền..."
                      : `Đồng ý hủy & Hoàn ${escrow.amount.toLocaleString("vi-VN")} UNIP cho người mua`}
                  </button>
                </div>
              )}

              {isEscrowBuyer && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => handleEscrowAction("WITHDRAW_CANCEL")}
                    className="py-2 px-3 rounded-lg text-xs font-bold bg-white text-[#001B48] border border-amber-400 hover:bg-amber-100/50 transition-colors cursor-pointer"
                  >
                    {submitting === "WITHDRAW_CANCEL"
                      ? "Đang xử lý..."
                      : "Rút lại yêu cầu hủy (Tiếp tục mua)"}
                  </button>
                  <span className="text-[11px] text-amber-900">
                    Hoặc chờ người bán xác nhận hoàn tiền.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Nút thu hồi tự động nếu đơn đã quá hạn 48h */}
          {isExpired && (isEscrowBuyer || isSeller) && (
            <div className="p-3.5 rounded-xl bg-white border-2 border-[#018ABE] space-y-2">
              <p className="text-xs font-bold text-[#001B48]">
                Đơn giữ chỗ đã quá thời hạn 48 giờ mà chưa hoàn tất giao nhận.
              </p>
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleEscrowAction("CLAIM_EXPIRED_REFUND")}
                className="w-full py-2.5 px-3 rounded-xl font-extrabold text-xs bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors cursor-pointer"
              >
                {submitting === "CLAIM_EXPIRED_REFUND"
                  ? "Đang thu hồi & hoàn điểm..."
                  : `Thu hồi đơn quá hạn & Hoàn 100% (${escrow.amount.toLocaleString("vi-VN")} UNIP)`}
              </button>
            </div>
          )}

          {/* Hành động chính cho NGƯỜI MUA */}
          {isEscrowBuyer && !activePanel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => {
                  setCheckAppearance(false);
                  setCheckPassportSpecs(false);
                  setCheckFinalIrreversible(false);
                  setActivePanel("INSPECT_RELEASE");
                }}
                className="py-2.5 px-3 rounded-xl font-extrabold text-xs bg-[#02457A] text-white hover:bg-[#001B48] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <IconCheck className="w-3.5 h-3.5" />
                <span>Kiểm tra & Nhận hàng</span>
              </button>

              {escrow.status === "LOCKED" && (
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => setActivePanel("REQUEST_CANCEL")}
                  className="py-2.5 px-3 rounded-xl font-bold text-xs bg-white text-[#02457A] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors cursor-pointer"
                >
                  Yêu cầu hủy / Báo lỗi hàng
                </button>
              )}
            </div>
          )}

          {/* Hành động chủ động hủy cho NGƯỜI BÁN (khi đơn đang LOCKED) */}
          {isSeller && escrow.status === "LOCKED" && !activePanel && (
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => setActivePanel("SELLER_CANCEL")}
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-white text-[#02457A] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors cursor-pointer"
            >
              Chủ động hủy đơn & Hoàn 100% điểm cho người mua
            </button>
          )}

          {/* PANEL 1: CHECKLIST 3 MỤC KIỂM TRA HÀNG TRƯỚC KHI GIẢI NGÂN */}
          {activePanel === "INSPECT_RELEASE" && isEscrowBuyer && (
            <div className="p-4 rounded-xl bg-white border-2 border-[#02457A] space-y-3">
              <div className="text-xs font-extrabold text-[#001B48]">
                Checklist kiểm tra thực tế trước khi giải ngân ({escrow.amount.toLocaleString("vi-VN")} UNIP)
              </div>
              <p className="text-[11px] text-[#02457A]">
                Hãy tích xác nhận đủ 3 mục bên dưới khi bạn đang cầm món đồ trên tay:
              </p>

              <div className="space-y-2 text-xs text-[#001B48]">
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#D6E8EE]/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkAppearance}
                    onChange={(e) => setCheckAppearance(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#02457A] rounded cursor-pointer"
                  />
                  <span>
                    Đã kiểm tra trực tiếp <strong>ngoại hình & tình trạng hoạt động</strong> đúng như bài đăng.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#D6E8EE]/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkPassportSpecs}
                    onChange={(e) => setCheckPassportSpecs(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#02457A] rounded cursor-pointer"
                  />
                  <span>
                    Đã đối chiếu <strong>thông số kỹ thuật & phụ kiện đi kèm</strong> khớp với{" "}
                    <Link
                      href={`/products/${productId}/passport`}
                      target="_blank"
                      className="text-[#018ABE] font-bold underline"
                    >
                      UniCycle Passport
                    </Link>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#D6E8EE]/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkFinalIrreversible}
                    onChange={(e) => setCheckFinalIrreversible(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#02457A] rounded cursor-pointer"
                  />
                  <span>
                    Tôi hiểu sau khi xác nhận, điểm sẽ <strong>chuyển ngay cho người bán</strong> và không thể hoàn tác.
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={!allInspectionChecked || submitting !== null}
                  onClick={() =>
                    handleEscrowAction("CONFIRM_RECEIPT", {
                      inspectionConfirmed: true,
                    })
                  }
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold bg-[#02457A] text-white hover:bg-[#001B48] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {submitting === "CONFIRM_RECEIPT"
                    ? "Đang giải ngân..."
                    : `Xác nhận nhận hàng & Giải ngân`}
                </button>
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => setActivePanel(null)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-white text-[#02457A] border border-[#97CADB] cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          {/* PANEL 2: NGƯỜI MUA GỬI YÊU CẦU HỦY / BÁO HÀNG LỆCH MÔ TẢ */}
          {activePanel === "REQUEST_CANCEL" && isEscrowBuyer && (
            <div className="p-4 rounded-xl bg-white border-2 border-[#018ABE] space-y-3">
              <div className="text-xs font-extrabold text-[#001B48]">
                Gửi yêu cầu hủy giữ chỗ / Báo hàng không đúng mô tả
              </div>
              <p className="text-[11px] text-[#02457A]">
                Chọn lý do cụ thể để thông báo cho người bán xác nhận hoàn 100% điểm về ví của bạn:
              </p>

              <div className="space-y-1.5">
                {CANCEL_REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelReason(preset)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors cursor-pointer ${
                      cancelReason === preset
                        ? "bg-[#D6E8EE]/60 border-[#02457A] font-bold text-[#001B48]"
                        : "bg-white border-[#D6E8EE] text-[#02457A] hover:bg-[#D6E8EE]/20"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập chi tiết lý do hủy..."
                maxLength={250}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#97CADB] text-[#001B48] focus:outline-none focus:border-[#02457A]"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!cancelReason.trim() || submitting !== null}
                  onClick={() =>
                    handleEscrowAction("REQUEST_CANCEL", {
                      reason: cancelReason.trim(),
                    })
                  }
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold bg-[#02457A] text-white hover:bg-[#001B48] disabled:opacity-50 cursor-pointer"
                >
                  {submitting === "REQUEST_CANCEL"
                    ? "Đang gửi yêu cầu..."
                    : "Gửi yêu cầu hủy & hoàn tiền"}
                </button>
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => setActivePanel(null)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-white text-[#02457A] border border-[#97CADB] cursor-pointer"
                >
                  Quay lại
                </button>
              </div>
            </div>
          )}

          {/* PANEL 3: NGƯỜI BÁN CHỦ ĐỘNG HỦY ĐƠN & HOÀN TIỀN */}
          {activePanel === "SELLER_CANCEL" && isSeller && (
            <div className="p-4 rounded-xl bg-white border-2 border-[#018ABE] space-y-3">
              <div className="text-xs font-extrabold text-[#001B48]">
                Xác nhận hủy đơn giữ chỗ & hoàn trả 100% ({escrow.amount.toLocaleString("vi-VN")} UNIP) cho người mua?
              </div>
              <p className="text-[11px] text-[#02457A]">
                Điểm giữ chỗ sẽ được hoàn ngay về ví của {escrow.buyer_name || "người mua"} và bài đăng chuyển lại trạng thái Đang bán.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() =>
                    handleEscrowAction("SELLER_CANCEL", {
                      reason: "Người bán chủ động hủy hẹn và hoàn tiền 100%",
                    })
                  }
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold bg-[#02457A] text-white hover:bg-[#001B48] disabled:opacity-50 cursor-pointer"
                >
                  {submitting === "SELLER_CANCEL"
                    ? "Đang hoàn tiền..."
                    : "Xác nhận hủy & Hoàn điểm ngay"}
                </button>
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => setActivePanel(null)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-white text-[#02457A] border border-[#97CADB] cursor-pointer"
                >
                  Quay lại
                </button>
              </div>
            </div>
          )}
        </div>
      ) : productStatus === "SOLD" ? (
        /* =====================================================================
           TRƯỜNG HỢP 2: ĐÃ BÁN (SOLD)
           ===================================================================== */
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#001B48] inline-flex items-center gap-1.5">
            <IconShieldCheck className="w-4 h-4 text-[#018ABE]" />
            <span>Đã chuyển quyền sở hữu cho {escrow?.buyer_name || "chủ mới"}</span>
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
              <span>Xem Passport</span>
              <IconArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : !currentUserId ? (
        /* =====================================================================
           TRƯỜNG HỢP 3: CHƯA ĐĂNG NHẬP
           ===================================================================== */
        <div className="space-y-2.5">
          <Link
            href={`/login?redirect=${encodeURIComponent(`/products/${productId}`)}`}
            className="w-full py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-[#02457A] text-white hover:bg-[#001B48] flex items-center justify-center gap-2 transition-colors shadow-2xs"
          >
            <IconLock className="w-4 h-4" />
            <span>Thanh toán & Giữ chỗ ({requiredUnip.toLocaleString("vi-VN")} UNIP)</span>
          </Link>
          <p className="text-[11px] text-[#02457A] text-center">
            Khóa 100% giá trị trong Escrow 48h • Kiểm tra đúng hàng mới giải ngân
          </p>
        </div>
      ) : (
        /* =====================================================================
           TRƯỜNG HỢP 4: NGƯỜI MUA ĐÃ ĐĂNG NHẬP & SẢN PHẨM ĐANG ACTIVE
           ===================================================================== */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-xl border border-[#D6E8EE]">
            <span className="text-[#02457A] font-semibold inline-flex items-center gap-1.5">
              <IconWallet className="w-3.5 h-3.5 text-[#018ABE]" />
              <span>Số dư khả dụng:</span>
            </span>
            <span className="font-extrabold text-[#001B48]" role="status" aria-atomic="true">
              {availableBalance.toLocaleString("vi-VN")} UNIP
            </span>
          </div>

          {hasEnoughUnip && (
            <div>
              <input
                type="text"
                value={meetingNoteInput}
                onChange={(e) => setMeetingNoteInput(e.target.value)}
                placeholder={`Ghi chú lịch hẹn (Tùy chọn — VD: 18h tại ${
                  pickupLocation || "sảnh KTX"
                })`}
                maxLength={200}
                className="w-full px-3 py-2 rounded-xl border border-[#97CADB] bg-white text-xs text-[#001B48] placeholder:text-[#02457A]/60 focus:outline-none focus:border-[#02457A]"
              />
            </div>
          )}

          {hasEnoughUnip ? (
            <button
              type="button"
              disabled={submitting !== null}
              onClick={handleLockEscrow}
              className="w-full py-3 px-4 rounded-xl font-extrabold text-sm bg-[#02457A] hover:bg-[#001B48] text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <IconLock className="w-4 h-4" />
              <span>
                {submitting === "LOCK"
                  ? "Đang khóa điểm giữ chỗ..."
                  : `Thanh toán & Giữ chỗ (${requiredUnip.toLocaleString("vi-VN")} UNIP)`}
              </span>
            </button>
          ) : (
            <Link
              href={`/wallet?amount=${Math.ceil(Math.max(10000, missingUnip) / 1000) * 1000}&returnUrl=${encodeURIComponent(
                `/products/${productId}`
              )}`}
              className="w-full py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors flex items-center justify-center gap-2 shadow-2xs"
            >
              <IconWallet className="w-4 h-4" />
              <span>Nạp thêm {missingUnip.toLocaleString("vi-VN")} UNIP để giữ chỗ →</span>
            </Link>
          )}

          <p className="text-[11px] text-[#02457A] text-center leading-relaxed">
            Giữ chỗ trong <strong>48h</strong> • Kiểm tra hàng thực tế xong mới giải ngân • Hoàn 100% nếu hủy hợp lệ
          </p>
        </div>
      )}
    </div>
  );
}
