"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  IconMail,
  IconMapPin,
  IconPhone,
  IconSchool,
  IconWallet,
  IconLock,
  IconPlus,
  IconArrowRight,
} from "@/components/icons";
import { formatCurrencyVND } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState<{
    active: number;
    sold: number;
    hidden: number;
    total: number;
  }>({
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
    window.dispatchEvent(new Event("unicycle:wallet-updated"));
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

  const availableBalance = Number(user.point_balance || 0);
  const lockedBalance = Number(user.locked_balance || 0);
  const totalBalance = Number(user.total_balance ?? availableBalance + lockedBalance);
  const activeEscrowCount = Number(user.active_escrow_count || 0);
  const incomingEscrowCount = Number(user.incoming_escrow_count || 0);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[#02457A] font-medium">
          <Link href="/" className="hover:text-[#018ABE] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-[#001B48] font-bold">Hồ sơ sinh viên</span>
        </nav>

        {/* 1. Card Hồ sơ cá nhân */}
        <section className="bg-white rounded-3xl border border-[#D6E8EE] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-[#02457A] text-white flex items-center justify-center text-3xl font-extrabold overflow-hidden border-2 border-[#97CADB] shadow-sm">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
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
                <h1 className="text-2xl font-extrabold text-[#001B48]">
                  {user.full_name}
                </h1>
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#D6E8EE] text-[#001B48] border border-[#97CADB]/60 w-fit mx-auto sm:mx-0">
                  ✓ Tài khoản sinh viên xác thực
                </span>
              </div>

              <div className="text-xs text-[#02457A] space-y-1.5">
                <p className="flex items-center gap-2 justify-center sm:justify-start">
                  <IconMail className="w-3.5 h-3.5 text-[#018ABE]" />{" "}
                  {user.email}
                </p>
                <p className="flex items-center gap-2 justify-center sm:justify-start">
                  <IconSchool className="w-3.5 h-3.5 text-[#018ABE]" />{" "}
                  {user.university || "Chưa cập nhật trường"}
                </p>
                {user.campus_location && (
                  <p className="flex items-center gap-2 justify-center sm:justify-start">
                    <IconMapPin className="w-3.5 h-3.5 text-[#018ABE]" />{" "}
                    {user.campus_location}
                  </p>
                )}
                {user.phone && (
                  <p className="flex items-center gap-2 justify-center sm:justify-start">
                    <IconPhone className="w-3.5 h-3.5 text-[#018ABE]" />{" "}
                    {user.phone}
                  </p>
                )}
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
                className="py-2 px-4 rounded-xl text-xs font-semibold text-center text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200 cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>

          {!user.phone && (
            <div
              role="note"
              className="mt-6 p-4 rounded-2xl bg-[#D6E8EE]/50 border border-[#97CADB] flex items-start gap-3 text-xs text-[#001B48]"
            >
              <IconPhone className="w-4 h-4 mt-0.5 text-[#018ABE] shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Bạn chưa cập nhật số điện thoại</p>
                <p className="text-[#02457A] mt-0.5">
                  Thêm số điện thoại để người mua dễ dàng hẹn gặp nhận đồ tại KTX/Trường.
                </p>
              </div>
              <Link
                href="/profile/edit"
                className="font-extrabold text-[#018ABE] hover:underline shrink-0"
              >
                Thêm ngay →
              </Link>
            </div>
          )}
        </section>

        {/* 2. Thẻ Tóm tắt Ví UniCycle & Đơn Giữ Chỗ (Kết nối liền mạch Hồ sơ - Ví - Đơn hàng) */}
        <section className="rounded-3xl bg-gradient-to-r from-[#001B48] via-[#02457A] to-[#018ABE] text-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D6E8EE]">
                <IconWallet className="w-4 h-4 text-[#97CADB]" />
                <span>Ví UniCycle của bạn</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mt-1">
                {availableBalance.toLocaleString("vi-VN")}{" "}
                <span className="text-sm font-bold text-[#97CADB]">
                  UNIP khả dụng
                </span>
              </div>
              <div className="text-xs text-[#D6E8EE] mt-0.5">
                = {formatCurrencyVND(availableBalance)} • Tổng tài sản:{" "}
                <strong>{totalBalance.toLocaleString("vi-VN")} UNIP</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/wallet?tab=TOPUP"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white text-[#001B48] hover:bg-[#D6E8EE] transition-colors"
              >
                <IconPlus className="w-3.5 h-3.5 text-[#018ABE]" />
                <span>Nạp điểm</span>
              </Link>
              <Link
                href="/wallet?tab=ESCROWS"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/15 text-white hover:bg-white/25 border border-white/20 transition-colors"
              >
                <IconLock className="w-3.5 h-3.5 text-[#97CADB]" />
                <span>
                  Đơn giữ chỗ ({activeEscrowCount + incomingEscrowCount})
                </span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/15 text-xs">
            <div className="rounded-xl bg-white/10 p-3">
              <span className="text-[#D6E8EE] block text-[11px]">
                Đang giữ trong Escrow (Mua)
              </span>
              <strong className="text-sm font-extrabold text-white">
                {lockedBalance.toLocaleString("vi-VN")} UNIP ({activeEscrowCount} đơn)
              </strong>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <span className="text-[#D6E8EE] block text-[11px]">
                Khách đặt giữ chỗ (Bán)
              </span>
              <strong className="text-sm font-extrabold text-white">
                {incomingEscrowCount} đơn đang chờ gặp
              </strong>
            </div>
            <Link
              href="/wallet?tab=HISTORY"
              className="rounded-xl bg-white/10 hover:bg-white/15 p-3 flex items-center justify-between transition-colors"
            >
              <div>
                <span className="text-[#D6E8EE] block text-[11px]">
                  Biến động số dư
                </span>
                <strong className="text-sm font-extrabold text-white">
                  Xem sao kê ví
                </strong>
              </div>
              <IconArrowRight className="w-4 h-4 text-[#97CADB]" />
            </Link>
          </div>
        </section>

        {/* 3. Thống kê & Quản lý tin đăng của bạn */}
        <section className="bg-white rounded-3xl border border-[#D6E8EE] p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-lg text-[#001B48]">
                Quản lý tin đăng thanh lý
              </h2>
              <p className="text-xs text-[#02457A] mt-0.5">
                Theo dõi món đồ đang bán, đang giữ chỗ và đã thanh lý
              </p>
            </div>
            <Link
              href="/profile/my-listings"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#02457A] text-white hover:bg-[#001B48] transition-colors shadow-2xs w-fit"
            >
              Quản lý tất cả tin đăng →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#D6E8EE]/30 p-4 rounded-2xl text-center border border-[#D6E8EE]">
              <div className="text-2xl font-extrabold text-[#018ABE]">
                {counts.active}
              </div>
              <div className="text-xs font-bold text-[#001B48] mt-0.5">
                Đang đăng bán
              </div>
            </div>
            <div className="bg-[#D6E8EE]/30 p-4 rounded-2xl text-center border border-[#D6E8EE]">
              <div className="text-2xl font-extrabold text-[#02457A]">
                {counts.sold}
              </div>
              <div className="text-xs font-bold text-[#001B48] mt-0.5">
                Đã thanh lý
              </div>
            </div>
            <div className="bg-[#D6E8EE]/30 p-4 rounded-2xl text-center border border-[#D6E8EE]">
              <div className="text-2xl font-extrabold text-[#001B48]">
                {counts.total}
              </div>
              <div className="text-xs font-bold text-[#001B48] mt-0.5">
                Tổng bài đăng
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
