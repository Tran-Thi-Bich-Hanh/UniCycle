"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const QUICK_ACCOUNTS = [
  {
    label: "SV Bách Khoa (KTX Khu B)",
    name: "Nguyễn Hoàng Nam",
    email: "hoangnam.bka@gmail.com",
    password: "Student@123456",
    badge: "Đang bán Casio & Quạt",
  },
  {
    label: "SV KHTN (KTX Khu B)",
    name: "Trần Hải Yến",
    email: "haiyen.khtn@gmail.com",
    password: "Student@123456",
    badge: "Tặng giáo trình 0đ",
  },
  {
    label: "Quản trị viên (Admin)",
    name: "Ban Quản Trị UniCycle",
    email: "admin@unicycle.vn",
    password: "Admin@123456",
    badge: "Quyền kiểm duyệt",
  },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError);

  const performLogin = async (targetEmail: string, targetPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại.");
        setLoading(false);
        return;
      }

      window.dispatchEvent(new Event("unicycle-auth-change"));
      const destination = returnTo.startsWith("/") ? returnTo : "/";
      router.push(destination);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    // Bắt buộc dùng window.location.href để trình duyệt rời trang Next.js và chuyển sang Google OAuth
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-linear-to-b from-[#D6E8EE]/40 via-white to-[#F8FAFC] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl border border-[#D6E8EE] shadow-[0_20px_50px_rgba(0,27,72,0.08)] overflow-hidden">
        {/* Cột trái: Thông điệp thương hiệu & Cam kết sinh viên */}
        <div className="lg:col-span-5 hero-gradient-bleed text-white p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-5 relative z-10">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white p-0.5 overflow-hidden relative shadow-sm">
                <Image src="/logo.jpg" alt="UniCycle" fill className="object-contain" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white block leading-none">
                  UniCycle
                </span>
                <span className="text-[11px] text-[#D6E8EE] font-medium">
                  Chợ đồ cũ sinh viên TP.HCM
                </span>
              </div>
            </Link>

            <div className="pt-2">
              <span className="inline-block px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-bold text-[#D6E8EE] mb-3">
                An Toàn · Minh Bạch · Không Lo Lừa Đảo
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white">
                Chào mừng bạn quay lại cộng đồng KTX!
              </h1>
              <p className="text-xs sm:text-sm text-[#D6E8EE]/90 mt-2.5 leading-relaxed">
                Đăng nhập để nhắn Zalo trực tiếp cho người bán, đặt lịch hẹn giữ chỗ tại cổng trường và quản lý Hộ chiếu đồ vật Product Passport.
              </p>
            </div>
          </div>

          <div className="pt-8 space-y-3 relative z-10 border-t border-white/15 mt-8">
            <div className="flex items-center gap-2.5 text-xs text-[#D6E8EE]">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold shrink-0">
                ✓
              </span>
              <span>Xác minh thẻ sinh viên chính chủ</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#D6E8EE]">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold shrink-0">
                ✓
              </span>
              <span>Bảo vệ số điện thoại Zalo khỏi tin rác</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#D6E8EE]">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold shrink-0">
                ✓
              </span>
              <span>Tra cứu lịch sử đời chủ minh bạch</span>
            </div>
          </div>
        </div>

        {/* Cột phải: Form Đăng nhập & Chọn nhanh tài khoản mẫu */}
        <div className="lg:col-span-7 p-6 sm:p-9 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#001B48]">
              Đăng nhập tài khoản
            </h2>
            <p className="text-xs sm:text-sm text-[#02457A] mt-1">
              Chưa có tài khoản sinh viên?{" "}
              <Link
                href={`/register${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                className="font-bold text-[#018ABE] hover:underline"
              >
                Đăng ký ngay trong 30 giây &rarr;
              </Link>
            </p>
          </div>

          {returnTo !== "/" && (
            <div className="mb-4 p-3 rounded-xl bg-[#D6E8EE]/50 border border-[#97CADB] text-xs font-medium text-[#001B48] flex items-center gap-2">
              <span>🔒</span>
              <span>Sau khi đăng nhập, bạn sẽ được đưa quay lại trang đang xem ngay lập tức.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Nút Đăng nhập Google 1-chạm */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-11 sm:h-12 px-4 rounded-xl border border-[#D6E8EE] hover:border-[#018ABE] bg-white hover:bg-[#D6E8EE]/20 text-[#001B48] font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Tiếp tục 1-chạm với Google Sinh Viên</span>
          </button>

          <div className="relative my-5 flex items-center justify-center">
            <div className="border-t border-[#D6E8EE] w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-[#02457A]/70 whitespace-nowrap">
              hoặc dùng email
            </span>
            <div className="border-t border-[#D6E8EE] w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-1.5">
                Email sinh viên hoặc cá nhân
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: hoangnam.bka@gmail.com"
                className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-1.5">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-12 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xác thực..." : "Đăng nhập ngay"}
            </button>
          </form>

          {/* Khối Chọn Nhanh Tài Khoản Sinh Viên Dùng Thử (1-Click Demo) */}
          <div className="mt-6 pt-5 border-t border-[#D6E8EE]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-[#001B48] uppercase tracking-wider">
                ⚡ Đăng nhập nhanh 1-Click (Tài khoản mẫu Seed)
              </span>
              <span className="text-[11px] text-[#018ABE] font-semibold">
                Dành cho kiểm thử &amp; Demo
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {QUICK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                    performLogin(acc.email, acc.password);
                  }}
                  className="text-left p-2.5 rounded-xl border border-[#D6E8EE] hover:border-[#018ABE] bg-[#F8FAFC] hover:bg-[#D6E8EE]/30 transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-[#001B48] group-hover:text-[#018ABE] truncate">
                    {acc.name}
                  </p>
                  <p className="text-[11px] text-[#02457A] truncate">{acc.label}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-[#D6E8EE]/70 text-[#001B48] text-[10px] font-semibold">
                    {acc.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm font-semibold text-[#02457A]">
          Đang tải trang đăng nhập...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

