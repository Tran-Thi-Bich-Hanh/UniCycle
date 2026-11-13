"use client";

import React, { useEffect, useRef, useState } from "react";

interface TimelineStep {
  number: string;
  tag: string;
  title: string;
  description: string;
  note: string;
}

const STEPS: TimelineStep[] = [
  {
    number: "01",
    tag: "Giữ đồ",
    title: "Đặt cọc giữ đồ trong 48 giờ",
    description:
      "Tiền UNIP của bạn được khóa tạm trong hợp đồng Escrow với mức phí 0 đồng. Người bán nhận thông báo giữ món đồ lại cho bạn và không bán cho người khác trong hai ngày.",
    note: "Nếu chưa kịp sắp xếp lịch gặp, bạn có thể tự gia hạn thêm 24 giờ ngay trong chi tiết đơn hàng.",
  },
  {
    number: "02",
    tag: "Kiểm tra",
    title: "Gặp trực tiếp và đối chiếu UniCycle Passport",
    description:
      "Hai bạn hẹn nhau ở sảnh KTX hoặc cổng trường để xem đồ tận mắt. Mở trang UniCycle Passport của món hàng để đối chiếu từng thông số và tình trạng người bán đã ghi từ đầu.",
    note: "Mọi lần chỉnh sửa bài đăng đều được lưu lại lịch sử để tránh việc sửa thông tin sau khi bạn đã đặt cọc.",
  },
  {
    number: "03",
    tag: "Hoàn tất",
    title: "Xác nhận nhận hàng hoặc yêu cầu hủy đơn",
    description:
      "Khi món đồ đúng như mô tả, bạn tích đủ ba mục kiểm tra ngay tại chỗ để hệ thống chuyển tiền cho người bán. Nếu đồ không đúng cam kết, bạn gửi yêu cầu hủy đơn trên app để xử lý hoàn UNIP về lại ví.",
    note: "Quá 48 giờ mà giao dịch chưa hoàn tất, người mua có thể chủ động bấm nhận lại tiền cọc.",
  },
];

export function SafeTradeTimeline() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleSteps, setVisibleSteps] = useState<boolean[]>([false, false, false]);
  const [lineProgress, setLineProgress] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setReducedMotion(true);
      setVisibleSteps([true, true, true]);
      setLineProgress(100);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.stepIndex);
          if (Number.isNaN(idx)) return;
          const nextVisible = entry.isIntersecting;
          setVisibleSteps((prev) => {
            if (prev[idx] === nextVisible) return prev;
            const next = [...prev];
            next[idx] = nextVisible;
            return next;
          });
        });
      },
      {
        threshold: 0.2,
        rootMargin: "-4% 0px -8% 0px",
      }
    );

    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    let rafId = 0;
    const updateProgress = () => {
      rafId = 0;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportTrigger = window.innerHeight * 0.72;
      const scrolledIntoSection = viewportTrigger - rect.top;
      const ratio = Math.min(1, Math.max(0, scrolledIntoSection / Math.max(rect.height, 1)));
      setLineProgress(Math.round(ratio * 100));
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      aria-labelledby="timeline-heading"
      className="relative overflow-hidden bg-gradient-to-b from-[#D6E8EE]/35 via-white to-[#D6E8EE]/30 border-y border-[#D6E8EE] py-14 sm:py-18 px-4 sm:px-6 lg:px-8"
    >
      {/* Hiệu ứng loang màu nhẹ phía sau (Soft Color Bleed) */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -left-24 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-[#97CADB]/35 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/3 -right-28 w-72 h-72 sm:w-[26rem] sm:h-[26rem] rounded-full bg-[#018ABE]/15 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-[#02457A]/10 blur-3xl pointer-events-none"
      />

      <div className="relative max-w-4xl mx-auto">
        <div className="max-w-2xl mb-10 sm:mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-white border border-[#97CADB] text-[#02457A] text-xs font-bold mb-3">
            Quy trình giao dịch
          </span>
          <h2
            id="timeline-heading"
            className="text-2xl sm:text-3xl font-black text-[#001B48] tracking-tight"
          >
            Cách một giao dịch trên UniCycle diễn ra
          </h2>
          <p className="text-xs sm:text-sm text-[#02457A] mt-2 leading-relaxed">
            Từ lúc bạn bấm đặt mua đến khi nhận đồ tận tay tại KTX hoặc sân trường.
          </p>
        </div>

        <div ref={containerRef} className="relative pl-10 sm:pl-14">
          {/* Đường ray nền của timeline */}
          <div
            aria-hidden="true"
            className="absolute left-4 sm:left-6 top-3 bottom-3 w-0.5 bg-[#D6E8EE] rounded-full"
          />

          {/* Đường tiến độ chạy theo thao tác cuộn trang */}
          <div
            aria-hidden="true"
            style={{ height: `${lineProgress}%` }}
            className="absolute left-4 sm:left-6 top-3 w-0.5 bg-gradient-to-b from-[#001B48] via-[#02457A] to-[#018ABE] rounded-full transition-[height] duration-200 ease-out max-h-[calc(100%-1.5rem)]"
          />

          <div className="space-y-8 sm:space-y-10">
            {STEPS.map((step, idx) => {
              const isVisible = visibleSteps[idx];
              return (
                <div
                  key={step.number}
                  ref={(el) => {
                    stepRefs.current[idx] = el;
                  }}
                  data-step-index={idx}
                  className="relative"
                >
                  {/* Nút tròn mốc bước trên trục timeline */}
                  <div
                    className={`absolute -left-10 sm:-left-14 top-1 w-8 h-8 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm border-2 ${reducedMotion ? "" : "transition-all duration-500 ease-out"
                      } ${isVisible
                        ? "bg-[#001B48] text-white border-[#97CADB] shadow-md shadow-[#001B48]/20 scale-100 opacity-100"
                        : "bg-white text-[#02457A] border-[#D6E8EE] scale-75 opacity-0"
                      }`}
                  >
                    {step.number}
                  </div>

                  {/* Thẻ nội dung từng bước (pop-up lặp lại mỗi khi kéo tới) */}
                  <div
                    className={`bg-white/90 backdrop-blur-xs rounded-2xl border p-5 sm:p-6 shadow-2xs ${reducedMotion ? "" : "transition-all duration-500 ease-out"
                      } ${isVisible
                        ? "border-[#97CADB] opacity-100 translate-y-0 scale-100"
                        : "border-[#D6E8EE] opacity-0 translate-y-5 scale-[0.98]"
                      }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D6E8EE] text-[#001B48]">
                        {step.tag}
                      </span>
                      <span className="text-[11px] font-semibold text-[#018ABE]">
                        Bước {idx + 1} / {STEPS.length}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-xs sm:text-sm text-[#02457A] leading-relaxed">
                      {step.description}
                    </p>

                    <p className="mt-3 pt-3 border-t border-[#D6E8EE]/70 text-[11px] sm:text-xs text-[#02457A]/85 leading-relaxed">
                      {step.note}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

