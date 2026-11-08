import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniCycle - Sàn Mua Bán Đồ Cũ Sinh Viên",
  description: "Nền tảng mua bán và tái sử dụng đồ dùng uy tín, tiết kiệm dành riêng cho cộng đồng sinh viên.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="shortcut icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-white text-[#001B48]">
        {children}
      </body>
    </html>
  );
}
