"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { IconMail, IconMapPin, IconPhone, IconSchool } from "@/components/icons";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState<{ active: number; sold: number; hidden: number; total: number }>({
    active: 0,
    sold: 0,
    hidden: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/my-listings").then((r) => r.json()),
    ])
      .then(([authData, listingsData]) => {
        if (!authData.user) {
          router.push("/login?redirect=/profile");
          return;
        }
        setUser(authData.user);
        if (listingsData.counts) {
          setCounts(listingsData.counts);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#02457A]">
            <div className="w-5 h-5 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span>Đang tải thông tin tài khoản...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[#02457A] mb-4 font-medium">
          <Link href="/" className="hover:text-[#018ABE] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-[#001B48] font-bold">Tài khoản sinh viên</span>
        </nav>

        {/* Card Hồ sơ cá nhân */}
        <div className="bg-white rounded-3xl border border-[#D6E8EE] p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-[#02457A] text-white flex items-center justify-center text-3xl font-extrabold overflow-hidden border-2 border-[#97CADB] shadow-sm">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span>{user.full_name?.charAt(0) || "U"}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#018ABE] text-white shadow-xs">
                Sinh viên
              </span>
            </div>

            {/* Thông tin chính */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl font-extrabold text-[#001B48]">{user.full_name}</h1>
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#D6E8EE] text-[#001B48] border border-[#97CADB]/60 w-fit mx-auto sm:mx-0">
                  ✓ Tài khoản đã xác thực
                </span>
              </div>

              <div className="text-xs text-[#02457A] space-y-1.5">
                <p className="flex items-center gap-2 justify-center sm:justify-start"><IconMail className="w-3.5 h-3.5" /> {user.email}</p>
                <p className="flex items-center gap-2 justify-center sm:justify-start"><IconSchool className="w-3.5 h-3.5" /> {user.university || "Chưa cập nhật trường"}</p>
                {user.campus_location && <p className="flex items-center gap-2 justify-center sm:justify-start"><IconMapPin className="w-3.5 h-3.5" /> {user.campus_location}</p>}
                {user.phone && <p className="flex items-center gap-2 justify-center sm:justify-start"><IconPhone className="w-3.5 h-3.5" /> {user.phone}</p>}
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Link
                href="/products/new"
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors shadow-2xs"
              >
                + Đăng tin bán đồ
              </Link>
              <Link
                href="/profile/edit"
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-white text-[#001B48] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors"
              >
                Sửa hồ sơ
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-center text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
              >
                Đăng xuất
              </button>
            </div>
          </div>

          {!user.phone && (
            <div role="note" className="mt-6 p-4 rounded-2xl bg-[#D6E8EE]/50 border border-[#97CADB] flex items-start gap-3 text-xs text-[#001B48]">
              <IconPhone className="w-4 h-4 mt-0.5 text-[#018ABE] shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Bạn chưa có số điện thoại</p>
                <p className="text-[#02457A] mt-0.5">Người mua sẽ không thể liên hệ với bạn qua gọi điện hay Zalo.</p>
              </div>
              <Link href="/profile/edit" className="font-extrabold text-[#018ABE] hover:underline shrink-0">Thêm ngay →</Link>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-[#D6E8EE]">
            <div className="bg-[#D6E8EE]/30 p-4 rounded-2xl text-center border border-[#D6E8EE]">
              <div className="text-2xl font-extrabold text-[#018ABE]">{counts.active}</div>
              <div className="text-xs font-bold text-[#001B48] mt-0.5">Đang đăng bán</div>
            </div>
            <div className="bg-[#D6E8EE]/30 p-4 rounded-2xl text-center border border-[#D6E8EE]">
              <div className="text-2xl font-extrabold text-[#02457A]">{counts.sold}</div>
              <div className="text-xs font-bold text-[#001B48] mt-0.5">Đã thanh lý</div>
            </div>
            <div className="bg-[#D6E8EE]/30 p-4 rounded-2xl text-center border border-[#D6E8EE]">
              <div className="text-2xl font-extrabold text-[#001B48]">{counts.total}</div>
              <div className="text-xs font-bold text-[#001B48] mt-0.5">Tổng bài đăng</div>
            </div>
          </div>
        </div>

        {/* Thanh chuyển nhanh sang Quản lý tin đăng */}
        <div className="flex items-center justify-between p-5 rounded-2xl bg-white border border-[#D6E8EE] shadow-2xs">
          <div>
            <h3 className="font-extrabold text-base text-[#001B48]">Quản lý tin đăng của bạn</h3>
            <p className="text-xs text-[#02457A] mt-0.5">
              Chỉnh sửa thông tin, giá bán, hoặc chuyển trạng thái sang "Đã bán"
            </p>
          </div>
          <Link
            href="/profile/my-listings"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#02457A] text-white hover:bg-[#001B48] transition-colors shadow-2xs shrink-0"
          >
            Vào mục Tin đăng →
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

