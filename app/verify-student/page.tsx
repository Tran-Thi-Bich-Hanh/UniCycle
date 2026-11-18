import React, { Suspense } from "react";
import { Metadata } from "next";
import { VerifyStudentClient } from "@/components/auth/VerifyStudentClient";

export const instant = false;

export const metadata: Metadata = {
  title: "Xác Minh Sinh Viên | UniCycle",
  description:
    "Xác minh danh tính sinh viên qua email trường .edu.vn hoặc ảnh thẻ sinh viên tuân thủ Nghị định 13/2023/NĐ-CP.",
};

export default function VerifyStudentPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang tải trang xác minh sinh viên...
            </span>
          </div>
        }
      >
        <VerifyStudentClient />
      </Suspense>
    </main>
  );
}
