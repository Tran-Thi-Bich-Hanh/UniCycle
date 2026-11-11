import React from "react";
import Link from "next/link";
import { Product } from "@/lib/db";
import { formatCurrencyVND, formatRelativeTime, CONDITION_LABELS, STATUS_LABELS } from "@/lib/utils";
import { IconCamera, IconEye, IconMapPin, IconShieldCheck } from "./icons";

export function ProductCard({ product }: { product: Product }) {
  const coverImage =
    product.images && product.images.length > 0
      ? product.images[0].url
      : "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80";

  const conditionMeta = CONDITION_LABELS[product.condition] || {
    label: product.condition,
    badgeClass: "bg-[#D6E8EE] text-[#001B48] border-[#97CADB]",
  };
  const statusMeta = STATUS_LABELS[product.status];
  const hasPassport = Boolean(product.passport_hash);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-[#D6E8EE] overflow-hidden shadow-2xs hover:shadow-lg hover:shadow-[#001B48]/5 hover:border-[#018ABE] transition-all duration-300 hover:-translate-y-1 cursor-pointer"
    >
      {/* Khung ảnh sản phẩm */}
      <div className="relative aspect-4/3 w-full bg-[#D6E8EE]/30 overflow-hidden">
        <img
          src={coverImage}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Nhãn tình trạng (Góc trái trên) */}
        <span
          className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs backdrop-blur-xs ${conditionMeta.badgeClass}`}
        >
          {conditionMeta.label}
        </span>

        {/* Trạng thái nếu đang giữ chỗ hoặc đã bán (Góc phải trên) */}
        {product.status !== "ACTIVE" ? (
          <span
            className={`absolute top-2.5 right-2.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs ${
              statusMeta?.colorClass || "bg-[#02457A] text-white"
            }`}
          >
            {statusMeta?.label || product.status}
          </span>
        ) : (
          hasPassport && (
            <span
              title="Đã khởi tạo Hồ sơ Chứng thực UniCycle Passport"
              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#001B48]/85 text-white border border-white/20 shadow-2xs backdrop-blur-xs"
            >
              <IconShieldCheck className="w-3 h-3 text-[#97CADB]" />
              <span>Passport</span>
            </span>
          )
        )}

        {/* Số lượng ảnh */}
        {product.images && product.images.length > 1 && (
          <span className="absolute bottom-2 right-2 text-[10px] font-medium bg-[#001B48]/75 text-white px-1.5 py-0.5 rounded-md backdrop-blur-xs">
            <IconCamera className="w-3 h-3 inline -mt-0.5 mr-1" />
            {product.images.length}
          </span>
        )}
      </div>

      {/* Thông tin sản phẩm */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Danh mục & Huy hiệu Passport phụ nếu đang RESERVED/SOLD */}
          <div className="flex items-center justify-between gap-2 mb-1">
            {product.category ? (
              <p className="text-[11px] font-bold text-[#018ABE] truncate">
                {product.category.name}
              </p>
            ) : (
              <span />
            )}
            {product.status !== "ACTIVE" && hasPassport && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#02457A] shrink-0">
                <IconShieldCheck className="w-3 h-3 text-[#018ABE]" />
                Passport
              </span>
            )}
          </div>

          {/* Tiêu đề giới hạn 2 dòng */}
          <h3 className="text-xs sm:text-sm font-bold text-[#001B48] line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-[#018ABE] transition-colors">
            {product.title}
          </h3>

          {/* Giá bán nổi bật */}
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-sm sm:text-base font-black text-[#02457A]">
              {formatCurrencyVND(product.price)}
            </span>
            <span className="text-[10px] font-bold text-[#018ABE] bg-[#D6E8EE]/50 px-1.5 py-0.5 rounded-md border border-[#97CADB]/60 shrink-0">
              Escrow 48h
            </span>
          </div>
        </div>

        {/* Khu vực giao dịch (KTX/Cơ sở) & Lượt xem */}
        <div className="mt-3 pt-2.5 border-t border-[#D6E8EE]/70 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1 max-w-[68%] truncate px-2 py-0.5 rounded-md bg-[#D6E8EE]/35 text-[#001B48] font-semibold">
            <IconMapPin className="w-3 h-3 text-[#018ABE] shrink-0" />
            <span className="truncate" title={product.pickup_location}>
              {product.pickup_location}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-[#02457A]/70 font-medium">
            <span className="inline-flex items-center gap-0.5">
              <IconEye className="w-3 h-3" />
              {product.view_count}
            </span>
            <span>•</span>
            <span>{formatRelativeTime(product.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
