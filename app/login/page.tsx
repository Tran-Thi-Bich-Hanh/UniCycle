"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { IconShieldCheck, IconSparkles, IconArrowRight } from "@/components/icons";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng nhập không thành công");
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi đăng nhập");
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123");
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-white p-6 sm:p-9 rounded-3xl border border-slate-200/90 shadow-xl shadow-blue-950/5 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#1F5E7A] text-white flex items-center justify-center text-xl font-bold mx-auto shadow-sm" aria-hidden="true">
              U
            </div>
            <h1 className="text-2xl font-bold text-[#102A43] tracking-tight">
              Đăng nhập UniCycle
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Cộng đồng mua bán và tái sử dụng đồ cũ an toàn cho sinh viên TP.HCM
            </p>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Email sinh viên
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten.sinhvien@edu.vn"
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all placeholder-slate-400"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Mật khẩu
                </label>
                <span className="text-[11px] text-blue-700 font-medium hover:underline cursor-pointer">
                  Quên mật khẩu?
                </span>
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all placeholder-slate-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-xs font-bold text-white bg-[#1F5E7A] hover:bg-[#174A61] shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{loading ? "Đang xác thực..." : "Đăng nhập ngay"}</span>
              {!loading && <IconArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          {/* Quick Demo Login Box */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                <IconSparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Test nhanh 1-Click (Tài khoản mẫu):</span>
              </div>
              <span className="text-[10px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                Sinh viên
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("an.nguyen@student.hcmut.edu.vn")}
                className="text-left px-3 py-2 rounded-xl bg-white border border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-700 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="font-bold text-xs text-blue-950 group-hover:text-blue-700 truncate">
                  Nguyễn Văn An
                </div>
                <div className="text-[10px] text-slate-500 truncate">ĐH Bách Khoa TP.HCM</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("mai.tran@student.hcmus.edu.vn")}
                className="text-left px-3 py-2 rounded-xl bg-white border border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-700 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="font-bold text-xs text-blue-950 group-hover:text-blue-700 truncate">
                  Trần Thị Mai
                </div>
                <div className="text-[10px] text-slate-500 truncate">ĐH Khoa học Tự nhiên</div>
              </button>
            </div>

            <p className="text-[10px] text-blue-800/80 text-center font-medium pt-1">
              Mật khẩu mặc định: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-blue-900">Password123</code>
            </p>
          </div>

          {/* Trust and safety highlight */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
            <IconShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Môi trường mua bán đồ cũ an toàn & minh bạch</span>
          </div>

          {/* Footer link */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Chưa có tài khoản?{" "}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirectUrl)}`}
              className="text-blue-700 font-bold hover:underline"
            >
              Tạo tài khoản sinh viên mới
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 p-8 text-center text-slate-500">Đang tải...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
