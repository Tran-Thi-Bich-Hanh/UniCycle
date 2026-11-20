"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ProductCard, ProductCardData } from "@/components/products/ProductCard";
import { CategoryGrid, CategoryItem } from "@/components/home/CategoryGrid";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface SchoolOption {
  id: string;
  name: string;
  shortName: string;
}

interface HomeProductFeedProps {
  initialProducts: ProductCardData[];
  categories: CategoryItem[];
  schools: SchoolOption[];
}

export function HomeProductFeed({
  initialProducts,
  categories,
  schools,
}: HomeProductFeedProps) {
  // Trạng thái bộ lọc
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>("all");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [onlyVerifiedStudent, setOnlyVerifiedStudent] = useState<boolean>(false);
  const [onlyFree, setOnlyFree] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">("newest");

  // Xử lý click chọn danh mục từ CategoryGrid
  const handleCategorySelect = (slug: string) => {
    if (activeCategorySlug === slug) {
      setActiveCategorySlug("all");
    } else {
      setActiveCategorySlug(slug);
    }
  };

  // Lọc và sắp xếp sản phẩm
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      // 1. Lọc theo danh mục
      if (activeCategorySlug !== "all") {
        if (activeCategorySlug === "goc-0d-cho-tang") {
          if (!product.isFree && product.price > 0 && product.category?.slug !== "goc-0d-cho-tang") {
            return false;
          }
        } else if (product.category?.slug !== activeCategorySlug) {
          return false;
        }
      }

      // 2. Lọc theo trường / KTX
      if (selectedSchoolId !== "all") {
        if (product.school?.id !== selectedSchoolId) {
          return false;
        }
      }

      // 3. Lọc chỉ tin từ sinh viên đã xác minh
      if (onlyVerifiedStudent) {
        if (!product.seller.isStudentVerified) {
          return false;
        }
      }

      // 4. Lọc chỉ đồ 0đ Cho Tặng
      if (onlyFree) {
        if (!product.isFree && product.price > 0) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "price-asc") {
        return a.price - b.price;
      }
      if (sortBy === "price-desc") {
        return b.price - a.price;
      }
      return 0; // Mặc định mới nhất
    });
  }, [initialProducts, activeCategorySlug, selectedSchoolId, onlyVerifiedStudent, onlyFree, sortBy]);

  const activeCategoryName = useMemo(() => {
    if (activeCategorySlug === "all") return null;
    if (activeCategorySlug === "goc-0d-cho-tang") return "Đồ tặng miễn phí";
    return categories.find((c) => c.slug === activeCategorySlug)?.name ?? null;
  }, [activeCategorySlug, categories]);

  const hasAnyFilter =
    activeCategorySlug !== "all" ||
    selectedSchoolId !== "all" ||
    onlyVerifiedStudent ||
    onlyFree;

  const resetAllFilters = () => {
    setActiveCategorySlug("all");
    setSelectedSchoolId("all");
    setOnlyVerifiedStudent(false);
    setOnlyFree(false);
  };

  return (
    <section
      className="py-10 sm:py-14 bg-[#F8FAFC] border-t border-[#D6E8EE]/70"
      id="live-feed"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up">
          {/* Tiêu đề mục gộp: Danh mục & Sản phẩm mới đăng */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
                Sản phẩm mới đăng
              </h2>
              <p className="text-xs sm:text-sm text-[#02457A] mt-1">
                Chọn danh mục bên dưới để lọc đồ quanh trường rồi nhắn trực tiếp cho người bán.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#02457A] hover:text-[#018ABE] transition-colors group shrink-0"
            >
              <span>Xem tất cả</span>
              <span
                className="group-hover:translate-x-0.5 transition-transform"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </div>
        </ScrollReveal>

        {/* Lưới 6 danh mục nhúng trực tiếp */}
        <CategoryGrid
          embedded
          categories={categories}
          selectedSlug={activeCategorySlug}
          onSelectCategory={handleCategorySelect}
        />

        <ScrollReveal variant="fade-up">
          {/* Thanh công cụ lọc nhanh (trái) & Khu vực + Sắp xếp (phải) trên cùng một hàng */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#D6E8EE]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategorySlug("all");
                    setOnlyVerifiedStudent(false);
                    setOnlyFree(false);
                  }}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
                    activeCategorySlug === "all" && !onlyVerifiedStudent && !onlyFree
                      ? "bg-[#001B48] text-white border-[#001B48] shadow-xs"
                      : "bg-[#D6E8EE]/30 text-[#02457A] border-transparent hover:bg-[#D6E8EE]/60"
                  }`}
                >
                  Tất cả sản phẩm
                </button>

                {activeCategoryName && (
                  <button
                    type="button"
                    onClick={() => setActiveCategorySlug("all")}
                    className="h-9 px-3 rounded-xl text-xs font-bold bg-[#018ABE]/10 text-[#018ABE] border border-[#018ABE]/30 hover:bg-[#018ABE]/20 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>{activeCategoryName}</span>
                    <span aria-hidden="true">×</span>
                  </button>
                )}

                <button
                  type="button"
                  aria-pressed={onlyVerifiedStudent}
                  onClick={() => setOnlyVerifiedStudent((prev) => !prev)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border whitespace-nowrap ${
                    onlyVerifiedStudent
                      ? "bg-[#018ABE] text-white border-[#018ABE] shadow-xs"
                      : "bg-white text-[#02457A] border-[#D6E8EE] hover:border-[#018ABE]"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <span>Sinh viên đã xác minh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnlyFree(!onlyFree)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border ${
                    onlyFree
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-emerald-700 border-emerald-200 hover:border-emerald-500"
                  }`}
                >
                  <svg className={`w-3.5 h-3.5 shrink-0 ${onlyFree ? "text-white" : "text-emerald-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <span>Chỉ xem đồ miễn phí</span>
                </button>

                {hasAnyFilter && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-2.5 py-1.5 text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>

              {/* Bộ lọc khu vực & sắp xếp */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="relative">
                  <select
                    aria-label="Lọc theo khu vực"
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-xl border border-[#D6E8EE] bg-white text-xs sm:text-sm font-semibold text-[#001B48] focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">Tất cả khu vực</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shortName}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#02457A]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="relative">
                  <select
                    aria-label="Sắp xếp sản phẩm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "newest" | "price-asc" | "price-desc")}
                    className="h-9 pl-3 pr-8 rounded-xl border border-[#D6E8EE] bg-white text-xs sm:text-sm font-semibold text-[#001B48] focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none appearance-none cursor-pointer"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="price-asc">Giá thấp đến cao</option>
                    <option value="price-desc">Giá cao đến thấp</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#02457A]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Lưới hiển thị các thẻ món đồ (Responsive 4 cột desktop, 3 tablet, 2 mobile) */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-[#D6E8EE]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#D6E8EE]/50 flex items-center justify-center text-[#018ABE]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#001B48] mb-1">Chưa có món đồ nào khớp bộ lọc này</h3>
              <p className="text-xs sm:text-sm text-[#02457A] mb-4">
                Thử đổi về &quot;Tất cả khu vực&quot; hoặc bỏ bớt bộ lọc để xem thêm tin đăng khác.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors cursor-pointer"
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          )}
      </div>
    </section>
  );
}

