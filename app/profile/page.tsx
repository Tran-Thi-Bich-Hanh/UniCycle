import React, { Suspense } from "react";
import { Metadata } from "next";
import { ProfileClient } from "@/components/profile/ProfileClient";

export const instant = false;

export const metadata: Metadata = {
  title: "Hồ Sơ & Cài Đặt | UniCycle",
  description:
    "Quản lý thông tin sinh viên, xem đánh giá uy tín và cài đặt bảo mật & tài khoản.",
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-[1040px] mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang tải hồ sơ cá nhân...
            </span>
          </div>
        }
      >
        <ProfileClient />
      </Suspense>
    </main>
  );
}
