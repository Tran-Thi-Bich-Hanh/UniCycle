"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { EditableListingFields } from "@/lib/my-items/types";

export interface EditListingPayload {
  title: string;
  price: number;
  isFree: boolean;
  condition: string;
  description: string;
  zaloPhone: string;
  hidePhone: boolean;
}

export interface ConfirmableListingSummary {
  id: string;
  title: string;
}

export type ConfirmActionTarget = {
  mode: "delete" | "mark_sold";
  listing: ConfirmableListingSummary;
  hasOwnedItem?: boolean;
} | null;

export interface ZaloInviteData {
  listingTitle: string;
  inviteUrl: string;
  fullInviteUrl: string;
  qrUrl: string;
}

const STANDARD_CONDITIONS = ["Mới 99%", "Mới 98%", "Còn rất tốt", "Đã sử dụng"];

function useAccessibleModal(
  isOpen: boolean,
  onClose: () => void,
  initialFocusRef: React.RefObject<HTMLElement | null>,
  disabled = false
) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const openerElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const frameId = requestAnimationFrame(() => {
      initialFocusRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      openerElement?.focus();
    };
  }, [isOpen, initialFocusRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, disabled]);
}

interface EditListingModalProps {
  listing: EditableListingFields | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: EditListingPayload) => void;
}

