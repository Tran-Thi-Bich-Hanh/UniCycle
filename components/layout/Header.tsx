"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface HeaderUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: "USER" | "ADMIN";
  isStudentVerified: boolean;
  reputationScore: number;
  schoolShortName?: string | null;
  dorm?: string | null;
}

const CAMPUS_AREAS = [
  { id: "all", name: "Tất cả KTX & Trường ĐH TP.HCM", shortName: "Toàn TP.HCM" },
  { id: "ktx-b", name: "KTX Khu B - ĐHQG TP.HCM", shortName: "KTX Khu B" },
  { id: "ktx-a", name: "KTX Khu A - ĐHQG TP.HCM", shortName: "KTX Khu A" },
  { id: "hcmut", name: "ĐH Bách Khoa (Cơ sở Dĩ An & Q.10)", shortName: "ĐH Bách Khoa" },
  { id: "hcmus", name: "ĐH Khoa học Tự nhiên", shortName: "ĐH KHTN" },
  { id: "ueh", name: "ĐH Kinh tế TP.HCM (UEH)", shortName: "ĐH Kinh tế" },
  { id: "uit", name: "ĐH Công nghệ Thông tin (UIT)", shortName: "ĐH CNTT" },
];

const CATEGORIES = [
  {
    slug: "giao-trinh-sach",
    name: "Giáo trình & Sách học",
    desc: "Giáo trình đại cương, chuyên ngành, tài liệu ôn thi",
    count: "140+ tin",
  },
  {
    slug: "ban-ghe-tu-ktx",
    name: "Bàn ghế & Tủ KTX",
    desc: "Bàn học gấp, ghế xoay, kệ sách, tủ vải sinh viên",
    count: "85+ tin",
  },
  {
    slug: "do-gia-dung-quat",
    name: "Đồ gia dụng & Quạt điện",
    desc: "Quạt đứng Senko, ấm siêu tốc, nồi cơm mini, đèn bàn",
    count: "110+ tin",
  },
  {
    slug: "do-dien-tu-phu-kien",
    name: "Đồ điện tử & Phụ kiện",
    desc: "Máy tính Casio fx-580VNX, chuột, bàn phím, tai nghe",
    count: "95+ tin",
  },
  {
    slug: "xe-dap-phuong-tien",
    name: "Xe đạp & Phương tiện",
    desc: "Xe đạp đi học trong làng đại học, mũ bảo hiểm",
    count: "40+ tin",
  },
  {
    slug: "goc-0d-cho-tang",
    name: "Góc 0đ Cho Tặng",
    desc: "Đồ dùng sinh viên khóa trước tặng lại tân sinh viên",
    count: "60+ tin",
    highlight: true,
  },
];

