import React from "react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chính Sách Bảo Mật & Nghị Định 13/2023/NĐ-CP | UniCycle",
  description:
    "Cam kết bảo vệ dữ liệu cá nhân sinh viên theo Nghị định 13/2023/NĐ-CP, bảo vệ SĐT Zalo BR36, ẩn danh Passport BR27/BR29 và cơ chế Crypto-shredding BR34.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <nav className="flex items-center gap-2 text-xs font-semibold text-[#02457A]">
          <Link href="/" className="hover:text-[#018ABE]">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-[#001B48] font-bold">Chính sách riêng tư</span>
        </nav>

        <div className="bg-white rounded-3xl border border-[#D6E8EE] shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-[#001B48] via-[#02457A] to-[#018ABE] p-7 sm:p-9 text-white space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold text-[#D6E8EE]">
              Tuân Thủ Nghị Định 13/2023/NĐ-CP
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Chính Sách Bảo Vệ Dữ Liệu Cá Nhân &amp; Quyền Riêng Tư
            </h1>
            <p className="text-xs sm:text-sm text-[#D6E8EE]">
              UniCycle thiết kế quyền riêng tư mặc định (Privacy by Design) cho cộng đồng sinh viên.
            </p>
          </div>

          <div className="p-6 sm:p-9 space-y-7 text-sm text-slate-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                1. Xử lý &amp; tự động xóa ảnh Thẻ Sinh Viên (Nghị định 13/2023/NĐ-CP)
              </h2>
              <p className="text-xs sm:text-sm">
                Khi sinh viên tải lên ảnh chụp Thẻ Sinh Viên tại <Link href="/verify-student" className="text-[#018ABE] font-bold hover:underline">/verify-student</Link>, dữ liệu ảnh chỉ phục vụ mục đích duy nhất là để Ban Quản Trị đối chiếu cấp huy hiệu xác minh. Ngay sau khi phê duyệt hoặc từ chối, hệ thống <strong>tự động xóa vĩnh viễn ảnh thẻ</strong> khỏi cơ sở dữ liệu. Hồ sơ công khai không bao giờ hiển thị MSSV, email hay ảnh thẻ.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                2. Bảo vệ số điện thoại Zalo khỏi thu thập tự động (BR01, BR36)
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>
                  Số điện thoại Zalo không bao giờ được nhúng vào mã HTML công khai cho khách vãng lai.
                </li>
                <li>
                  Mọi lượt mở liên hệ Zalo đều phải đi qua route trung gian bảo mật <code className="font-mono">/api/zalo/[listingId]</code> (yêu cầu đăng nhập và có rate limit theo tài khoản/IP). Khi bật tùy chọn ẩn SĐT, hệ thống không trả về số thô trên giao diện.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                3. Ẩn danh mặc định trên Digital Passport &amp; Avalanche Fuji (BR27, BR29)
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>
                  Lịch sử chuyển giao trên trang Passport mặc định hiển thị ở dạng ẩn danh: <em>&ldquo;Chủ #n · Trường · Tháng/Năm&rdquo;</em>; tên hiển thị chỉ xuất hiện khi chủ sở hữu chủ động bật cho phép (BR29).
                </li>
                <li>
                  Trên Smart Contract <code className="font-mono">UniCyclePassport.sol</code> (Avalanche Fuji Testnet), UniCycle <strong>chỉ ghi mã băm ẩn danh (<code className="font-mono">bytes32</code>)</strong> gồm <code className="font-mono">passportId</code>, <code className="font-mono">itemCommit</code>, <code className="font-mono">ownerHash</code> và <code className="font-mono">orderHash</code> — tuyệt đối không ghi tên, email, SĐT, ảnh hay giá tiền lên blockchain (BR27).
                </li>
              </ul>
            </section>

            <section className="p-5 rounded-2xl bg-[#F4F9FB] border border-[#D6E8EE] space-y-2">
              <h2 className="text-sm sm:text-base font-extrabold text-[#001B48]">
                4. Quyền xóa tài khoản theo cơ chế Crypto-Shredding (BR34)
              </h2>
              <p className="text-xs sm:text-sm text-slate-700">
                Sinh viên có quyền yêu cầu xóa vĩnh viễn tài khoản bất kỳ lúc nào tại <Link href="/profile?tab=privacy" className="text-[#018ABE] font-bold hover:underline">/profile?tab=privacy</Link>. Hệ thống thực thi xóa liên kết <code className="font-mono">PassportOwner.userId = NULL</code>, ẩn danh hóa toàn bộ PII trong bảng <code className="font-mono">User</code>, xóa SĐT trên tin đăng và chuyển các món đồ đang sở hữu sang trạng thái đóng băng <code className="font-mono">ARCHIVED_OWNER_DELETED</code>, giúp vừa xóa sạch danh tính cá nhân vừa bảo toàn tính liên tục của lịch sử đồ vật.
              </p>
            </section>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <Link href="/terms" className="font-bold text-[#018ABE] hover:underline">
                &larr; Xem Điều khoản sử dụng
              </Link>
              <Link href="/profile?tab=privacy" className="font-bold text-[#02457A] hover:underline">
                Quản lý Quyền riêng tư &amp; Xóa tài khoản
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
