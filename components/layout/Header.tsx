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
    name: "Giáo trình & Sách",
    desc: "Giáo trình đại học, sách chuyên ngành và tài liệu học tập",
    count: "140+ tin",
  },
  {
    slug: "ban-ghe-tu-ktx",
    name: "Bàn ghế & Nội thất",
    desc: "Bàn học, ghế xoay, kệ sách và nội thất phòng trọ",
    count: "85+ tin",
  },
  {
    slug: "do-gia-dung-quat",
    name: "Đồ gia dụng",
    desc: "Quạt điện, ấm siêu tốc, nồi cơm mini và vật dụng sinh hoạt",
    count: "110+ tin",
  },
  {
    slug: "do-dien-tu-phu-kien",
    name: "Đồ điện tử",
    desc: "Máy tính, máy tính cầm tay, chuột, bàn phím và tai nghe",
    count: "95+ tin",
  },
  {
    slug: "xe-dap-phuong-tien",
    name: "Xe đạp & Di chuyển",
    desc: "Xe đạp, mũ bảo hiểm và vật dụng đi lại",
    count: "40+ tin",
  },
  {
    slug: "goc-0d-cho-tang",
    name: "Góc Cho Tặng",
    desc: "Đồ dùng miễn phí được sinh viên khóa trước chia sẻ",
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
  const [userCounts, setUserCounts] = useState<{
    itemsCount: number;
    productsCount?: number;
    ordersCount: number;
    activeOrdersCount: number;
  }>({ itemsCount: 0, productsCount: 0, ordersCount: 0, activeOrdersCount: 0 });

  useEffect(() => {
    let active = true;

    const loadUserData = async () => {
      try {
        const [userRes, countsRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/user/counts", { cache: "no-store" }),
        ]);

        if (!active) return;

        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user || null);
        } else {
          setCurrentUser(null);
        }

        if (countsRes.ok) {
          const countsData = await countsRes.json();
          setUserCounts({
            itemsCount: countsData.itemsCount || 0,
            productsCount: countsData.productsCount || countsData.itemsCount || 0,
            ordersCount: countsData.ordersCount || 0,
            activeOrdersCount: countsData.activeOrdersCount || 0,
          });
        } else {
          setUserCounts({ itemsCount: 0, productsCount: 0, ordersCount: 0, activeOrdersCount: 0 });
        }
      } catch {
        // Ignore
      }
    };

    loadUserData();
    window.addEventListener("unicycle-auth-change", loadUserData);
    return () => {
      active = false;
      window.removeEventListener("unicycle-auth-change", loadUserData);
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setUserCounts({ itemsCount: 0, productsCount: 0, ordersCount: 0, activeOrdersCount: 0 });
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
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#D6E8EE] shadow-[0_2px_12px_rgba(0,27,72,0.04)]">
      {/* 1. Main Header Bar (Đã bỏ topbar xanh đen phía trên cho giao diện sạch sẽ, thoáng mắt) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between md:justify-center gap-2.5">
          {/* Cụm trái: Logo + Nút Danh mục (khoảng cách gap-2.5 đồng đều) */}
          <div className="flex items-center gap-2.5 shrink-0">
                  {/* Mobile: Nút mở Offcanvas Menu (kế thừa goal-header-mobile từ index.html) */}
                  <div className="flex items-center gap-2 lg:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(true)}
                      aria-label="Mở danh mục và menu điều hướng"
                      aria-expanded={mobileMenuOpen}
                      className="w-[38px] h-[38px] inline-flex items-center justify-center rounded-lg text-[#001B48] hover:bg-[#D6E8EE]/50 transition-colors cursor-pointer"
                    >
                    <svg
                      className="w-5 h-5"
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
                className="relative hidden lg:block shrink-0"
                onMouseEnter={() => setCategoryMenuOpen(true)}
                onMouseLeave={() => setCategoryMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setCategoryMenuOpen((prev) => !prev)}
                  aria-expanded={categoryMenuOpen}
                  aria-haspopup="true"
                  className="h-[38px] px-3 rounded-lg bg-[#D6E8EE]/60 hover:bg-[#D6E8EE] text-[#001B48] font-semibold text-[13px] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                    < svg
                  className="w-4 h-4 text-[#02457A] shrink-0"
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
                <span className="whitespace-nowrap">Danh mục</span>
                <svg
                  className={`w-3.5 h-3.5 text-[#02457A] shrink-0 transition-transform duration-200 ${categoryMenuOpen ? "rotate-180" : ""
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

                    {/* Mega Menu Dropdown */ }
              { categoryMenuOpen && (
                      <div className="absolute left-0 top-full pt-2 w-[calc(100vw-2rem)] max-w-[680px] z-50 animate-in fade-in duration-150">
                        <div className="bg-white rounded-2xl border border-[#D6E8EE] shadow-2xl p-5 grid grid-cols-12 gap-5">
                          <div className="col-span-8 grid grid-cols-2 gap-2.5">
                            {CATEGORIES.map((cat) => (
                              <Link
                                key={cat.slug}
                                href={`/categories/${cat.slug}`}
                                onClick={() => setCategoryMenuOpen(false)}
                                className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${cat.highlight
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
                                Mỗi món đồ, một câu chuyện.
                              </h3>
                              <p className="text-xs text-[#D6E8EE] mt-1.5 leading-relaxed">
                                Theo dõi hành trình của món đồ qua mã QR, từ người sở hữu đầu tiên đến những lần trao đổi tiếp theo.
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
              </div>

          {/* Desktop Search Bar: Cách đều nút Danh mục và nút Đồ của tôi đúng 1 khoảng gap-2.5 */}
          <div className="hidden md:flex shrink-0 w-[340px] lg:w-[420px] xl:w-[460px]">
            <form onSubmit={handleSearchSubmit} className="w-full relative flex items-center h-[38px] bg-[#F4F9FB] rounded-lg border border-[#D6E8EE] focus-within:bg-white focus-within:border-[#018ABE] transition-colors pl-3 pr-1.5">
              <svg
                className="w-4 h-4 text-slate-400 shrink-0 mr-2"
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
              <label htmlFor="desktop-search-input" className="sr-only">
                Tìm kiếm giáo trình, đồ gia dụng KTX, đồ điện tử
              </label>
              <input
                id="desktop-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm giáo trình, quạt điện, bàn học KTX..."
                className="flex-1 min-w-0 h-full bg-transparent text-[13px] text-[#001B48] placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="h-7 px-2.5 rounded-md bg-[#02457A] hover:bg-[#018ABE] text-white text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <span>Tìm</span>
              </button>
            </form>
          </div>

          {/* Cụm hành động bên phải: Khoảng cách gap-2.5 đồng đều giữa các nút */}
          <div className="flex items-center gap-2.5 shrink-0">
                      {/* Nút mở thanh tìm kiếm trên Mobile */}
                      <button
                        type="button"
                        onClick={() => setMobileSearchOpen((prev) => !prev)}
                        aria-label="Mở thanh tìm kiếm sản phẩm"
                        aria-expanded={mobileSearchOpen}
                        className="md:hidden w-[38px] h-[38px] inline-flex items-center justify-center rounded-lg text-[#001B48] hover:bg-[#D6E8EE]/50 transition-colors cursor-pointer"
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

                      {/* Nút Đồ của tôi (Icon-only với Shopee-style badge & Custom Tooltip) */}
                      <div className="relative group">
                        <Link
                          href="/my-items"
                          aria-label="Đồ của tôi"
                          className={`relative w-[38px] h-[38px] rounded-lg inline-flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 ${pathname?.startsWith("/my-items") || pathname?.startsWith("/my-products")
                              ? "bg-[#D6E8EE] text-[#001B48]"
                              : "text-[#001B48] hover:bg-[#F4F9FB]"
                            }`}
                        >
                          <svg
                            className="w-[18px] h-[18px] text-[#018ABE]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.9}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                            />
                          </svg>
                          {currentUser && (userCounts.productsCount ?? userCounts.itemsCount) > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#018ABE] text-white text-[9px] font-bold flex items-center justify-center leading-none border-2 border-white shadow-xs">
                    {userCounts.productsCount ?? userCounts.itemsCount}
                  </span>
                )}
              </Link>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0B1F4B] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform group-hover:translate-y-0 translate-y-1 shadow-lg z-50">
                <span>Đồ của tôi</span>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0B1F4B] rotate-45" />
              </div>
            </div>

                      {/* Nút Đơn hẹn (/orders) (Icon-only với Shopee-style badge & Custom Tooltip) */}
                      <div className="relative group">
                        <Link
                          href="/orders"
                          aria-label="Quản lý đơn hẹn xem hàng"
                          className={`relative w-[38px] h-[38px] rounded-lg inline-flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 ${pathname?.startsWith("/orders")
                              ? "bg-[#D6E8EE] text-[#001B48]"
                              : "text-[#001B48] hover:bg-[#F4F9FB]"
                            }`}
                        >
                          <svg
                            className="w-[18px] h-[18px] text-[#02457A]"
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
                          {currentUser && userCounts.ordersCount > 0 && (
                            <span
                              className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none border-2 border-white shadow-xs ${userCounts.activeOrdersCount > 0 ? "bg-[#EF4444]" : "bg-[#02457A]"
                                }`}
                            >
                              {userCounts.ordersCount}
                            </span>
                          )}
                        </Link>
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0B1F4B] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform group-hover:translate-y-0 translate-y-1 shadow-lg z-50">
                          <span>Lịch hẹn &amp; giao dịch</span>
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0B1F4B] rotate-45" />
                        </div>
                      </div>

                      {/* Nút Đăng bán CTA tối giản (Icon +) */}
                      <div className="relative group">
                        <Link
                          href="/sell"
                          aria-label="Đăng bán món đồ"
                          className="w-[38px] h-[38px] rounded-lg bg-[#018ABE] hover:bg-[#02457A] text-white inline-flex items-center justify-center shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                        >
                          <svg
                            className="w-[18px] h-[18px]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </Link>
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0B1F4B] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform group-hover:translate-y-0 translate-y-1 shadow-lg z-50">
                          <span>Đăng bán</span>
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0B1F4B] rotate-45" />
                        </div>
                      </div>

                      {/* Nút Tài khoản / Avatar tròn không khung vuông */}
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => setAccountPopupOpen((prev) => !prev)}
                          aria-expanded={accountPopupOpen}
                          aria-haspopup="true"
                          aria-label={currentUser ? `Tài khoản ${currentUser.displayName}` : "Tài khoản và đăng nhập"}
                          className="w-[38px] h-[38px] rounded-full overflow-hidden border-2 border-white ring-2 ring-[#D6E8EE] hover:ring-[#018ABE] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center bg-white"
                        >
                          {currentUser ? (
                            currentUser.avatarUrl ? (
                              <div className="w-full h-full relative">
                                <Image
                                  src={currentUser.avatarUrl}
                                  alt={currentUser.displayName}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#0B1F4B] to-[#018ABE] text-white flex items-center justify-center font-bold text-sm">
                                {currentUser.displayName.charAt(0).toUpperCase()}
                              </div>
                            )
                          ) : (
                            <div className="w-full h-full bg-[#D6E8EE] text-[#02457A] flex items-center justify-center font-bold text-xs">
                              SV
                            </div>
                          )}
                        </button>

                        {!accountPopupOpen && (
                          <div className="absolute top-full mt-2 right-0 px-2.5 py-1 rounded-lg bg-[#0B1F4B] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform group-hover:translate-y-0 translate-y-1 shadow-lg z-50">
                            <span>{currentUser ? currentUser.displayName : "Tài khoản"}</span>
                            <div className="absolute -top-1 right-4 w-2 h-2 bg-[#0B1F4B] rotate-45" />
                          </div>
                        )}

                        {accountPopupOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setAccountPopupOpen(false)}
                              aria-hidden="true"
                            />
                            <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-2xl bg-white border border-[#D6E8EE] shadow-xl p-2.5 z-50">
                              {currentUser ? (
                                <>
                                  <div className="space-y-1 text-xs">
                                    <Link
                                      href="/profile"
                                      onClick={() => setAccountPopupOpen(false)}
                                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-semibold transition-colors group"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <svg className="w-4 h-4 text-[#018ABE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                        </svg>
                                        <span>Hồ sơ cá nhân &amp; Cài đặt</span>
                                      </div>
                                      <svg className="w-4 h-4 text-slate-300 group-hover:text-[#018ABE] group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                      </svg>
                                    </Link>

                                    <Link
                                      href="/my-items"
                                      onClick={() => setAccountPopupOpen(false)}
                                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-semibold transition-colors group"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <svg className="w-4 h-4 text-[#018ABE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                        </svg>
                                        <span>Đồ của tôi</span>
                                      </div>
                                      <span className="text-[#018ABE] font-bold text-xs bg-[#D6E8EE]/50 px-2 py-0.5 rounded-full">
                                        {(userCounts.productsCount ?? userCounts.itemsCount) > 0 ? `${userCounts.productsCount ?? userCounts.itemsCount} món` : "0 món"}
                                      </span>
                                    </Link>

                                    <Link
                                      href="/orders"
                                      onClick={() => setAccountPopupOpen(false)}
                                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-semibold transition-colors group"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <svg className="w-4 h-4 text-[#018ABE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                        </svg>
                                        <span>Đơn hẹn xem hàng</span>
                                      </div>
                                      <span className="text-[#02457A] font-bold text-xs bg-[#D6E8EE]/50 px-2 py-0.5 rounded-full">
                                        {userCounts.ordersCount > 0 ? `${userCounts.ordersCount} đơn` : "0 đơn"}
                                      </span>
                                    </Link>

                                    <Link
                                      href="/verify-student"
                                      onClick={() => setAccountPopupOpen(false)}
                                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-semibold transition-colors group"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <svg className="w-4 h-4 text-[#018ABE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                                        </svg>
                                        <span>Xác minh thẻ sinh viên</span>
                                      </div>
                                      {currentUser.isStudentVerified ? (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                          ✓ Đã duyệt
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded bg-[#D6E8EE] text-[#02457A] text-[10px] font-bold">
                                          Huy hiệu SV
                                        </span>
                                      )}
                                    </Link>

                                    {currentUser.role === "ADMIN" && (
                                      <Link
                                        href="/admin"
                                        onClick={() => setAccountPopupOpen(false)}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#001B48]/5 hover:bg-[#001B48]/10 text-[#001B48] font-bold border border-[#D6E8EE]"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <svg className="w-4 h-4 text-[#018ABE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                          </svg>
                                          <span>Quản trị hệ thống</span>
                                        </div>
                                        <span className="px-1.5 py-0.5 rounded bg-[#018ABE]/10 text-[#018ABE] text-[10px] font-extrabold">
                                          ADMIN
                                        </span>
                                      </Link>
                                    )}
                                  </div>

                                  <div className="pt-2 mt-1 border-t border-[#D6E8EE]">
                                    <button
                                      type="button"
                                      onClick={handleLogout}
                                      className="w-full h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                      </svg>
                                      <span>Đăng xuất tài khoản</span>
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="p-1.5 space-y-3">
                                  <div className="pb-3 border-b border-[#D6E8EE]">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#018ABE]">
                                      Cộng đồng sinh viên UniCycle
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                      Nơi sinh viên có thể tìm mua, bán và trao đổi những món đồ cũ với nhau.
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <Link
                                      href="/login"
                                      onClick={() => setAccountPopupOpen(false)}
                                      className="w-full h-10 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-1"
                                    >
                                      <svg
                                        className="w-4 h-4 shrink-0"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                                        />
                                      </svg>
                                      <span>Đăng nhập</span>
                                    </Link>
                                    <Link
                                      href="/register"
                                      onClick={() => setAccountPopupOpen(false)}
                                      className="w-full h-9 rounded-xl border border-[#D6E8EE] hover:bg-[#F4F9FB] text-[#001B48] text-xs font-semibold flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                                    >
                                      Tạo tài khoản
                                    </Link>
                                  </div>
                                </div>
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
                              href="/profile"
                              onClick={() => setMobileMenuOpen(false)}
                              className="block px-3 py-2 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                            >
                              Hồ sơ cá nhân &amp; Quyền riêng tư
                            </Link>
                            <Link
                              href="/my-items"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                            >
                              <span>Đồ của tôi</span>
                              {currentUser && (userCounts.productsCount ?? userCounts.itemsCount) > 0 && (
                                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#D6E8EE] text-[#02457A]">
                                  {userCounts.productsCount ?? userCounts.itemsCount} món
                                </span>
                              )}
                            </Link>
                            <Link
                              href="/orders"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                            >
                              <span>Đơn hẹn xem hàng</span>
                              {currentUser && userCounts.ordersCount > 0 && (
                                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#018ABE] text-white">
                                  {userCounts.ordersCount} đơn
                                </span>
                              )}
                            </Link>
                            <Link
                              href="/verify-student"
                              onClick={() => setMobileMenuOpen(false)}
                              className="block px-3 py-2 rounded-xl hover:bg-[#F4F9FB] text-[#001B48] font-medium"
                            >
                              Xác minh thẻ sinh viên
                            </Link>
                            {currentUser?.role === "ADMIN" && (
                              <Link
                                href="/admin"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 rounded-xl bg-[#001B48] text-white font-bold"
                              >
                                🛡️ Quản trị hệ thống (/admin)
                              </Link>
                            )}
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
                            {currentUser.isStudentVerified ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                ✓ SV Đã duyệt
                              </span>
                            ) : (
                              <Link
                                href="/verify-student"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-[11px] font-bold text-[#02457A] bg-[#D6E8EE] px-2 py-0.5 rounded-full"
                              >
                                Xác minh SV
                              </Link>
                            )}
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

