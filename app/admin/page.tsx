import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export const instant = false;

export const metadata: Metadata = {
  title: "Quản Trị Kiểm Duyệt & Phân Xử | UniCycle Admin",
  description:
    "Phân xử đơn hàng tranh chấp SLA 72h, gắn/gỡ cờ Passport BR39, duyệt báo cáo vi phạm BR17 và phê duyệt thẻ sinh viên theo NĐ 13/2023/NĐ-CP.",
};

async function AdminPageContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/admin");
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="max-w-xl mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-4 shadow-xs">
          <div className="text-4xl">🛡️</div>
          <h1 className="text-xl font-black text-[#001B48]">
            Khu vực dành riêng cho Quản trị viên
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tài khoản hiện tại ({user.email}) có quyền <code className="font-mono font-bold">{user.role}</code>. Vui lòng đăng nhập bằng tài khoản Quản trị viên (<code className="font-mono">admin@unicycle.vn</code>) để truy cập trang này.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/login?returnTo=/admin"
              className="px-5 py-2.5 rounded-xl bg-[#001B48] text-white text-xs font-bold hover:bg-[#02457A]"
            >
              Đăng nhập Admin
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-[#D6E8EE] text-[#02457A] text-xs font-bold hover:bg-[#F4F9FB]"
            >
              Về Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboardClient />;
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang kiểm tra quyền Quản trị viên...
            </span>
          </div>
        }
      >
        <AdminPageContent />
      </Suspense>
    </main>
  );
}
