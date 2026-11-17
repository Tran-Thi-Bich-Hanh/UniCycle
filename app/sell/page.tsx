import React, { Suspense } from "react";
import { Metadata } from "next";
import { SellForm } from "@/components/sell/SellForm";

export const metadata: Metadata = {
  title: "Đăng Bán Siêu Tốc < 60 Giây | UniCycle Sinh Viên",
  description:
    "Đăng bán hoặc cho tặng giáo trình, đồ điện tử, đồ dùng KTX siêu tốc dưới 60 giây. Tự động cấp Hộ Chiếu Số Digital Product Passport bảo vệ giá trị vòng đời món đồ.",
};

export default function SellPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto px-4 py-16 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <SellForm />
      </Suspense>
    </main>
  );
}

