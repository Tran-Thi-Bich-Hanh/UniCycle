import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniCycle - Sàn Mua Bán Đồ Cũ Sinh Viên",
  description: "Nền tảng mua bán và tái sử dụng đồ dùng uy tín, tiết kiệm dành riêng cho cộng đồng sinh viên.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#F7F9FC] text-[#102A43]">
        {children}
      </body>
    </html>
  );
}
