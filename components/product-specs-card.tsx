"use client";

import React from "react";
import Link from "next/link";
import { extractDisplaySpecs } from "@/lib/passport";
import { IconArrowRight, IconCheck, IconShieldCheck, IconTag } from "./icons";

interface ProductSpecsCardProps {
  productId: string;
  categoryId: string;
  attributes: string | Record<string, any> | null | undefined;
}

/**
 * Hiển thị trực tiếp các thông số kỹ thuật cam kết theo danh mục ngay trên trang chi tiết món đồ
 */
export function ProductSpecsCard({ productId, categoryId, attributes }: ProductSpecsCardProps) {
  const specs = extractDisplaySpecs(categoryId, attributes);
  if (specs.length === 0) return null;

  return (
    <section
      aria-labelledby="specs-heading"
      className="bg-white rounded-2xl border border-[#D6E8EE] p-6 space-y-4 shadow-2xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="specs-heading" className="text-lg font-extrabold text-[#001B48] flex items-center gap-2">
          <IconTag className="w-5 h-5 text-[#018ABE]" />
          <span>Thông số thực tế người bán cam kết</span>
        </h2>
        <Link
          href={`/products/${productId}/passport`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#018ABE] hover:text-[#02457A] transition-colors"
        >
          <IconShieldCheck className="w-3.5 h-3.5" />
          <span>Đã niêm phong trên Passport →</span>
        </Link>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {specs.map((item) => (
          <div
            key={item.key}
            className={`p-3.5 rounded-xl border flex flex-col justify-between gap-1 ${
              item.isHighlight
                ? "bg-amber-50/50 border-amber-200 text-amber-950"
                : "bg-[#D6E8EE]/25 border-[#D6E8EE] text-[#001B48]"
            }`}
          >
            <dt className="text-[11px] font-bold uppercase tracking-wider text-[#02457A]">
              {item.label}
            </dt>
            <dd className="text-sm font-extrabold text-[#001B48] flex items-start gap-1.5">
              <IconCheck className="w-4 h-4 text-[#018ABE] shrink-0 mt-0.5" />
              <span>{item.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Huy hiệu Bảo chứng thu gọn (UX Abstraction):
 * Không phô trương mã hex 0x... gây ngợp cho sinh viên, chỉ hiển thị thông điệp tin cậy rõ ràng
 * và dành sẵn không gian cột phải cho nút Đặt cọc Smart Escrow ở Giai đoạn 3.
 */
export function PassportTrustBanner({ productId }: { productId: string }) {
  return (
    <Link
      href={`/products/${productId}/passport`}
      className="group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white transition-all shadow-2xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-[#018ABE] text-white flex items-center justify-center shrink-0">
          <IconShieldCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold text-white truncate">
              Đã bảo chứng thông số gốc
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#018ABE]/30 text-[#97CADB] text-[10px] font-bold border border-[#97CADB]/30 shrink-0">
              Passport
            </span>
          </div>
          <p className="text-[11px] text-[#97CADB] truncate mt-0.5">
            Xem chứng nhận nguyên bản & lịch sử qua tay sinh viên
          </p>
        </div>
      </div>
      <IconArrowRight className="w-4 h-4 text-[#97CADB] group-hover:translate-x-1 transition-transform shrink-0" />
    </Link>
  );
}

