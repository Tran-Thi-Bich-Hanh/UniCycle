import React from "react";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ui/ScrollReveal";

const STORY_HIGHLIGHTS = [
  "Kế thừa lịch sử sử dụng rõ ràng",
  "Tiết kiệm 40–70% chi phí đầu học kỳ",
  "Gặp mặt kiểm tra an toàn tại cổng trường",
  "Góc cho tặng 0đ lan tỏa giữa các khóa",
];

const LIFECYCLE_STEPS = ["Đời #1", "Đời #2", "Đời #3"];

export function CircularStorySection() {
  return (
    <section
      aria-labelledby="circular-story-heading"
      className="py-10 sm:py-14 bg-[#F8FAFC] border-b border-[#D6E8EE]/70"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Cột trái: Tiêu đề 2 tầng + 4 điểm nhấn + Ảnh dọc không gian KTX */}
          <ScrollReveal
            variant="fade-left"
            className="lg:col-span-6 flex flex-col justify-between space-y-6"
          >
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#018ABE] block mb-1.5">
                Cảm hứng từ vòng đời đồ dùng KTX:
              </span>
              <h2
                id="circular-story-heading"
                className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight leading-tight"
              >
                Để mỗi món đồ cũ tiếp tục hành trình mới
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-stretch flex-1">
              <div className="sm:col-span-7 flex flex-col justify-between bg-white p-5 rounded-2xl border border-[#D6E8EE]/90 shadow-xs">
                <p className="text-xs sm:text-sm text-[#02457A] leading-relaxed">
                  Mỗi mùa tốt nghiệp hay chuyển phòng KTX, hàng ngàn cuốn giáo
                  trình, bàn học gấp, quạt máy và đồ điện tử vẫn còn rất tốt.
                  UniCycle kết nối trực tiếp các khóa sinh viên để món đồ được
                  trao tận tay người cần tiếp theo.
                </p>

                <ul className="mt-4 space-y-2.5 pt-3 border-t border-[#D6E8EE]/60">
                  {STORY_HIGHLIGHTS.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-2.5 text-xs sm:text-[13px] font-semibold text-[#001B48]"
                    >
                      <svg
                        className="w-4 h-4 text-[#018ABE] shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
                      </svg>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="sm:col-span-5 relative min-h-[220px] sm:min-h-full rounded-2xl overflow-hidden border border-[#D6E8EE] shadow-xs group">
                <Image
                  src="/categories/ban-ghe-tu-ktx.jpg"
                  alt="Không gian bàn học và đồ dùng ký túc xá sinh viên"
                  fill
                  sizes="(max-width: 640px) 100vw, 260px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#001B48]/85 via-[#001B48]/40 to-transparent p-3.5 pt-10">
                  <p className="text-[11px] font-bold text-white leading-snug">
                    Góc học tập KTX · Bền bỉ qua nhiều thế hệ
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Cột phải: Showcase Hộ chiếu vòng đời + Watermark thương hiệu + CTA */}
          <ScrollReveal
            variant="fade-right"
            className="lg:col-span-6 flex flex-col justify-between space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center bg-white p-5 rounded-2xl border border-[#D6E8EE]/90 shadow-xs">
              <div className="sm:col-span-7 relative aspect-[16/10] rounded-xl overflow-hidden border border-[#D6E8EE] group">
                <Image
                  src="/categories/do-dien-tu-phu-kien.jpg"
                  alt="Chuỗi chuyển giao Hộ chiếu số 3 thế hệ sinh viên"
                  fill
                  sizes="(max-width: 640px) 100vw, 340px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#001B48]/90 via-[#001B48]/35 to-transparent"
                  aria-hidden="true"
                />

                <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 text-[#001B48] text-[10px] font-extrabold shadow-xs">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#018ABE]"
                    aria-hidden="true"
                  />
                  Hành trình xác thực
                </span>

                <div className="absolute bottom-3 inset-x-3 z-10 flex items-center gap-1.5 flex-wrap">
                  {LIFECYCLE_STEPS.map((step, index) => (
                    <React.Fragment key={step}>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[11px] font-bold tabular-nums">
                        {step}
                      </span>
                      {index < LIFECYCLE_STEPS.length - 1 && (
                        <span
                          className="text-[#97CADB] text-xs font-bold"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-5 flex flex-col justify-center sm:pl-2">
                <p className="text-2xl sm:text-3xl font-black text-[#001B48] tracking-tight leading-none">
                  UniCycle
                </p>
                <p className="text-sm sm:text-base font-extrabold text-[#018ABE] mt-1">
                  từ KTX TP.HCM
                </p>
                <p className="text-xs text-[#02457A]/80 mt-2 leading-relaxed">
                  Mạng lưới tuần hoàn đồ dùng học tập &amp; sinh hoạt dành riêng
                  cho sinh viên.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#D6E8EE]/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-[#02457A] leading-relaxed max-w-md">
                Mỗi món đồ gắn Hộ chiếu số đều lưu lại cột mốc bàn giao thực tế
                giữa các khóa, giúp bạn yên tâm nguồn gốc khi nhận đồ và dễ dàng
                sang nhượng lại khi ra trường.
              </p>
              <Link
                href="/products"
                className="h-10 px-5 rounded-xl bg-[#001B48] hover:bg-[#018ABE] text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 transition-colors"
              >
                <span>Khám phá đồ có Hộ chiếu</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

export default CircularStorySection;
