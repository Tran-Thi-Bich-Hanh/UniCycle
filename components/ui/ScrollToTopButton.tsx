"use client";

import React, { useSyncExternalStore } from "react";

function subscribeScroll(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onStoreChange();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}

function getScrollSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.scrollY > 400;
}

function getServerScrollSnapshot() {
  return false;
}

export default function ScrollToTopButton() {
  const visible = useSyncExternalStore(
    subscribeScroll,
    getScrollSnapshot,
    getServerScrollSnapshot
  );

  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Cuộn lên đầu trang"
      title="Cuộn lên đầu trang"
      className={`fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-30 w-11 h-11 rounded-2xl bg-[#001B48] text-white shadow-lg hover:bg-[#018ABE] active:scale-95 transition-all duration-300 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      <svg
        className="w-5 h-5 transition-transform duration-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}
