"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "@/components/ui/ScrollReveal";

export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  count?: string;
}

const CATEGORY_IMAGES: Record<string, string> = {
  "goc-0d-cho-tang": "/categories/goc-0d-cho-tang.jpg",
  "giao-trinh-sach": "/categories/giao-trinh-sach.jpg",
  "do-dien-tu-phu-kien": "/categories/do-dien-tu-phu-kien.jpg",
  "xe-dap-phuong-tien": "/categories/xe-dap-phuong-tien.jpg",
  "ban-ghe-tu-ktx": "/categories/ban-ghe-tu-ktx.jpg",
  "do-gia-dung-quat": "/categories/do-gia-dung-quat.jpg",
};

const CATEGORY_THEMES: Record<
  string,
  {
    bgGradient: string;
    borderAccent: string;
    glowColor: string;
  }
> = {
  "goc-0d-cho-tang": {
    bgGradient: "from-emerald-100/70 via-teal-50 to-emerald-50",
    borderAccent: "border-emerald-200 group-hover:border-emerald-400",
    glowColor: "group-hover:shadow-[0_12px_28px_rgba(16,185,129,0.2)]",
  },
  "giao-trinh-sach": {
    bgGradient: "from-sky-100/70 via-blue-50 to-indigo-50/50",
    borderAccent: "border-sky-200 group-hover:border-sky-400",
    glowColor: "group-hover:shadow-[0_12px_28px_rgba(2,69,122,0.18)]",
  },
  "do-dien-tu-phu-kien": {
    bgGradient: "from-indigo-100/70 via-cyan-50 to-blue-50/50",
    borderAccent: "border-indigo-200 group-hover:border-indigo-400",
    glowColor: "group-hover:shadow-[0_12px_28px_rgba(99,102,241,0.18)]",
  },
  "xe-dap-phuong-tien": {
    bgGradient: "from-amber-100/70 via-orange-50 to-yellow-50/50",
    borderAccent: "border-amber-200 group-hover:border-amber-400",
    glowColor: "group-hover:shadow-[0_12px_28px_rgba(245,158,11,0.18)]",
  },
  "ban-ghe-tu-ktx": {
    bgGradient: "from-purple-100/70 via-pink-50 to-rose-50/50",
    borderAccent: "border-purple-200 group-hover:border-purple-400",
    glowColor: "group-hover:shadow-[0_12px_28px_rgba(168,85,247,0.18)]",
  },
  "do-gia-dung-quat": {
    bgGradient: "from-rose-100/70 via-amber-50 to-orange-50/50",
    borderAccent: "border-orange-200 group-hover:border-orange-400",
    glowColor: "group-hover:shadow-[0_12px_28px_rgba(249,115,22,0.18)]",
  },
};

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: "giao-trinh-sach",
    slug: "giao-trinh-sach",
    name: "Giáo trình & Sách",
    description: "Giáo trình đại học, sách chuyên ngành và tài liệu học tập",
    count: "140+ tin",
    imageUrl: "/categories/giao-trinh-sach.jpg",
    icon: "book",
  },
  {
    id: "ban-ghe-tu-ktx",
    slug: "ban-ghe-tu-ktx",
    name: "Bàn ghế & Nội thất",
    description: "Bàn học, ghế xoay, kệ sách và nội thất phòng trọ",
    count: "85+ tin",
    imageUrl: "/categories/ban-ghe-tu-ktx.jpg",
    icon: "archive",
  },
  {
    id: "do-gia-dung-quat",
    slug: "do-gia-dung-quat",
    name: "Đồ gia dụng",
    description: "Quạt điện, ấm siêu tốc, nồi cơm mini và vật dụng sinh hoạt",
    count: "110+ tin",
    imageUrl: "/categories/do-gia-dung-quat.jpg",
    icon: "bolt",
  },
  {
    id: "do-dien-tu-phu-kien",
    slug: "do-dien-tu-phu-kien",
    name: "Đồ điện tử",
    description: "Máy tính, máy tính cầm tay, chuột, bàn phím và tai nghe",
    count: "95+ tin",
    imageUrl: "/categories/do-dien-tu-phu-kien.jpg",
    icon: "chip",
  },
  {
    id: "xe-dap-phuong-tien",
    slug: "xe-dap-phuong-tien",
    name: "Xe đạp & Di chuyển",
    description: "Xe đạp, mũ bảo hiểm và vật dụng đi lại",
    count: "40+ tin",
    imageUrl: "/categories/xe-dap-phuong-tien.jpg",
    icon: "truck",
  },
  {
    id: "goc-0d-cho-tang",
    slug: "goc-0d-cho-tang",
    name: "Đồ tặng miễn phí",
    description: "Đồ dùng miễn phí được sinh viên khóa trước chia sẻ",
    count: "50+ tin",
    imageUrl: "/categories/goc-0d-cho-tang.jpg",
    icon: "gift",
  },
];

interface CategoryGridProps {
  categories?: CategoryItem[];
  selectedSlug?: string;
  onSelectCategory?: (slug: string) => void;
  embedded?: boolean;
}

