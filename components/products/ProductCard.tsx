"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface ProductCardData {
  id: string;
  title: string;
  price: number;
  isFree?: boolean;
  condition: string;
  zaloPhone?: string;
  createdAt?: string | Date;
  school?: {
    id: string;
    name: string;
    shortName: string;
    area?: string;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  seller: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    isStudentVerified?: boolean;
    reputationScore?: number;
    dorm?: string | null;
  };
  item?: {
    id: string;
    passportEnabled?: boolean;
    passportId?: string | null;
    passportStatus?: string;
    owners?: Array<{
      seq: number;
      showName: boolean;
    }>;
  } | null;
  images: Array<{
    id?: string;
    url: string;
  }>;
}

interface ProductCardProps {
  product: ProductCardData;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { title, price, isFree, condition, school, seller, item, images } = product;

  // Xử lý ảnh sản phẩm đầu tiên hoặc ảnh placeholder
  const mainImage = images && images.length > 0 && images[0]?.url
    ? images[0].url
    : "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600";

  // Số đời chủ nếu có Product Passport
  const ownersCount = item?.owners?.length || 1;
  const hasPassport = item?.passportEnabled !== false && (item?.passportId || item?.passportEnabled);

  // Định dạng giá VNĐ
  const formattedPrice = isFree || price === 0
    ? "0 ₫ (Miễn phí)"
    : `${price.toLocaleString("vi-VN")} ₫`;

  // Mở Zalo an toàn (BR01, BR36): Điều hướng tới PDP kèm action=zalo để kiểm tra quyền và rate limit
  const handleZaloClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/products/${product.id}?action=zalo`);
  };

  return (
    <div className="group bg-white rounded-2xl border border-[#D6E8EE] hover:border-[#018ABE] hover:shadow-[0_12px_28px_rgba(2,69,122,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* 1. Khung Ảnh đại diện & Badges */}
      <Link href={`/products/${product.id}`} className="block relative aspect-4/3 w-full bg-[#D6E8EE]/30 overflow-hidden cursor-pointer">
        <Image
          src={mainImage}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Lớp bóng mờ nhẹ trên ảnh */}
        <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-black/10 opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Góc trên bên trái: Badges Hộ chiếu Product Passport & Góc 0đ */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 items-start">
          {hasPassport && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#018ABE] text-white shadow-sm backdrop-blur-xs border border-white/20"
              title="Món đồ có Hộ chiếu Product Passport lưu lại lịch sử vòng đời"
            >
              <svg className="w-3.5 h-3.5 text-[#D6E8EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Đời chủ #{ownersCount}</span>
            </span>
          )}

          {(isFree || price === 0) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-600 text-white shadow-sm border border-emerald-400/30 animate-pulse">
              <span>🎁 Tặng 0đ</span>
            </span>
          )}
        </div>

        {/* Góc trên bên phải: Tình trạng món đồ */}
        {condition && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/95 text-[#02457A] shadow-xs backdrop-blur-xs border border-[#D6E8EE]">
              {condition}
            </span>
          </div>
        )}
      </Link>

      {/* 2. Phần nội dung thông tin sản phẩm */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Vị trí Trường / KTX */}
          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-[#02457A] font-semibold mb-1">
            <svg className="w-3.5 h-3.5 text-[#018ABE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="truncate">{school?.shortName || "KTX Làng Đại Học"}</span>
          </div>

          {/* Tiêu đề món đồ */}
          <Link href={`/products/${product.id}`} className="block">
            <h3 className="font-bold text-[#001B48] group-hover:text-[#018ABE] transition-colors line-clamp-2 text-sm sm:text-[15px] leading-snug min-h-[2.5rem]">
              {title}
            </h3>
          </Link>
        </div>

        <div>
          {/* Giá bán / Tặng 0đ */}
          <div className="flex items-baseline justify-between pt-1">
            <div className={`text-base sm:text-lg font-extrabold ${isFree || price === 0 ? "text-emerald-600" : "text-[#001B48]"}`}>
              {formattedPrice}
            </div>

            {hasPassport && (
              <span className="text-[10px] text-[#018ABE] bg-[#D6E8EE]/50 px-1.5 py-0.5 rounded font-medium">
                Passport
              </span>
            )}
          </div>

          {/* Người bán & Xác minh sinh viên */}
          <div className="mt-3 pt-3 border-t border-[#D6E8EE]/60 flex items-center justify-between text-xs text-[#02457A]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[#D6E8EE] overflow-hidden relative shrink-0">
                <Image
                  src={seller.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                  alt={seller.displayName}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-[#001B48] text-[12px]">{seller.displayName}</p>
              </div>
            </div>

            {/* Huy hiệu Sinh viên đã xác minh */}
            {seller.isStudentVerified ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0" title="Sinh viên đã xác minh thẻ">
                <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>SV Đã duyệt</span>
              </span>
            ) : (
              <span className="text-[11px] text-[#02457A]/70 font-medium">
                ⭐ {seller.reputationScore ? seller.reputationScore.toFixed(1) : "5.0"}
              </span>
            )}
          </div>

          {/* Nút hành động nhanh: Xem & Nhắn Zalo */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href={`/products/${product.id}`}
              className="w-full py-1.5 px-2 text-center text-xs font-semibold text-[#02457A] bg-[#D6E8EE]/40 hover:bg-[#D6E8EE] rounded-xl transition-colors cursor-pointer"
            >
              Xem chi tiết
            </Link>
            <button
              type="button"
              onClick={handleZaloClick}
              className="w-full py-1.5 px-2 inline-flex items-center justify-center gap-1 text-xs font-bold text-white bg-[#0068FF] hover:bg-[#0052cc] rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.86 7.02l-.95 3.51a.6.6 0 0 0 .78.71l3.9-1.62c.76.22 1.57.38 2.41.38 5.52 0 10-4.03 10-9s-4.48-9-10-9zm5.54 11.23c-.23.63-1.18 1.18-1.65 1.25-.43.06-.99.09-1.6-.11a14.28 14.28 0 0 1-4.45-2.73 13.9 13.9 0 0 1-2.65-4.17c-.22-.61-.22-1.17-.15-1.6.07-.47.62-1.42 1.25-1.65.23-.09.49-.07.69.05.27.16 1.09 1.93 1.19 2.13.06.13.07.28.02.41-.09.23-.39.69-.47.81-.11.16-.2.27-.08.48.24.42.78 1.26 1.48 1.91.7.64 1.55 1.13 1.98 1.34.22.11.33.02.48-.09.12-.08.58-.38.81-.47.13-.05.28-.04.41.02.2.1 1.97.92 2.13 1.19.12.2.14.46.05.69z" />
              </svg>
              <span>Zalo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