const POPULAR_KEYWORDS = [
  "Quạt đứng Senko",
  "Casio fx-580VNX",
  "Bàn học gấp KTX",
  "Giáo trình Giải tích",
  "Đèn học chống cận",
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [selectedCampus, setSelectedCampus] = useState(CAMPUS_AREAS[1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [accountPopupOpen, setAccountPopupOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    let active = true;

    const loadUser = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active && data) {
            setCurrentUser(data.user || null);
          }
        })
        .catch(() => {});
    };

    loadUser();
    window.addEventListener("unicycle-auth-change", loadUser);
    return () => {
      active = false;
      window.removeEventListener("unicycle-auth-change", loadUser);
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setAccountPopupOpen(false);
      setMobileMenuOpen(false);
      window.dispatchEvent(new Event("unicycle-auth-change"));
      router.refresh();
    } catch {
      // Ignore
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    if (selectedCampus.id !== "all") {
      params.set("campus", selectedCampus.id);
    }
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#D6E8EE] shadow-[0_2px_12px_rgba(0,27,72,0.04)]">
      {/* 1. Main Header Bar (Đã bỏ topbar xanh đen phía trên cho giao diện sạch sẽ, thoáng mắt) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-3 lg:gap-6">
          {/* Mobile: Nút mở Offcanvas Menu (kế thừa goal-header-mobile từ index.html) */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở danh mục và menu điều hướng"
              aria-expanded={mobileMenuOpen}
              className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-[#001B48] hover:bg-[#D6E8EE]/50 transition-colors cursor-pointer"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* Logo chính từ /public/logo.jpg */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group focus:outline-none"
            aria-label="Trang chủ UniCycle"
          >
            <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden border border-[#D6E8EE] bg-white shadow-xs group-hover:border-[#018ABE] transition-colors">
              <Image
                src="/logo.jpg"
                alt="Logo UniCycle"
                fill
                sizes="44px"
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#001B48] leading-none">
                Uni<span className="text-[#018ABE]">Cycle</span>
              </span>
              <span className="text-[11px] font-medium text-[#02457A] tracking-wide mt-0.5">
                Chợ đồ cũ sinh viên
              </span>
            </div>
          </Link>

          {/* Desktop: Nút Mega-Menu Danh mục (kế thừa megamenu từ index.html) */}
          <div
            className="relative hidden lg:block"
            onMouseEnter={() => setCategoryMenuOpen(true)}
            onMouseLeave={() => setCategoryMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setCategoryMenuOpen((prev) => !prev)}
              aria-expanded={categoryMenuOpen}
              aria-haspopup="true"
              className="h-11 px-4 rounded-xl bg-[#D6E8EE]/60 hover:bg-[#D6E8EE] text-[#001B48] font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-[#02457A]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
              <span>Danh mục</span>
              <svg
                className={`w-4 h-4 text-[#02457A] transition-transform duration-200 ${
                  categoryMenuOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Mega Menu Dropdown */}
            {categoryMenuOpen && (
              <div className="absolute left-0 top-full pt-2 w-[680px] z-50">
                <div className="bg-white rounded-2xl border border-[#D6E8EE] shadow-xl p-5 grid grid-cols-12 gap-5">
                  <div className="col-span-8 grid grid-cols-2 gap-2.5">
                    {CATEGORIES.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/categories/${cat.slug}`}
                        onClick={() => setCategoryMenuOpen(false)}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          cat.highlight
                            ? "bg-[#D6E8EE]/45 border-[#97CADB] hover:border-[#018ABE]"
                            : "bg-white border-transparent hover:border-[#D6E8EE] hover:bg-[#F4F9FB]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-[#001B48]">{cat.name}</span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#D6E8EE] text-[#02457A]">
                              {cat.count}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{cat.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Cột Banner Passport trong Mega-Menu (kế thừa widget-banner trong index.html) */}
                  <div className="col-span-4 rounded-xl bg-gradient-to-br from-[#001B48] via-[#02457A] to-[#018ABE] text-white p-4 flex flex-col justify-between">
                    <div>
                      <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 text-[#D6E8EE]">
                        Digital Passport
                      </span>
                      <h3 className="text-base font-bold mt-2.5 leading-snug">
                        Món đồ có lịch sử chuyền tay rõ ràng
                      </h3>
                      <p className="text-xs text-[#D6E8EE] mt-1.5 leading-relaxed">
                        Kiểm tra các đời chủ trước qua mã QR màn hình và bán lại trong 1 chạm khi ra trường.
                      </p>
                    </div>
                    <Link
                      href="/products?passport=true"
                      onClick={() => setCategoryMenuOpen(false)}
                      className="mt-4 inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-white text-[#001B48] hover:bg-[#D6E8EE] text-xs font-bold transition-colors"
                    >
                      Xem đồ có Passport
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Search Bar trung tâm kèm chọn nhanh Khu vực Trường / KTX */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <form onSubmit={handleSearchSubmit} className="w-full relative flex items-center bg-[#F4F9FB] rounded-xl border border-[#D6E8EE] focus-within:bg-white focus-within:border-[#018ABE] transition-colors">
              <label htmlFor="campus-select-in-bar" className="sr-only">Chọn khu vực</label>
              <select
                id="campus-select-in-bar"
                value={selectedCampus.id}
                onChange={(e) => {
                  const found = CAMPUS_AREAS.find((c) => c.id === e.target.value);
                  if (found) setSelectedCampus(found);
                }}
                className="h-11 pl-3 pr-2 bg-transparent text-xs font-semibold text-[#02457A] border-r border-[#D6E8EE] focus:outline-none cursor-pointer max-w-[145px] truncate"
              >
                {CAMPUS_AREAS.map((c) => (
                  <option key={c.id} value={c.id}>{c.shortName}</option>
                ))}
              </select>

              <label htmlFor="desktop-search-input" className="sr-only">
                Tìm kiếm giáo trình, đồ gia dụng KTX, đồ điện tử
              </label>
              <input
                id="desktop-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm giáo trình, quạt điện, bàn học KTX..."
                className="flex-1 h-11 px-3 bg-transparent text-sm text-[#001B48] placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="mr-1.5 h-8 px-3.5 rounded-lg bg-[#02457A] hover:bg-[#018ABE] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <span>Tìm</span>
              </button>
            </form>
          </div>

          {/* Cụm hành động bên phải (Desktop + Mobile) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Nút mở thanh tìm kiếm trên Mobile */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen((prev) => !prev)}
              aria-label="Mở thanh tìm kiếm sản phẩm"
              aria-expanded={mobileSearchOpen}
              className="md:hidden w-11 h-11 inline-flex items-center justify-center rounded-xl text-[#001B48] hover:bg-[#D6E8EE]/50 transition-colors cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </button>

            {/* Nút Đồ của tôi (Passport) trên Desktop */}
            <Link
              href="/my-items"
              className={`hidden xl:inline-flex items-center gap-2 h-11 px-3.5 rounded-xl text-sm font-semibold transition-colors ${
                pathname?.startsWith("/my-items")
                  ? "bg-[#D6E8EE] text-[#001B48]"
                  : "text-[#001B48] hover:bg-[#F4F9FB]"
              }`}
            >
              <svg
                className="w-5 h-5 text-[#018ABE]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.9}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
                />
              </svg>
              <span>Đồ của tôi</span>
            </Link>

            {/* Nút Đơn hẹn (/orders) */}
            <Link
              href="/orders"
              className={`relative h-11 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
                pathname?.startsWith("/orders")
                  ? "bg-[#D6E8EE] text-[#001B48]"
                  : "text-[#001B48] hover:bg-[#F4F9FB]"
              }`}
              aria-label="Quản lý đơn hẹn xem hàng"
            >
              <svg
                className="w-5 h-5 text-[#02457A]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.9}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <span className="hidden lg:inline">Đơn hẹn</span>
              <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-[#018ABE] text-white leading-none">
                2
              </span>
            </Link>

            {/* Nút Đăng bán CTA chính (#018ABE) */}
            <Link
              href="/sell"
              className="hidden sm:inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-sm shadow-xs transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Đăng bán</span>
            </Link>

            {/* Nút Tài khoản / Đăng nhập nhanh (kế thừa wrapper-account-action từ index.html) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountPopupOpen((prev) => !prev)}
                aria-expanded={accountPopupOpen}
                aria-haspopup="true"
                aria-label="Tài khoản và đăng nhập"
                className="h-11 px-3 rounded-xl border border-[#D6E8EE] hover:border-[#97CADB] bg-white text-[#001B48] inline-flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer"
              >
                {currentUser ? (
                  <>
                    <div className="w-7 h-7 rounded-full bg-[#018ABE] text-white flex items-center justify-center font-bold text-xs overflow-hidden relative">
                      {currentUser.avatarUrl ? (
                        <Image
                          src={currentUser.avatarUrl}
                          alt={currentUser.displayName}
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      ) : (
                        currentUser.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="hidden xl:inline max-w-[110px] truncate">
                      {currentUser.displayName}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-7 h-7 rounded-full bg-[#D6E8EE] text-[#02457A] flex items-center justify-center font-bold text-xs">
                      SV
                    </div>
                    <span className="hidden xl:inline">Tài khoản</span>
                  </>
                )}
              </button>

              {accountPopupOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAccountPopupOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-[#D6E8EE] shadow-xl p-4 z-50">
                    {currentUser ? (
                      <>
                        <div className="pb-3 border-b border-[#D6E8EE] flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-[#D6E8EE] overflow-hidden relative shrink-0 border border-[#97CADB]">
                            {currentUser.avatarUrl ? (
                              <Image
                                src={currentUser.avatarUrl}
                                alt={currentUser.displayName}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center font-bold text-[#001B48]">
                                {currentUser.displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-[#001B48] truncate">
                              {currentUser.displayName}
                            </p>
                            <p className="text-[11px] text-[#02457A] truncate">
                              {currentUser.email}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {currentUser.isStudentVerified && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                  ✓ SV Đã duyệt
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-[#02457A] bg-[#D6E8EE]/60 px-1.5 py-0.5 rounded-full truncate">
                                {currentUser.schoolShortName || "KTX ĐHQG"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="py-2 space-y-1 text-xs">
                          <Link
                            href="/my-products"
                            onClick={() => setAccountPopupOpen(false)}
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                          >
                            <span>Sản phẩm của tôi</span>
                            <span className="text-slate-400">/my-products</span>
                          </Link>
                          <Link
                            href="/my-items"
                            onClick={() => setAccountPopupOpen(false)}
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                          >
                            <span>Đồ của tôi (Passport &amp; Bán lại)</span>
                            <span className="text-[#018ABE] font-semibold">QR</span>
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setAccountPopupOpen(false)}
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                          >
                            <span>Đơn hẹn xem hàng</span>
                            <span className="text-[#02457A] font-semibold">Lịch hẹn</span>
                          </Link>
                          <Link
                            href="/verify-student"
                            onClick={() => setAccountPopupOpen(false)}
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                          >
                            <span>Xác minh thẻ sinh viên</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#D6E8EE] text-[#02457A] text-[10px] font-bold">
                              Huy hiệu SV
                            </span>
                          </Link>
                        </div>

                        <div className="pt-2 border-t border-[#D6E8EE]">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                          >
                            Đăng xuất tài khoản
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="pb-3 border-b border-[#D6E8EE]">
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#018ABE]">
                            Cộng đồng sinh viên UniCycle
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Đăng nhập 1 chạm bằng Google để nhắn Zalo người bán, đặt lịch hẹn và lưu Hộ chiếu đồ vật.
                          </p>
                        </div>

                        <div className="py-3 space-y-2">
                          <Link
                            href="/login"
                            onClick={() => setAccountPopupOpen(false)}
                            className="w-full h-10 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" />
                            </svg>
                            <span>Đăng nhập Google / Email</span>
                          </Link>
                          <Link
                            href="/register"
                            onClick={() => setAccountPopupOpen(false)}
                            className="w-full h-9 rounded-xl border border-[#D6E8EE] hover:bg-[#F4F9FB] text-[#001B48] text-xs font-semibold flex items-center justify-center transition-colors"
                          >
                            Tạo tài khoản sinh viên mới
                          </Link>
                        </div>

                        <div className="pt-2 border-t border-[#D6E8EE] space-y-1 text-xs">
                          <Link
                            href="/my-products"
                            onClick={() => setAccountPopupOpen(false)}
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                          >
                            <span>Sản phẩm của tôi</span>
                            <span className="text-slate-400">/my-products</span>
                          </Link>
                          <Link
                            href="/my-items"
                            onClick={() => setAccountPopupOpen(false)}
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                          >
                            <span>Đồ của tôi (Passport &amp; Bán lại)</span>
                            <span className="text-[#018ABE] font-semibold">QR</span>
                          </Link>
                          <Link
                            href="/verify-student"
                            onClick={() => setAccountPopupOpen(false)}
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                          >
                            <span>Xác minh thẻ sinh viên</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#D6E8EE] text-[#02457A] text-[10px] font-bold">
                              Huy hiệu SV
                            </span>
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Thanh tìm kiếm mở rộng trên Mobile (khi bấm icon kính lúp) */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t border-[#D6E8EE] bg-[#F4F9FB] px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Tìm đồ cũ tại ${selectedCampus.shortName}...`}
              autoFocus
              className="flex-1 h-11 px-3.5 rounded-xl bg-white border border-[#97CADB] text-sm text-[#001B48] focus:border-[#018ABE] focus:outline-none"
            />
            <button
              type="submit"
              className="h-11 px-4 rounded-xl bg-[#018ABE] text-white text-sm font-bold shrink-0 cursor-pointer"
            >
              Tìm
            </button>
          </form>
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar">
            <span className="text-[11px] font-semibold text-[#02457A] shrink-0">Gợi ý:</span>
            {POPULAR_KEYWORDS.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => {
                  setSearchQuery(kw);
                  setMobileSearchOpen(false);
                  router.push(`/products?q=${encodeURIComponent(kw)}`);
                }}
                className="text-xs px-2.5 py-1 rounded-full bg-white border border-[#D6E8EE] text-[#001B48] hover:border-[#018ABE] shrink-0 cursor-pointer"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Mobile Offcanvas Drawer (kế thừa goal-mobile-menu từ index.html) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#001B48]/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-[84%] max-w-sm bg-white h-full flex flex-col justify-between overflow-y-auto z-10 shadow-2xl">
            <div>
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#D6E8EE] flex items-center justify-between bg-[#F4F9FB]">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-[#D6E8EE] bg-white">
                    <Image src="/logo.jpg" alt="UniCycle" fill sizes="36px" className="object-contain p-0.5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-base text-[#001B48] leading-none">UniCycle</p>
                    <p className="text-[11px] text-[#02457A] mt-0.5">{selectedCampus.shortName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Đóng menu"
                  className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#001B48] hover:bg-[#D6E8EE]/50 cursor-pointer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Danh mục sản phẩm trên Mobile Drawer */}
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#02457A] mb-2.5">
                  Danh mục đồ sinh viên
                </p>
                <ul className="space-y-1">
                  {CATEGORIES.map((cat) => (
                    <li key={cat.slug}>
                      <Link
                        href={`/categories/${cat.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#F4F9FB] text-sm font-medium text-[#001B48]"
                      >
                        <span>{cat.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#D6E8EE] text-[#02457A] font-semibold">
                          {cat.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-[#D6E8EE]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#02457A] mb-2.5">
                    Tiện ích &amp; Hồ sơ đồ vật
                  </p>
                  <div className="space-y-1 text-sm">
                    <Link
                      href="/my-items"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                    >
                      Đồ của tôi (Mã QR &amp; Bán lại)
                    </Link>
                    <Link
                      href="/my-products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                    >
                      Quản lý tin đăng bán
                    </Link>
                    <Link
                      href="/verify-student"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                    >
                      Xác minh thẻ sinh viên
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer (kế thừa header-mobile-bottom từ index.html) */}
            <div className="p-4 border-t border-[#D6E8EE] bg-[#F4F9FB] space-y-2.5">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-extrabold text-[#001B48] truncate">
                      {currentUser.displayName}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      ✓ SV Đã duyệt
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full h-10 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full h-11 rounded-xl bg-[#001B48] text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  Đăng nhập / Đăng ký
                </Link>
              )}
              <p className="text-[11px] text-center text-slate-600">
                Giao dịch an toàn tại cổng trường &amp; KTX TP.HCM
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

