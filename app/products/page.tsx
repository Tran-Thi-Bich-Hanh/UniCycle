"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Product, Category } from "@/lib/db";
import { formatCurrencyVND, CONDITION_LABELS } from "@/lib/utils";
import { CategoryGlyph, IconPackage, IconSearchOff, IconSparkles, IconX } from "@/components/icons";

const SORT_OPTIONS = [
  { value: "newest", label: "Mới đăng nhất" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "views", label: "Xem nhiều nhất" },
];

const PRICE_PRESETS = [
  { label: "Tất cả mức giá", min: "", max: "" },
  { label: "Dưới 50k", min: "", max: "50000" },
  { label: "50k - 200k", min: "50000", max: "200000" },
  { label: "200k - 500k", min: "200000", max: "500000" },
  { label: "500k - 1 triệu", min: "500000", max: "1000000" },
  { label: "Trên 1 triệu", min: "1000000", max: "" },
];

/** Trả về danh sách trang gọn: luôn có trang đầu/cuối và 1 trang kề trang hiện tại. */
function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = Array.from(pages).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

function ProductsExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Params from URL
  const currentSearch = searchParams.get("search") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentCondition = searchParams.get("condition") || "";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // Local state for immediate inputs
  const [keywordInput, setKeywordInput] = useState(currentSearch);
  const [minPriceInput, setMinPriceInput] = useState(currentMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(currentMaxPrice);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Sync inputs with URL params
  useEffect(() => {
    setKeywordInput(currentSearch);
    setMinPriceInput(currentMinPrice);
    setMaxPriceInput(currentMaxPrice);
  }, [currentSearch, currentMinPrice, currentMaxPrice]);

  // Load categories once
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
        }
      })
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // Fetch products whenever URL searchParams change (huỷ request cũ để tránh kết quả lệch)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = searchParams.toString();
    fetch(`/api/products?${query}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        if (data.pagination) {
          setTotal(data.pagination.total || 0);
          setTotalPages(data.pagination.totalPages || 1);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Failed to fetch products:", err);
        setLoading(false);
      });
    return () => controller.abort();
  }, [searchParams]);

  // Đóng drawer bộ lọc bằng phím Esc
  useEffect(() => {
    if (!mobileFilterOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileFilterOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileFilterOpen]);

  // Update query params helper
  const updateFilters = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "" || val === undefined) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val);
      }
    });

    // Reset to page 1 whenever filters change (unless updating page itself)
    const isPageChange = "page" in updates;
    if (!isPageChange) {
      nextParams.delete("page");
    }

    const url = `/products?${nextParams.toString()}`;
    startTransition(() => {
      // Đổi bộ lọc dùng replace để nút Back không bị "kẹt" qua từng lần tick checkbox;
      // đổi trang vẫn push để Back quay lại trang trước.
      if (isPageChange) {
        router.push(url, { scroll: false });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.replace(url, { scroll: false });
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: keywordInput.trim() || null });
  };

  const handleCategorySelect = (slug: string) => {
    if (currentCategory === slug) {
      updateFilters({ category: null });
    } else {
      updateFilters({ category: slug });
    }
  };

  const handleConditionToggle = (code: string) => {
    const existing = currentCondition ? currentCondition.split(",").filter(Boolean) : [];
    let updated: string[];
    if (existing.includes(code)) {
      updated = existing.filter((c) => c !== code);
    } else {
      updated = [...existing, code];
    }
    updateFilters({ condition: updated.length > 0 ? updated.join(",") : null });
  };

  const handlePricePreset = (min: string, max: string) => {
    setMinPriceInput(min);
    setMaxPriceInput(max);
    updateFilters({ minPrice: min || null, maxPrice: max || null });
  };

  const handleApplyCustomPrice = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({
      minPrice: minPriceInput.trim() || null,
      maxPrice: maxPriceInput.trim() || null,
    });
  };

  const handleResetFilters = () => {
    setKeywordInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    startTransition(() => {
      router.replace("/products", { scroll: false });
    });
  };

  const activeFilterCount =
    (currentSearch ? 1 : 0) +
    (currentCategory ? 1 : 0) +
    (currentCondition ? currentCondition.split(",").filter(Boolean).length : 0) +
    (currentMinPrice || currentMaxPrice ? 1 : 0);

  const activeCategoryObj = categories.find(
    (c) => c.slug === currentCategory || c.id === currentCategory
  );
  const activeConditions = currentCondition.split(",").filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb & Tiêu đề trang */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-xs text-[#02457A] mb-2 font-medium">
            <Link href="/" className="hover:text-[#018ABE] transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-[#001B48] font-bold">Khám phá đồ dùng</span>
            {activeCategoryObj && (
              <>
                <span>/</span>
                <span className="text-[#018ABE]">{activeCategoryObj.name}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
                {currentSearch ? (
                  <>
                    Kết quả tìm kiếm cho <span className="text-[#018ABE]">"{currentSearch}"</span>
                  </>
                ) : activeCategoryObj ? (
                  activeCategoryObj.name
                ) : (
                  "Tất cả đồ dùng sinh viên"
                )}
              </h1>
              <p className="text-sm text-[#02457A] mt-1 font-medium">
                Tìm thấy{" "}
                <span className="font-extrabold text-[#001B48]">{loading ? "..." : total}</span> món
                đồ trao đổi uy tín trong cộng đồng sinh viên
              </p>
            </div>

            {/* Mobile Filter Button */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#97CADB] bg-[#D6E8EE]/40 text-sm font-bold text-[#001B48] hover:bg-[#D6E8EE] transition-colors"
              >
                <svg className="w-4 h-4 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Bộ lọc {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
              </button>

              {/* Mobile Sort Dropdown */}
              <select
                value={currentSort}
                onChange={(e) => updateFilters({ sort: e.target.value })}
                className="px-3 py-2.5 rounded-xl border border-[#D6E8EE] bg-white text-xs font-semibold text-[#001B48] focus:outline-hidden focus:border-[#018ABE]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Thanh chip bộ lọc đang hoạt động (Active filters pill) */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-[#D6E8EE]/60">
              <span className="text-xs font-semibold text-[#02457A]">Đang lọc:</span>

              {currentSearch && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D6E8EE] text-[#001B48] border border-[#97CADB]">
                  Từ khóa: "{currentSearch}"
                  <button
                    onClick={() => {
                      setKeywordInput("");
                      updateFilters({ search: null });
                    }}
                    aria-label="Xóa bộ lọc từ khóa" className="p-0.5 rounded-full hover:text-red-600 transition-colors"
                  ><IconX className="w-3.5 h-3.5" /></button>
                </span>
              )}

              {activeCategoryObj && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D6E8EE] text-[#001B48] border border-[#97CADB]">
                  <CategoryGlyph name={activeCategoryObj.icon} className="w-3.5 h-3.5 text-[#018ABE]" /> {activeCategoryObj.name}
                  <button
                    onClick={() => updateFilters({ category: null })}
                    aria-label="Xóa bộ lọc danh mục" className="p-0.5 rounded-full hover:text-red-600 transition-colors"
                  ><IconX className="w-3.5 h-3.5" /></button>
                </span>
              )}

              {activeConditions.map((cond) => (
                <span
                  key={cond}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D6E8EE] text-[#001B48] border border-[#97CADB]"
                >
                  {CONDITION_LABELS[cond]?.label || cond}
                  <button
                    onClick={() => handleConditionToggle(cond)}
                    aria-label="Bỏ lọc tình trạng" className="p-0.5 rounded-full hover:text-red-600 transition-colors"
                  ><IconX className="w-3.5 h-3.5" /></button>
                </span>
              ))}

              {(currentMinPrice || currentMaxPrice) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D6E8EE] text-[#001B48] border border-[#97CADB]">
                  {currentMinPrice && currentMaxPrice
                    ? `${formatCurrencyVND(Number(currentMinPrice))} - ${formatCurrencyVND(Number(currentMaxPrice))}`
                    : currentMinPrice
                    ? `Từ ${formatCurrencyVND(Number(currentMinPrice))}`
                    : `Đến ${formatCurrencyVND(Number(currentMaxPrice))}`}
                  <button
                    onClick={() => {
                      setMinPriceInput("");
                      setMaxPriceInput("");
                      updateFilters({ minPrice: null, maxPrice: null });
                    }}
                    aria-label="Xóa bộ lọc khoảng giá" className="p-0.5 rounded-full hover:text-red-600 transition-colors"
                  ><IconX className="w-3.5 h-3.5" /></button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-[#018ABE] hover:underline ml-1"
              >
                Xóa tất cả
              </button>
            </div>
          )}
        </div>

        {/* Layout: Sidebar + Product Grid */}
        <div className="flex gap-8 items-start">
          {/* DESKTOP SIDEBAR */}
          <aside className="hidden lg:block w-64 shrink-0 bg-white rounded-2xl border border-[#D6E8EE] p-5 sticky top-20 shadow-2xs space-y-6">
            {/* Header bộ lọc */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D6E8EE]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <h3 className="font-extrabold text-[#001B48] text-base">Bộ lọc tìm kiếm</h3>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-[#018ABE] hover:underline font-semibold"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Tìm kiếm từ khóa */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                Tìm từ khóa
              </label>
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Giáo trình, tai nghe..."
                  aria-label="Tìm từ khóa"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-white rounded-xl border border-[#D6E8EE] text-[#001B48] placeholder-[#02457A]/50 focus:outline-hidden focus:border-[#018ABE] focus:ring-1 focus:ring-[#018ABE]"
                />
                <button
                  type="submit"
                  aria-label="Tìm kiếm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#02457A] hover:text-[#018ABE]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Danh mục sản phẩm */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2.5">
                Danh mục
              </label>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => updateFilters({ category: null })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    !currentCategory
                      ? "bg-[#02457A] text-white shadow-2xs"
                      : "text-[#001B48] hover:bg-[#D6E8EE]/40"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconSparkles className="w-4 h-4 shrink-0" />
                    <span>Tất cả danh mục</span>
                  </span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${!currentCategory ? "bg-white/20 text-white" : "bg-[#D6E8EE] text-[#001B48]"}`}>
                    {categories.reduce((acc, c) => acc + (c.product_count || 0), 0)}
                  </span>
                </button>

                {categories.map((cat) => {
                  const isSelected = currentCategory === cat.slug || currentCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.slug)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[#02457A] text-white shadow-2xs"
                          : "text-[#001B48] hover:bg-[#D6E8EE]/40"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <CategoryGlyph name={cat.icon} className="w-4 h-4 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </span>
                      {typeof cat.product_count === "number" && (
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded-full shrink-0 ${
                            isSelected ? "bg-white/20 text-white" : "bg-[#D6E8EE] text-[#001B48]"
                          }`}
                        >
                          {cat.product_count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tình trạng sản phẩm */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2.5">
                Tình trạng
              </label>
              <div className="space-y-2">
                {Object.entries(CONDITION_LABELS).map(([code, meta]) => {
                  const checked = activeConditions.includes(code);
                  return (
                    <label
                      key={code}
                      className="flex items-center gap-2.5 text-xs text-[#001B48] font-medium cursor-pointer hover:text-[#018ABE] select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleConditionToggle(code)}
                        className="w-4 h-4 rounded-sm border-[#97CADB] text-[#018ABE] focus:ring-[#018ABE] cursor-pointer"
                      />
                      <span>{meta.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Khoảng giá */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2.5">
                Khoảng giá (VND)
              </label>
              {/* Presets */}
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {PRICE_PRESETS.slice(1).map((preset) => {
                  const isPresetActive =
                    currentMinPrice === preset.min && currentMaxPrice === preset.max;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePricePreset(preset.min, preset.max)}
                      className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border text-center transition-all ${
                        isPresetActive
                          ? "bg-[#018ABE] text-white border-[#018ABE]"
                          : "bg-white text-[#02457A] border-[#D6E8EE] hover:border-[#97CADB]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Tùy chỉnh khoảng giá */}
              <form onSubmit={handleApplyCustomPrice} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Từ"
                    aria-label="Giá từ (VND)"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D6E8EE] text-[#001B48] focus:border-[#018ABE] focus:outline-hidden"
                  />
                  <span className="text-xs text-[#02457A] font-bold">-</span>
                  <input
                    type="number"
                    placeholder="Đến"
                    aria-label="Giá đến (VND)"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D6E8EE] text-[#001B48] focus:border-[#018ABE] focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 text-xs font-bold text-white bg-[#02457A] hover:bg-[#001B48] rounded-lg transition-colors shadow-2xs"
                >
                  Áp dụng giá
                </button>
              </form>
            </div>
          </aside>

          {/* MAIN PRODUCT LIST */}
          <div className="flex-1 min-w-0">
            {/* Top Toolbar (Desktop): Sắp xếp & Thống kê */}
            <div className="hidden lg:flex items-center justify-between pb-4 mb-4 border-b border-[#D6E8EE]">
              <div className="text-sm font-semibold text-[#02457A]">
                Hiển thị{" "}
                <span className="font-extrabold text-[#001B48]">
                  {products.length}
                </span>{" "}
                / {total} sản phẩm
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#02457A]">Sắp xếp:</span>
                <select
                  value={currentSort}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="px-3 py-1.5 rounded-xl border border-[#D6E8EE] bg-white text-xs font-bold text-[#001B48] focus:outline-hidden focus:border-[#018ABE] cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Trạng thái đang tải (Loading Skeleton) */}
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="animate-pulse bg-white rounded-2xl border border-[#D6E8EE] p-4 flex flex-col gap-3"
                  >
                    <div className="w-full aspect-4/3 bg-[#D6E8EE]/60 rounded-xl" />
                    <div className="h-4 bg-[#D6E8EE]/70 rounded-md w-3/4" />
                    <div className="h-4 bg-[#D6E8EE]/40 rounded-md w-1/2" />
                    <div className="flex justify-between items-center mt-2">
                      <div className="h-5 bg-[#D6E8EE]/80 rounded-md w-1/3" />
                      <div className="h-4 bg-[#D6E8EE]/40 rounded-md w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                {/* Lưới sản phẩm */}
                <div
                  aria-busy={loading}
                  className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 transition-opacity ${
                    loading ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Phân trang (Pagination) */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => updateFilters({ page: (currentPage - 1).toString() })}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#D6E8EE] bg-white text-[#001B48] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#D6E8EE]/30 transition-colors"
                    >
                      ← Trang trước
                    </button>

                    <div className="flex items-center gap-1">
                      {pageWindow(currentPage, totalPages).map((p, i) => {
                        if (p === "gap") {
                          return (
                            <span key={`gap-${i}`} aria-hidden="true" className="w-6 text-center text-[#02457A]">
                              …
                            </span>
                          );
                        }
                        const isActive = p === currentPage;
                        return (
                          <button
                            key={p}
                            aria-label={`Trang ${p}`}
                            aria-current={isActive ? "page" : undefined}
                            type="button"
                            onClick={() => updateFilters({ page: p.toString() })}
                            className={`w-9 h-9 text-xs font-extrabold rounded-xl transition-all ${
                              isActive
                                ? "bg-[#018ABE] text-white shadow-2xs"
                                : "bg-white text-[#001B48] border border-[#D6E8EE] hover:bg-[#D6E8EE]/30"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => updateFilters({ page: (currentPage + 1).toString() })}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#D6E8EE] bg-white text-[#001B48] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#D6E8EE]/30 transition-colors"
                    >
                      Trang sau →
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Trạng thái trống (Empty State) */
              <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-[#97CADB] flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-[#D6E8EE]/60 flex items-center justify-center mb-4 text-[#018ABE]">
                  <IconSearchOff className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#001B48]">
                  Không tìm thấy món đồ phù hợp
                </h3>
                <p className="text-sm text-[#02457A] max-w-md mt-1 mb-6">
                  {currentSearch
                    ? `Không có kết quả nào khớp với từ khóa "${currentSearch}". Bạn thử kiểm tra lại chính tả hoặc mở rộng khoảng giá xem sao nhé!`
                    : "Hiện chưa có sản phẩm nào trong nhóm bộ lọc này. Hãy thử xóa bớt tiêu chí để xem các món đồ khác."}
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors shadow-2xs"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MOBILE FILTER MODAL DRAWER */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Bộ lọc tìm kiếm">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative ml-auto w-full max-w-xs h-full bg-white shadow-2xl flex flex-col z-10">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#D6E8EE]">
              <h3 className="font-extrabold text-[#001B48] text-base">Bộ lọc tìm kiếm</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Đóng bộ lọc"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#02457A] hover:bg-[#D6E8EE]/50"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Filters */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Từ khóa */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] uppercase mb-2">
                  Tìm từ khóa
                </label>
                <form
                  onSubmit={(e) => {
                    handleSearchSubmit(e);
                    setMobileFilterOpen(false);
                  }}
                  className="relative"
                >
                  <input
                    type="text"
                    placeholder="Nhập tên đồ..."
                    aria-label="Tìm từ khóa"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#D6E8EE] focus:border-[#018ABE]"
                  />
                </form>
              </div>

              {/* Danh mục */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] uppercase mb-2">
                  Danh mục
                </label>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ category: null });
                      setMobileFilterOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      !currentCategory ? "bg-[#02457A] text-white" : "text-[#001B48] hover:bg-[#D6E8EE]/40"
                    }`}
                  >
                    Tất cả danh mục
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        handleCategorySelect(cat.slug);
                        setMobileFilterOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        currentCategory === cat.slug || currentCategory === cat.id
                          ? "bg-[#02457A] text-white"
                          : "text-[#001B48] hover:bg-[#D6E8EE]/40"
                      }`}
                    >
                      <CategoryGlyph name={cat.icon} className="w-4 h-4 shrink-0" />
                      <span>{cat.name} ({cat.product_count || 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tình trạng */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] uppercase mb-2">
                  Tình trạng
                </label>
                <div className="space-y-2">
                  {Object.entries(CONDITION_LABELS).map(([code, meta]) => (
                    <label key={code} className="flex items-center gap-2 text-xs font-medium text-[#001B48]">
                      <input
                        type="checkbox"
                        checked={activeConditions.includes(code)}
                        onChange={() => handleConditionToggle(code)}
                        className="rounded-sm text-[#018ABE]"
                      />
                      <span>{meta.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Khoảng giá */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] uppercase mb-2">
                  Khoảng giá (VND)
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {PRICE_PRESETS.slice(1).map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        handlePricePreset(preset.min, preset.max);
                        setMobileFilterOpen(false);
                      }}
                      className="px-2 py-1.5 text-[11px] font-semibold rounded-lg border border-[#D6E8EE] text-[#02457A]"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-[#D6E8EE] flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleResetFilters();
                  setMobileFilterOpen(false);
                }}
                className="flex-1 py-2 text-xs font-bold text-[#02457A] bg-[#D6E8EE]/40 rounded-xl"
              >
                Đặt lại
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#018ABE] rounded-xl shadow-2xs"
              >
                Xem kết quả
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
          <Navbar />
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 flex items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-semibold text-[#02457A]">
              <div className="w-5 h-5 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
              <span>Đang tải danh sách đồ dùng sinh viên...</span>
            </div>
          </div>
          <Footer />
        </div>
      }
    >
      <ProductsExplorer />
    </Suspense>
  );
}

