"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ProductCard, ProductCardData } from "@/components/products/ProductCard";
import { CategoryItem } from "@/components/home/CategoryGrid";
import { CategorySyncItem, syncCategoriesWithHeader } from "@/lib/constants/categories";
import {
  CONDITION_GRADE_OPTIONS,
  ConditionGrade,
  getConditionGrade,
} from "@/lib/utils/condition";
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
  initialVerifiedOnly?: boolean;
  initialMultiOwner?: boolean;
}

interface PriceRangeOption {
  chipLabel: string;
  label: string;
  min?: number;
  max?: number;
  isFreeOnly?: boolean;
}

const PRICE_RANGES: PriceRangeOption[] = [
  { chipLabel: "Tất cả", label: "Tất cả mức giá" },
  { chipLabel: "0đ Cho Tặng", label: "0đ Cho Tặng", min: 0, max: 0, isFreeOnly: true },
  { chipLabel: "Dưới 100k", label: "Dưới 100.000 ₫", min: 1, max: 100000 },
  { chipLabel: "100k – 300k", label: "100.000 ₫ – 300.000 ₫", min: 100000, max: 300000 },
  { chipLabel: "Trên 300k", label: "Trên 300.000 ₫", min: 300000 },
];

export function ProductsExplorer({
  initialProducts,
  categories,
  schools,
  initialQuery = "",
  initialCategory = "all",
  initialCampus = "all",
  initialVerifiedOnly = false,
  initialMultiOwner = false,
}: ProductsExplorerProps) {
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  const [prevInitialCategory, setPrevInitialCategory] = useState(initialCategory);
  const [prevInitialCampus, setPrevInitialCampus] = useState(initialCampus);
  const [prevInitialVerifiedOnly, setPrevInitialVerifiedOnly] = useState(initialVerifiedOnly);
  const [prevInitialMultiOwner, setPrevInitialMultiOwner] = useState(initialMultiOwner);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedCampus, setSelectedCampus] = useState(initialCampus);

  if (prevInitialQuery !== initialQuery) {
    setPrevInitialQuery(initialQuery);
    setSearchQuery(initialQuery);
  }
  if (prevInitialCategory !== initialCategory) {
    setPrevInitialCategory(initialCategory);
    setSelectedCategory(initialCategory);
  }
  if (prevInitialCampus !== initialCampus) {
    setPrevInitialCampus(initialCampus);
    setSelectedCampus(initialCampus);
  }

  const [selectedPriceIndex, setSelectedPriceIndex] = useState(0);
  const [selectedConditions, setSelectedConditions] = useState<ConditionGrade[]>([]);
  const [onlyMultiOwner, setOnlyMultiOwner] = useState(initialMultiOwner);
  const [onlyVerifiedStudent, setOnlyVerifiedStudent] = useState(initialVerifiedOnly);

  if (prevInitialVerifiedOnly !== initialVerifiedOnly) {
    setPrevInitialVerifiedOnly(initialVerifiedOnly);
    setOnlyVerifiedStudent(initialVerifiedOnly);
  }
  if (prevInitialMultiOwner !== initialMultiOwner) {
    setPrevInitialMultiOwner(initialMultiOwner);
    setOnlyMultiOwner(initialMultiOwner);
  }
  const [sortBy, setSortBy] = useState<"verified" | "newest" | "price_asc" | "price_desc">("verified");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const mobileFilterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeMobileFilterBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleHeaderSearch = (event: Event) => {
      const customEvent = event as CustomEvent<{ q?: string }>;
      setSearchQuery(customEvent.detail?.q ?? "");
    };

    window.addEventListener("unicycle-header-search", handleHeaderSearch);
    return () => {
      window.removeEventListener("unicycle-header-search", handleHeaderSearch);
    };
  }, []);

  const normalizedCategories = useMemo(
    () => syncCategoriesWithHeader(categories),
    [categories]
  );

  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of normalizedCategories) {
      map.set(cat.slug, cat.name);
    }
    return map;
  }, [normalizedCategories]);

  useEffect(() => {
    if (!mobileFilterOpen) return;

    const previousOverflow = document.body.style.overflow;
    const triggerEl = mobileFilterTriggerRef.current;
    document.body.style.overflow = "hidden";

    const frameId = requestAnimationFrame(() => {
      closeMobileFilterBtnRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileFilterOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerEl?.focus();
    };
  }, [mobileFilterOpen]);

  const toggleConditionGrade = (grade: ConditionGrade) => {
    setSelectedConditions((prev) =>
      prev.includes(grade) ? prev.filter((item) => item !== grade) : [...prev, grade]
    );
  };

  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((p) => {
        if (searchQuery.trim()) {
          const normQ = removeVietnameseTones(searchQuery);
          const normTitle = removeVietnameseTones(p.title);
          const rawCatName = p.category ? p.category.name : "";
          const syncedCatName = p.category?.slug
            ? categoryNameBySlug.get(p.category.slug) || rawCatName
            : rawCatName;
          const normCat = removeVietnameseTones(`${rawCatName} ${syncedCatName}`);
          const normSchool = p.school
            ? removeVietnameseTones(`${p.school.name} ${p.school.shortName}`)
            : "";

          if (
            !normTitle.includes(normQ) &&
            !normCat.includes(normQ) &&
            !normSchool.includes(normQ)
          ) {
            return false;
          }
        }

        if (selectedCategory !== "all") {
          if (selectedCategory === "goc-0d-cho-tang") {
            if (!p.isFree && p.price > 0 && p.category?.slug !== "goc-0d-cho-tang") {
              return false;
            }
          } else if (p.category?.slug !== selectedCategory) {
            return false;
          }
        }

        if (selectedCampus !== "all") {
          if (
            p.school?.id !== selectedCampus &&
            p.school?.shortName !== selectedCampus
          ) {
            return false;
          }
        }

        const priceRange = PRICE_RANGES[selectedPriceIndex];
        if (priceRange.isFreeOnly) {
          if (!p.isFree && p.price > 0) return false;
        } else {
          if (priceRange.min !== undefined && p.price < priceRange.min) return false;
          if (priceRange.max !== undefined && p.price > priceRange.max) return false;
        }

        if (selectedConditions.length > 0) {
          const productGrade = getConditionGrade(p.condition);
          if (!productGrade || !selectedConditions.includes(productGrade)) {
            return false;
          }
        }

        if (onlyMultiOwner) {
          if ((p.item?.owners?.length ?? 0) < 2) {
            return false;
          }
        }

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
    selectedConditions,
    onlyMultiOwner,
    onlyVerifiedStudent,
    sortBy,
    categoryNameBySlug,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCampus("all");
    setSelectedPriceIndex(0);
    setSelectedConditions([]);
    setOnlyMultiOwner(false);
    setOnlyVerifiedStudent(false);
  };

  const activeFilterCount =
    (searchQuery.trim() !== "" ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedCampus !== "all" ? 1 : 0) +
    (selectedPriceIndex !== 0 ? 1 : 0) +
    selectedConditions.length +
    (onlyMultiOwner ? 1 : 0) +
    (onlyVerifiedStudent ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const activeCategoryName =
    selectedCategory !== "all"
      ? categoryNameBySlug.get(selectedCategory) || selectedCategory
      : null;

  const activeCampusLabel =
    selectedCampus !== "all"
      ? schools.find(
          (s) => s.id === selectedCampus || s.shortName === selectedCampus
        )?.shortName || selectedCampus
      : null;

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Tiêu đề trang */}
        <div className="mb-6 sm:mb-8">
          <nav className="flex items-center gap-2 text-xs text-[#02457A] mb-2 font-medium">
            <Link href="/" className="hover:text-[#018ABE]">
              Trang chủ
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#001B48] font-bold">Khám phá đồ cũ</span>
            {activeCategoryName && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-[#016D96] font-bold">{activeCategoryName}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
              Sàn Trao Đổi Đồ Cũ Sinh Viên
            </h1>

            <button
              ref={mobileFilterTriggerRef}
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden h-11 px-4 rounded-xl bg-white border border-[#D6E8EE] text-sm font-bold text-[#001B48] inline-flex items-center justify-center gap-2 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              <svg
                className="w-4 h-4 text-[#018ABE] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>Bộ lọc tìm kiếm</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 leading-none rounded-full text-[11px] font-bold bg-[#018ABE] text-white tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bố cục 2 cột: Sidebar Bộ Lọc (Trái) + Lưới Sản Phẩm (Phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Cột Trái (3/12): Sidebar Bộ lọc trên Desktop */}
          <aside className="hidden lg:block lg:col-span-3 bg-white rounded-2xl border border-[#D6E8EE] p-5 shadow-xs sticky top-24">
            <FilterPanelContent
              idPrefix="desktop"
              initialProducts={initialProducts}
              categories={normalizedCategories}
              schools={schools}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              selectedCampus={selectedCampus}
              selectedPriceIndex={selectedPriceIndex}
              selectedConditions={selectedConditions}
              onlyMultiOwner={onlyMultiOwner}
              onlyVerifiedStudent={onlyVerifiedStudent}
              showResetButton={hasActiveFilters}
              onResetFilters={resetFilters}
              onSearchChange={setSearchQuery}
              onSelectCategory={setSelectedCategory}
              onSelectCampus={setSelectedCampus}
              onSelectPriceIndex={setSelectedPriceIndex}
              onToggleCondition={toggleConditionGrade}
              onToggleMultiOwner={() => setOnlyMultiOwner((prev) => !prev)}
              onToggleVerifiedStudent={() => setOnlyVerifiedStudent((prev) => !prev)}
            />
          </aside>

          {/* Cột Phải (9/12): Danh Sách Sản Phẩm & Thanh Công Cụ */}
          <main className="lg:col-span-9 space-y-4">
            {/* Thanh sắp xếp & Thống kê kết quả */}
            <div className="bg-white rounded-2xl border border-[#D6E8EE] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="text-xs sm:text-sm font-bold text-[#001B48]">
                Tìm thấy{" "}
                <span className="text-[#016D96] text-base tabular-nums">
                  {filteredProducts.length}
                </span>{" "}
                món đồ phù hợp
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <label
                  htmlFor="products-sort-select"
                  className="text-xs text-[#02457A] font-semibold whitespace-nowrap"
                >
                  Sắp xếp:
                </label>
                <div className="relative">
                  <select
                    id="products-sort-select"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as "verified" | "newest" | "price_asc" | "price_desc"
                      )
                    }
                    className="h-9 pl-3 pr-8 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] text-xs font-bold text-[#001B48] focus:outline-none focus:border-[#018ABE] focus-visible:ring-2 focus-visible:ring-[#018ABE]/25 cursor-pointer appearance-none"
                  >
                    <option value="verified">Ưu tiên SV Đã duyệt</option>
                    <option value="newest">Mới đăng nhất</option>
                    <option value="price_asc">Giá: Thấp đến Cao</option>
                    <option value="price_desc">Giá: Cao đến Thấp</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#02457A]">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Thanh Active Filter Chips */}
            {hasActiveFilters && (
              <div
                className="flex flex-wrap items-center gap-2"
                role="region"
                aria-label="Các bộ lọc đang áp dụng"
              >
                {searchQuery.trim() !== "" && (
                  <ActiveFilterChip
                    label={`Từ khóa: "${searchQuery.trim()}"`}
                    onClear={() => setSearchQuery("")}
                  />
                )}
                {activeCategoryName && (
                  <ActiveFilterChip
                    label={activeCategoryName}
                    onClear={() => setSelectedCategory("all")}
                  />
                )}
                {activeCampusLabel && (
                  <ActiveFilterChip
                    label={activeCampusLabel}
                    onClear={() => setSelectedCampus("all")}
                  />
                )}
                {selectedPriceIndex !== 0 && (
                  <ActiveFilterChip
                    label={PRICE_RANGES[selectedPriceIndex].chipLabel}
                    onClear={() => setSelectedPriceIndex(0)}
                  />
                )}
                {selectedConditions.map((grade) => (
                  <ActiveFilterChip
                    key={grade}
                    label={`Hạng ${grade}`}
                    onClear={() => toggleConditionGrade(grade)}
                  />
                ))}
                {onlyMultiOwner && (
                  <ActiveFilterChip
                    label="Đã qua ≥ 2 đời chủ"
                    onClear={() => setOnlyMultiOwner(false)}
                  />
                )}
                {onlyVerifiedStudent && (
                  <ActiveFilterChip
                    label="SV đã xác minh"
                    onClear={() => setOnlyVerifiedStudent(false)}
                  />
                )}

                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-rose-700 hover:underline px-1.5 py-1 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                >
                  Xóa tất cả
                </button>
              </div>
            )}

            {/* Lưới sản phẩm Responsive */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#D6E8EE] shadow-2xs space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#E3F1F9] text-[#018ABE] flex items-center justify-center">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#001B48]">
                  Không tìm thấy món đồ phù hợp
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Hãy thử gõ từ khóa không dấu hoặc xóa bớt tiêu chí lọc để xem thêm đồ dùng sinh
                  viên.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="h-10 px-5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
                  >
                    Xóa toàn bộ bộ lọc
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer (WCAG 2.2) */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-filter-title"
        >
          <div
            className="fixed inset-0 bg-[#001B48]/60 backdrop-blur-xs"
            onClick={() => setMobileFilterOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-[88%] max-w-sm bg-white h-full flex flex-col justify-between z-10 shadow-2xl ml-auto">
            <div className="p-5 pb-3.5 border-b border-[#D6E8EE] flex items-center justify-between">
              <h3 id="mobile-filter-title" className="font-extrabold text-[#001B48] text-base">
                Bộ lọc tìm kiếm
              </h3>
              <button
                ref={closeMobileFilterBtnRef}
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Đóng bộ lọc tìm kiếm"
                className="w-10 h-10 -mr-1.5 rounded-xl text-slate-500 hover:text-[#001B48] hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
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

            <div className="flex-1 overflow-y-auto p-5">
              <FilterPanelContent
                idPrefix="mobile"
                initialProducts={initialProducts}
                categories={normalizedCategories}
                schools={schools}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                selectedCampus={selectedCampus}
                selectedPriceIndex={selectedPriceIndex}
                selectedConditions={selectedConditions}
                onlyMultiOwner={onlyMultiOwner}
                onlyVerifiedStudent={onlyVerifiedStudent}
                onSearchChange={setSearchQuery}
                onSelectCategory={setSelectedCategory}
                onSelectCampus={setSelectedCampus}
                onSelectPriceIndex={setSelectedPriceIndex}
                onToggleCondition={toggleConditionGrade}
                onToggleMultiOwner={() => setOnlyMultiOwner((prev) => !prev)}
                onToggleVerifiedStudent={() => setOnlyVerifiedStudent((prev) => !prev)}
              />
            </div>

            <div className="p-4 border-t border-[#D6E8EE] bg-white flex gap-2.5">
              <button
                type="button"
                onClick={resetFilters}
                className="w-1/2 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
              >
                Xóa lọc
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-1/2 h-11 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
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

interface FilterPanelContentProps {
  idPrefix: string;
  initialProducts: ProductCardData[];
  categories: CategorySyncItem[];
  schools: SchoolOption[];
  searchQuery: string;
  selectedCategory: string;
  selectedCampus: string;
  selectedPriceIndex: number;
  selectedConditions: ConditionGrade[];
  onlyMultiOwner: boolean;
  onlyVerifiedStudent: boolean;
  showResetButton?: boolean;
  onResetFilters?: () => void;
  onSearchChange: (value: string) => void;
  onSelectCategory: (slug: string) => void;
  onSelectCampus: (campusId: string) => void;
  onSelectPriceIndex: (index: number) => void;
  onToggleCondition: (grade: ConditionGrade) => void;
  onToggleMultiOwner: () => void;
  onToggleVerifiedStudent: () => void;
}

function FilterPanelContent({
  idPrefix,
  initialProducts,
  categories,
  schools,
  searchQuery,
  selectedCategory,
  selectedCampus,
  selectedPriceIndex,
  selectedConditions,
  onlyMultiOwner,
  onlyVerifiedStudent,
  showResetButton = false,
  onResetFilters,
  onSearchChange,
  onSelectCategory,
  onSelectCampus,
  onSelectPriceIndex,
  onToggleCondition,
  onToggleMultiOwner,
  onToggleVerifiedStudent,
}: FilterPanelContentProps) {
  const searchInputId = `${idPrefix}-products-search`;
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!categoryDropdownOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        event.target instanceof Node &&
        !categoryDropdownRef.current.contains(event.target)
      ) {
        setCategoryDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [categoryDropdownOpen]);

  const isSelectedFreeCategory = selectedCategory === "goc-0d-cho-tang";
  const selectedCategoryObj =
    selectedCategory === "all"
      ? null
      : categories.find((c) => c.slug === selectedCategory) || null;
  const selectedCategoryLabel = selectedCategoryObj
    ? selectedCategoryObj.name
    : "Tất cả danh mục";
  const selectedCategoryCount =
    selectedCategory === "all"
      ? initialProducts.length
      : typeof selectedCategoryObj?.listingCount === "number"
        ? selectedCategoryObj.listingCount
        : initialProducts.filter((p) =>
            isSelectedFreeCategory
              ? p.isFree || p.price === 0 || p.category?.slug === "goc-0d-cho-tang"
              : p.category?.slug === selectedCategory
          ).length;

  return (
    <div className="divide-y divide-[#EBF3F7]">
      {/* 1. Từ khóa tìm kiếm */}
      <div className="pb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label
            htmlFor={searchInputId}
            className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider"
          >
            Từ khóa tìm kiếm
          </label>
          {showResetButton && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-rose-700 hover:underline font-semibold cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              Xóa lọc
            </button>
          )}
        </div>
        <div className="relative">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
          <input
            id={searchInputId}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Gõ có dấu hoặc không dấu..."
            className="w-full h-10 pl-9 pr-9 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white text-xs text-[#001B48] placeholder:text-slate-400 focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 transition-colors [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-slate-400 hover:text-[#001B48] hover:bg-slate-200/70 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 2. Danh mục đồ dùng (1 ô gọn, rê chuột hoặc bấm để xổ danh sách đồng bộ Header) */}
      <div className="py-4">
        <p className="text-[11px] font-bold text-slate-500 mb-2.5 uppercase tracking-wider">
          Danh mục đồ dùng
        </p>

        <div
          ref={categoryDropdownRef}
          className="relative"
          onPointerEnter={(e) => {
            if (e.pointerType !== "touch") setCategoryDropdownOpen(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== "touch") setCategoryDropdownOpen(false);
          }}
        >
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={categoryDropdownOpen}
            aria-label={`Danh mục đồ dùng: ${selectedCategoryLabel}`}
            onClick={() => setCategoryDropdownOpen((prev) => !prev)}
            className={`w-full h-10 px-3 rounded-xl border text-xs font-bold transition-colors flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
              selectedCategory === "all"
                ? "bg-[#F8FAFC] hover:bg-[#F4F9FB] text-[#001B48] border-[#D6E8EE] hover:border-[#018ABE]/60"
                : isSelectedFreeCategory
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                  : "bg-[#001B48] text-white border-[#001B48] shadow-2xs"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 min-w-0">
              {isSelectedFreeCategory && <GiftIcon className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{selectedCategoryLabel}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 shrink-0">
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums leading-none ${
                  selectedCategory === "all"
                    ? "bg-white text-[#02457A] border border-[#D6E8EE]"
                    : "bg-white/20 text-white"
                }`}
              >
                {selectedCategoryCount}
              </span>
              <svg
                className={`w-4 h-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                  selectedCategory === "all" ? "text-[#02457A]" : "text-white/90"
                } ${categoryDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </span>
          </button>

          {categoryDropdownOpen && (
            <div className="absolute left-0 right-0 top-full pt-1.5 z-30">
              <div
                role="listbox"
                aria-label="Chọn danh mục đồ dùng"
                className="rounded-2xl bg-white border border-[#D6E8EE] shadow-xl p-1.5 space-y-1"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedCategory === "all"}
                  onClick={() => {
                    onSelectCategory("all");
                    setCategoryDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                    selectedCategory === "all"
                      ? "bg-[#001B48] text-white"
                      : "text-[#02457A] hover:bg-[#F4F9FB]"
                  }`}
                >
                  <span>Tất cả danh mục</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums leading-none ${
                      selectedCategory === "all"
                        ? "bg-white/20 text-white"
                        : "bg-[#F4F9FB] text-[#02457A] border border-[#D6E8EE]"
                    }`}
                  >
                    {initialProducts.length}
                  </span>
                </button>

                {categories.map((c) => {
                  const isSelected = selectedCategory === c.slug;
                  const isFree = c.slug === "goc-0d-cho-tang";
                  const count =
                    typeof c.listingCount === "number"
                      ? c.listingCount
                      : initialProducts.filter((p) =>
                          isFree
                            ? p.isFree || p.price === 0 || p.category?.slug === "goc-0d-cho-tang"
                            : p.category?.slug === c.slug
                        ).length;

                  return (
                    <button
                      key={c.slug}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onSelectCategory(isSelected ? "all" : c.slug);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                        isSelected
                          ? isFree
                            ? "bg-emerald-700 text-white"
                            : "bg-[#018ABE] text-white"
                          : isFree
                            ? "text-emerald-800 hover:bg-emerald-50"
                            : "text-[#02457A] hover:bg-[#F4F9FB]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                        {isFree && <GiftIcon className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums leading-none shrink-0 ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : isFree
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-[#F4F9FB] text-[#02457A] border border-[#D6E8EE]"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Tình trạng món đồ (Hạng A / B / C, multi-select toggle cards) */}
      <div className="py-4">
        <p className="text-[11px] font-bold text-slate-500 mb-2.5 uppercase tracking-wider">
          Tình trạng món đồ
        </p>
        <div
          className="grid grid-cols-3 gap-1.5"
          role="group"
          aria-label="Lọc theo hạng tình trạng món đồ"
        >
          {CONDITION_GRADE_OPTIONS.map((opt) => {
            const isSelected = selectedConditions.includes(opt.grade);
            return (
              <button
                key={opt.grade}
                type="button"
                aria-pressed={isSelected}
                title={opt.description}
                onClick={() => onToggleCondition(opt.grade)}
                className={`min-h-[52px] px-2 py-2 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                  isSelected
                    ? "bg-[#001B48] text-white border-[#001B48] shadow-2xs"
                    : "bg-[#F8FAFC] hover:bg-[#F4F9FB] text-[#001B48] border-[#D6E8EE] hover:border-[#018ABE]/60"
                }`}
              >
                <span className="text-xs font-bold leading-tight whitespace-nowrap">
                  {opt.label}
                </span>
                <span
                  className={`text-[11px] font-medium leading-tight whitespace-nowrap ${
                    isSelected ? "text-[#BAE6FD]" : "text-slate-600"
                  }`}
                >
                  {opt.shortDesc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Khoảng giá sinh viên (toggle chips) */}
      <div className="py-4">
        <p className="text-[11px] font-bold text-slate-500 mb-2.5 uppercase tracking-wider">
          Khoảng giá sinh viên
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo khoảng giá">
          {PRICE_RANGES.map((pr, idx) => {
            const isSelected = selectedPriceIndex === idx;
            const isFreeChip = Boolean(pr.isFreeOnly);

            return (
              <button
                key={pr.chipLabel}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectPriceIndex(isSelected && idx !== 0 ? 0 : idx)}
                className={`h-8 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                  isSelected
                    ? isFreeChip
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                      : "bg-[#001B48] text-white border-[#001B48] shadow-2xs"
                    : isFreeChip
                      ? "bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                      : "bg-[#F8FAFC] text-[#02457A] border-[#D6E8EE] hover:bg-[#F4F9FB]"
                }`}
              >
                {isFreeChip && <GiftIcon className="w-3.5 h-3.5 shrink-0" />}
                <span>{pr.chipLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Khu vực Trường / KTX (toggle chips) */}
      <div className="py-4">
        <p className="text-[11px] font-bold text-slate-500 mb-2.5 uppercase tracking-wider">
          Khu vực Trường / KTX
        </p>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Lọc theo khu vực trường và KTX"
        >
          <button
            type="button"
            aria-pressed={selectedCampus === "all"}
            onClick={() => onSelectCampus("all")}
            className={`h-8 px-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
              selectedCampus === "all"
                ? "bg-[#001B48] text-white border-[#001B48] shadow-2xs"
                : "bg-[#F8FAFC] text-[#02457A] border-[#D6E8EE] hover:bg-[#F4F9FB]"
            }`}
          >
            Tất cả
          </button>

          {schools.map((s) => {
            const isSelected =
              selectedCampus === s.id || selectedCampus === s.shortName;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectCampus(isSelected ? "all" : s.id)}
                className={`h-8 px-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                  isSelected
                    ? "bg-[#001B48] text-white border-[#001B48] shadow-2xs"
                    : "bg-[#F8FAFC] text-[#02457A] border-[#D6E8EE] hover:bg-[#F4F9FB]"
                }`}
              >
                {s.shortName}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Tiêu chí xác thực (2 accessible role="switch" toggles) */}
      <div className="pt-4 space-y-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Tiêu chí xác thực
        </p>

        <button
          type="button"
          role="switch"
          aria-checked={onlyVerifiedStudent}
          onClick={onToggleVerifiedStudent}
          className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
            onlyVerifiedStudent
              ? "bg-emerald-50/70 border-emerald-200"
              : "bg-[#F8FAFC] border-[#E2EEF3] hover:bg-[#F4F9FB]"
          }`}
        >
          <span className="inline-flex items-center gap-2 min-w-0 text-xs font-bold text-[#001B48]">
            <svg
              className="w-4 h-4 text-emerald-600 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="truncate">SV đã xác minh</span>
          </span>

          <span
            aria-hidden="true"
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 motion-reduce:transition-none ${
              onlyVerifiedStudent ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200 motion-reduce:transition-none ${
                onlyVerifiedStudent ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={onlyMultiOwner}
          onClick={onToggleMultiOwner}
          className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
            onlyMultiOwner
              ? "bg-[#F4F9FB] border-[#97CADB]"
              : "bg-[#F8FAFC] border-[#E2EEF3] hover:bg-[#F4F9FB]"
          }`}
        >
          <span className="inline-flex items-center gap-2 min-w-0 text-xs font-bold text-[#001B48]">
            <svg
              className="w-4 h-4 text-[#018ABE] shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.9}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span className="truncate">Đã qua ≥ 2 đời chủ</span>
          </span>

          <span
            aria-hidden="true"
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 motion-reduce:transition-none ${
              onlyMultiOwner ? "bg-[#018ABE]" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200 motion-reduce:transition-none ${
                onlyMultiOwner ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}

function GiftIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function ActiveFilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Bỏ bộ lọc ${label}`}
      className="h-7 pl-2.5 pr-2 rounded-full bg-white hover:bg-[#F4F9FB] border border-[#D6E8EE] text-xs font-semibold text-[#02457A] inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
    >
      <span className="max-w-[180px] truncate">{label}</span>
      <svg
        className="w-3.5 h-3.5 text-slate-400 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
