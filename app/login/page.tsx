"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const QUICK_ACCOUNTS = [
  {
    name: "Hoàng Nam",
    role: "Sinh viên Bách Khoa",
    email: "hoangnam.bka@gmail.com",
    password: "Student@123456",
  },
  {
    name: "Hải Yến",
    role: "Sinh viên KHTN",
    email: "haiyen.khtn@gmail.com",
    password: "Student@123456",
  },
  {
    name: "Quản trị viên",
    role: "Ban quản trị",
    email: "admin@unicycle.vn",
    password: "Admin@123456",
  },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white">
                Chào mừng bạn trở lại!
              </h1>
              <p className="text-xs sm:text-sm text-[#D6E8EE]/90 mt-2.5 leading-relaxed">
                Tiếp tục hành trình mua bán và trao đổi đồ cũ cùng cộng đồng sinh viên.
              </p>
            </div>
          </div>

          <div className="pt-8 space-y-3.5 relative z-10 border-t border-white/15 mt-8">
            <div className="flex items-center gap-2.5 text-xs text-[#D6E8EE]">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>Xác minh sinh viên chính chủ</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#D6E8EE]">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.861-.861 5.972 5.972 0 011.057-3.035C4.604 15.69 4 13.93 4 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <span>Kết nối trực tiếp với người bán</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#D6E8EE]">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Lịch sử giao dịch minh bạch</span>
            </div>
          </div>
        </div>

        {/* Cột phải: Form Đăng nhập & Chọn nhanh tài khoản mẫu */}
        <div className="lg:col-span-7 p-6 sm:p-9 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#001B48]">
              Đăng nhập
            </h2>
            <p className="text-xs sm:text-sm text-[#02457A] mt-1">
              Chưa có tài khoản?{" "}
              <Link
                href={`/register${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                className="font-bold text-[#018ABE] hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Nút Đăng nhập Google */}
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
            <span>Tiếp tục với Google</span>
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
                Địa chỉ email
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-12 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xác thực..." : "Đăng nhập"}
            </button>
          </form>

          {/* Khối Trải nghiệm nhanh (Demo) */}
          <div className="mt-6 pt-5 border-t border-[#D6E8EE]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#001B48]">
                Trải nghiệm nhanh
              </span>
              <span className="text-[10px] font-semibold text-[#02457A] bg-[#D6E8EE]/70 px-2 py-0.5 rounded-full">
                Demo
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Chọn một tài khoản mẫu để khám phá các tính năng của UniCycle.
            </p>
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
                  <p className="text-[11px] text-[#02457A] truncate mt-0.5">{acc.role}</p>
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

