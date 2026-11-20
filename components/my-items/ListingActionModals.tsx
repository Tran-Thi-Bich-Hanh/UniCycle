"use client";

import React, { useEffect, useRef, useState } from "react";
import type { EditableListingFields } from "@/lib/my-items/types";
import {
  CONDITION_GRADE_OPTIONS,
  normalizeConditionValue,
} from "@/lib/utils/condition";

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
  const [condition, setCondition] = useState(() => normalizeConditionValue(listing.condition));
  const [description, setDescription] = useState(listing.description);
  const [zaloPhone, setZaloPhone] = useState(listing.zaloPhone);
  const [hidePhone, setHidePhone] = useState(listing.hidePhone);
  const [localError, setLocalError] = useState<string | null>(null);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  useAccessibleModal(true, onClose, closeBtnRef, saving);

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
                {CONDITION_GRADE_OPTIONS.map((opt) => (
                  <option key={opt.grade} value={opt.value}>
                    {opt.value} ({opt.description})
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
                    được giữ lại trong mục <strong>Đồ đã mua</strong>.
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
