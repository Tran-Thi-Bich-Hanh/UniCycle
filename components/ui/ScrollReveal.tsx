"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type ScrollRevealVariant = "fade-up" | "fade-left" | "fade-right" | "fade-in";

interface ScrollRevealProps {
  children: React.ReactNode;
  variant?: ScrollRevealVariant;
  delayMs?: number;
  once?: boolean;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "span" | "p";
}

const variantHiddenClasses: Record<ScrollRevealVariant, string> = {
  "fade-up": "opacity-0 translate-y-4",
  "fade-left": "opacity-0 -translate-x-4",
  "fade-right": "opacity-0 translate-x-4",
  "fade-in": "opacity-0",
};

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return () => {};
  }
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => {
    mediaQuery.removeEventListener("change", onStoreChange);
  };
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot() {
  return false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  );
}

export default function ScrollReveal({
  children,
  variant = "fade-up",
  delayMs = 0,
  once = false,
  className = "",
  as: Component = "div",
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isIntersected, setIsIntersected] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const currentElement = elementRef.current;
    if (!currentElement) return;

    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setIsIntersected(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsIntersected(entry.isIntersecting);
        if (once && entry.isIntersecting) {
          observer.disconnect();
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(currentElement);

    return () => {
      observer.disconnect();
    };
  }, [prefersReducedMotion, once]);

  const isVisible = prefersReducedMotion || isIntersected;
  const hiddenClass = variantHiddenClasses[variant];
  const motionStyle = delayMs > 0 && isVisible ? { transitionDelay: `${delayMs}ms` } : undefined;

  return (
    <Component
      ref={elementRef as React.Ref<never>}
      style={motionStyle}
      className={`transition-all duration-500 ease-out ${
        isVisible ? "opacity-100 translate-y-0 translate-x-0" : hiddenClass
      } ${className}`.trim()}
    >
      {children}
    </Component>
  );
}
