import React from "react";
import Image from "next/image";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface WorkflowStep {
  step: string;
  title: string;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: "Bước 1",
    title: "Tìm món đồ quanh trường & KTX",
    description:
      "Lọc nhanh theo cơ sở trường học, hạng tình trạng A/B/C và xem trước Hộ chiếu số để biết lịch sử các đời chủ.",
  },
  {
    step: "Bước 2",
    title: "Nhắn Zalo & Đặt hẹn giữ chỗ",
    description:
      "Thống nhất thời gian, điểm hẹn tại cổng trường hoặc KTX; người bán bấm giữ chỗ để bạn không lo món đồ bị bán mất.",
  },
  {
    step: "Bước 3",
    title: "Kiểm tra trực tiếp & Nhận Hộ chiếu số",
    description:
      "Kiểm tra thực tế hài lòng mới thanh toán, xác nhận bàn giao và kế thừa hồ sơ món đồ để dễ bán lại khi ra trường.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="py-10 sm:py-14 bg-[#F8FAFC] border-t border-b border-[#D6E8EE]/70"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal
          variant="fade-up"
          className="mb-8 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#018ABE] block mb-1.5">
              Quy trình giao dịch
            </span>
            <h2
              id="how-it-works-heading"
              className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight"
            >
              Nhận đồ cũ an toàn chỉ với ba bước
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#02457A] max-w-md leading-relaxed">
            Chọn món ưng ý quanh trường, hẹn giờ qua Zalo để người bán giữ chỗ và
            kiểm tra tận tay trước khi nhận.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Bên trái: Thẻ ảnh minh họa trực tiếp & huy hiệu cam kết */}
          <ScrollReveal variant="fade-left" className="lg:col-span-5">
            <div className="relative h-full min-h-[280px] sm:min-h-[340px] rounded-3xl overflow-hidden border border-[#D6E8EE] shadow-xs group">
              <Image
                src="/categories/giao-trinh-sach.jpg"
                alt="Sinh viên kiểm tra giáo trình và đồ dùng trực tiếp tại khuôn viên trường"
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#001B48]/90 via-[#001B48]/35 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-[#001B48] text-[11px] font-extrabold shadow-xs mb-2.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  Cam kết an toàn KTX
                </span>
                <p className="text-sm sm:text-base font-bold text-white leading-snug">
                  Không đặt cọc trước · Kiểm tra đồ tận tay tại cổng trường hoặc
                  sảnh KTX
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Bên phải: 3 Thẻ Bước xếp tầng */}
          <ScrollReveal
            variant="fade-right"
            className="lg:col-span-7 flex flex-col justify-between gap-4"
          >
            {WORKFLOW_STEPS.map((item) => (
              <div
                key={item.step}
                className="group bg-white p-5 sm:p-6 rounded-2xl border border-[#D6E8EE]/90 hover:border-[#018ABE] shadow-xs transition-all duration-200"
              >
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <span className="px-3 py-1 rounded-full bg-[#001B48] group-hover:bg-[#018ABE] text-white text-xs font-extrabold transition-colors">
                    {item.step}
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[#02457A] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
