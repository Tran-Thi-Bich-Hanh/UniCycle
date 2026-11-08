import React from "react";
import Link from "next/link";
import { Product } from "@/lib/db";
import { formatCurrencyVND, formatRelativeTime, CONDITION_LABELS, STATUS_LABELS } from "@/lib/utils";

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

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-[#D6E8EE] overflow-hidden shadow-2xs hover:shadow-lg hover:shadow-[#001B48]/5 hover:border-[#97CADB] transition-all duration-300 hover:-translate-y-1 cursor-pointer"
    >
      {/* Khung ảnh sản phẩm */}
      <div className="relative aspect-4/3 w-full bg-[#D6E8EE]/30 overflow-hidden">
        <img
          src={coverImage}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Nhãn tình trạng */}
        <span
          className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs backdrop-blur-xs ${conditionMeta.badgeClass}`}
        >
          {conditionMeta.label}
        </span>

        {/* Trạng thái nếu không phải ACTIVE */}
        {product.status !== "ACTIVE" && (
          <span
            className={`absolute top-2.5 right-2.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs ${
              statusMeta?.colorClass || "bg-[#02457A] text-white"
            }`}
          >
            {statusMeta?.label || product.status}
          </span>
        )}

        {/* Số lượng ảnh */}
        {product.images && product.images.length > 1 && (
          <span className="absolute bottom-2 right-2 text-[10px] font-medium bg-[#001B48]/70 text-white px-1.5 py-0.5 rounded-md backdrop-blur-xs">
            📷 {product.images.length}
          </span>
        )}
      </div>

      {/* Thông tin sản phẩm */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Danh mục */}
          {product.category && (
            <p className="text-[11px] font-bold text-[#018ABE] mb-1 truncate">
              {product.category.name}
            </p>
          )}

          {/* Tiêu đề */}
          <h3 className="text-xs sm:text-sm font-bold text-[#001B48] line-clamp-2 leading-snug group-hover:text-[#018ABE] transition-colors">
            {product.title}
          </h3>

          {/* Giá tiền */}
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-sm sm:text-base font-black text-[#02457A]">
              {formatCurrencyVND(product.price)}
            </span>
          </div>
        </div>

        {/* Địa điểm & Lượt xem */}
        <div className="mt-3.5 pt-3 border-t border-[#D6E8EE]/70 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1 max-w-[65%] truncate">
            <span className="text-[#018ABE] shrink-0 text-xs">📍</span>
            <span className="truncate text-slate-600" title={product.pickup_location}>
              {product.pickup_location}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
            <span>👁️ {product.view_count}</span>
            <span>•</span>
            <span>{formatRelativeTime(product.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