export function CategoryGrid({
  categories = DEFAULT_CATEGORIES,
  selectedSlug,
  onSelectCategory,
  embedded = false,
}: CategoryGridProps) {
  // Render icon SVG tương ứng
  const renderIcon = (type?: string | null) => {
    switch (type) {
      case "book":
        return (
          <svg className="w-7 h-7 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        );
      case "archive":
        return (
          <svg className="w-7 h-7 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        );
      case "bolt":
        return (
          <svg className="w-7 h-7 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        );
      case "chip":
        return (
          <svg className="w-7 h-7 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9a.75.75 0 01.75.75v9a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75v-9a.75.75 0 01.75-.75z" />
          </svg>
        );
      case "truck":
        return (
          <svg className="w-7 h-7 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75m0 0a1.125 1.125 0 00-1.125-1.125H5.625A1.125 1.125 0 004.5 3.75v10.5" />
          </svg>
        );
      case "gift":
        return (
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        );
      default:
        return (
          <svg className="w-7 h-7 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        );
    }
  };

  const gridContent = (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 lg:gap-5 ${
        embedded ? "mb-6" : ""
      }`.trim()}
    >
      {categories.map((cat, index) => {
        const isSelected = selectedSlug === cat.slug;
        const isFree = cat.slug === "goc-0d-cho-tang";
        const imageSrc = cat.imageUrl || CATEGORY_IMAGES[cat.slug];
        const theme = CATEGORY_THEMES[cat.slug] || {
          bgGradient: "from-slate-100/70 via-slate-50 to-sky-50/40",
          borderAccent: "border-slate-200 group-hover:border-[#018ABE]/60",
          glowColor: "group-hover:shadow-[0_12px_28px_rgba(1,138,190,0.15)]",
        };

        return (
          <ScrollReveal
            key={cat.id || cat.slug}
            variant="fade-up"
            delayMs={index * 45}
            className="h-full"
          >
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectCategory && onSelectCategory(cat.slug)}
              className={`group relative w-full h-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center text-center border cursor-pointer transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2 ${
                isSelected
                  ? "border-[#018ABE] ring-2 ring-[#018ABE]/20 shadow-[0_12px_28px_rgba(1,138,190,0.22)] bg-[#D6E8EE]/15 -translate-y-1.5"
                  : isFree
                  ? "border-emerald-200 hover:border-emerald-500 hover:shadow-[0_14px_30px_rgba(16,185,129,0.18)] hover:-translate-y-1.5"
                  : `border-slate-200/80 hover:border-[#018ABE] ${theme.glowColor} hover:-translate-y-1.5`
              }`}
            >
              {/* Chỉ báo trạng thái đang chọn lọc */}
              {isSelected && (
                <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 bg-[#018ABE] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="hidden sm:inline">Đang lọc</span>
                </span>
              )}

              {/* Khung ảnh đại diện 3D danh mục kích thước lớn (96px desktop / 80px mobile) */}
              <span
                className={`relative block w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden mb-3 p-1 bg-gradient-to-br ${theme.bgGradient} border ${theme.borderAccent} shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all duration-300`}
              >
                <span className="relative block w-full h-full rounded-xl overflow-hidden">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 640px) 80px, 96px"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <span
                      className={`w-full h-full flex items-center justify-center transition-colors duration-300 ${
                        isSelected
                          ? "bg-[#018ABE] text-white"
                          : isFree
                          ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                          : "bg-[#D6E8EE]/40 text-[#018ABE] group-hover:bg-[#018ABE]/15"
                      }`}
                    >
                      {renderIcon(cat.icon || cat.slug)}
                    </span>
                  )}
                </span>
              </span>

              {/* Tên danh mục */}
              <span
                className={`text-xs sm:text-[14px] font-bold line-clamp-2 leading-snug transition-colors mb-2 min-h-[2.5rem] flex items-center justify-center ${
                  isSelected
                    ? "text-[#018ABE]"
                    : isFree
                    ? "text-emerald-800 group-hover:text-emerald-600"
                    : "text-[#001B48] group-hover:text-[#018ABE]"
                }`}
              >
                {isFree ? "Đồ tặng miễn phí" : cat.name}
              </span>

              {/* Số lượng tin dạng Capsule Pill Badge */}
              <span
                className={`inline-flex items-center text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                  isSelected
                    ? "bg-[#018ABE] text-white"
                    : isFree
                    ? "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600 group-hover:bg-[#D6E8EE]/70 group-hover:text-[#018ABE]"
                }`}
              >
                {cat.count || "Khám phá"}
              </span>
            </button>
          </ScrollReveal>
        );
      })}
    </div>
  );

  if (embedded) {
    return gridContent;
  }

  return (
    <section className="py-8 sm:py-12 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề mục danh mục */}
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
              Danh mục sản phẩm
            </h2>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#02457A] hover:text-[#018ABE] transition-colors group cursor-pointer"
            >
              <span>Xem tất cả</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>

        {/* Lưới danh mục 6 ô */}
        {gridContent}
      </div>
    </section>
  );
}

