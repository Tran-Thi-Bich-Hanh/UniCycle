import Image from "next/image";
import Link from "next/link";

const COLOR_TOKENS = [
  {
    name: "Midnight Navy",
    hex: "#001B48",
    role: "Text chính, tiêu đề H1, Topbar",
    bgClass: "bg-[#001B48] text-white",
  },
  {
    name: "Deep Ocean Blue",
    hex: "#02457A",
    role: "Tiêu đề phân đoạn, nhãn giá, viền đậm",
    bgClass: "bg-[#02457A] text-white",
  },
  {
    name: "Cerulean Blue",
    hex: "#018ABE",
    role: "CTA chính, nút Đăng bán, trạng thái active",
    bgClass: "bg-[#018ABE] text-white",
  },
  {
    name: "Soft Sky Blue",
    hex: "#97CADB",
    role: "Điểm chuyển gradient, viền thẻ khi hover",
    bgClass: "bg-[#97CADB] text-[#001B48]",
  },
  {
    name: "Ice Blue Tint",
    hex: "#D6E8EE",
    role: "Nền huy hiệu, pill lọc nhanh, nền phụ",
    bgClass: "bg-[#D6E8EE] text-[#001B48]",
  },
  {
    name: "Zalo Official",
    hex: "#0068FF",
    role: "Nút Nhắn qua Zalo (/api/zalo/[listingId])",
    bgClass: "bg-[#0068FF] text-white",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Khối Hero Gradient Bleed chuẩn docs/ui-ux.md §2.3 */}
      <section className="hero-gradient-bleed text-white pt-10 pb-20 sm:pt-14 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-xs font-semibold text-[#D6E8EE]">
              <Image
                src="/icon.png"
                alt=""
                width={18}
                height={18}
                className="rounded-sm"
              />
              <span>Chợ đồ cũ sinh viên TP.HCM · Có Hộ chiếu đồ vật (Product Passport)</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Mua bán đồ cũ sinh viên tiết kiệm, tin cậy &amp; trao tay tận cổng trường
            </h1>

            <p className="text-base sm:text-lg text-[#D6E8EE] leading-relaxed max-w-2xl">
              Tìm nhanh giáo trình, bàn học gấp, quạt đứng Senko hay đồ dùng ký túc xá quanh trường bạn. Liên hệ qua Zalo, đặt lịch hẹn giữ chỗ và kiểm tra lịch sử món đồ qua mã QR trên màn hình.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="h-12 px-6 rounded-xl bg-white text-[#001B48] hover:bg-[#D6E8EE] font-bold text-sm inline-flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Khám phá đồ quanh KTX</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/sell"
                className="h-12 px-6 rounded-xl bg-[#018ABE] hover:bg-[#02457A] border border-[#97CADB]/50 text-white font-bold text-sm inline-flex items-center gap-2 transition-colors"
              >
                <span>Đăng bán trong 60 giây</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bảng kiểm tra Design System & Khung điều hướng (Task 1.1) */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-10 pb-16">
        <div className="bg-white rounded-2xl border border-[#D6E8EE] shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6E8EE] pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#018ABE]">
                Sprint 1 · Task 1.1 Hoàn tất
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#001B48] mt-0.5">
                Hệ thống Design Tokens &amp; Khung điều hướng Responsive
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D6E8EE] text-[#02457A] text-xs font-bold self-start sm:self-center">
              Font: Manrope (Vietnamese)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
            {COLOR_TOKENS.map((token) => (
              <div
                key={token.hex}
                className="rounded-xl border border-[#D6E8EE] overflow-hidden flex flex-col justify-between bg-white"
              >
                <div className={`h-20 p-3 flex flex-col justify-between ${token.bgClass}`}>
                  <span className="text-xs font-bold">{token.name}</span>
                  <code className="text-xs font-mono opacity-90">{token.hex}</code>
                </div>
                <p className="p-3 text-xs text-slate-600 leading-snug">{token.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
