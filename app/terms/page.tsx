import React from "react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Điều Khoản Sử Dụng & Giao Dịch An Toàn | UniCycle",
  description:
    "Quy tắc giao dịch đồ cũ sinh viên, danh mục hàng cấm BR17, cơ chế giữ chỗ & khiếu nại 48h và tuyên bố giới hạn trách nhiệm Passport BR30.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <nav className="flex items-center gap-2 text-xs font-semibold text-[#02457A]">
          <Link href="/" className="hover:text-[#018ABE]">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-[#001B48] font-bold">Điều khoản sử dụng</span>
        </nav>

        <div className="bg-white rounded-3xl border border-[#D6E8EE] shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-[#001B48] via-[#02457A] to-[#018ABE] p-7 sm:p-9 text-white space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold text-[#D6E8EE]">
              Quy Định Cộng Đồng Sinh Viên
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Điều Khoản Sử Dụng &amp; An Toàn Giao Dịch
            </h1>
            <p className="text-xs sm:text-sm text-[#D6E8EE]">
              Cập nhật áp dụng cho cộng đồng sinh viên KTX &amp; các trường Đại học trên nền tảng UniCycle.
            </p>
          </div>

          <div className="p-6 sm:p-9 space-y-7 text-sm text-slate-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                1. Nguyên tắc giao dịch trực tiếp &amp; An toàn KTX
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>
                  UniCycle khuyến khích sinh viên <strong>gặp mặt kiểm tra đồ trực tiếp tại địa điểm công cộng</strong> (cổng KTX Khu A/B, căng tin, thư viện trường) trước khi thanh toán.
                </li>
                <li>
                  <strong>Tuyệt đối không chuyển tiền đặt cọc trước</strong> khi chưa kiểm tra món đồ tận tay. UniCycle không thu hộ hoặc giữ tiền giao dịch ở giai đoạn MVP.
                </li>
                <li>
                  Khi người bán chấp nhận yêu cầu hẹn, tin đăng chuyển sang trạng thái <strong>Giữ chỗ độc quyền (RESERVED - BR11)</strong> để bảo vệ lịch hẹn của bạn. Nếu quá giờ hẹn + 24 giờ mà hai bên không xác nhận bàn giao, đơn tự động hết hạn và mở bán lại (BR37).
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                2. Chu kỳ xác nhận bàn giao 48h &amp; Khiếu nại (BR13, SLA 72h)
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>
                  Khi một bên bấm xác nhận đã giao/nhận hàng, bên còn lại có <strong>48 giờ</strong> để xác nhận đối ứng. Nếu người bán xác nhận khống khi bạn chưa nhận được đồ, hãy bấm ngay nút <strong>&ldquo;Tôi chưa nhận hàng&rdquo;</strong> để chặn tự động hoàn tất và chuyển Ban Quản Trị phân xử (trạng thái <code className="font-mono">DISPUTED</code>).
                </li>
                <li>
                  Quản trị viên cam kết phân xử trong <strong>SLA 72 giờ</strong>; quá 72 giờ nếu chưa chứng minh được việc bàn giao, đơn tự động hủy và mở bán lại tin đăng.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                3. Danh mục hàng cấm &amp; Kiểm duyệt vi phạm (BR16, BR17)
              </h2>
              <p className="text-xs sm:text-sm">
                Nghiêm cấm đăng bán, trao đổi trên UniCycle các mặt hàng sau (vi phạm sẽ bị gỡ tin ngay lập tức và có thể khóa tài khoản):
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Đồ bị đánh cắp, không rõ nguồn gốc hoặc đang có tranh chấp sở hữu.</li>
                <li>Rượu, bia, thuốc lá, thuốc lá điện tử (vape/pod), chất kích thích và chất cấm.</li>
                <li>Vũ khí, vật liệu cháy nổ, bình gas mini không đảm bảo an toàn trong KTX.</li>
                <li>Giấy tờ tùy thân, bằng cấp, thẻ sinh viên giả hoặc tài liệu vi phạm bản quyền nghiêm trọng.</li>
                <li>Giới hạn tối đa <strong>10 tin đăng mới/ngày</strong> và tối đa 5 ảnh/tin (BR16); tin hết hạn sau 30 ngày và có thể gia hạn (BR15).</li>
              </ul>
            </section>

            <section className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <h2 className="text-sm sm:text-base font-extrabold text-amber-950">
                4. Tuyên bố giới hạn trách nhiệm Digital Product Passport (BR30 &amp; BR39)
              </h2>
              <p className="text-xs sm:text-sm text-amber-900">
                Digital Product Passport trên UniCycle (kèm lát cắt đối chiếu Avalanche Fuji Testnet) chỉ ghi nhận lịch sử chuyển nhượng số giữa các sinh viên qua mã băm ẩn danh. <strong>Passport KHÔNG PHẢI chứng thư giám định chất lượng, không bảo đảm hàng chính hãng hay bảo hành vật lý.</strong> Khi Passport bị gắn cờ vi phạm (<code className="font-mono">FLAGGED</code>), toàn bộ giao dịch mới và đăng bán lại sẽ tạm khóa theo quy tắc BR39.
              </p>
            </section>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <Link href="/privacy" className="font-bold text-[#018ABE] hover:underline">
                Xem Chính sách bảo vệ dữ liệu &amp; Quyền riêng tư (NĐ 13/2023/NĐ-CP) &rarr;
              </Link>
              <Link href="/products" className="font-bold text-[#02457A] hover:underline">
                Quay lại Sàn trao đổi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
