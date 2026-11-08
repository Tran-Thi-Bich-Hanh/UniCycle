"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { IconShieldCheck, IconArrowRight } from "@/components/icons";

const POPULAR_UNIVERSITIES = [
  "Đại học Bách Khoa - ĐHQG TP.HCM",
  "Đại học Khoa học Tự nhiên - ĐHQG TP.HCM",
  "Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
  "Đại học Kinh tế - Luật - ĐHQG TP.HCM",
  "Đại học Quốc tế - ĐHQG TP.HCM",
  "Đại học KHXH&NV - ĐHQG TP.HCM",
  "Đại học Sư phạm Kỹ thuật TP.HCM",
  "Đại học Kinh tế TP.HCM (UEH)",
  "Đại học Y Dược TP.HCM",
  "Khác",
];

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState(POPULAR_UNIVERSITIES[0]);
  const [campusLocation, setCampusLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          university,
          campusLocation: campusLocation.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng ký không thành công");
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi đăng ký");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-lg w-full bg-white p-6 sm:p-9 rounded-3xl border border-slate-200/90 shadow-xl shadow-blue-950/5 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 text-white flex items-center justify-center text-xl font-black mx-auto shadow-md shadow-blue-600/25">
              🎓
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Đăng ký tài khoản sinh viên
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Mua bán, nhượng lại giáo trình và đồ dùng phòng trọ với sinh viên cùng trường
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

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Họ và tên sinh viên <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all placeholder-slate-400"
                required
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Email sinh viên / cá nhân <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten.sinhvien@hcmut.edu.vn"
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all placeholder-slate-400"
                required
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Mật khẩu (tối thiểu 6 ký tự) <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all placeholder-slate-400"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reg-uni"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Trường đại học <span className="text-red-500">*</span>
                </label>
                <select
                  id="reg-uni"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all cursor-pointer"
                >
                  {POPULAR_UNIVERSITIES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Số điện thoại / Zalo <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all placeholder-slate-400"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-dorm"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Ký túc xá / Khu vực sinh sống
              </label>
              <input
                id="reg-dorm"
                type="text"
                value={campusLocation}
                onChange={(e) => setCampusLocation(e.target.value)}
                placeholder="VD: KTX Khu B (Nhà B4) hoặc Hẻm 8 Hoàng Diệu 2..."
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all placeholder-slate-400"
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
              <IconShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Thông tin trường và khu vực giúp các bạn sinh viên xung quanh dễ dàng hẹn xem và nhận đồ trực tiếp.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full text-xs font-bold text-white bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 shadow-md shadow-blue-600/30 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{loading ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký sinh viên"}</span>
              {!loading && <IconArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          {/* Footer link */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Đã có tài khoản sinh viên?{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
              className="text-blue-700 font-bold hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 p-8 text-center text-slate-500">Đang tải...</div>}>
      <RegisterFormContent />
    </Suspense>
  );
}

