"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function PassportBanner() {
  const router = useRouter();
  const [lookupCode, setLookupCode] = useState("");

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupCode.trim()) {
      router.push(`/passport/${lookupCode.trim()}`);
    }
  };

  return (
    <section className="py-12 sm:py-16 bg-linear-to-br from-[#001B48] via-[#02457A] to-[#018ABE] text-white relative overflow-hidden">
      {/* Họa tiết nền mờ & ánh sáng tuần hoàn */}
      <div className="absolute inset-0 pointer-events-none opacity-15">
        <div className="absolute top-1/4 left-10 w-96 h-96 rounded-full bg-[#97CADB] filter blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-[#018ABE] filter blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Cột trái (7/12 cột): Giới thiệu Hộ Chiếu Đồ Vật Product Passport */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[#018ABE]/40 border border-[#97CADB]/40 text-[#D6E8EE] mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Độc Quyền Tại UniCycle · Vòng Đời Đồ Vật Tuần Hoàn</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              Biết Rõ Món Đồ Bạn Mua <br className="hidden sm:inline" />
              <span className="text-[#97CADB]">Đã Qua Tay Ai &amp; Nguồn Gốc Thế Nào</span>
            </h2>

            <p className="text-sm sm:text-base text-[#D6E8EE]/90 leading-relaxed mb-6 max-w-xl">
              Không còn nỗi lo mua phải đồ trộm cắp hay hàng hỏng giấu lỗi. Mỗi món đồ đăng ký trên UniCycle được cấp một <strong>Hộ Chiếu Số (Product Passport)</strong> minh bạch lịch sử các đời chủ, bảo toàn uy tín sinh viên qua từng năm học.
            </p>

            {/* 3 Lợi ích cốt lõi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <div className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-sky-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </span>
                  <span>Chuỗi đời chủ</span>
                </div>
                <p className="text-xs text-[#D6E8EE]/90 leading-relaxed">Biết món đồ đã qua mấy sinh viên KTX sử dụng.</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <div className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </span>
                  <span>Chống trộm cắp</span>
                </div>
                <p className="text-xs text-[#D6E8EE]/90 leading-relaxed">Khóa vĩnh viễn và gắn cờ các món đồ nghi vấn trộm cắp.</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <div className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </span>
                  <span>Bán lại 1-click</span>
                </div>
                <p className="text-xs text-[#D6E8EE]/90 leading-relaxed">Kế thừa hồ sơ, chuyển giao quyền sở hữu trong 30s.</p>
              </div>
            </div>

            {/* Ô Tra cứu nhanh Passport */}
            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Nhập mã Passport (VD: 0x6a8f...)"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-white/15 border border-white/20 text-white placeholder-[#D6E8EE]/60 text-sm focus:outline-none focus:bg-white/25 focus:border-[#97CADB]"
                />
              </div>
              <button
                type="submit"
                className="h-12 px-6 rounded-xl font-bold text-sm bg-white text-[#001B48] hover:bg-[#D6E8EE] transition-colors shrink-0 shadow-md cursor-pointer"
              >
                Tra cứu ngay
              </button>
            </form>
          </div>

          {/* Cột phải (5/12 cột): Thẻ Hộ Chiếu Mẫu Sinh Động */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#018ABE] flex items-center justify-center font-bold text-white shadow-xs">
                    UC
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-white">HỘ CHIẾU SỐ ĐỒ VẬT</h4>
                    <p className="text-[11px] text-[#97CADB]">Digital Product Passport · UniCycle</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  HỢP LỆ ✓
                </span>
              </div>

              {/* Sản phẩm mẫu */}
              <div className="bg-black/20 rounded-2xl p-4 mb-4">
                <span className="text-[11px] text-[#D6E8EE]/70 block mb-0.5">Món đồ theo dõi:</span>
                <p className="font-bold text-sm text-white">Máy tính Casio fx-580VNX (Nguyên tem)</p>
                <p className="text-xs text-[#97CADB] mt-0.5">Số Serial: 87B4-2910-K24</p>
              </div>

              {/* Dòng thời gian các đời chủ */}
              <div className="space-y-3 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#97CADB]/40">
                <div className="relative">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#97CADB]" />
                  <p className="text-xs font-bold text-white">Đời chủ #1: Sinh viên KHTN (Ẩn danh)</p>
                  <p className="text-[11px] text-[#D6E8EE]/70">Bàn giao tại KTX Khu B · 6 tháng trước</p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <p className="text-xs font-bold text-white">Đời chủ #2: Nguyễn Hoàng Nam (Bách Khoa)</p>
                  <p className="text-[11px] text-emerald-300">Chủ sở hữu hiện tại · Sẵn sàng chuyển nhượng</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between">
                <div className="text-[11px] text-[#D6E8EE]/80">
                  Xác minh off-chain &amp; Lát cắt Fuji
                </div>
                <Link
                  href="/passport/0x6a8f12c4b7890123456789abcdef0123456789abcdef0123456789abcdef01"
                  className="text-xs font-bold text-white hover:text-[#97CADB] transition-colors underline"
                >
                  Xem mẫu chi tiết &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
