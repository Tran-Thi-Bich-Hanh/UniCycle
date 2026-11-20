import React, { Suspense } from "react";
import { Metadata } from "next";
import { HandoverConfirmClient } from "@/components/orders/HandoverConfirmClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export const metadata: Metadata = {
  title: "Xác Nhận Giao Nhận Trao Tay | UniCycle",
  description:
    "Kiểm tra nhanh thông tin sản phẩm, người bán, trạng thái Product Passport và xác nhận nhận hàng trực tiếp tại điểm hẹn.",
};

export default async function OrderHandoverPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang kiểm tra mã QR giao nhận...
            </span>
          </div>
        }
      >
        <HandoverConfirmClient orderId={id} />
      </Suspense>
    </main>
  );
}