function EditListingForm({
  listing,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  listing: EditableListingFields;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: EditListingPayload) => void;
}) {
  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState(String(listing.price));
  const [isFree, setIsFree] = useState(listing.isFree);
  const [condition, setCondition] = useState(listing.condition);
  const [description, setDescription] = useState(listing.description);
  const [zaloPhone, setZaloPhone] = useState(listing.zaloPhone);
  const [hidePhone, setHidePhone] = useState(listing.hidePhone);
  const [localError, setLocalError] = useState<string | null>(null);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  useAccessibleModal(true, onClose, closeBtnRef, saving);

  const conditionOptions = STANDARD_CONDITIONS.includes(listing.condition)
    ? STANDARD_CONDITIONS
    : [listing.condition, ...STANDARD_CONDITIONS];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedTitle = title.trim();
    const trimmedPhone = zaloPhone.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setLocalError("Vui lòng nhập tiêu đề món đồ.");
      return;
    }
    if (!trimmedPhone) {
      setLocalError("Vui lòng nhập số điện thoại Zalo liên hệ.");
      return;
    }
    if (!trimmedDescription) {
      setLocalError("Vui lòng nhập mô tả chi tiết cho món đồ.");
      return;
    }

    const numericPrice = isFree ? 0 : Math.max(0, parseInt(price, 10) || 0);

    onSubmit({
      title: trimmedTitle,
      price: numericPrice,
      isFree,
      condition,
      description: trimmedDescription,
      zaloPhone: trimmedPhone,
      hidePhone,
    });
  };

  const displayError = localError || error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-listing-title-heading"
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#D6E8EE] max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <h3 id="edit-listing-title-heading" className="text-base sm:text-lg font-extrabold text-[#001B48]">
            Chỉnh sửa thông tin tin đăng
          </h3>
          <button
            ref={closeBtnRef}
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Đóng hộp thoại chỉnh sửa"
            className="w-10 h-10 -mr-1.5 rounded-xl text-slate-500 hover:text-[#001B48] hover:bg-slate-100 inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {displayError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm font-semibold text-rose-800 flex items-start gap-2"
          >
            <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-listing-title" className="block text-xs font-bold text-[#001B48] mb-1.5">
              Tiêu đề món đồ
            </label>
            <input
              id="edit-listing-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              required
              className="w-full h-10 px-3.5 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-listing-condition" className="block text-xs font-bold text-[#001B48] mb-1.5">
                Tình trạng
              </label>
              <select
                id="edit-listing-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D6E8EE] bg-white text-xs sm:text-sm font-medium text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20"
              >
                {conditionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-listing-price" className="block text-xs font-bold text-[#001B48] mb-1.5">
                Giá bán (VNĐ)
              </label>
              <input
                id="edit-listing-price"
                type="number"
                disabled={isFree}
                value={isFree ? "0" : price}
                onChange={(e) => setPrice(e.target.value)}
                min={0}
                step={5000}
                className="w-full h-10 px-3.5 rounded-xl border border-[#D6E8EE] text-sm font-bold text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-listing-free"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#018ABE] focus:ring-[#018ABE] cursor-pointer"
            />
            <label htmlFor="edit-listing-free" className="text-xs font-semibold text-[#02457A] cursor-pointer">
              Tặng miễn phí 0đ cho sinh viên
            </label>
          </div>

          <div>
            <label htmlFor="edit-listing-zalo" className="block text-xs font-bold text-[#001B48] mb-1.5">
              Số điện thoại Zalo
            </label>
            <input
              id="edit-listing-zalo"
              type="tel"
              value={zaloPhone}
              onChange={(e) => setZaloPhone(e.target.value)}
              required
              className="w-full h-10 px-3.5 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20"
            />
          </div>

          <div className="flex items-start gap-2.5 bg-[#F4F9FB] p-3 rounded-xl border border-[#D6E8EE]">
            <input
              type="checkbox"
              id="edit-listing-hide-phone"
              checked={hidePhone}
              onChange={(e) => setHidePhone(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#018ABE] focus:ring-[#018ABE] cursor-pointer shrink-0"
            />
            <label htmlFor="edit-listing-hide-phone" className="text-xs text-[#001B48] font-medium cursor-pointer flex items-start gap-1.5 leading-snug">
              <svg className="w-4 h-4 text-[#018ABE] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>Ẩn số điện thoại công khai, người mua liên hệ qua nút Zalo bảo mật</span>
            </label>
          </div>

          <div>
            <label htmlFor="edit-listing-desc" className="block text-xs font-bold text-[#001B48] mb-1.5">
              Mô tả chi tiết
            </label>
            <textarea
              id="edit-listing-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="w-full p-3 rounded-xl border border-[#D6E8EE] text-xs sm:text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 resize-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditListingModal({
  listing,
  saving,
  error,
  onClose,
  onSubmit,
}: EditListingModalProps) {
  if (!listing) return null;

  return (
    <EditListingForm
      key={listing.id}
      listing={listing}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface ConfirmListingActionModalProps {
  target: ConfirmActionTarget;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmListingActionModal({
  target,
  submitting,
  onClose,
  onConfirm,
}: ConfirmListingActionModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  useAccessibleModal(Boolean(target), onClose, cancelBtnRef, submitting);

  if (!target) return null;

  const isDelete = target.mode === "delete";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        aria-describedby="confirm-action-desc"
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#D6E8EE] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isDelete ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isDelete ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <h3 id="confirm-action-title" className="text-base font-extrabold text-[#001B48]">
              {isDelete ? "Xóa tin đăng này?" : "Đánh dấu đã bán?"}
            </h3>
            <p id="confirm-action-desc" className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isDelete ? (
                target.hasOwnedItem ? (
                  <>
                    Tin đăng{" "}
                    <span className="font-semibold text-[#001B48]">
                      &ldquo;{target.listing.title}&rdquo;
                    </span>{" "}
                    sẽ bị xóa khỏi sàn giao dịch. Bản ghi sở hữu và hành trình đồ vật của bạn vẫn
                    được giữ lại ở trạng thái <strong>Đang sử dụng</strong>.
                  </>
                ) : (
                  <>
                    Tin đăng{" "}
                    <span className="font-semibold text-[#001B48]">
                      &ldquo;{target.listing.title}&rdquo;
                    </span>{" "}
                    sẽ bị xóa vĩnh viễn và không thể khôi phục.
                  </>
                )
              ) : (
                <>
                  Tin đăng{" "}
                  <span className="font-semibold text-[#001B48]">
                    &ldquo;{target.listing.title}&rdquo;
                  </span>{" "}
                  sẽ chuyển sang trạng thái Đã bán và ngừng hiển thị mở bán trên sàn.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isDelete
                ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600"
                : "bg-[#018ABE] hover:bg-[#02457A] focus-visible:ring-[#018ABE]"
            }`}
          >
            {submitting
              ? "Đang xử lý..."
              : isDelete
                ? target.hasOwnedItem
                  ? "Xóa tin đăng"
                  : "Xóa vĩnh viễn"
                : "Xác nhận đã bán"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ZaloInviteModalProps {
  invite: ZaloInviteData | null;
  onClose: () => void;
  onCopyError: (message: string) => void;
}

function ZaloInviteContent({
  invite,
  onClose,
  onCopyError,
}: {
  invite: ZaloInviteData;
  onClose: () => void;
  onCopyError: (message: string) => void;
}) {
  const [qrLoadState, setQrLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [qrRetryKey, setQrRetryKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useAccessibleModal(true, onClose, closeBtnRef);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invite.fullInviteUrl);
      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 2000);
    } catch {
      onCopyError("Không thể sao chép liên kết. Vui lòng thử lại.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="zalo-invite-title"
        aria-describedby="zalo-invite-desc"
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#D6E8EE] max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#0068FF]/10 text-[#0068FF] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.861-.861 5.972 5.972 0 011.057-3.035C4.604 15.69 4 13.93 4 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h3 id="zalo-invite-title" className="text-base font-extrabold text-[#001B48] truncate">
                Link chốt bán cho khách Zalo
              </h3>
              <p className="text-xs text-slate-500">Có hiệu lực trong 24 giờ</p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại link chốt bán Zalo"
            className="w-10 h-10 -mr-1.5 rounded-xl text-slate-500 hover:text-[#001B48] hover:bg-slate-100 inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p id="zalo-invite-desc" className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Gửi liên kết hoặc mã QR dưới đây cho người mua <span className="font-semibold text-[#001B48]">{invite.listingTitle}</span> qua Zalo để xác nhận đặt mua nhanh.
        </p>

        <div className="relative w-44 h-44 sm:w-48 sm:h-48 mx-auto rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE] p-3 flex items-center justify-center overflow-hidden">
          {qrLoadState === "loading" && (
            <div
              className="absolute inset-3 rounded-xl bg-slate-200/70 animate-pulse motion-reduce:animate-none flex items-center justify-center"
              aria-hidden="true"
            >
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                />
              </svg>
            </div>
          )}

          {qrLoadState === "error" ? (
            <div className="text-center space-y-2 px-2">
              <p className="text-xs text-slate-600">Không tải được mã QR.</p>
              <button
                type="button"
                onClick={() => {
                  setQrLoadState("loading");
                  setQrRetryKey((k) => k + 1);
                }}
                className="px-3 py-1 rounded-lg bg-[#E3F1F9] hover:bg-[#BAE6FD]/70 text-[#02457A] text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
              >
                Thử tải lại
              </button>
            </div>
          ) : (
            <Image
              key={`${invite.fullInviteUrl}-${qrRetryKey}`}
              src={
                qrRetryKey > 0
                  ? `${invite.qrUrl}${invite.qrUrl.includes("?") ? "&" : "?"}retry=${qrRetryKey}`
                  : invite.qrUrl
              }
              alt={`Mã QR chốt bán ${invite.listingTitle}`}
              fill
              sizes="192px"
              className={`object-contain p-3 transition-opacity duration-200 motion-reduce:transition-none ${
                qrLoadState === "loaded" ? "opacity-100" : "opacity-0"
              }`}
              unoptimized
              onLoad={() => setQrLoadState("loaded")}
              onError={() => setQrLoadState("error")}
            />
          )}
        </div>

        <div className="flex items-center gap-2 p-2 bg-[#F8FAFC] rounded-xl border border-[#D6E8EE]">
          <label htmlFor="zalo-invite-url-input" className="sr-only">
            Liên kết chốt bán Zalo
          </label>
          <input
            id="zalo-invite-url-input"
            type="text"
            readOnly
            value={invite.fullInviteUrl}
            className="text-xs bg-transparent text-[#001B48] flex-1 min-w-0 px-1.5 outline-none font-mono truncate"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className={`h-8 px-3 rounded-lg text-xs font-bold shrink-0 inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-[#0068FF] hover:bg-[#0052CC] text-white"
            }`}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Đã sao chép</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                <span>Sao chép link</span>
              </>
            )}
          </button>
        </div>

        <div className="p-3 bg-[#F4F9FB] rounded-xl border border-[#D6E8EE] text-xs text-[#02457A] leading-relaxed flex items-start gap-2">
          <svg className="w-4 h-4 text-[#018ABE] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>
            Khi người mua xác nhận qua liên kết, tin đăng sẽ tự động chuyển sang trạng thái <strong>Đang giữ chỗ</strong> để tránh đặt trùng và nối tiếp hành trình đồ vật.
          </span>
        </div>
      </div>
    </div>
  );
}

export function ZaloInviteModal({ invite, onClose, onCopyError }: ZaloInviteModalProps) {
  if (!invite) return null;

  return (
    <ZaloInviteContent
      key={invite.fullInviteUrl}
      invite={invite}
      onClose={onClose}
      onCopyError={onCopyError}
    />
  );
}
