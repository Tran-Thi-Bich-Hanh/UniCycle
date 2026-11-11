import React from "react";
import Link from "next/link";
import { Product } from "@/lib/db";
import { formatCurrencyVND } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const coverImage =
    product.images && product.images.length > 0
      ? product.images[0].url
      : "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80";

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-[#D6E8EE] overflow-hidden shadow-2xs hover:shadow-lg hover:shadow-[#001B48]/5 hover:border-[#018ABE] transition-all duration-300 hover:-translate-y-1 cursor-pointer"
    >
      {/* Hình ảnh sản phẩm */}
      <div className="relative aspect-4/3 w-full bg-[#D6E8EE]/30 overflow-hidden">
        <img
          src={coverImage}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Tên và giá sản phẩm */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-2.5">
        <h3 className="text-xs sm:text-sm font-bold text-[#001B48] line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-[#018ABE] transition-colors">
          {product.title}
        </h3>

        <span className="text-sm sm:text-base font-black text-[#02457A]">
          {formatCurrencyVND(product.price)}
        </span>
      </div>
    </Link>
  );
}
