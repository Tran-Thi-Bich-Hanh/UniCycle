import React from "react";
import { IconArmchair, IconBook, IconHome, IconMapPin, IconSparkles, IconZap } from "./icons";
import Link from "next/link";
import { IconShieldCheck } from "./icons";
import UniCycleLogo from "./logo";

export function Footer() {
  return (
    <footer className="bg-[#001B48] text-[#D6E8EE]/80 text-xs mt-auto border-t border-[#02457A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-white rounded-xl p-1 shadow-xs inline-block">
                <UniCycleLogo className="h-9 w-auto" />
              </div>
            </div>
            <p className="text-xs text-[#D6E8EE]/70 leading-relaxed">
              Nền tảng mua bán và tái sử dụng đồ dùng uy tín, tiết kiệm dành riêng cho cộng đồng sinh viên các trường đại học tại TP.HCM.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#97CADB] pt-1 font-semibold">
              <IconShieldCheck className="w-4 h-4 text-[#018ABE]" />
              <span>Giao dịch an toàn & minh bạch</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-bold text-xs tracking-wider uppercase mb-3">Danh mục đồ cũ</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/products?category=sach-giao-trinh" className="hover:text-[#97CADB] transition-colors">
                  <IconBook className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> Sách & Giáo trình đại học
                </Link>
              </li>
              <li>
                <Link href="/products?category=ban-ghe-noi-that" className="hover:text-[#97CADB] transition-colors">
                  <IconArmchair className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> Bàn ghế & Nội thất phòng trọ
                </Link>
              </li>
              <li>
                <Link href="/products?category=do-dien-thiet-bi" className="hover:text-[#97CADB] transition-colors">
                  <IconZap className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> Quạt, đèn & Thiết bị học tập
                </Link>
              </li>
              <li>
                <Link href="/products?category=do-dung-ktx-sinh-hoat" className="hover:text-[#97CADB] transition-colors">
                  <IconHome className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> Đồ dùng KTX & Sinh hoạt
                </Link>
              </li>
            </ul>
          </div>

          {/* Campuses */}
          <div>
            <h4 className="text-white font-bold text-xs tracking-wider uppercase mb-3">Khu vực sinh viên</h4>
            <ul className="space-y-2 text-[#D6E8EE]/70">
              <li className="hover:text-white transition-colors"><IconMapPin className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> Ký túc xá Khu A ĐHQG (Dĩ An)</li>
              <li className="hover:text-white transition-colors"><IconMapPin className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> Ký túc xá Khu B ĐHQG</li>
              <li className="hover:text-white transition-colors"><IconMapPin className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> ĐH Bách Khoa CS1 & CS2</li>
              <li className="hover:text-white transition-colors"><IconMapPin className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> Làng Đại học Thủ Đức</li>
              <li className="hover:text-white transition-colors"><IconMapPin className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> Cụm trường Quận 10 & Tân Bình</li>
            </ul>
          </div>

          {/* Project notes */}
          <div>
            <h4 className="text-white font-bold text-xs tracking-wider uppercase mb-3">Về Đồ án UniCycle</h4>
            <p className="text-xs text-[#D6E8EE]/70 leading-relaxed mb-3">
              Mô hình kinh tế tuần hoàn (Circular Economy) kết hợp cơ chế kiểm chứng Web3/Blockchain trên Avalanche C-Chain.
            </p>
            <div className="p-3 bg-[#02457A]/50 rounded-xl border border-[#02457A] text-[11px] text-[#D6E8EE]">
              <IconSparkles className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" /> <span className="font-semibold text-[#97CADB]">Giai đoạn 1:</span> Sàn mua bán đồ cũ C2C chuẩn mực.
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#02457A] flex flex-col sm:flex-row items-center justify-between text-xs text-[#D6E8EE]/50 gap-4">
          <p>© 2026 UniCycle – Đồ án công nghệ sinh viên. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-4 text-[#D6E8EE]/70">
            <Link href="/docs/design.md" className="hover:text-white transition-colors">Design System</Link>
            <span>•</span>
            <Link href="/docs/architecture.md" className="hover:text-white transition-colors">Architecture</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
