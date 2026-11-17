import React, { Suspense } from "react";
import { Metadata } from "next";
import { OrderDetailClient } from "@/components/orders/OrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export const metadata: Metadata = {
  title: "Chi Tiết Đơn Hẹn & Bàn Giao | UniCycle Sinh Viên",
  description:
    "Theo dõi tiến trình hẹn gặp, xác nhận bàn giao 48 giờ, gửi khiếu nại bảo vệ người mua và theo dõi chuyển giao Digital Product Passport.",
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang tải chi tiết đơn hẹn...
            </span>
          </div>
        }
      >
        <OrderDetailClient orderId={id} />
      </Suspense>
    </main>
  );
}

