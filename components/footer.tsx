import React from "react";
import Link from "next/link";
import { IconShieldCheck } from "./icons";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                🔄
              </div>
              <span className="text-xl font-black text-white">UniCycle</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nền tảng mua bán và tái sử dụng đồ dùng uy tín, tiết kiệm dành riêng cho cộng đồng sinh viên các trường đại học tại TP.HCM.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-blue-400 pt-1 font-semibold">
              <IconShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Giao dịch an toàn & minh bạch</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-bold text-xs tracking-wider uppercase mb-3">Danh mục đồ cũ</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/products?category=sach-giao-trinh" className="hover:text-blue-400 transition-colors">
                  📚 Sách & Giáo trình đại học
                </Link>
              </li>
              <li>
                <Link href="/products?category=ban-ghe-noi-that" className="hover:text-blue-400 transition-colors">
                  🪑 Bàn ghế & Nội thất phòng trọ
                </Link>
              </li>
              <li>
                <Link href="/products?category=do-dien-thiet-bi" className="hover:text-blue-400 transition-colors">
                  ⚡ Quạt, đèn & Thiết bị học tập
                </Link>
              </li>
              <li>
                <Link href="/products?category=do-dung-ktx-sinh-hoat" className="hover:text-blue-400 transition-colors">
                  🏠 Đồ dùng KTX & Sinh hoạt
                </Link>
              </li>
            </ul>
          </div>

          {/* Campuses */}
          <div>
            <h4 className="text-white font-bold text-xs tracking-wider uppercase mb-3">Khu vực sinh viên</h4>
            <ul className="space-y-2">
              <li className="hover:text-slate-300">📍 Ký túc xá Khu A ĐHQG (Dĩ An)</li>
              <li className="hover:text-slate-300">📍 Ký túc xá Khu B ĐHQG</li>
              <li className="hover:text-slate-300">📍 ĐH Bách Khoa CS1 & CS2</li>
              <li className="hover:text-slate-300">📍 Làng Đại học Thủ Đức</li>
              <li className="hover:text-slate-300">📍 Cụm trường Quận 10 & Tân Bình</li>
            </ul>
          </div>

          {/* Project notes */}
          <div>
            <h4 className="text-white font-bold text-xs tracking-wider uppercase mb-3">Về Đồ án UniCycle</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Mô hình kinh tế tuần hoàn (Circular Economy) kết hợp cơ chế kiểm chứng Web3/Blockchain trên Avalanche C-Chain.
            </p>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-[11px] text-slate-300">
              💡 <span className="font-semibold text-blue-400">Giai đoạn 1:</span> Sàn mua bán đồ cũ C2C chuẩn mực.
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 UniCycle – Đồ án công nghệ sinh viên. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/docs/design.md" className="hover:text-white transition-colors">Design System</Link>
            <span>•</span>
            <Link href="/docs/architecture.md" className="hover:text-white transition-colors">Architecture</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

