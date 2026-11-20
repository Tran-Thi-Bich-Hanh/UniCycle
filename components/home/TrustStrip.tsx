import React from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface TrustItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const TRUST_ITEMS: TrustItem[] = [
  {
    id: "verified-student",
    title: "Xác minh thẻ sinh viên",
    description:
      "Người dùng xác thực bằng thẻ sinh viên hoặc email .edu.vn để nhận huy hiệu trên hồ sơ.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
  {
    id: "campus-meetup",
    title: "Gặp trực tiếp tại cổng trường, KTX",
    description:
      "Kiểm tra món đồ tận tay ở Làng ĐH hoặc cổng trường, không cần chuyển cọc trước.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
        />
      </svg>
    ),
  },
  {
    id: "digital-passport",
    title: "Lưu lịch sử bằng Hộ chiếu số",
    description:
      "Xem món đồ đã qua mấy đời chủ và quét mã QR để xác nhận lúc bàn giao.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M13.5 14.625h2.25v2.25H13.5v-2.25zm2.25 2.25h2.25v2.25h-2.25v-2.25zm2.25-2.25h2.25v2.25H18v-2.25zm0 4.5h2.25v2.25H18v-2.25zm-4.5 0h2.25v2.25H13.5v-2.25z"
        />
      </svg>
    ),
  },
  {
    id: "free-corner",
    title: "Góc 0đ từ khóa trước",
    description:
      "Nhận miễn phí giáo trình, tài liệu và đồ dùng KTX mà anh chị khóa trên để lại.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-17.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>
    ),
  },
];

export function TrustStrip() {
  return (
    <section
      aria-label="Cam kết giao dịch an toàn"
      className="bg-white border-b border-[#D6E8EE]/80 py-6 sm:py-8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item.id}
                className="group flex items-start gap-3.5 p-3.5 rounded-2xl border border-transparent hover:border-[#D6E8EE] hover:bg-[#F8FAFC] transition-colors duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-[#D6E8EE]/45 text-[#02457A] flex items-center justify-center shrink-0 group-hover:bg-[#018ABE] group-hover:text-white transition-colors duration-200">
                  {item.icon}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#001B48]">
                    {item.title}
                  </h2>
                  <p className="text-xs text-[#02457A]/80 leading-relaxed mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default TrustStrip;
