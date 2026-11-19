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
    <div className="max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-[#02457A]">
        <Link href="/" className="hover:text-[#018ABE]">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-[#001B48] font-bold">Hồ sơ &amp; Cài đặt</span>
      </nav>

      {/* 1. Header Hồ Sơ (Chuẩn thiết kế ui-profile) */}
      <section className="bg-white border border-[#DCE6EE] rounded-[24px] overflow-hidden shadow-xs">
        {/* Banner 96px */}
        <div className="h-24 bg-gradient-to-r from-[#0B1F4B] via-[#0A4A82] to-[#0088C2] flex justify-end items-start p-4 box-border">
          <label className="inline-flex items-center gap-2 min-h-[44px] px-3.5 rounded-xl border border-white/35 bg-[#0B1F4B]/55 hover:bg-[#0B1F4B]/75 text-white text-[13px] font-semibold cursor-pointer transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <span>Đổi ảnh bìa</span>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
          </label>
        </div>

        <div className="p-6 pt-0 flex flex-col gap-6">
          <div className="flex flex-wrap items-start gap-3 sm:gap-6">
            {/* Avatar 112px đè lên banner (-52px) */}
            <div className="relative -mt-[52px] w-28 h-28 shrink-0">
              <div className="w-28 h-28 box-border border-4 border-white rounded-[28px] overflow-hidden bg-gradient-to-br from-[#0B1F4B] to-[#0088C2] text-white flex items-center justify-center text-[38px] font-bold tracking-wide shadow-sm">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {profile.displayName
                      .split(" ")
                      .map((w) => w[0])
                      .slice(-2)
                      .join("")
                      .toUpperCase() || "UN"}
                  </span>
                )}
              </div>
              <label
                aria-label="Đổi ảnh đại diện"
                className="absolute -right-2.5 -bottom-2.5 w-11 h-11 rounded-full border border-[#DCE6EE] bg-white text-[#0B1F4B] hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-xs transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
              </label>
            </div>

            {/* Thông tin bên cạnh avatar */}
            <div className="flex-1 min-w-[280px] sm:min-w-[320px] flex flex-col gap-2.5 pt-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-2xl sm:text-[28px] leading-tight font-bold text-[#0B1F4B] tracking-tight">
                  {profile.displayName}
                </h1>
                {profile.isStudentVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E6F6EE] border border-[#B7E4CB] text-[#0B6B3A] text-[13px] font-semibold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                    <span>Sinh viên đã xác minh</span>
                  </span>
                ) : profile.hasPendingCard ? (
                  <Link
                    href="/verify-student"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-semibold hover:bg-amber-100"
                  >
                    <span>⏳ Chờ duyệt thẻ SV</span>
                  </Link>
                ) : (
                  <Link
                    href="/verify-student"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-200"
                  >
                    <span>Chưa xác minh SV &rarr;</span>
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[#475569]">
                <span className="inline-flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>{reviews.length === 0 ? "Chưa có đánh giá" : `${profile.reputationScore.toFixed(1)} uy tín`}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{profile.dorm || profile.school?.shortName || profile.school?.name || "KTX ĐHQG"}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-[#475569]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>{profile.email}{profile.dorm ? ` · ${profile.dorm}` : ""}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#EEF2F6] text-[#475569] text-xs font-semibold">
                  Chỉ mình bạn thấy
                </span>
              </div>
            </div>

            {/* Nút Xem hồ sơ công khai */}
            <div className="pt-2 sm:pt-4 self-start sm:self-auto shrink-0">
              <Link
                href={`/users/${profile.id}`}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4.5 rounded-xl border border-[#C9D7E3] bg-white hover:bg-slate-50 text-[#0B1F4B] text-[15px] font-semibold transition-colors"
              >
                <span>Xem hồ sơ công khai</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="h-px bg-[#E6EDF3]" />

          {/* 3 Thẻ Stats Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/my-items"
              className="flex items-center gap-3.5 p-4 bg-[#F7FAFC] hover:bg-slate-100/70 border border-[#DCE6EE] rounded-2xl transition-colors text-inherit group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#E3F1F9] text-[#0088C2] flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m7.5 4.27 9 5.15" />
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[26px] leading-tight font-bold text-[#0B1F4B]">{stats.listingsCount}</span>
                <span className="text-sm text-[#475569]">Đồ của tôi</span>
              </div>
              <svg className="ml-auto text-[#475569] group-hover:translate-x-0.5 transition-transform" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>

            <Link
              href="/orders"
              className="flex items-center gap-3.5 p-4 bg-[#F7FAFC] hover:bg-slate-100/70 border border-[#DCE6EE] rounded-2xl transition-colors text-inherit group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#E3F1F9] text-[#0088C2] flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[26px] leading-tight font-bold text-[#0B1F4B]">{stats.completedOrdersCount}</span>
                <span className="text-sm text-[#475569]">Giao dịch hoàn tất</span>
              </div>
              <svg className="ml-auto text-[#475569] group-hover:translate-x-0.5 transition-transform" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>

            <Link
              href="/verify-student"
              className={`flex items-center gap-3.5 p-4 border rounded-2xl transition-colors text-inherit group ${
                profile.isStudentVerified
                  ? "bg-[#F2FAF6] border-[#CBE8D8] hover:bg-[#E6F6EE]"
                  : "bg-[#F7FAFC] border-[#DCE6EE] hover:bg-slate-100/70"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  profile.isStudentVerified
                    ? "bg-[#E6F6EE] text-[#0B6B3A]"
                    : "bg-[#E3F1F9] text-[#0088C2]"
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className={`text-[20px] leading-snug font-bold ${
                    profile.isStudentVerified ? "text-[#0B6B3A]" : "text-[#0B1F4B]"
                  }`}
                >
                  {profile.isStudentVerified ? "Đã duyệt" : "Chưa duyệt"}
                </span>
                <span className="text-sm text-[#475569]">Xác minh sinh viên</span>
              </div>
              <svg className="ml-auto text-[#475569] group-hover:translate-x-0.5 transition-transform" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Tabs Container */}
      <div className="bg-white rounded-3xl border border-[#D6E8EE] shadow-xs overflow-hidden">
        <div className="w-full flex border-b border-[#D6E8EE] bg-[#F4F9FB]">
          <button
            type="button"
            onClick={() => handleTabChange("info")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors cursor-pointer min-w-0 ${
              activeTab === "info"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            <span className="shrink-0">👤</span>
            <span className="truncate">Thông tin</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("reviews")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors cursor-pointer min-w-0 ${
              activeTab === "reviews"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            <span className="shrink-0">⭐</span>
            <span className="truncate">Đánh giá ({reviews.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("privacy")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors cursor-pointer min-w-0 ${
              activeTab === "privacy"
                ? "bg-white text-[#001B48] border-[#018ABE]"
                : "text-slate-600 border-transparent hover:text-[#02457A]"
            }`}
          >
            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="truncate">Bảo mật &amp; tài khoản</span>
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {feedback && (
            <div
              role="alert"
              className={`mb-5 p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-start gap-2.5 ${feedback.type === "success"
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
            <form onSubmit={handleSaveProfile} className="space-y-5 w-full">
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs text-[#02457A] leading-relaxed space-y-1">
                  <div className="font-bold text-[#001B48]">Thông tin hiển thị công khai</div>
                  <p>
                    Những thông tin như tên hiển thị, trường/KTX, huy hiệu xác minh, điểm uy tín và tin đăng có thể được người khác xem.
                  </p>
                  <p className="text-slate-500">
                    Email và các thông tin cá nhân khác luôn được giữ riêng tư.
                  </p>
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
                      Trường đại học
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
                      Khu vực giao dịch
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
                    Ảnh đại diện
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
                      <span>Tải ảnh lên</span>
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
                    {saving ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
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
                    {reviews.length === 0
                      ? "Chưa có đánh giá"
                      : `Điểm uy tín: ${profile.reputationScore.toFixed(1)}/5.0 ⭐`}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Đánh giá chỉ hiển thị công khai khi cả hai bên đã gửi đánh giá hoặc sau 48 giờ kể từ khi hoàn tất giao dịch.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#018ABE] bg-white px-3 py-1.5 rounded-xl border border-[#D6E8EE] shrink-0">
                  {reviews.length} đánh giá
                </span>
              </div>

              {reviews.length === 0 ? (
                <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
                  <div className="text-3xl">⭐</div>
                  <p className="text-sm font-bold text-[#001B48]">Chưa có đánh giá nào</p>
                  <p className="text-xs text-slate-500">
                    Hoàn tất giao dịch và nhận đánh giá từ người mua hoặc người bán để xây dựng uy tín trên UniCycle.
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

          {/* TAB 3: Bảo mật & tài khoản */}
          {activeTab === "privacy" && (
            <div className="space-y-6 w-full">
              <div className="p-5 rounded-2xl bg-[#F4F9FB] border border-[#D6E8EE] space-y-3">
                <h2 className="text-sm sm:text-base font-extrabold text-[#001B48] flex items-center gap-2">
                  <span>🔐</span>
                  <span>Bảo vệ dữ liệu cá nhân</span>
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Khi bạn xóa tài khoản, UniCycle sẽ xử lý thông tin cá nhân theo chính sách bảo mật. Một số dữ liệu giao dịch cần được lưu lại để đảm bảo tính minh bạch và lịch sử giao dịch.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-5">
                  <li>
                    <strong>Gỡ liên kết tài khoản:</strong> Hệ thống hủy liên kết định danh cá nhân trên hồ sơ đồ vật nhưng bảo toàn lịch sử giao dịch ẩn danh.
                  </li>
                  <li>
                    <strong>Ngừng hoạt động tin đăng:</strong> Các món đồ và tin đăng của bạn sẽ ngừng hoạt động, không còn hiển thị công khai trên sàn.
                  </li>
                  <li>
                    <strong>Xóa thông tin cá nhân:</strong> Tên hiển thị, email, số điện thoại và các dữ liệu nhận diện cá nhân sẽ được xử lý và ẩn danh vĩnh viễn.
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/60 space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-rose-900">
                    Xóa tài khoản vĩnh viễn
                  </h3>
                  <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                    Sau khi xác nhận, bạn sẽ bị đăng xuất và không thể khôi phục tài khoản này.
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-xs text-rose-800/90 mt-1">
                    <li>Thông tin cá nhân sẽ được xử lý theo chính sách xóa dữ liệu.</li>
                    <li>Các tin đăng của bạn sẽ ngừng hoạt động.</li>
                    <li>Lịch sử giao dịch cần được bảo toàn theo quy định của hệ thống.</li>
                  </ul>
                </div>

                {stats.blockingOrdersCount > 0 && (
                  <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-xs text-amber-950 font-semibold flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                      Bạn đang có {stats.blockingOrdersCount} đơn hẹn ở trạng thái giữ chỗ, chờ xác nhận hoặc khiếu nại. Vui lòng xử lý xong tại trang{" "}
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
                    Xóa tài khoản
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
                        {deleting ? "Đang xử lý..." : "Xác nhận xóa tài khoản"}
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
