import React from "react";
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#001B48] text-white border-t border-[#02457A] pb-20 lg:pb-0">
      {/* dải Cam kết an toàn giao dịch sinh viên */}
      <div className="bg-[#02457A]/60 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#018ABE]/25 border border-[#97CADB]/30 flex items-center justify-center shrink-0 text-[#97CADB]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cộng đồng SV Xác minh</h3>
              <p className="text-xs text-[#D6E8EE]/80 mt-0.5 leading-relaxed">
                Đăng nhập Google 1 chạm, cấp huy hiệu qua thẻ SV hoặc email trường.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#018ABE]/25 border border-[#97CADB]/30 flex items-center justify-center shrink-0 text-[#97CADB]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Liên hệ Zalo &amp; Đặt hẹn</h3>
              <p className="text-xs text-[#D6E8EE]/80 mt-0.5 leading-relaxed">
                Chống thu thập SĐT hàng loạt, hỗ trợ lời mời chốt bán 24h và giữ chỗ.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#018ABE]/25 border border-[#97CADB]/30 flex items-center justify-center shrink-0 text-[#97CADB]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Hộ chiếu đồ vật (Passport)</h3>
              <p className="text-xs text-[#D6E8EE]/80 mt-0.5 leading-relaxed">
                Theo dõi chuỗi đời chủ qua mã QR màn hình, bán lại kế thừa lịch sử.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#018ABE]/25 border border-[#97CADB]/30 flex items-center justify-center shrink-0 text-[#97CADB]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Chu kỳ 48h &amp; Blind Review</h3>
              <p className="text-xs text-[#D6E8EE]/80 mt-0.5 leading-relaxed">
                Xác nhận trao tay tại trường/KTX, bảo vệ người mua với nút khiếu nại.
              </p>
            </div>
          </div>
        </div>
      </div>

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
                Giáo trình &amp; Sách đại học
              </Link>
            </li>
            <li>
              <Link href="/categories/ban-ghe-tu-ktx" className="hover:text-white transition-colors">
                Bàn học gấp &amp; Nội thất KTX
              </Link>
            </li>
            <li>
              <Link href="/categories/do-gia-dung-quat" className="hover:text-white transition-colors">
                Quạt điện &amp; Đồ gia dụng phòng trọ
              </Link>
            </li>
            <li>
              <Link href="/categories/do-dien-tu-phu-kien" className="hover:text-white transition-colors">
                Máy tính Casio &amp; Phụ kiện học tập
              </Link>
            </li>
            <li>
              <Link href="/categories/goc-0d-cho-tang" className="text-[#97CADB] font-semibold hover:text-white transition-colors">
                Góc 0đ – Sinh viên chia sẻ
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
                Quản lý lịch hẹn (/orders)
              </Link>
            </li>
            <li>
              <Link href="/my-products" className="hover:text-white transition-colors">
                Đồ của tôi (/my-products)
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

