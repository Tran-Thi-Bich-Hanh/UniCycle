"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ProductCard, ProductCardData } from "@/components/products/ProductCard";
import { CategoryItem } from "@/components/home/CategoryGrid";
import { removeVietnameseTones } from "@/lib/utils/vietnamese";

interface SchoolOption {
  id: string;
  name: string;
  shortName: string;
}

interface ProductsExplorerProps {
  initialProducts: ProductCardData[];
  categories: CategoryItem[];
  schools: SchoolOption[];
  initialQuery?: string;
  initialCategory?: string;
  initialCampus?: string;
}

const PRICE_RANGES = [
  { label: "Tất cả mức giá", min: undefined, max: undefined },
  { label: "🎁 0đ Cho Tặng", min: 0, max: 0, isFreeOnly: true },
  { label: "Dưới 100.000 ₫", min: 1, max: 100000 },
  { label: "100.000 ₫ - 300.000 ₫", min: 100000, max: 300000 },
  { label: "Trên 300.000 ₫", min: 300000, max: undefined },
];

const CONDITIONS = [
  { label: "Tất cả tình trạng", value: "all" },
  { label: "Mới 99%", value: "99%" },
  { label: "Mới 98%", value: "98%" },
  { label: "Còn rất tốt", value: "Còn rất tốt" },
  { label: "Đã sử dụng", value: "Đã sử dụng" },
];

