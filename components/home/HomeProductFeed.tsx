"use client";

import React, { useState, useMemo } from "react";
import { ProductCard, ProductCardData } from "@/components/products/ProductCard";
import { CategoryGrid, CategoryItem } from "@/components/home/CategoryGrid";

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
  const [onlyPassport, setOnlyPassport] = useState<boolean>(false);
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

      // 3. Lọc chỉ đồ có Product Passport
      if (onlyPassport) {
        if (!product.item?.passportEnabled && !product.item?.passportId) {
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
  }, [initialProducts, activeCategorySlug, selectedSchoolId, onlyPassport, onlyFree, sortBy]);

  // Đếm nhanh số tin của từng tab
  const getTabCount = (slug: string) => {
    if (slug === "all") return initialProducts.length;
    if (slug === "goc-0d-cho-tang") {
      return initialProducts.filter(p => p.isFree || p.price === 0 || p.category?.slug === "goc-0d-cho-tang").length;
    }
    return initialProducts.filter(p => p.category?.slug === slug).length;
  };

  return (
    <>
      {/* 1. Lưới 6 Danh mục khám phá theo phong cách widget-categories-box trong index.html */}
      <CategoryGrid
        categories={categories}
        selectedSlug={activeCategorySlug}
        onSelectCategory={handleCategorySelect}
      />

      {/* 2. Feed Tin Đăng & Bộ lọc Tabs chuyên nghiệp (chuẩn phong cách widget-products-tabs từ index.html) */}
      <section className="py-8 sm:py-12 bg-white" id="live-feed">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header phân đoạn */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-[#D6E8EE]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#018ABE]">
                  Cập Nhật Trực Tiếp
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
                Món Đồ Đang Chờ Trao Tay
              </h2>
              <p className="text-xs sm:text-sm text-[#02457A] mt-1">
                Giao dịch an toàn trực tiếp tại cổng KTX & trường học, không lo lừa đảo chuyển khoản trước
              </p>
            </div>

            {/* Bộ lọc trường học & sắp xếp */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Dropdown chọn Trường / KTX */}
              <div className="relative">
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="h-10 pl-3 pr-8 rounded-xl border border-[#D6E8EE] bg-white text-xs sm:text-sm font-semibold text-[#001B48] focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="all">📍 Tất cả KTX & Trường</option>
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

              {/* Dropdown sắp xếp */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "price-asc" | "price-desc")}
                  className="h-10 pl-3 pr-8 rounded-xl border border-[#D6E8EE] bg-white text-xs sm:text-sm font-semibold text-[#001B48] focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="newest">🕒 Mới đăng nhất</option>
                  <option value="price-asc">💵 Giá sinh viên (Thấp - Cao)</option>
                  <option value="price-desc">💎 Giá trị (Cao - Thấp)</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#02457A]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Dải Tabs Lọc Danh Mục (theo chuẩn nav-tabs tabs-product st_3 từ index.html) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategorySlug("all")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategorySlug === "all"
                  ? "bg-[#001B48] text-white shadow-md shadow-[#001B48]/15"
                  : "bg-[#D6E8EE]/30 text-[#02457A] hover:bg-[#D6E8EE]/60"
              }`}
            >
              Tất cả đồ cũ ({getTabCount("all")})
            </button>

            {categories.map((cat) => {
              const isSelected = activeCategorySlug === cat.slug;
              const isFree = cat.slug === "goc-0d-cho-tang";
              const count = getTabCount(cat.slug);

              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setActiveCategorySlug(cat.slug)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    isSelected
                      ? isFree
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-[#018ABE] text-white shadow-md shadow-[#018ABE]/20"
                      : isFree
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-[#D6E8EE]/30 text-[#02457A] hover:bg-[#D6E8EE]/60"
                  }`}
                >
                  {isFree && <span>🎁</span>}
                  <span>{cat.name}</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-[#02457A]/10 text-[#02457A]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Công tắc lọc phụ: Chỉ đồ có Passport + Góc 0đ */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setOnlyPassport(!onlyPassport)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border ${
                onlyPassport
                  ? "bg-[#018ABE] text-white border-[#018ABE]"
                  : "bg-white text-[#02457A] border-[#D6E8EE] hover:border-[#018ABE]"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Chỉ hiện món có Hộ chiếu Product Passport</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyFree(!onlyFree)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border ${
                onlyFree
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-200 hover:border-emerald-500"
              }`}
            >
              <span>🎁 Chỉ hiện đồ tặng 0đ</span>
            </button>

            {(activeCategorySlug !== "all" || selectedSchoolId !== "all" || onlyPassport || onlyFree) && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategorySlug("all");
                  setSelectedSchoolId("all");
                  setOnlyPassport(false);
                  setOnlyFree(false);
                }}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>

          {/* 3. Lưới hiển thị các thẻ món đồ (Responsive 4 cột desktop, 3 tablet, 2 mobile) */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#D6E8EE]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#D6E8EE]/50 flex items-center justify-center text-[#018ABE]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#001B48] mb-1">Không tìm thấy món đồ nào phù hợp</h3>
              <p className="text-xs sm:text-sm text-[#02457A] mb-4">
                Hãy thử chọn &quot;Tất cả KTX &amp; Trường&quot; hoặc bỏ bớt các tiêu chí lọc để xem thêm nhiều đồ cũ sinh viên hơn.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategorySlug("all");
                  setSelectedSchoolId("all");
                  setOnlyPassport(false);
                  setOnlyFree(false);
                }}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors cursor-pointer"
              >
                Xem tất cả món đồ
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

