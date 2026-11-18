"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { compressImage } from "@/lib/utils/image-compress";

interface SchoolOption {
  id: string;
  name: string;
  shortName: string;
  emailDomain?: string | null;
}

interface ProfileData {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  authProvider: string;
  isStudentVerified: boolean;
  studentVerifiedAt: string | null;
  hasPendingCard: boolean;
  reputationScore: number;
  schoolId: string | null;
  school: { id: string; name: string; shortName: string } | null;
  dorm: string | null;
  createdAt: string;
}

interface ProfileStats {
  listingsCount: number;
  completedOrdersCount: number;
  ownedItemsCount: number;
  reviewsCount: number;
  blockingOrdersCount: number;
}

interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  tags: string[];
  submittedAt: string;
  reviewer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isStudentVerified: boolean;
  };
  listingTitle: string;
}

export function ProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const activeTab: "info" | "reviews" | "privacy" =
    initialTabParam === "reviews" || initialTabParam === "privacy"
      ? initialTabParam
      : "info";

  const handleTabChange = (tab: "info" | "reviews" | "privacy") => {
    setFeedback(null);
    router.replace(tab === "info" ? "/profile" : `/profile?tab=${tab}`, {
      scroll: false,
    });
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    listingsCount: 0,
    completedOrdersCount: 0,
    ownedItemsCount: 0,
    reviewsCount: 0,
    blockingOrdersCount: 0,
  });
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [dorm, setDorm] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Crypto-shredding delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profile", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login?returnTo=/profile");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!active || !data) return;
        if (data.profile) {
          setProfile(data.profile);
          setDisplayName(data.profile.displayName || "");
          setSchoolId(data.profile.schoolId || "");
          setDorm(data.profile.dorm || "");
          setAvatarUrl(data.profile.avatarUrl || "");
        }
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.reviews)) setReviews(data.reviews);
        if (Array.isArray(data.schools)) setSchools(data.schools);
      })
      .catch(() => {
        if (active) {
          setFeedback({
            type: "error",
            message: "Không thể tải hồ sơ cá nhân. Vui lòng thử lại.",
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Vui lòng chọn tệp hình ảnh hợp lệ." });
      return;
    }
    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      setAvatarUrl(compressed.dataUrl);
      setFeedback(null);
    } catch {
      setFeedback({ type: "error", message: "Không thể xử lý ảnh đại diện." });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          schoolId,
          dorm: dorm.trim(),
          avatarUrl: avatarUrl.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Không thể lưu thay đổi." });
        return;
      }

      if (data.user) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                displayName: data.user.displayName,
                schoolId: data.user.schoolId,
                school: data.user.schoolShortName
                  ? {
                      id: data.user.schoolId || "",
                      name: data.user.schoolShortName,
                      shortName: data.user.schoolShortName,
                    }
                  : prev.school,
                dorm: data.user.dorm,
                avatarUrl: data.user.avatarUrl,
              }
            : prev
        );
      }

      setFeedback({
        type: "success",
        message: data.message || "Đã cập nhật hồ sơ cá nhân!",
      });
      window.dispatchEvent(new Event("unicycle-auth-change"));
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Lỗi kết nối máy chủ khi lưu hồ sơ." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Không thể xóa tài khoản.");
        setDeleting(false);
        return;
      }

      window.dispatchEvent(new Event("unicycle-auth-change"));
      router.push("/?deleted=true");
      router.refresh();
    } catch {
      setDeleteError("Lỗi kết nối máy chủ khi thực hiện xóa tài khoản.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-[#02457A]">
          Đang tải hồ sơ sinh viên của bạn...
        </span>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-[#02457A]">
        <Link href="/" className="hover:text-[#018ABE]">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-[#001B48] font-bold">Hồ sơ cá nhân &amp; Cài đặt</span>
      </nav>

      {/* 1. Profile Header Card */}
      <div className="bg-white rounded-3xl border border-[#D6E8EE] shadow-xs overflow-hidden">
        <div className="h-24 sm:h-28 bg-gradient-to-r from-[#001B48] via-[#02457A] to-[#018ABE]" />
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-12">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white bg-[#D6E8EE] shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-[#001B48]">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="pt-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#001B48]">
                    {profile.displayName}
                  </h1>
                  {profile.isStudentVerified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                      <span>✓</span>
                      <span>Sinh viên đã xác minh</span>
                    </span>
                  ) : profile.hasPendingCard ? (
                    <Link
                      href="/verify-student"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold hover:bg-amber-100"
                    >
                      <span>⏳ Chờ duyệt thẻ SV</span>
                    </Link>
                  ) : (
                    <Link
                      href="/verify-student"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D6E8EE] text-[#02457A] text-[11px] font-bold hover:bg-[#97CADB]/50"
                    >
                      <span>🎓 Xác minh SV ngay &rarr;</span>
                    </Link>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span>{profile.email}</span>
                  <span>•</span>
                  <span className="font-semibold text-[#02457A]">
                    ⭐ {profile.reputationScore.toFixed(1)} uy tín
                  </span>
                  {(profile.school?.shortName || profile.dorm) && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-[#018ABE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{profile.dorm || profile.school?.shortName}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Link
              href={`/users/${profile.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] hover:bg-[#D6E8EE]/50 text-[#001B48] text-xs font-bold transition-colors self-start sm:self-end"
            >
              <span>Xem hồ sơ công khai</span>
              <span>↗</span>
            </Link>
          </div>

          {/* Stats Grid + Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
            <Link
              href="/my-items"
              className="p-3.5 rounded-2xl bg-[#F4F9FB] hover:bg-[#D6E8EE]/50 border border-[#D6E8EE] transition-colors"
            >
              <div className="text-lg sm:text-xl font-black text-[#001B48]">
                {stats.listingsCount}
              </div>
              <div className="text-[11px] font-semibold text-[#02457A]">Đồ của tôi &rarr;</div>
            </Link>
            <Link
              href="/orders"
              className="p-3.5 rounded-2xl bg-[#F4F9FB] hover:bg-[#D6E8EE]/50 border border-[#D6E8EE] transition-colors"
            >
              <div className="text-lg sm:text-xl font-black text-[#001B48]">
                {stats.completedOrdersCount}
              </div>
              <div className="text-[11px] font-semibold text-[#02457A]">
                Giao dịch hoàn tất &rarr;
              </div>
            </Link>
            <Link
              href="/verify-student"
              className="p-3.5 rounded-2xl bg-[#F4F9FB] hover:bg-[#D6E8EE]/50 border border-[#D6E8EE] transition-colors"
            >
              <div className="text-lg sm:text-xl font-black text-[#018ABE]">
                {profile.isStudentVerified ? "Đã duyệt" : "Chưa duyệt"}
              </div>
              <div className="text-[11px] font-semibold text-[#02457A]">
                Xác minh sinh viên &rarr;
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Tabs Container */}
      <div className="bg-white rounded-3xl border border-[#D6E8EE] shadow-xs overflow-hidden">
        <div className="flex overflow-x-auto border-b border-[#D6E8EE] bg-[#F4F9FB]">
          <button
            type="button"
            onClick={() => handleTabChange("info")}
            className={`px-5 py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === "info"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            👤 Thông tin &amp; Trường/KTX
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("reviews")}
            className={`px-5 py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === "reviews"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            ⭐ Đánh giá uy tín ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("privacy")}
            className={`px-5 py-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              activeTab === "privacy"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Quyền riêng tư &amp; Xóa tài khoản</span>
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {feedback && (
            <div
              role="alert"
              className={`mb-5 p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-start gap-2.5 ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <span className="shrink-0 mt-0.5">
                {feedback.type === "success" ? (
                  <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </span>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* TAB 1: Thông tin cá nhân */}
          {activeTab === "info" && (
            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs text-[#02457A] leading-relaxed">
                Hồ sơ công khai chỉ hiển thị <strong>Tên hiển thị, Trường/KTX, Huy hiệu xác minh, Điểm uy tín</strong> và tin đang bán. Email cá nhân và thông tin riêng tư tuyệt đối không công khai (Mục 6.5).
              </div>

              <div>
                <label htmlFor="profile-display-name" className="block text-xs font-bold text-[#001B48] mb-1.5">
                  Tên hiển thị <span className="text-rose-500">*</span>
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-sm text-[#001B48]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-school" className="block text-xs font-bold text-[#001B48] mb-1.5">
                    Trường ĐH / Cụm KTX
                  </label>
                  <select
                    id="profile-school"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-sm text-[#001B48]"
                  >
                    <option value="">-- Chọn trường / KTX --</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="profile-dorm" className="block text-xs font-bold text-[#001B48] mb-1.5">
                    Tòa KTX / Khu vực giao dịch
                  </label>
                  <input
                    id="profile-dorm"
                    type="text"
                    value={dorm}
                    onChange={(e) => setDorm(e.target.value)}
                    placeholder="VD: Tòa B4 - KTX Khu B"
                    className="w-full h-11 px-4 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-sm text-[#001B48]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-avatar-url" className="block text-xs font-bold text-[#001B48] mb-1.5">
                  Ảnh đại diện (URL hoặc tải ảnh lên)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="profile-avatar-url"
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 h-11 px-4 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white focus:border-[#018ABE] focus:outline-none text-sm text-[#001B48]"
                  />
                  <label className="h-11 px-4 rounded-xl border border-[#97CADB] bg-[#D6E8EE]/40 hover:bg-[#D6E8EE] text-[#001B48] text-xs font-bold inline-flex items-center justify-center cursor-pointer shrink-0">
                    <span>Chọn ảnh từ máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 h-11 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Đang lưu hồ sơ..." : "Lưu thay đổi hồ sơ"}
                </button>
                {!profile.isStudentVerified && (
                  <Link
                    href="/verify-student"
                    className="px-5 h-11 rounded-xl border border-[#018ABE] text-[#018ABE] hover:bg-[#D6E8EE]/40 text-xs sm:text-sm font-bold inline-flex items-center justify-center transition-colors"
                  >
                    🎓 Xác minh sinh viên (.edu.vn / Thẻ SV)
                  </Link>
                )}
              </div>
            </form>
          )}

          {/* TAB 2: Đánh giá uy tín công khai */}
          {activeTab === "reviews" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#F4F9FB] border border-[#D6E8EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-[#001B48]">
                    Điểm uy tín hiện tại: ⭐ {profile.reputationScore.toFixed(1)} / 5.0
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Đánh giá áp dụng cơ chế Blind Review 48 giờ (BR14) — chỉ công khai khi cả hai bên cùng nộp hoặc sau 48 giờ để chống trả đũa.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#018ABE] bg-white px-3 py-1.5 rounded-xl border border-[#D6E8EE] shrink-0">
                  {reviews.length} đánh giá công khai
                </span>
              </div>

              {reviews.length === 0 ? (
                <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
                  <div className="text-3xl">⭐</div>
                  <p className="text-sm font-bold text-[#001B48]">Chưa có đánh giá công khai nào</p>
                  <p className="text-xs text-slate-500">
                    Khi hoàn tất đơn giao dịch và hết cửa sổ Blind Review 48 giờ, nhận xét từ đối tác sẽ hiển thị tại đây.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/users/${rev.reviewer.id}`}
                            className="text-xs font-extrabold text-[#001B48] hover:text-[#018ABE]"
                          >
                            {rev.reviewer.displayName}
                          </Link>
                          {rev.reviewer.isStudentVerified && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              ✓ SV
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-amber-500">
                          {"★".repeat(rev.rating)}
                          {"☆".repeat(Math.max(0, 5 - rev.rating))}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                      {rev.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {rev.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[#02457A]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                        <span className="truncate max-w-md">Món đồ: {rev.listingTitle}</span>
                        <span>{new Date(rev.submittedAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Quyền riêng tư & Crypto-shredding BR34 */}
          {activeTab === "privacy" && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-5 rounded-2xl bg-[#F4F9FB] border border-[#D6E8EE] space-y-3">
                <h2 className="text-sm sm:text-base font-extrabold text-[#001B48] flex items-center gap-2">
                  <span>🔐</span>
                  <span>Cơ chế Xóa Tài Khoản Crypto-Shredding (BR34 &amp; NĐ 13/2023/NĐ-CP)</span>
                </h2>
                <ul className="space-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-5">
                  <li>
                    <strong>Hủy liên kết danh tính trên Passport:</strong> Hệ thống đặt{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
                      PassportOwner.userId = NULL
                    </code>{" "}
                    và{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
                      showName = false
                    </code>
                    , nhưng giữ nguyên <code className="font-mono">ownerHash</code> ngẫu nhiên,{" "}
                    <code className="font-mono">seq</code> và <code className="font-mono">since</code> để lịch sử vòng đời đồ vật trên PostgreSQL và Avalanche Fuji không bị đứt gãy.
                  </li>
                  <li>
                    <strong>Đóng băng món đồ đang sở hữu:</strong> Các món đồ bạn đang làm chủ sở hữu hiện tại sẽ chuyển sang trạng thái{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
                      ARCHIVED_OWNER_DELETED
                    </code>{" "}
                    và không thể đăng bán lại trái phép.
                  </li>
                  <li>
                    <strong>Xóa sạch PII cá nhân:</strong> Tên, email, SĐT Zalo trên các tin đăng, ảnh đại diện và ảnh thẻ sinh viên bị ẩn danh và xóa vĩnh viễn.
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/60 space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-rose-900">
                    Vùng Nguy Hiểm: Xóa Vĩnh Viễn Tài Khoản
                  </h3>
                  <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                    Thao tác này không thể hoàn tác. Bạn sẽ bị đăng xuất ngay lập tức và không thể đăng nhập lại bằng tài khoản này.
                  </p>
                </div>

                {stats.blockingOrdersCount > 0 && (
                  <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-xs text-amber-950 font-semibold flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                      Bạn đang có {stats.blockingOrdersCount} đơn hẹn ở trạng thái giữ chỗ, chờ xác nhận 48h hoặc khiếu nại. Vui lòng xử lý xong tại trang{" "}
                      <Link href="/orders" className="underline font-bold">
                        Quản lý đơn hẹn
                      </Link>{" "}
                      trước khi xóa tài khoản.
                    </span>
                  </div>
                )}

                {!deleteDialogOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteDialogOpen(true);
                      setDeleteError(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Yêu cầu xóa vĩnh viễn tài khoản
                  </button>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="space-y-3 pt-2 border-t border-rose-200">
                    <div>
                      <label htmlFor="confirm-delete-input" className="block text-xs font-bold text-rose-950 mb-1.5">
                        Nhập chính xác <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-300">XOA TAI KHOAN</code> để xác nhận:
                      </label>
                      <input
                        id="confirm-delete-input"
                        type="text"
                        required
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="XOA TAI KHOAN"
                        className="w-full h-11 px-4 rounded-xl border border-rose-300 bg-white focus:border-rose-600 focus:outline-none text-sm font-mono text-rose-950"
                      />
                    </div>

                    {deleteError && (
                      <p className="text-xs font-bold text-rose-700">{deleteError}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={deleting || confirmText.trim().toUpperCase() !== "XOA TAI KHOAN"}
                        className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {deleting ? "Đang thực thi Crypto-shredding..." : "Xác nhận xóa vĩnh viễn"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteDialogOpen(false);
                          setConfirmText("");
                          setDeleteError(null);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
