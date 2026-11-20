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
  itemsCount?: number;
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
    itemsCount: 0,
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

  const hasChanges =
    Boolean(profile) &&
    (displayName.trim() !== (profile?.displayName || "") ||
      schoolId !== (profile?.schoolId || "") ||
      dorm.trim() !== (profile?.dorm || "") ||
      avatarUrl.trim() !== (profile?.avatarUrl || ""));

  const handleReset = () => {
    if (!profile) return;
    setDisplayName(profile.displayName || "");
    setSchoolId(profile.schoolId || "");
    setDorm(profile.dorm || "");
    setAvatarUrl(profile.avatarUrl || "");
    setFeedback(null);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
  };

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
        <div className="h-24 bg-gradient-to-r from-[#0B1F4B] via-[#0A4A82] to-[#0088C2]" />

        <div className="p-6 pt-0 flex flex-col gap-6">
          <div className="flex flex-wrap items-start gap-3 sm:gap-6">
            {/* Avatar 112px đè lên banner (-52px) */}
            <div className="relative -mt-[52px] w-28 h-28 shrink-0">
              <div className="w-28 h-28 box-border border-4 border-white rounded-[28px] overflow-hidden bg-gradient-to-br from-[#0B1F4B] to-[#0088C2] text-white flex items-center justify-center text-[38px] font-bold tracking-wide shadow-sm">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName || profile.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {(displayName || profile.displayName)
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
                className="absolute -right-2.5 -bottom-2.5 w-11 h-11 rounded-full border border-[#DCE6EE] bg-white text-[#0B1F4B] hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-xs transition-colors focus-within:ring-2 focus-within:ring-[#018ABE] focus-within:ring-offset-2"
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
                <span>{profile.email}</span>
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
                <span className="text-[26px] leading-tight font-bold text-[#0B1F4B]">
                  {stats.itemsCount ?? stats.listingsCount}
                </span>
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

      {/* 2. Tabs Bar (Chuẩn thiết kế ui-profile) */}
      <div
        role="tablist"
        aria-label="Các phần của hồ sơ"
        className="flex gap-1 border-b border-[#DCE6EE] overflow-x-auto no-scrollbar"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "info"}
          onClick={() => handleTabChange("info")}
          className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 min-h-[48px] px-4.5 bg-transparent border-b-[3px] -mb-px text-[15px] cursor-pointer transition-colors ${
            activeTab === "info"
              ? "border-[#0088C2] text-[#0B1F4B] font-bold"
              : "border-transparent text-[#475569] font-semibold hover:text-[#0B1F4B]"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Thông tin</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "reviews"}
          onClick={() => handleTabChange("reviews")}
          className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 min-h-[48px] px-4.5 bg-transparent border-b-[3px] -mb-px text-[15px] cursor-pointer transition-colors ${
            activeTab === "reviews"
              ? "border-[#0088C2] text-[#0B1F4B] font-bold"
              : "border-transparent text-[#475569] font-semibold hover:text-[#0B1F4B]"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Đánh giá</span>
          <span className="min-w-[22px] px-1.5 py-0.5 rounded-full bg-[#E8EEF3] text-[#334155] text-xs font-bold text-center">
            {reviews.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "privacy"}
          onClick={() => handleTabChange("privacy")}
          className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 min-h-[48px] px-4.5 bg-transparent border-b-[3px] -mb-px text-[15px] cursor-pointer transition-colors ${
            activeTab === "privacy"
              ? "border-[#0088C2] text-[#0B1F4B] font-bold"
              : "border-transparent text-[#475569] font-semibold hover:text-[#0B1F4B]"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          </svg>
          <span>Bảo mật &amp; tài khoản</span>
        </button>
      </div>

      {/* Thông báo kết quả lưu */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-start gap-2.5 ${
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

      {/* 3. NỘI DUNG TAB: THÔNG TIN (Bố cục 2 cột: Form + Live Public Preview) */}
      {activeTab === "info" && (
        <div role="tabpanel" className="flex flex-col lg:flex-row items-start gap-6">
          {/* Cột trái: Form thông tin */}
          <section className="flex-1 w-full min-w-0 bg-white border border-[#DCE6EE] rounded-[20px] p-6 sm:p-7 shadow-xs">
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-7 w-full">
              {/* Nhóm 1: Hiển thị công khai */}
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="m-0 text-lg leading-snug font-bold text-[#0B1F4B]">Hiển thị công khai</h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E3F1F9] text-[#0B1F4B] text-xs font-semibold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span>Mọi người đều thấy</span>
                  </span>
                </div>

                {/* Ảnh đại diện */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[#0B1F4B]">Ảnh đại diện</span>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="w-[72px] h-[72px] rounded-[20px] bg-gradient-to-br from-[#0B1F4B] to-[#0088C2] text-white flex items-center justify-center text-[26px] font-bold shrink-0 overflow-hidden shadow-xs">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>
                          {(displayName || profile.displayName)
                            .split(" ")
                            .map((w) => w[0])
                            .slice(-2)
                            .join("")
                            .toUpperCase() || "UN"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-[#C9D7E3] bg-white hover:bg-slate-50 text-[#0B1F4B] text-sm font-semibold cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#018ABE] focus-within:ring-offset-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <path d="m17 8-5-5-5 5" />
                            <path d="M12 3v12" />
                          </svg>
                          <span>Tải ảnh lên</span>
                          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
                        </label>
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="min-h-[44px] px-3 rounded-xl border-none bg-transparent hover:bg-rose-50 text-[#B42318] text-sm font-semibold cursor-pointer transition-colors"
                          >
                            Xóa ảnh
                          </button>
                        )}
                      </div>
                      <span className="text-[13px] leading-relaxed text-[#475569]">
                        Ảnh vuông sẽ hiển thị đẹp nhất trên hồ sơ và tin đăng.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tên hiển thị */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="f-name" className="text-sm font-semibold text-[#0B1F4B]">
                    Tên hiển thị <span className="text-[#B42318]" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="f-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="box-border w-full min-h-[48px] px-3.5 border border-[#C9D7E3] rounded-xl bg-white text-[#0B1F4B] text-[15px] focus:outline-none focus:border-[#0088C2]"
                  />
                  <span className="text-[13px] leading-relaxed text-[#475569]">
                    Tên này hiển thị trên hồ sơ và các tin đăng của bạn.
                  </span>
                </div>

                {/* Trường đại học */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="f-school" className="text-sm font-semibold text-[#0B1F4B]">
                    Trường đại học
                  </label>
                  {profile.isStudentVerified ? (
                    <>
                      <input
                        id="f-school"
                        type="text"
                        readOnly
                        value={profile.school?.name || "Trường ĐH Bách Khoa - ĐHQG TP.HCM"}
                        className="box-border w-full min-h-[48px] px-3.5 border border-[#DCE6EE] rounded-xl bg-[#F1F5F9] text-[#334155] text-[15px] focus:outline-none cursor-default"
                      />
                      <div className="flex flex-wrap items-center gap-1 sm:gap-3 text-[13px] leading-relaxed text-[#475569]">
                        <span className="inline-flex items-center gap-1 text-[#0B6B3A] font-semibold">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                          <span>Đã xác minh</span>
                        </span>
                        <span>
                          Muốn đổi trường?{" "}
                          <Link href="/verify-student" className="text-[#0088C2] font-semibold underline hover:text-[#02457A]">
                            Xác minh lại
                          </Link>{" "}
                          (huy hiệu hiện tại sẽ bị thu hồi).
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <select
                        id="f-school"
                        value={schoolId}
                        onChange={(e) => setSchoolId(e.target.value)}
                        className="box-border w-full min-h-[48px] px-3 border border-[#C9D7E3] rounded-xl bg-white text-[#0B1F4B] text-[15px] focus:outline-none focus:border-[#0088C2] cursor-pointer"
                      >
                        <option value="">-- Chọn trường / KTX --</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap items-center gap-2 text-[13px] leading-relaxed text-[#475569]">
                        <Link href="/verify-student" className="text-[#0088C2] font-semibold underline hover:text-[#02457A]">
                          🎓 Xác minh thẻ sinh viên để nhận huy hiệu
                        </Link>
                      </div>
                    </>
                  )}
                </div>

                {/* Khu vực giao dịch */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="f-area" className="text-sm font-semibold text-[#0B1F4B]">
                    Khu vực / KTX giao dịch
                  </label>
                  <input
                    id="f-area"
                    type="text"
                    value={dorm}
                    onChange={(e) => setDorm(e.target.value)}
                    placeholder="VD: KTX Khu B ĐHQG, Thủ Đức..."
                    className="box-border w-full min-h-[48px] px-3.5 border border-[#C9D7E3] rounded-xl bg-white text-[#0B1F4B] text-[15px] focus:outline-none focus:border-[#0088C2]"
                  />
                  <span className="text-[13px] leading-relaxed text-[#475569]">
                    Hiển thị trên hồ sơ công khai và tin đăng để người mua biết bạn ở gần khu vực nào (không nên ghi số phòng cụ thể).
                  </span>
                </div>
              </div>

              {/* Đường kẻ phân cách */}
              <div className="h-px bg-[#E6EDF3]" />

              {/* Nhóm 2: Thông tin riêng tư */}
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="m-0 text-lg leading-snug font-bold text-[#0B1F4B]">Thông tin riêng tư</h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF2F6] text-[#334155] text-xs font-semibold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Chỉ mình bạn thấy</span>
                  </span>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="f-email" className="text-sm font-semibold text-[#0B1F4B]">
                    Email
                  </label>
                  <input
                    id="f-email"
                    type="email"
                    readOnly
                    value={profile.email}
                    className="box-border w-full min-h-[48px] px-3.5 border border-[#DCE6EE] rounded-xl bg-[#F1F5F9] text-[#334155] text-[15px] focus:outline-none cursor-default"
                  />
                  <span className="text-[13px] leading-relaxed text-[#475569]">
                    Email đăng nhập, không hiển thị trên hồ sơ công khai.
                  </span>
                </div>
              </div>

              {/* Thanh lưu dính đáy (Sticky Action Bar) */}
              <div className="sticky bottom-0 -mx-6 -mb-6 sm:-mx-7 sm:-mb-7 p-4 sm:px-6 bg-white border-t border-[#E6EDF3] rounded-b-[20px] flex flex-wrap items-center justify-between gap-3 shadow-md z-10">
                <span className="text-sm text-[#475569]">
                  {hasChanges ? (
                    <span className="font-semibold text-[#0088C2]">● Bạn có thay đổi chưa lưu</span>
                  ) : (
                    "Chưa có thay đổi nào để lưu"
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!hasChanges || saving}
                    onClick={handleReset}
                    className="min-h-[44px] px-5 rounded-xl border border-[#DCE6EE] bg-white text-[#475569] hover:bg-slate-50 text-[15px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!hasChanges || saving}
                    className="min-h-[44px] px-6 rounded-xl border border-transparent bg-[#0088C2] hover:bg-[#02457A] text-white text-[15px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      "Lưu thay đổi"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Cột phải: Live Public Preview */}
          <aside className="w-full lg:w-[320px] xl:w-[360px] shrink-0 lg:sticky lg:top-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0B1F4B]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>Người khác sẽ thấy bạn như thế này</span>
            </div>

            <div className="bg-white border border-[#DCE6EE] rounded-[20px] overflow-hidden shadow-xs">
              <div className="h-14 bg-gradient-to-r from-[#0B1F4B] via-[#0A4A82] to-[#0088C2]" />
              <div className="p-5 pt-0 flex flex-col gap-3">
                <div className="-mt-8 w-16 h-16 box-border border-[3px] border-white rounded-[18px] bg-gradient-to-br from-[#0B1F4B] to-[#0088C2] text-white flex items-center justify-center text-[22px] font-bold overflow-hidden shadow-xs">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>
                      {(displayName || profile.displayName)
                        .split(" ")
                        .map((w) => w[0])
                        .slice(-2)
                        .join("")
                        .toUpperCase() || "UN"}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-lg leading-tight font-bold text-[#0B1F4B]">
                    {displayName || profile.displayName}
                  </span>
                  {profile.isStudentVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F6EE] border border-[#B7E4CB] text-[#0B6B3A] text-xs font-semibold">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                      <span>Đã xác minh</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 text-sm text-[#475569]">
                  <span className="flex items-center gap-2 truncate">
                    <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 10 12 5 2 10l10 5 10-5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                    <span className="truncate">
                      {schools.find((s) => s.id === schoolId)?.name || profile.school?.name || "Chưa chọn trường"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 truncate">
                    <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="truncate">
                      {dorm.trim() ||
                        schools.find((s) => s.id === schoolId)?.shortName ||
                        profile.school?.shortName ||
                        "Chưa cập nhật khu vực"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>{reviews.length === 0 ? "Chưa có đánh giá" : `${profile.reputationScore.toFixed(1)} uy tín`}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-[14px] bg-[#EEF2F6] text-[#334155] text-[13px] leading-relaxed">
              <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Email đăng nhập, thẻ sinh viên và số điện thoại Zalo sẽ không xuất hiện trên hồ sơ công khai.</span>
            </div>
          </aside>
        </div>
      )}

      {/* 4. NỘI DUNG TAB: ĐÁNH GIÁ */}
      {activeTab === "reviews" && (
        <section className="bg-white border border-[#DCE6EE] rounded-[20px] p-6 sm:p-8 shadow-xs">
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
        </section>
      )}

      {/* 5. NỘI DUNG TAB: BẢO MẬT & TÀI KHOẢN */}
      {activeTab === "privacy" && (
        <div role="tabpanel" className="flex flex-col gap-5 w-full">
          {/* Card chính: Bảo vệ dữ liệu cá nhân */}
          <section className="bg-white border border-[#DCE6EE] rounded-[20px] p-6 sm:p-7 flex flex-col gap-6 shadow-xs">
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#E3F1F9] text-[#0088C2] flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <h2 className="text-xl leading-snug font-bold text-[#0B1F4B]">Bảo vệ dữ liệu cá nhân</h2>
                <p className="max-w-[720px] text-[15px] leading-relaxed text-[#334155]">
                  Khi bạn xóa tài khoản, UniCycle sẽ xử lý thông tin cá nhân theo chính sách bảo mật. Một số dữ liệu giao dịch cần được lưu lại để đảm bảo tính minh bạch và lịch sử giao dịch.
                </p>
              </div>
            </div>

            {/* Quy trình: Khi xóa tài khoản, điều gì sẽ xảy ra */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold tracking-wider uppercase text-[#475569]">
                Khi xóa tài khoản, điều gì sẽ xảy ra
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Bước 1 */}
                <div className="p-4.5 bg-[#F7FAFC] border border-[#DCE6EE] rounded-2xl flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#DCE6EE] text-[#0B1F4B] flex items-center justify-center shrink-0 shadow-2xs">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="m5.17 11.75-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        <line x1="8" x2="8" y1="2" y2="5" />
                        <line x1="2" x2="5" y1="8" y2="8" />
                        <line x1="16" x2="16" y1="19" y2="22" />
                        <line x1="19" x2="22" y1="16" y2="16" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-[#0088C2]">Bước 1</span>
                  </div>
                  <h3 className="text-base font-bold text-[#0B1F4B] leading-snug">Gỡ liên kết tài khoản</h3>
                  <p className="text-sm leading-relaxed text-[#475569]">
                    Hệ thống hủy liên kết định danh cá nhân trên hồ sơ đồ vật nhưng bảo toàn lịch sử giao dịch ẩn danh.
                  </p>
                </div>

                {/* Bước 2 */}
                <div className="p-4.5 bg-[#F7FAFC] border border-[#DCE6EE] rounded-2xl flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#DCE6EE] text-[#0B1F4B] flex items-center justify-center shrink-0 shadow-2xs">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                        <line x1="2" x2="22" y1="2" y2="22"></line>
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-[#0088C2]">Bước 2</span>
                  </div>
                  <h3 className="text-base font-bold text-[#0B1F4B] leading-snug">Ngừng hoạt động tin đăng</h3>
                  <p className="text-sm leading-relaxed text-[#475569]">
                    Các món đồ và tin đăng của bạn sẽ ngừng hoạt động, không còn hiển thị công khai trên sàn.
                  </p>
                </div>

                {/* Bước 3 */}
                <div className="p-4.5 bg-[#F7FAFC] border border-[#DCE6EE] rounded-2xl flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#DCE6EE] text-[#0B1F4B] flex items-center justify-center shrink-0 shadow-2xs">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="17" x2="22" y1="8" y2="13" />
                        <line x1="22" x2="17" y1="8" y2="13" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-[#0088C2]">Bước 3</span>
                  </div>
                  <h3 className="text-base font-bold text-[#0B1F4B] leading-snug">Xóa thông tin cá nhân</h3>
                  <p className="text-sm leading-relaxed text-[#475569]">
                    Tên hiển thị, email, số điện thoại và các dữ liệu nhận diện cá nhân sẽ được xử lý và ẩn danh vĩnh viễn.
                  </p>
                </div>
              </div>
            </div>

            {/* Tóm tắt dữ liệu của bạn */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold tracking-wider uppercase text-[#475569]">
                Tóm tắt dữ liệu của bạn
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Giữ lại */}
                <div className="p-4.5 bg-[#F2FAF6] border border-[#CBE8D8] rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[#0B6B3A] text-[15px] font-bold">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Được giữ lại (ẩn danh)</span>
                  </div>
                  <ul className="list-disc pl-5 text-sm leading-relaxed text-[#334155] space-y-1">
                    <li>Lịch sử giao dịch, để đảm bảo tính minh bạch cho các giao dịch đã diễn ra</li>
                  </ul>
                </div>

                {/* Xóa vĩnh viễn */}
                <div className="p-4.5 bg-[#FDF5F4] border border-[#F3D0CC] rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[#B42318] text-[15px] font-bold">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m15 9-6 6" />
                      <path d="m9 9 6 6" />
                    </svg>
                    <span>Được xóa vĩnh viễn</span>
                  </div>
                  <ul className="list-disc pl-5 text-sm leading-relaxed text-[#334155] space-y-1">
                    <li>Tên hiển thị</li>
                    <li>Email và số điện thoại</li>
                    <li>Các dữ liệu nhận diện cá nhân khác</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Vùng Nguy Hiểm: Xóa tài khoản */}
          <section className="bg-white border border-[#F3C5C0] rounded-[20px] p-5 sm:p-6 flex flex-col gap-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[280px] sm:min-w-[320px] flex flex-col gap-1">
                <h2 className="text-[17px] leading-snug font-bold text-[#B42318]">
                  Xóa tài khoản
                </h2>
                <p className="text-sm leading-relaxed text-[#475569]">
                  Hành động này không thể hoàn tác. Bạn sẽ cần xác nhận trước khi tài khoản bị xóa.
                </p>
              </div>

              {!deleteDialogOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteDialogOpen(true);
                    setDeleteError(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl border border-[#B42318] bg-white hover:bg-rose-50 text-[#B42318] text-[15px] font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Xóa tài khoản</span>
                </button>
              )}
            </div>

            {stats.blockingOrdersCount > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-950 font-medium flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  Bạn đang có <strong>{stats.blockingOrdersCount} đơn hẹn</strong> ở trạng thái giữ chỗ, chờ xác nhận hoặc khiếu nại. Vui lòng xử lý xong tại trang{" "}
                  <Link href="/orders" className="underline font-bold text-[#0B1F4B] hover:text-[#0088C2]">
                    Quản lý đơn hẹn
                  </Link>{" "}
                  trước khi xóa tài khoản.
                </span>
              </div>
            )}

            {deleteDialogOpen && (
              <form onSubmit={handleDeleteAccount} className="pt-4 border-t border-[#F3D0CC] flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="confirm-delete-input" className="text-sm font-semibold text-[#B42318]">
                    Nhập chính xác <code className="font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[#B42318] font-bold">XOA TAI KHOAN</code> để xác nhận:
                  </label>
                  <input
                    id="confirm-delete-input"
                    type="text"
                    required
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="XOA TAI KHOAN"
                    className="w-full h-11 px-4 rounded-xl border border-rose-300 bg-white focus:border-[#B42318] focus:ring-2 focus:ring-rose-200 focus:outline-none text-sm font-mono text-rose-950 transition-all placeholder:text-rose-300"
                  />
                </div>

                {deleteError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm font-semibold text-[#B42318] flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={deleting || confirmText.trim().toUpperCase() !== "XOA TAI KHOAN" || stats.blockingOrdersCount > 0}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-[#B42318] hover:bg-rose-800 text-white text-[15px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang xóa tài khoản...</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Xác nhận xóa tài khoản</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setConfirmText("");
                      setDeleteError(null);
                    }}
                    className="min-h-[44px] px-5 rounded-xl bg-white border border-[#DCE6EE] text-[#475569] hover:bg-slate-50 text-[15px] font-semibold transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
