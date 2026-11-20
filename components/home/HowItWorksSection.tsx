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
    title: "Tìm đồ gần trường hoặc KTX của bạn",
    description:
      "Lọc theo trường, tình trạng A/B/C và mở Hộ chiếu số để xem món đồ đã qua mấy đời chủ.",
  },
  {
    step: "Bước 2",
    title: "Nhắn Zalo và đặt lịch giữ chỗ",
    description:
      "Chốt giờ và chỗ gặp ở cổng trường hoặc sảnh KTX. Khi người bán xác nhận giữ chỗ, tin sẽ tạm khóa để không bán cho người khác.",
  },
  {
    step: "Bước 3",
    title: "Xem đồ tận tay và nhận Hộ chiếu số",
    description:
      "Gặp nhau kiểm tra đồ xong mới thanh toán, rồi quét mã QR xác nhận nhận hàng để Hộ chiếu số chuyển sang tên bạn.",
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
              Cách mua bán
            </span>
            <h2
              id="how-it-works-heading"
              className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight"
            >
              Ba bước để mua và nhận đồ trực tiếp
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#02457A] max-w-md leading-relaxed">
            Mọi giao dịch đều hẹn gặp mặt quanh trường, xem kỹ đồ rồi mới trả
            tiền.
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
                  Nguyên tắc gặp mặt
                </span>
                <p className="text-sm sm:text-base font-bold text-white leading-snug">
                  Không chuyển cọc trước, kiểm tra đồ trực tiếp tại cổng trường
                  hoặc sảnh KTX
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
