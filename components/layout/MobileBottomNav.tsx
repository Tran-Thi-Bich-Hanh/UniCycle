"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileBottomNav() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isExplore =
    pathname?.startsWith("/products") ||
    pathname?.startsWith("/categories") ||
    pathname?.startsWith("/search");
  const isSell = pathname?.startsWith("/sell");
  const isOrders = pathname?.startsWith("/orders");
  const isAccount =
    pathname?.startsWith("/profile") ||
    pathname?.startsWith("/my-items") ||
    pathname?.startsWith("/my-products") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register");

  return (
    <nav
      aria-label="Thanh điều hướng di động"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#D6E8EE] shadow-[0_-4px_16px_rgba(0,27,72,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-16 items-center px-1">
        {/* 1. Trang chủ */}
        <li>
          <Link
            href="/"
            aria-current={isHome ? "page" : undefined}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
              isHome ? "text-[#018ABE] font-bold" : "text-slate-600 hover:text-[#001B48] font-medium"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill={isHome ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.9}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            <span className="text-[11px] leading-none">Trang chủ</span>
          </Link>
        </li>

        {/* 2. Khám phá */}
        <li>
          <Link
            href="/products"
            aria-current={isExplore ? "page" : undefined}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
              isExplore ? "text-[#018ABE] font-bold" : "text-slate-600 hover:text-[#001B48] font-medium"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isExplore ? 2.3 : 1.9}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <span className="text-[11px] leading-none">Khám phá</span>
          </Link>
        </li>

        {/* 3. Đăng tin (+) - Nút trung tâm nổi bật */}
        <li className="flex justify-center">
          <Link
            href="/sell"
            aria-current={isSell ? "page" : undefined}
            className="group -mt-4 flex flex-col items-center justify-center focus:outline-none"
          >
            <span
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md border-4 border-white transition-colors ${
                isSell ? "bg-[#001B48] text-white" : "bg-[#018ABE] group-hover:bg-[#02457A] text-white"
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </span>
            <span
              className={`text-[11px] leading-none mt-1 ${
                isSell ? "text-[#001B48] font-bold" : "text-[#02457A] font-semibold"
              }`}
            >
              Đăng tin
            </span>
          </Link>
        </li>

        {/* 4. Đơn hẹn */}
        <li>
          <Link
            href="/orders"
            aria-current={isOrders ? "page" : undefined}
            className={`relative min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
              isOrders ? "text-[#018ABE] font-bold" : "text-slate-600 hover:text-[#001B48] font-medium"
            }`}
          >
            <div className="relative">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={isOrders ? 2.3 : 1.9}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                />
              </svg>
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#018ABE] text-white text-[10px] font-bold flex items-center justify-center">
                2
              </span>
            </div>
            <span className="text-[11px] leading-none">Đơn hẹn</span>
          </Link>
        </li>

        {/* 5. Tài khoản */}
        <li>
          <Link
            href="/profile"
            aria-current={isAccount ? "page" : undefined}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
              isAccount ? "text-[#018ABE] font-bold" : "text-slate-600 hover:text-[#001B48] font-medium"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isAccount ? 2.3 : 1.9}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <span className="text-[11px] leading-none">Tài khoản</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

