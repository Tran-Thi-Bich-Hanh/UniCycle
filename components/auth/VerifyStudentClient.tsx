"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/utils/image-compress";

interface SchoolOption {
  id: string;
  name: string;
  shortName: string;
  emailDomain?: string | null;
  area?: string;
}

interface VerificationState {
  isStudentVerified: boolean;
  studentVerifiedAt: string | null;
  hasPendingCard: boolean;
  schoolId: string | null;
  schoolName: string | null;
  schoolShortName: string | null;
  dorm: string | null;
  email: string;
}

const SAMPLE_EDU_DOMAINS = [
  { label: "ĐH Bách Khoa", domain: "hcmut.edu.vn" },
  { label: "ĐH KHTN", domain: "hcmus.edu.vn" },
  { label: "ĐH CNTT (UIT)", domain: "uit.edu.vn" },
  { label: "UEH", domain: "ueh.edu.vn" },
  { label: "ĐHQG TP.HCM", domain: "vnuhcm.edu.vn" },
];

export function VerifyStudentClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edu_email" | "student_card">("edu_email");

  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [eduEmail, setEduEmail] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [dorm, setDorm] = useState("");

  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [cardCompressInfo, setCardCompressInfo] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [consentDecree13, setConsentDecree13] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/verify-student", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login?returnTo=/verify-student");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!active || !data) return;
        if (data.verification) {
          setVerification(data.verification);
          setSchoolId(data.verification.schoolId || data.schools?.[0]?.id || "");
          setDorm(data.verification.dorm || "");
          if (data.verification.email?.endsWith(".edu.vn")) {
            setEduEmail(data.verification.email);
          }
        }
        if (Array.isArray(data.schools)) {
          setSchools(data.schools);
        }
      })
      .catch(() => {
        if (active) {
          setFeedback({
            type: "error",
            message: "Không thể tải thông tin xác minh sinh viên. Vui lòng thử lại.",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const handleCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({
        type: "error",
        message: "Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).",
      });
      return;
    }

    setCompressing(true);
    setFeedback(null);
    try {
      const compressed = await compressImage(file, 1200, 1200, 0.82);
      setCardPreviewUrl(compressed.dataUrl);
      const kbAfter = Math.round(compressed.compressedSize / 1024);
      setCardCompressInfo(`Đã nén tối ưu (${kbAfter} KB, giảm ${compressed.compressionRatio}%)`);
    } catch {
      setFeedback({
        type: "error",
        message: "Không thể xử lý ảnh thẻ sinh viên. Vui lòng thử ảnh khác.",
      });
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmitEduEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/auth/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "edu_email",
          eduEmail: eduEmail.trim(),
          schoolId,
          dorm: dorm.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Xác minh thất bại." });
        return;
      }

      setVerification((prev) =>
        prev
          ? {
              ...prev,
              isStudentVerified: true,
              studentVerifiedAt: new Date().toISOString(),
              hasPendingCard: false,
              schoolId: data.user?.schoolId || schoolId,
              schoolShortName: data.user?.schoolShortName || prev.schoolShortName,
              dorm: data.user?.dorm || dorm.trim(),
            }
          : prev
      );
      setFeedback({
        type: "success",
        message: data.message || "Xác minh sinh viên thành công!",
      });
      window.dispatchEvent(new Event("unicycle-auth-change"));
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        message: "Lỗi kết nối máy chủ khi gửi xác minh email.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/auth/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "student_card",
          studentCardUrl: cardPreviewUrl,
          schoolId,
          dorm: dorm.trim(),
          consentDecree13,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Gửi ảnh thẻ thất bại." });
        return;
      }

      setVerification((prev) =>
        prev
          ? {
              ...prev,
              hasPendingCard: true,
              schoolId: data.user?.schoolId || schoolId,
              schoolShortName: data.user?.schoolShortName || prev.schoolShortName,
              dorm: data.user?.dorm || dorm.trim(),
            }
          : prev
      );
      setFeedback({
        type: "success",
        message: data.message || "Đã gửi ảnh thẻ sinh viên chờ Admin phê duyệt!",
      });
      window.dispatchEvent(new Event("unicycle-auth-change"));
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        message: "Lỗi kết nối máy chủ khi tải ảnh thẻ sinh viên.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-[#02457A]">
          Đang tải trạng thái xác minh sinh viên...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-[#02457A]">
        <Link href="/" className="hover:text-[#018ABE]">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/profile" className="hover:text-[#018ABE]">
          Hồ sơ cá nhân
        </Link>
        <span>/</span>
        <span className="text-[#001B48] font-bold">Xác minh sinh viên</span>
      </nav>

      {/* Hero Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#001B48] via-[#02457A] to-[#018ABE] text-white p-6 sm:p-8 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-bold text-[#D6E8EE]">
            <span>🎓</span>
            <span>Xác Minh Cộng Đồng Sinh Viên (BR19)</span>
          </span>
          {verification?.isStudentVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold shadow-xs">
              <span>✓</span>
              <span>Sinh viên đã xác minh</span>
            </span>
          ) : verification?.hasPendingCard ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold shadow-xs">
              <span>⏳</span>
              <span>Đang chờ Admin duyệt thẻ</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
              Chưa xác minh
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Nhận Huy Hiệu &ldquo;Sinh Viên Đã Xác Minh&rdquo;
        </h1>
        <p className="text-xs sm:text-sm text-[#D6E8EE] leading-relaxed max-w-2xl">
          Tài khoản được xác minh giúp tăng độ tin cậy khi giao dịch tại cổng trường / KTX và được{" "}
          <strong className="text-white">ưu tiên hiển thị tin đăng</strong> trên bảng tin khám phá (BR19).
        </p>
      </div>

      {/* Trạng thái đã xác minh hoặc đang chờ duyệt */}
      {verification?.isStudentVerified && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0">
              🌟
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-extrabold text-emerald-950">
                Tài khoản của bạn đã được xác minh sinh viên!
              </h2>
              <p className="text-xs sm:text-sm text-emerald-900/90 leading-relaxed">
                Huy hiệu <strong>Sinh viên đã xác minh</strong> đang hiển thị công khai trên các tin đăng và hồ sơ của bạn
                {verification.schoolShortName ? ` (${verification.schoolShortName})` : ""}.
                {verification.studentVerifiedAt && (
                  <> Ngày cấp: {new Date(verification.studentVerifiedAt).toLocaleDateString("vi-VN")}.</>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/sell"
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
            >
              + Đăng tin bán đồ ngay
            </Link>
            <Link
              href="/profile"
              className="px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100/60 text-xs font-bold transition-colors"
            >
              Quay lại Hồ sơ cá nhân
            </Link>
          </div>
        </div>
      )}

      {!verification?.isStudentVerified && verification?.hasPendingCard && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start gap-3.5">
          <span className="text-2xl shrink-0">⏳</span>
          <div className="space-y-1 text-xs sm:text-sm text-amber-950">
            <p className="font-extrabold">Hồ sơ Thẻ Sinh Viên đang chờ Ban Quản Trị đối chiếu</p>
            <p className="text-amber-900/90 leading-relaxed">
              Nếu bạn có email trường đuôi <code className="font-mono font-bold">.edu.vn</code>, bạn có thể chuyển sang tab bên dưới để được xác minh tự động ngay lập tức.
            </p>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-start gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span className="text-base leading-none">{feedback.type === "success" ? "✓" : "⚠️"}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Form 2 Phương Thức Xác Minh (ẩn hoặc cho cập nhật nếu chưa verify) */}
      {!verification?.isStudentVerified && (
        <div className="bg-white rounded-3xl border border-[#D6E8EE] shadow-xs overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-[#D6E8EE] bg-[#F4F9FB]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("edu_email");
                setFeedback(null);
              }}
              className={`py-4 px-4 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 border-b-2 ${
                activeTab === "edu_email"
                  ? "bg-white text-[#001B48] border-[#018ABE]"
                  : "text-slate-600 border-transparent hover:text-[#02457A]"
              }`}
            >
              <span>📧</span>
              <span>Email Trường (.edu.vn) · Tức thì</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("student_card");
                setFeedback(null);
              }}
              className={`py-4 px-4 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 border-b-2 ${
                activeTab === "student_card"
                  ? "bg-white text-[#001B48] border-[#018ABE]"
                  : "text-slate-600 border-transparent hover:text-[#02457A]"
              }`}
            >
              <span>🪪</span>
              <span>Ảnh Thẻ Sinh Viên (NĐ 13/2023)</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === "edu_email" ? (
              <form onSubmit={handleSubmitEduEmail} className="space-y-5">
                <div className="p-4 rounded-2xl bg-[#D6E8EE]/40 border border-[#97CADB]/50 text-xs text-[#001B48] space-y-2">
                  <p className="font-bold">⚡ Duyệt tự động trong 1 giây</p>
                  <p className="text-[#02457A] leading-relaxed">
                    Nhập địa chỉ email sinh viên kết thúc bằng <code className="font-mono font-bold">.edu.vn</code> do trường đại học cấp để nhận huy hiệu ngay mà không cần chờ duyệt thủ công.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SAMPLE_EDU_DOMAINS.map((item) => (
                      <button
                        key={item.domain}
                        type="button"
                        onClick={() => {
                          const prefix = eduEmail.split("@")[0] || "sinhvien";
                          setEduEmail(`${prefix}@${item.domain}`);
                        }}
                        className="px-2.5 py-1 rounded-full bg-white border border-[#97CADB] text-[11px] font-semibold text-[#02457A] hover:border-[#018ABE] hover:text-[#001B48] cursor-pointer"
                      >
                        @{item.domain}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="verify-edu-email" className="block text-xs font-bold text-[#001B48] mb-1.5">
                    Email trường (.edu.vn) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="verify-edu-email"
                    type="email"
                    required
                    value={eduEmail}
                    onChange={(e) => setEduEmail(e.target.value)}
                    placeholder="VD: mssv@hcmut.edu.vn hoặc sv@uit.edu.vn"
                    className="w-full h-11 px-4 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-sm text-[#001B48]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="verify-edu-school" className="block text-xs font-bold text-[#001B48] mb-1.5">
                      Trường ĐH / Cụm KTX
                    </label>
                    <select
                      id="verify-edu-school"
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-sm text-[#001B48]"
                    >
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="verify-edu-dorm" className="block text-xs font-bold text-[#001B48] mb-1.5">
                      Tòa KTX / Khu vực (Tùy chọn)
                    </label>
                    <input
                      id="verify-edu-dorm"
                      type="text"
                      value={dorm}
                      onChange={(e) => setDorm(e.target.value)}
                      placeholder="VD: Tòa B4 - KTX Khu B"
                      className="w-full h-11 px-4 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-sm text-[#001B48]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Đang xác thực email trường..." : "Xác minh tức thì bằng Email .edu.vn"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitCard} className="space-y-5">
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-[#001B48] space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Cam kết Bảo vệ Dữ liệu Cá nhân (Nghị định 13/2023/NĐ-CP)</span>
                  </p>
                  <p className="text-[#02457A] leading-relaxed">
                    Ảnh Thẻ Sinh Viên chỉ được Ban Quản Trị sử dụng duy nhất một lần để đối chiếu danh tính. Hệ thống{" "}
                    <strong>tự động xóa vĩnh viễn ảnh thẻ</strong> khỏi cơ sở dữ liệu ngay khi hồ sơ được phê duyệt. Hồ sơ công khai tuyệt đối không hiển thị MSSV hay ảnh thẻ.
                  </p>
                </div>

                <div>
                  <label htmlFor="verify-card-upload" className="block text-xs font-bold text-[#001B48] mb-1.5">
                    Ảnh mặt trước Thẻ Sinh Viên <span className="text-rose-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-[#97CADB] rounded-2xl p-5 bg-[#F8FAFC] text-center space-y-3">
                    {cardPreviewUrl ? (
                      <div className="space-y-3">
                        <div className="relative mx-auto max-w-sm rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cardPreviewUrl}
                            alt="Xem trước thẻ sinh viên"
                            className="w-full max-h-56 object-contain"
                          />
                        </div>
                        {cardCompressInfo && (
                          <p className="text-[11px] font-semibold text-emerald-700">{cardCompressInfo}</p>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 space-y-1.5">
                        <div className="text-3xl">🪪</div>
                        <p className="text-xs font-semibold text-[#001B48]">
                          Chụp rõ tên, trường đại học trên Thẻ Sinh Viên (có thể che bớt số CMND/CCCD nếu có)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Ảnh được nén tự động trên thiết bị trước khi gửi để tiết kiệm 4G
                        </p>
                      </div>
                    )}

                    <input
                      id="verify-card-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleCardFileChange}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#D6E8EE] file:text-[#001B48] hover:file:bg-[#97CADB]/50 cursor-pointer"
                    />
                    {compressing && (
                      <p className="text-xs font-semibold text-[#018ABE]">Đang nén tối ưu ảnh thẻ...</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="verify-card-school" className="block text-xs font-bold text-[#001B48] mb-1.5">
                      Trường ĐH / Cụm KTX
                    </label>
                    <select
                      id="verify-card-school"
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-sm text-[#001B48]"
                    >
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="verify-card-dorm" className="block text-xs font-bold text-[#001B48] mb-1.5">
                      Tòa KTX / Khu vực (Tùy chọn)
                    </label>
                    <input
                      id="verify-card-dorm"
                      type="text"
                      value={dorm}
                      onChange={(e) => setDorm(e.target.value)}
                      placeholder="VD: Tòa BA1 - KTX Khu B"
                      className="w-full h-11 px-4 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-sm text-[#001B48]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentDecree13}
                    onChange={(e) => setConsentDecree13(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#018ABE] focus:ring-[#018ABE]"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    Tôi đồng ý cung cấp ảnh thẻ sinh viên để UniCycle đối chiếu xác minh theo{" "}
                    <strong>Nghị định 13/2023/NĐ-CP</strong> và xác nhận rằng ảnh sẽ tự động bị xóa vĩnh viễn ngay sau khi Admin phê duyệt.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting || compressing || !cardPreviewUrl || !consentDecree13}
                  className="w-full h-12 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Đang gửi hồ sơ xét duyệt..." : "Gửi ảnh Thẻ Sinh Viên để nhận Huy hiệu"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
