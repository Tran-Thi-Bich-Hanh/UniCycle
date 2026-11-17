"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FALLBACK_SCHOOLS } from "@/lib/data/mock-fallback";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolId, setSchoolId] = useState("ktx-b");
  const [dorm, setDorm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEduEmail = email.trim().toLowerCase().endsWith(".edu.vn");

  const handleGoogleAuth = () => {
    setLoading(true);
    router.push(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          password,
          schoolId,
          dorm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đăng ký thất bại.");
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

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-linear-to-b from-[#D6E8EE]/40 via-white to-[#F8FAFC] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl border border-[#D6E8EE] shadow-[0_20px_50px_rgba(0,27,72,0.08)] overflow-hidden">
        {/* Cột trái: Quyền lợi thành viên sinh viên */}
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
                Dành Riêng Cho Sinh Viên
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white">
                Tạo tài khoản sinh viên trong 30 giây
              </h1>
              <p className="text-xs sm:text-sm text-[#D6E8EE]/90 mt-2.5 leading-relaxed">
                Sử dụng email trường (<code className="text-white font-bold">*.edu.vn</code>) để nhận ngay huy hiệu <strong>SV Đã duyệt</strong> tự động, hoặc dùng email cá nhân và xác minh thẻ sinh viên sau.
              </p>
            </div>
          </div>

          <div className="pt-8 space-y-3 relative z-10 border-t border-white/15 mt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
              <p className="text-xs font-bold text-white mb-1">
                🛡️ Bảo mật dữ liệu cá nhân (NĐ 13/2023)
              </p>
              <p className="text-[11px] text-[#D6E8EE] leading-relaxed">
                Số điện thoại Zalo của bạn được bảo vệ qua lớp trung gian chống cào dữ liệu. Lịch sử đời chủ trên Product Passport mặc định ẩn danh.
              </p>
            </div>
          </div>
        </div>

        {/* Cột phải: Form Đăng ký */}
        <div className="lg:col-span-7 p-6 sm:p-9 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#001B48]">
              Đăng ký tài khoản mới
            </h2>
            <p className="text-xs sm:text-sm text-[#02457A] mt-1">
              Đã có tài khoản?{" "}
              <Link
                href={`/login${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                className="font-bold text-[#018ABE] hover:underline"
              >
                Đăng nhập tại đây &rarr;
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Nút Đăng ký nhanh với Google */}
          <button
            type="button"
            onClick={handleGoogleAuth}
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
            <span>Đăng ký 1-chạm với Google Sinh Viên</span>
          </button>

          <div className="relative my-5 flex items-center justify-center">
            <div className="border-t border-[#D6E8EE] w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-[#02457A]/70 whitespace-nowrap">
              hoặc điền thông tin bên dưới
            </span>
            <div className="border-t border-[#D6E8EE] w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-1.5">
                Họ và tên hiển thị
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="VD: Lê Minh Khôi"
                className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#001B48]">
                  Email đăng ký
                </label>
                {isEduEmail && (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ Email .edu.vn: Tự động cấp huy hiệu SV
                  </span>
                )}
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: khoi.le@hcmut.edu.vn hoặc email cá nhân"
                className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#001B48] mb-1.5">
                  Trường / Cụm KTX chính
                </label>
                <select
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-[#D6E8EE] bg-white text-sm text-[#001B48] font-medium focus:outline-none focus:border-[#018ABE]"
                >
                  {FALLBACK_SCHOOLS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#001B48] mb-1.5">
                  Tòa KTX / Khu vực giao dịch
                </label>
                <input
                  type="text"
                  value={dorm}
                  onChange={(e) => setDorm(e.target.value)}
                  placeholder="VD: Tòa B4 - KTX Khu B"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001B48] mb-1.5">
                Mật khẩu (tối thiểu 6 ký tự)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tạo mật khẩu an toàn..."
                className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-12 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? "Đang khởi tạo tài khoản..." : "Hoàn tất đăng ký"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm font-semibold text-[#02457A]">
          Đang tải trang đăng ký...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}

