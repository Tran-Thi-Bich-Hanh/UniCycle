import React, { Suspense } from "react";
import { Metadata } from "next";
import { OrdersManager } from "@/components/orders/OrdersManager";

export const metadata: Metadata = {
  title: "Quản Lý Lịch Hẹn & Đơn Hàng | UniCycle Sinh Viên",
  description:
    "Quản lý lịch hẹn xem hàng, xác nhận giữ chỗ món đồ độc quyền (RESERVED) và kết nối trao tay an toàn tại khuôn viên trường, ký túc xá TP.HCM.",
};

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang tải danh sách lịch hẹn...
            </span>
          </div>
        }
      >
        <OrdersManager />
      </Suspense>
    </main>
  );
}

