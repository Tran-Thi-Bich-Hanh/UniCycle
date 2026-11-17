import type { Metadata } from "next";
import { Suspense } from "react";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "UniCycle – Chợ đồ cũ sinh viên & Hộ chiếu đồ vật (Product Passport)",
    template: "%s | UniCycle",
  },
  description:
    "Nền tảng mua bán, thanh lý và tặng lại giáo trình, bàn ghế, đồ gia dụng ký túc xá dành cho sinh viên TP.HCM. Liên hệ nhanh qua Zalo, đặt lịch hẹn giữ chỗ và kiểm tra lịch sử món đồ qua Digital Product Passport.",
  icons: {
    icon: [
      { url: "/logo.jpg", type: "image/jpeg" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-white text-[#001B48]"
      >
        <Suspense
          fallback={
            <div className="h-16 sm:h-20 w-full bg-white border-b border-[#D6E8EE]" />
          }
        >
          <Header />
        </Suspense>

        <main className="flex-1 flex flex-col">{children}</main>

        <Footer />

        <Suspense fallback={null}>
          <MobileBottomNav />
        </Suspense>
      </body>
    </html>
  );
}
