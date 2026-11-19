import React from "react";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface StudentReview {
  headline: string;
  comment: string;
  rating: string;
  name: string;
  school: string;
}

const STUDENT_REVIEWS: StudentReview[] = [
  {
    headline: "Săn được bàn học & quạt đúng chuẩn!",
    comment:
      "Mình nhận lại quạt đứng và bàn gấp từ một anh khóa trên ngay sảnh KTX Khu B. Đồ còn mới như mô tả, quét QR Hộ chiếu số thấy rõ lịch sử dùng kỹ nên cực kỳ yên tâm.",
    rating: "4.9",
    name: "Trần Thảo Vy",
    school: "Sinh viên năm 2 · KTX Khu B ĐHQG",
  },
  {
    headline: "Nhượng đồ nhanh gọn trước kỳ thực tập!",
    comment:
      "Cuối kỳ dọn phòng mình đăng bộ giáo trình Giải tích và máy tính Casio fx-580VNX. Chưa đầy một buổi đã có bạn nhắn Zalo hẹn lấy ngay cổng Bách Khoa, không mất đồng phí trung gian nào.",
    rating: "4.9",
    name: "Nguyễn Minh Khôi",
    school: "Sinh viên năm 4 · ĐH Bách Khoa TP.HCM",
  },
];

export function StudentTestimonialsSection() {
  return (
    <section
      aria-labelledby="student-testimonials-heading"
      className="py-10 sm:py-14 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal
          variant="fade-up"
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10"
        >
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#018ABE] block mb-1.5">
              Cộng đồng sinh viên Làng ĐH
            </span>
            <h2
              id="student-testimonials-heading"
              className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight"
            >
              Sinh viên nói gì về UniCycle
            </h2>
            <p className="text-xs sm:text-sm text-[#02457A] mt-1.5 max-w-xl">
              Những chia sẻ thực tế từ các bạn sinh viên đã trao tay giáo trình
              và đồ trọ qua các học kỳ.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#02457A] hover:text-[#018ABE] transition-colors shrink-0 group"
          >
            <span>Xem thêm đồ đang bán</span>
            <span
              className="group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          {/* 8 cột trái: 2 thẻ đánh giá Bento */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {STUDENT_REVIEWS.map((review, index) => (
              <ScrollReveal
                key={review.name}
                variant="fade-up"
                delayMs={index * 80}
                className="h-full"
              >
                <article className="h-full flex flex-col justify-between bg-[#F8FAFC] p-6 rounded-3xl border border-[#D6E8EE]/90 hover:border-[#018ABE] transition-colors">
                  <div>
                    <div className="flex items-start gap-2.5 text-sm sm:text-base font-extrabold text-[#001B48] mb-3">
                      <svg
                        className="w-5 h-5 text-[#018ABE] shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                      <h3>{review.headline}</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#02457A] leading-relaxed">
                      {review.comment}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#D6E8EE]/70 flex items-center gap-4">
                    <span className="text-3xl sm:text-4xl font-black text-[#018ABE] tabular-nums leading-none select-none">
                      {review.rating}
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-[#001B48]">
                        {review.name}
                      </p>
                      <p className="text-xs text-[#02457A]/80 mt-0.5">
                        {review.school}
                      </p>
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>

          {/* 4 cột phải: Thẻ ảnh điểm nhấn cộng đồng */}
          <ScrollReveal
            variant="fade-up"
            delayMs={160}
            className="lg:col-span-4"
          >
            <div className="relative h-full min-h-[260px] rounded-3xl overflow-hidden border border-[#D6E8EE] shadow-xs group">
              <Image
                src="/categories/do-gia-dung-quat.jpg"
                alt="Đồ gia dụng, quạt máy và vật dụng phòng trọ sinh viên tuần hoàn"
                fill
                sizes="(max-width: 1024px) 100vw, 380px"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#001B48]/90 via-[#001B48]/35 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white z-10">
                <span className="inline-block px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-[10px] font-bold uppercase tracking-wider text-[#D6E8EE] mb-2">
                  Kinh tế tuần hoàn học đường
                </span>
                <p className="text-sm sm:text-base font-extrabold leading-snug">
                  Cùng tái sử dụng — Giảm lãng phí đồ dùng mỗi mùa chuyển phòng
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

export default StudentTestimonialsSection;
