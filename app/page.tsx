import Image from "next/image";
import Link from "next/link";

const COLOR_TOKENS = [
  {
    name: "Midnight Navy",
    hex: "#001B48",
    role: "Text chính, tiêu đề H1, Header dark",
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
      {/* Khối Hero Gradient Bleed: kéo dài hơn, hình ảnh to và sát lề phải hơn */}
      <section className="hero-gradient-bleed text-white pt-0 pb-36 sm:pt-0 sm:pb-48 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center">
            {/* Cột trái (6/12 cột): Tiêu đề, thông điệp & CTA */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold text-[#D6E8EE] shadow-sm">
                <Image
                  src="/icon.png"
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-sm"
                />
                <span>Chợ đồ cũ sinh viên TP.HCM · Vòng đời đồ vật tuần hoàn</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.16] text-white">
                Mua bán đồ cũ sinh viên tiết kiệm &amp; trao tay tận cổng trường
              </h1>

              <p className="text-base sm:text-lg text-[#D6E8EE] leading-relaxed max-w-xl font-normal">
                Tái sử dụng giáo trình, bàn học gấp, quạt đứng hay đồ dùng ký túc xá qua các thế hệ sinh viên. Kết nối nhanh qua Zalo, đặt hẹn giữ chỗ và kiểm tra chuỗi đời chủ qua Digital Product Passport.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/products"
                  className="h-12 px-7 rounded-xl bg-white text-[#001B48] hover:bg-[#D6E8EE] font-bold text-sm inline-flex items-center gap-2 shadow-md transition-colors"
                >
                  <span>Khám phá đồ quanh KTX</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
                <Link
                  href="/sell"
                  className="h-12 px-7 rounded-xl bg-[#018ABE] hover:bg-[#02457A] border border-[#97CADB]/50 text-white font-bold text-sm inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <span>Đăng bán trong 60 giây</span>
                </Link>
              </div>

              {/* Thống kê nhanh nổi bật */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/15 max-w-lg">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">300k+</p>
                  <p className="text-xs text-[#97CADB] mt-0.5">Sinh viên KTX TP.HCM</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">1-chạm</p>
                  <p className="text-xs text-[#97CADB] mt-0.5">Mở Zalo &amp; Hẹn xem đồ</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">100%</p>
                  <p className="text-xs text-[#97CADB] mt-0.5">QR Passport số màn hình</p>
                </div>
              </div>
            </div>

            {/* Cột phải (6/12 cột): Ảnh 3D Vòng đời tái chế & Đồ dùng sinh viên đặt ở vị trí cân đối, kéo sang bên trái cho hài hòa */}
            <div className="lg:col-span-6 flex justify-center items-center relative">
              <div className="relative w-full max-w-[560px] lg:max-w-[620px] aspect-[4/3.5] flex items-center justify-center">
                {/* Vầng sáng phía sau ảnh */}
                <div className="absolute inset-4 bg-[#018ABE]/30 rounded-full blur-3xl scale-105" aria-hidden="true" />
                <Image
                  src="/hero-recycle-lifecycle.png"
                  alt="Vòng đời tái chế và đồ dùng sinh viên: bàn học, quạt điện, balo, giáo trình, máy tính Casio và Hộ chiếu đồ vật"
                  width={800}
                  height={700}
                  className="relative z-10 w-full h-auto object-contain drop-shadow-[0_20px_45px_rgba(0,27,72,0.5)] hover:scale-[1.02] transition-transform duration-300"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bảng kiểm tra Design System & Khung điều hướng (Task 1.1) */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 pb-20">
        <div className="bg-white rounded-2xl border border-[#D6E8EE] shadow-lg p-6 sm:p-8 space-y-6">
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
                className="rounded-xl border border-[#D6E8EE] overflow-hidden flex flex-col justify-between bg-white hover:border-[#018ABE] transition-colors"
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
