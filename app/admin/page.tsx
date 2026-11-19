import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export const instant = false;

export const metadata: Metadata = {
  title: "Quản trị hệ thống | UniCycle",
  description:
    "Trung tâm vận hành UniCycle: theo dõi tổng quan, quản lý tin đăng, người dùng và kiểm duyệt cộng đồng sinh viên.",
};

async function AdminPageContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/admin");
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-4 shadow-[0_1px_2px_rgba(0,27,72,0.04)]">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#001B48]">
            Khu vực dành riêng cho Quản trị viên
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Tài khoản hiện tại ({user.email}) chưa được cấp quyền Quản trị viên. Vui lòng đăng nhập bằng tài khoản quản trị để tiếp tục.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/login?returnTo=/admin"
              className="px-5 py-2.5 rounded-xl bg-[#001B48] text-white text-xs font-semibold hover:bg-[#02457A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              Đăng nhập Quản trị viên
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              Về Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboardClient
      currentAdminId={user.id}
      currentAdminEmail={user.email}
    />
  );
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-slate-500">
              Đang kiểm tra quyền truy cập Quản trị viên...
            </span>
          </div>
        }
      >
        <AdminPageContent />
      </Suspense>
    </main>
  );
}
