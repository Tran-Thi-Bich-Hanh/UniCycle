"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconSearch,
  IconPlus,
  IconUser,
  IconLogOut,
  IconSparkles,
} from "./icons";
import UniCycleLogo from "./logo";

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  university: string | null;
}

export function Navbar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser({
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.full_name,
            avatarUrl: data.user.avatar_url,
            university: data.user.university,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/products");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setShowDropdown(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#D6E8EE] shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <UniCycleLogo className="h-11 w-auto max-w-[130px] group-hover:scale-105 transition-transform" />
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-[#D6E8EE]/80 text-[#001B48] border border-[#97CADB]/60 rounded-md">
              Chợ sinh viên
            </span>
          </Link>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-lg hidden md:flex items-center relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm giáo trình, bàn học, quạt điện, nệm KTX..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-[#D6E8EE] rounded-full focus:bg-white focus:border-[#018ABE] focus:outline-hidden focus:ring-2 focus:ring-[#018ABE]/20 transition-all text-[#001B48] placeholder-slate-400"
            />
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#018ABE] transition-colors cursor-pointer"
              aria-label="Tìm kiếm"
            >
              <IconSearch className="w-4 h-4" />
            </button>
          </form>

          {/* Navigation links & Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="hidden lg:inline-flex items-center text-xs font-semibold text-[#02457A] hover:text-[#018ABE] px-3 py-2 rounded-lg hover:bg-[#D6E8EE]/40 transition-colors"
            >
              Tất cả đồ cũ
            </Link>

            {/* Post listing button */}
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#02457A] to-[#018ABE] hover:from-[#001B48] hover:to-[#02457A] shadow-sm shadow-[#018ABE]/25 hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Đăng tin</span>
            </Link>

            {/* Auth User Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[#D6E8EE]/40 transition-colors border border-[#D6E8EE] cursor-pointer"
                  aria-expanded={showDropdown}
                >
                  <img
                    src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=SV"}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full object-cover bg-[#D6E8EE] border border-[#97CADB]"
                  />
                  <span className="hidden sm:inline-block text-xs font-bold text-[#001B48] max-w-[100px] truncate pr-1">
                    {currentUser.fullName}
                  </span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#D6E8EE] py-2 z-50">
                    <div className="px-4 py-2 border-b border-[#D6E8EE]/60">
                      <p className="text-xs font-bold text-[#001B48] truncate">{currentUser.fullName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      {currentUser.university && (
                        <p className="text-[10px] text-[#018ABE] font-semibold mt-1 truncate">
                          🏫 {currentUser.university}
                        </p>
                      )}
                    </div>

                    <Link
                      href="/profile/my-listings"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#02457A] hover:bg-[#D6E8EE]/50 hover:text-[#001B48] transition-colors"
                    >
                      <IconSparkles className="w-4 h-4 text-[#018ABE]" />
                      <span>Tin đã đăng của tôi</span>
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#02457A] hover:bg-[#D6E8EE]/50 hover:text-[#001B48] transition-colors"
                    >
                      <IconUser className="w-4 h-4 text-slate-500" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    <div className="border-t border-[#D6E8EE]/60 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                    >
                      <IconLogOut className="w-4 h-4 text-red-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#02457A] hover:text-[#018ABE] px-3 py-2 rounded-lg hover:bg-[#D6E8EE]/40 transition-colors cursor-pointer"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex text-xs font-bold text-[#001B48] bg-[#D6E8EE] hover:bg-[#97CADB]/50 px-3 py-2 rounded-lg transition-colors border border-[#97CADB]/60 cursor-pointer"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="pb-3 md:hidden">
          <form onSubmit={handleSearch} className="flex items-center relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sách, bàn ghế, đồ sinh hoạt..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-[#D6E8EE] rounded-full focus:bg-white focus:border-[#018ABE] focus:outline-hidden text-[#001B48]"
            />
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-label="Tìm kiếm"
            >
              <IconSearch className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