export function ProductsExplorer({
  initialProducts,
  categories,
  schools,
  initialQuery = "",
  initialCategory = "all",
  initialCampus = "all",
}: ProductsExplorerProps) {
  // Trạng thái bộ lọc
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedCampus, setSelectedCampus] = useState(initialCampus);
  const [selectedPriceIndex, setSelectedPriceIndex] = useState(0);
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [onlyPassport, setOnlyPassport] = useState(false);
  const [onlyVerifiedStudent, setOnlyVerifiedStudent] = useState(false);
  const [sortBy, setSortBy] = useState<"verified" | "newest" | "price_asc" | "price_desc">("verified");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Lọc dữ liệu client-side tức thì
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((p) => {
        // 1. Tìm kiếm theo từ khóa (tiếng Việt có/không dấu)
        if (searchQuery.trim()) {
          const normQ = removeVietnameseTones(searchQuery);
          const normTitle = removeVietnameseTones(p.title);
          const normCat = p.category ? removeVietnameseTones(p.category.name) : "";
          const normSchool = p.school ? removeVietnameseTones(p.school.name + " " + p.school.shortName) : "";

          if (
            !normTitle.includes(normQ) &&
            !normCat.includes(normQ) &&
            !normSchool.includes(normQ)
          ) {
            return false;
          }
        }

        // 2. Lọc theo danh mục
        if (selectedCategory !== "all") {
          if (selectedCategory === "goc-0d-cho-tang") {
            if (!p.isFree && p.price > 0 && p.category?.slug !== "goc-0d-cho-tang") {
              return false;
            }
          } else if (p.category?.slug !== selectedCategory) {
            return false;
          }
        }

        // 3. Lọc theo Trường / KTX
        if (selectedCampus !== "all") {
          if (
            p.school?.id !== selectedCampus &&
            p.school?.shortName !== selectedCampus
          ) {
            return false;
          }
        }

        // 4. Lọc theo khoảng giá
        const priceRange = PRICE_RANGES[selectedPriceIndex];
        if (priceRange.isFreeOnly) {
          if (!p.isFree && p.price > 0) return false;
        } else {
          if (priceRange.min !== undefined && p.price < priceRange.min) return false;
          if (priceRange.max !== undefined && p.price > priceRange.max) return false;
        }

        // 5. Lọc theo tình trạng
        if (selectedCondition !== "all") {
          if (!p.condition.toLowerCase().includes(selectedCondition.toLowerCase())) {
            return false;
          }
        }

        // 6. Lọc chỉ đồ có Product Passport
        if (onlyPassport) {
          if (!p.item?.passportEnabled && !p.item?.passportId) {
            return false;
          }
        }

        // 7. Lọc chỉ người bán sinh viên đã xác minh
        if (onlyVerifiedStudent) {
          if (!p.seller.isStudentVerified) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "verified") {
          const aV = a.seller.isStudentVerified ? 1 : 0;
          const bV = b.seller.isStudentVerified ? 1 : 0;
          if (aV !== bV) return bV - aV;
          return 0;
        }
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "price_desc") return b.price - a.price;
        return 0;
      });
  }, [
    initialProducts,
    searchQuery,
    selectedCategory,
    selectedCampus,
    selectedPriceIndex,
    selectedCondition,
    onlyPassport,
    onlyVerifiedStudent,
    sortBy,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCampus("all");
    setSelectedPriceIndex(0);
    setSelectedCondition("all");
    setOnlyPassport(false);
    setOnlyVerifiedStudent(false);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "all" ||
    selectedCampus !== "all" ||
    selectedPriceIndex !== 0 ||
    selectedCondition !== "all" ||
    onlyPassport ||
    onlyVerifiedStudent;

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Tiêu đề trang */}
        <div className="mb-6 sm:mb-8">
          <nav className="flex items-center gap-2 text-xs text-[#02457A] mb-2 font-medium">
            <Link href="/" className="hover:text-[#018ABE]">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-[#001B48] font-bold">Khám phá đồ cũ</span>
            {selectedCategory !== "all" && (
              <>
                <span>/</span>
                <span className="text-[#018ABE] font-bold">
                  {categories.find((c) => c.slug === selectedCategory)?.name}
                </span>
              </>
            )}
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
                Sàn Trao Đổi Đồ Cũ Sinh Viên
              </h1>
              <p className="text-xs sm:text-sm text-[#02457A] mt-1">
                Tìm kiếm thông minh quanh các trường ĐH và KTX TP.HCM
              </p>
            </div>

            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden h-11 px-4 rounded-xl bg-white border border-[#D6E8EE] text-sm font-bold text-[#001B48] inline-flex items-center justify-center gap-2 shadow-2xs"
            >
              <svg className="w-4 h-4 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Bộ lọc tìm kiếm</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#018ABE]" />
              )}
            </button>
          </div>
        </div>

        {/* Bố cục 2 cột: Sidebar Bộ Lọc (Trái) + Lưới Sản Phẩm (Phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Cột Trái (3/12): Sidebar Bộ lọc trên Desktop */}
          <aside className="hidden lg:block lg:col-span-3 bg-white rounded-2xl border border-[#D6E8EE] p-5 shadow-xs space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6E8EE]">
              <h3 className="font-extrabold text-[#001B48] text-base flex items-center gap-2">
                <svg className="w-4 h-4 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.539.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.378-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                <span>Bộ lọc chi tiết</span>
              </h3>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Ô tìm kiếm từ khóa */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-2 uppercase tracking-wider">
                Từ khóa tìm kiếm
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Gõ có dấu hoặc không dấu..."
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#D6E8EE] text-xs text-[#001B48] focus:outline-none focus:border-[#018ABE]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Lọc theo Trường / KTX */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-2 uppercase tracking-wider">
                Khu vực Trường / KTX
              </label>
              <div className="relative">
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-[#D6E8EE] bg-white text-xs font-semibold text-[#001B48] focus:outline-none focus:border-[#018ABE] cursor-pointer appearance-none"
                >
                  <option value="all">Tất cả KTX &amp; Trường</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#02457A]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Lọc theo Danh mục */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-2 uppercase tracking-wider">
                Danh mục đồ dùng
              </label>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-[#001B48] text-white"
                      : "text-[#02457A] hover:bg-[#D6E8EE]/30"
                  }`}
                >
                  <span>Tất cả danh mục</span>
                  <span>{initialProducts.length}</span>
                </button>
                {categories.map((c) => {
                  const isSelected = selectedCategory === c.slug;
                  const isFree = c.slug === "goc-0d-cho-tang";
                  const count = initialProducts.filter((p) =>
                    isFree ? p.isFree || p.price === 0 : p.category?.slug === c.slug
                  ).length;

                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setSelectedCategory(c.slug)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? isFree
                            ? "bg-emerald-600 text-white"
                            : "bg-[#018ABE] text-white"
                          : isFree
                          ? "text-emerald-800 hover:bg-emerald-50"
                          : "text-[#02457A] hover:bg-[#D6E8EE]/30"
                      }`}
                    >
                      <span className="truncate">
                        {isFree ? "🎁 " : ""}
                        {c.name}
                      </span>
                      <span className="text-[11px] opacity-80">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lọc theo Khoảng giá */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-2 uppercase tracking-wider">
                Khoảng giá sinh viên
              </label>
              <div className="space-y-1.5">
                {PRICE_RANGES.map((pr, idx) => (
                  <label
                    key={pr.label}
                    className="flex items-center gap-2 text-xs font-medium text-[#02457A] cursor-pointer hover:text-[#001B48]"
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      checked={selectedPriceIndex === idx}
                      onChange={() => setSelectedPriceIndex(idx)}
                      className="accent-[#018ABE]"
                    />
                    <span>{pr.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Lọc theo Tình trạng */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-2 uppercase tracking-wider">
                Tình trạng món đồ
              </label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D6E8EE] bg-white text-xs font-semibold text-[#001B48] focus:outline-none focus:border-[#018ABE] cursor-pointer"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Công tắc đặc biệt */}
            <div className="pt-3 border-t border-[#D6E8EE] space-y-2.5">
              <label className="flex items-center gap-2 text-xs font-bold text-[#02457A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyPassport}
                  onChange={(e) => setOnlyPassport(e.target.checked)}
                  className="rounded-sm accent-[#018ABE]"
                />
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span>Có Digital Passport</span>
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-[#02457A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyVerifiedStudent}
                  onChange={(e) => setOnlyVerifiedStudent(e.target.checked)}
                  className="rounded-sm accent-emerald-600"
                />
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>SV Đã xác minh</span>
                </span>
              </label>
            </div>
          </aside>

          {/* Cột Phải (9/12): Danh Sách Sản Phẩm & Thanh Công Cụ */}
          <main className="lg:col-span-9 space-y-4">
            {/* Thanh sắp xếp & Thống kê kết quả */}
            <div className="bg-white rounded-2xl border border-[#D6E8EE] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="text-xs sm:text-sm font-bold text-[#001B48]">
                Tìm thấy{" "}
                <span className="text-[#018ABE] text-base">{filteredProducts.length}</span>{" "}
                món đồ phù hợp
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-[#02457A] font-semibold whitespace-nowrap">
                  Sắp xếp:
                </span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "verified" | "newest" | "price_asc" | "price_desc")}
                    className="h-9 pl-3 pr-8 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] text-xs font-bold text-[#001B48] focus:outline-none focus:border-[#018ABE] cursor-pointer appearance-none"
                  >
                    <option value="verified">Ưu tiên SV Đã duyệt</option>
                    <option value="newest">Mới đăng nhất</option>
                    <option value="price_asc">Giá: Thấp đến Cao</option>
                    <option value="price_desc">Giá: Cao đến Thấp</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#02457A]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Lưới sản phẩm Responsive */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#D6E8EE] shadow-2xs">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#D6E8EE]/40 flex items-center justify-center text-2xl">
                  🔍
                </div>
                <h3 className="text-lg font-bold text-[#001B48] mb-1">
                  Không tìm thấy món đồ phù hợp
                </h3>
                <p className="text-xs sm:text-sm text-[#02457A] max-w-md mx-auto mb-5 leading-relaxed">
                  Hãy thử gõ từ khóa không dấu, chọn &quot;Tất cả mức giá&quot; hoặc chọn &quot;Tất cả KTX &amp; Trường&quot; để tìm thấy nhiều đồ hơn.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 px-5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Xóa toàn bộ bộ lọc
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Modal / Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#001B48]/60 backdrop-blur-xs"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative w-[85%] max-w-sm bg-white h-full flex flex-col justify-between overflow-y-auto z-10 p-5 shadow-2xl ml-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#D6E8EE]">
                <h3 className="font-extrabold text-[#001B48] text-base">Bộ lọc tìm kiếm</h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="text-slate-400 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Ô tìm kiếm */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] mb-1.5">Từ khóa</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Gõ có/không dấu..."
                  className="w-full h-10 px-3 rounded-xl border border-[#D6E8EE] text-xs text-[#001B48]"
                />
              </div>

              {/* Trường KTX */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] mb-1.5">Khu vực</label>
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D6E8EE] bg-white text-xs font-bold text-[#001B48]"
                >
                  <option value="all">Tất cả KTX &amp; Trường</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Danh mục */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] mb-1.5">Danh mục</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D6E8EE] bg-white text-xs font-bold text-[#001B48]"
                >
                  <option value="all">Tất cả danh mục</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mức giá */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] mb-1.5">Khoảng giá</label>
                <div className="space-y-1.5">
                  {PRICE_RANGES.map((pr, idx) => (
                    <label key={pr.label} className="flex items-center gap-2 text-xs text-[#02457A]">
                      <input
                        type="radio"
                        name="mobilePrice"
                        checked={selectedPriceIndex === idx}
                        onChange={() => setSelectedPriceIndex(idx)}
                        className="accent-[#018ABE]"
                      />
                      <span>{pr.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#D6E8EE] flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="w-1/2 h-11 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
              >
                Xóa lọc
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-1/2 h-11 rounded-xl bg-[#018ABE] text-white text-xs font-bold"
              >
                Xem {filteredProducts.length} món
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
