"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-[#001B48] text-white border-t border-[#02457A] pb-20 lg:pb-0">
      {/* Nội dung chính Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
        {/* Cột 1: Thương hiệu UniCycle */}
        <div className="lg:col-span-4 space-y-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white p-0.5">
              <Image src="/logo.jpg" alt="Logo UniCycle" fill sizes="44px" className="object-contain" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Uni<span className="text-[#97CADB]">Cycle</span>
              </span>
              <p className="text-xs text-[#97CADB]">Chợ đồ cũ sinh viên TP.HCM</p>
            </div>
          </Link>
          <p className="text-sm text-[#D6E8EE]/85 leading-relaxed max-w-sm">
            Nền tảng giúp sinh viên mua bán, thanh lý hoặc tặng lại giáo trình, bàn ghế, quạt điện và đồ dùng ký túc xá với lịch sử chuyển giao minh bạch.
          </p>
          <div className="pt-1 text-xs text-[#97CADB] space-y-1">
            <p>Khu vực trọng điểm: Làng Đại học Thủ Đức (KTX Khu A &amp; Khu B), Bách Khoa, KHTN, UEH.</p>
            <p>Khuyến nghị: Gặp mặt kiểm tra đồ trực tiếp tại cổng trường/KTX, không đặt cọc trước.</p>
          </div>
        </div>

        {/* Cột 2: Danh mục */}
        <div className="lg:col-span-3 space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-[#97CADB]">
            Danh mục phổ biến
          </h4>
          <ul className="space-y-2 text-sm text-[#D6E8EE]/90">
            <li>
              <Link href="/categories/giao-trinh-sach" className="hover:text-white transition-colors">
                Giáo trình &amp; Sách
              </Link>
            </li>
            <li>
              <Link href="/categories/ban-ghe-tu-ktx" className="hover:text-white transition-colors">
                Bàn ghế &amp; Nội thất
              </Link>
            </li>
            <li>
              <Link href="/categories/do-gia-dung-quat" className="hover:text-white transition-colors">
                Đồ gia dụng
              </Link>
            </li>
            <li>
              <Link href="/categories/do-dien-tu-phu-kien" className="hover:text-white transition-colors">
                Đồ điện tử
              </Link>
            </li>
            <li>
              <Link href="/categories/goc-0d-cho-tang" className="text-[#97CADB] font-semibold hover:text-white transition-colors">
                Góc Cho Tặng
              </Link>
            </li>
          </ul>
        </div>

        {/* Cột 3: Dành cho sinh viên */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-[#97CADB]">
            Tài khoản &amp; Đơn
          </h4>
          <ul className="space-y-2 text-sm text-[#D6E8EE]/90">
            <li>
              <Link href="/sell" className="hover:text-white transition-colors">
                Đăng bán dưới 60s
              </Link>
            </li>
            <li>
              <Link href="/orders" className="hover:text-white transition-colors">
                Quản lý lịch hẹn
              </Link>
            </li>
            <li>
              <Link href="/my-items" className="hover:text-white transition-colors">
                Đồ của tôi
              </Link>
            </li>
            <li>
              <Link href="/verify-student" className="hover:text-white transition-colors">
                Xác minh thẻ sinh viên
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition-colors">
                Quy tắc an toàn &amp; Riêng tư
              </Link>
            </li>
          </ul>
        </div>

        {/* Cột 4: Digital Product Passport & Avalanche Fuji */}
        <div className="lg:col-span-3 space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-[#97CADB]">
            Digital Product Passport
          </h4>
          <div className="p-4 rounded-2xl bg-[#02457A]/70 border border-[#018ABE]/40 space-y-2.5">
            <p className="text-xs text-[#D6E8EE] leading-relaxed">
              Mỗi món đồ bật Passport có mã QR số hiển thị trên màn hình điện thoại để kiểm tra chuỗi đời chủ (Chủ #1 ➔ Chủ #2 ➔ Chủ #3).
            </p>
            <p className="text-[11px] text-[#97CADB]">
              Lưu ý (BR30): Passport ghi nhận lịch sử chuyển giao, không chứng nhận chất lượng hàng hóa. Lát cắt đối chiếu on-chain hoạt động trên Avalanche Fuji Testnet.
            </p>
            <Link
              href="/passport/demo-senko-8f3a"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#97CADB] pt-1 transition-colors"
            >
              <span>Xem mẫu Hộ chiếu đồ vật</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#97CADB]">
          <p>© 2026 UniCycle. Phát triển bởi UniCycle Team H.Y cho cộng đồng sinh viên.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">
              Điều khoản sử dụng
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Chính sách riêng tư (NĐ 13/2023/NĐ-CP)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

