"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";

export interface AdminActionReasonConfig {
  label: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
}

export interface AdminActionModalProps {
  open: boolean;
  title: string;
  description: string;
  warningText?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  reasonConfig?: AdminActionReasonConfig;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export interface StudentCardPreviewModalProps {
  open: boolean;
  studentName: string;
  studentEmail?: string;
  schoolName?: string | null;
  imageUrl: string | null;
  onClose: () => void;
}

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

function AdminActionModalContent({
  title,
  description,
  warningText,
  confirmLabel,
  cancelLabel = "Hủy bỏ",
  variant = "primary",
  reasonConfig,
  submitting = false,
  error = null,
  onClose,
  onConfirm,
}: Omit<AdminActionModalProps, "open">) {
  const [reason, setReason] = useState(reasonConfig?.defaultValue ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const headingId = useId();
  const descriptionId = useId();
  const textareaId = useId();
  const initialFocusRef = useRef<HTMLElement | null>(null);

  useAccessibleModal(true, onClose, initialFocusRef, submitting);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const trimmed = reason.trim();
    if (reasonConfig) {
      const minLen = reasonConfig.minLength ?? (reasonConfig.required ? 5 : 0);
      if (reasonConfig.required && trimmed.length === 0) {
        setLocalError("Vui lòng nhập lý do thực hiện.");
        return;
      }
      if (minLen > 0 && (reasonConfig.required || trimmed.length > 0) && trimmed.length < minLen) {
        setLocalError(`Vui lòng nhập ít nhất ${minLen} ký tự để ghi nhận rõ ràng.`);
        return;
      }
    }

    onConfirm(trimmed);
  };

  const displayError = localError || error;
  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200/80 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                isDanger ? "bg-rose-50 text-rose-600" : "bg-[#EEF7FB] text-[#018ABE]"
              }`}
            >
              {isDanger ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              )}
            </div>
            <div className="space-y-1">
              <h2 id={headingId} className="text-base font-bold text-[#001B48] leading-snug">
                {title}
              </h2>
              <p id={descriptionId} className="text-sm text-slate-600 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <button
            ref={(el) => {
              if (!reasonConfig) initialFocusRef.current = el;
            }}
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại xác nhận"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {warningText && (
          <div
            className={`rounded-xl px-3.5 py-2.5 border text-xs leading-relaxed flex items-start gap-2.5 ${
              isDanger
                ? "bg-rose-50/70 border-rose-200/80 text-rose-800"
                : "bg-amber-50/70 border-amber-200/80 text-amber-900"
            }`}
          >
            <svg
              className="w-4 h-4 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <span>{warningText}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {reasonConfig && (
            <div className="space-y-1.5">
              <label htmlFor={textareaId} className="block text-xs font-semibold text-[#001B48]">
                {reasonConfig.label}
                {reasonConfig.required && <span className="text-rose-600 ml-1">*</span>}
              </label>
              <textarea
                id={textareaId}
                ref={(el) => {
                  if (reasonConfig) initialFocusRef.current = el;
                }}
                rows={3}
                value={reason}
                disabled={submitting}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder={reasonConfig.placeholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#001B48] placeholder:text-slate-400 focus:border-[#018ABE] focus:outline-none focus:ring-2 focus:ring-[#018ABE]/20 disabled:bg-slate-50"
              />
            </div>
          )}

          {displayError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-800"
            >
              {displayError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isDanger
                  ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600"
                  : "bg-[#001B48] hover:bg-[#02457A] focus-visible:ring-[#018ABE]"
              }`}
            >
              {submitting && (
                <span
                  className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
              )}
              <span>{submitting ? "Đang xử lý..." : confirmLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminActionModal(props: AdminActionModalProps) {
  if (!props.open) return null;
  return <AdminActionModalContent {...props} />;
}

function StudentCardPreviewModalContent({
  studentName,
  studentEmail,
  schoolName,
  imageUrl,
  onClose,
}: Omit<StudentCardPreviewModalProps, "open"> & { imageUrl: string }) {
  const headingId = useId();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useAccessibleModal(true, onClose, closeBtnRef, false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-xl border border-slate-200/80 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <h2 id={headingId} className="text-base font-bold text-[#001B48] truncate">
              Ảnh thẻ sinh viên — {studentName}
            </h2>
            {(studentEmail || schoolName) && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {[studentEmail, schoolName].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ xem ảnh thẻ"
            className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2 flex items-center justify-center overflow-hidden">
          <Image
            src={imageUrl}
            alt={`Ảnh thẻ sinh viên của ${studentName}`}
            width={960}
            height={600}
            unoptimized
            className="w-full h-auto max-h-[65vh] object-contain rounded-lg"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
          <p className="text-slate-500">
            Ảnh thẻ sinh viên chỉ dùng để đối chiếu và sẽ tự động xóa vĩnh viễn sau khi xét duyệt.
          </p>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-[#018ABE] hover:text-[#02457A] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] rounded"
          >
            <span>Mở ảnh gốc ở tab mới</span>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export function StudentCardPreviewModal({
  open,
  studentName,
  studentEmail,
  schoolName,
  imageUrl,
  onClose,
}: StudentCardPreviewModalProps) {
  if (!open || !imageUrl) return null;
  return (
    <StudentCardPreviewModalContent
      studentName={studentName}
      studentEmail={studentEmail}
      schoolName={schoolName}
      imageUrl={imageUrl}
      onClose={onClose}
    />
  );
}
