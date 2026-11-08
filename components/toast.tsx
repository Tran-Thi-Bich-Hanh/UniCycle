"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { IconAlert, IconCheck, IconX } from "./icons";

export interface ToastState {
  id: number;
  message: string;
  type: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
}

/** Hook quản lý 1 toast duy nhất, tự ẩn sau `duration` ms. */
export function useToast(duration = 6000) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (message: string, opts: Partial<Omit<ToastState, "id" | "message">> = {}) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, type: "success", ...opts });
      timer.current = setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { toast, show, dismiss };
}

export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold ${
          isError
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-[#001B48] text-white border-[#02457A]"
        }`}
      >
        {isError ? (
          <IconAlert className="w-5 h-5 shrink-0" />
        ) : (
          <IconCheck className="w-5 h-5 shrink-0 text-[#97CADB]" />
        )}
        <span className="flex-1">{toast.message}</span>
        {toast.actionLabel && toast.onAction && (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              onDismiss();
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-white/15 hover:bg-white/25 underline-offset-2"
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
          className="p-1 rounded-md opacity-70 hover:opacity-100"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

