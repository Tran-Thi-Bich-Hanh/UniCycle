import React, { Suspense } from "react";
import { Metadata } from "next";
import { MyProductsManager } from "@/components/my-products/MyProductsManager";

export const metadata: Metadata = {
  title: "Quản Lý Tin Đăng Cá Nhân | UniCycle Sinh Viên",
  description:
    "Quản lý danh sách tin đăng bán đồ, cập nhật thông tin, điều chỉnh trạng thái giữ chỗ (RESERVED), đánh dấu đã bán và gia hạn hạn đăng tin 30 ngày.",
};

export default function MyProductsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang tải danh sách tin đăng của bạn...
            </span>
          </div>
        }
      >
        <MyProductsManager />
      </Suspense>
    </main>
  );
}

