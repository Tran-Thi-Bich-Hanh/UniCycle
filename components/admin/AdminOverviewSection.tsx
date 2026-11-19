"use client";

import React from "react";
import Link from "next/link";
import type {
  AdminDashboardPayload,
  AdminOverviewStats,
  AdminRecentActivity,
  AdminSection,
} from "@/lib/admin/types";

export interface AdminOverviewSectionProps {
  stats: AdminOverviewStats;
  distribution: AdminDashboardPayload["distribution"];
  recentActivities: AdminRecentActivity[];
  serverNow: string;
  onNavigate: (section: AdminSection) => void;
}

const STATUS_LABEL_MAP: Record<string, { label: string; className: string }> = {
  AVAILABLE: {
    label: "Đang mở bán",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  RESERVED: {
    label: "Đang giữ chỗ",
    className: "bg-amber-50 text-amber-800 border-amber-200/80",
  },
  SOLD: {
    label: "Đã bán",
    className: "bg-slate-100 text-slate-700 border-slate-200/80",
  },
  HIDDEN: {
    label: "Tạm ẩn",
    className: "bg-slate-100 text-slate-600 border-slate-200/80",
  },
  EXPIRED: {
    label: "Hết hạn",
    className: "bg-slate-100 text-slate-600 border-slate-200/80",
  },
  REMOVED: {
    label: "Đã gỡ",
    className: "bg-rose-50 text-rose-700 border-rose-200/80",
  },
  DRAFT: {
    label: "Bản nháp",
    className: "bg-slate-100 text-slate-600 border-slate-200/80",
  },
  PENDING: {
    label: "Chờ xác nhận",
    className: "bg-sky-50 text-sky-800 border-sky-200/80",
  },
  ACCEPTED: {
    label: "Đã chốt lịch hẹn",
    className: "bg-sky-50 text-sky-800 border-sky-200/80",
  },
  WAITING_CONFIRMATION: {
    label: "Chờ xác nhận nhận đồ",
    className: "bg-amber-50 text-amber-800 border-amber-200/80",
  },
  COMPLETED: {
    label: "Hoàn tất",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-slate-100 text-slate-600 border-slate-200/80",
  },
  REJECTED: {
    label: "Đã từ chối",
    className: "bg-slate-100 text-slate-600 border-slate-200/80",
  },
  DISPUTED: {
    label: "Đang tranh chấp",
    className: "bg-rose-50 text-rose-700 border-rose-200/80",
  },
};

function formatRelativeTime(isoTime: string, serverNowIso: string): string {
  const targetMs = new Date(isoTime).getTime();
  const baseMs = new Date(serverNowIso).getTime();
  if (Number.isNaN(targetMs)) return "";

  const nowMs = Number.isNaN(baseMs) ? targetMs : baseMs;
  const diffSec = Math.max(0, Math.floor((nowMs - targetMs) / 1000));

  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `${diffDays} ngày trước`;

  return new Date(targetMs).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getActivityHref(activity: AdminRecentActivity): string | null {
  if (activity.type === "listing") {
    return `/products/${activity.id.replace(/^listing-/, "")}`;
  }
  if (activity.type === "order") {
    return `/orders/${activity.id.replace(/^order-/, "")}`;
  }
  return null;
}

export function AdminOverviewSection({
  stats,
  distribution,
  recentActivities,
  serverNow,
  onNavigate,
}: AdminOverviewSectionProps) {
  const attentionItems: Array<{
    id: string;
    label: string;
    count: number;
    tone: "rose" | "amber" | "sky";
    target: AdminSection;
  }> = [];

  if (stats.disputedOrdersCount > 0) {
    attentionItems.push({
      id: "disputes",
      label: "Đơn hàng tranh chấp",
      count: stats.disputedOrdersCount,
      tone: "rose",
      target: "moderation",
    });
  }
  if (stats.pendingReportsCount > 0) {
    attentionItems.push({
      id: "reports",
      label: "Báo cáo vi phạm mới",
      count: stats.pendingReportsCount,
      tone: "amber",
      target: "moderation",
    });
  }
  if (stats.pendingStudentCardsCount > 0) {
    attentionItems.push({
      id: "student-cards",
      label: "Thẻ sinh viên chờ duyệt",
      count: stats.pendingStudentCardsCount,
      tone: "sky",
      target: "users",
    });
  }
  if (stats.flaggedPassportsCount > 0) {
    attentionItems.push({
      id: "flagged-items",
      label: "Hành trình đang cảnh báo",
      count: stats.flaggedPassportsCount,
      tone: "rose",
      target: "listings",
    });
  }

  const passportRatio =
    stats.activeListings > 0
      ? Math.round((stats.passportListingsCount / stats.activeListings) * 100)
      : 0;

  const categoriesTotal = distribution.byCategory.reduce((sum, item) => sum + item.count, 0);
  const maxCategoryCount = Math.max(1, ...distribution.byCategory.map((item) => item.count));

  const nonZeroSchools = distribution.bySchool.filter((item) => item.count > 0);
  const visibleSchools = (
    nonZeroSchools.length > 0 ? nonZeroSchools : distribution.bySchool
  ).slice(0, 6);
  const schoolsTotal = visibleSchools.reduce((sum, item) => sum + item.count, 0);
  const maxSchoolCount = Math.max(1, ...visibleSchools.map((item) => item.count));

  const toneStyleMap = {
    rose: {
      dot: "bg-rose-500",
      count: "text-rose-700",
      border: "border-rose-200/80 hover:border-rose-300",
    },
    amber: {
      dot: "bg-amber-500",
      count: "text-amber-700",
      border: "border-amber-200/80 hover:border-amber-300",
    },
    sky: {
      dot: "bg-[#018ABE]",
      count: "text-[#02457A]",
      border: "border-sky-200/80 hover:border-[#018ABE]",
    },
  };

  return (
    <div className="space-y-6">
      {/* Band 1: Trạng thái vận hành & Việc cần xử lý */}
      {attentionItems.length === 0 ? (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-emerald-900">
            Hệ thống đang vận hành ổn định, chưa có khiếu nại hay hồ sơ tồn đọng.
          </p>
        </div>
      ) : (
        <section
          aria-label="Việc cần xử lý"
          className="rounded-2xl border border-amber-200/80 bg-amber-50/35 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[#001B48]">Việc cần xử lý</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {attentionItems.map((item) => {
              const tone = toneStyleMap[item.tone];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.target)}
                  className={`bg-white rounded-xl border ${tone.border} px-3.5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className={`text-lg font-bold leading-tight tabular-nums ${tone.count}`}>
                        {item.count}
                      </div>
                      <div className="text-xs font-medium text-slate-600 truncate">
                        {item.label}
                      </div>
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-slate-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Band 2: 4 Chỉ số vận hành chính */}
      <section aria-label="Chỉ số vận hành chính" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate("users")}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 text-left shadow-[0_1px_2px_rgba(0,27,72,0.04)] hover:border-[#97CADB] transition-colors cursor-pointer space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Thành viên</span>
            <span className="w-9 h-9 rounded-xl bg-slate-50 text-[#02457A] flex items-center justify-center shrink-0">
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-[28px] font-bold text-[#001B48] leading-none tabular-nums">
              {stats.totalUsers.toLocaleString("vi-VN")}
            </div>
            <p className="text-xs text-slate-500 mt-2 truncate tabular-nums">
              {stats.verifiedUsersCount} sinh viên đã xác minh
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("listings")}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 text-left shadow-[0_1px_2px_rgba(0,27,72,0.04)] hover:border-[#97CADB] transition-colors cursor-pointer space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Tin đang mở bán</span>
            <span className="w-9 h-9 rounded-xl bg-slate-50 text-[#02457A] flex items-center justify-center shrink-0">
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-[28px] font-bold text-[#001B48] leading-none tabular-nums">
              {stats.activeListings.toLocaleString("vi-VN")}
            </div>
            <p className="text-xs text-slate-500 mt-2 truncate tabular-nums">
              {stats.activeListings > 0
                ? `${passportRatio}% có hành trình xác thực`
                : "Chưa có tin đang mở bán"}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("moderation")}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 text-left shadow-[0_1px_2px_rgba(0,27,72,0.04)] hover:border-[#97CADB] transition-colors cursor-pointer space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Giao dịch hoàn tất</span>
            <span className="w-9 h-9 rounded-xl bg-slate-50 text-[#02457A] flex items-center justify-center shrink-0">
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                />
              </svg>
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-[28px] font-bold text-[#001B48] leading-none tabular-nums">
              {stats.completedOrdersCount.toLocaleString("vi-VN")}
            </div>
            <p className="text-xs text-slate-500 mt-2 truncate tabular-nums">
              {stats.activeOrdersCount} đơn đang hẹn gặp
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("listings")}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 text-left shadow-[0_1px_2px_rgba(0,27,72,0.04)] hover:border-[#97CADB] transition-colors cursor-pointer space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Đồ tái sử dụng</span>
            <span className="w-9 h-9 rounded-xl bg-slate-50 text-[#02457A] flex items-center justify-center shrink-0">
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"
                />
              </svg>
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-[28px] font-bold text-[#001B48] leading-none tabular-nums">
              {stats.multiOwnerItemsCount.toLocaleString("vi-VN")}
            </div>
            <p className="text-xs text-slate-500 mt-2 truncate">
              Món đồ từ 2 đời chủ trở lên
            </p>
          </div>
        </button>
      </section>

      {/* Band 3: Phân bố tin mở bán */}
      <section aria-label="Phân bố tin mở bán" className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card A: Theo danh mục */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,27,72,0.04)] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#001B48]">Phân bố theo danh mục</h2>
            <span className="text-xs text-slate-500 tabular-nums">{categoriesTotal} tin mở bán</span>
          </div>

          {categoriesTotal === 0 || distribution.byCategory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Chưa có tin đăng nào đang mở bán để hiển thị thống kê theo danh mục.
            </div>
          ) : (
            <div className="space-y-3">
              {distribution.byCategory.map((item) => {
                const widthPercent =
                  item.count > 0 ? Math.max(6, Math.round((item.count / maxCategoryCount) * 100)) : 0;
                const share = item.percentage ?? Math.round((item.count / Math.max(1, categoriesTotal)) * 100);

                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-700 truncate">{item.label}</span>
                      <span className="text-slate-500 tabular-nums shrink-0">
                        <strong className="font-semibold text-[#001B48]">{item.count}</strong> ({share}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#018ABE] transition-all duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card B: Theo trường & KTX */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,27,72,0.04)] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#001B48]">Phân bố theo trường &amp; KTX</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              Top {visibleSchools.length} khu vực
            </span>
          </div>

          {schoolsTotal === 0 || visibleSchools.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Chưa có dữ liệu tin mở bán theo cơ sở trường và ký túc xá.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSchools.map((item) => {
                const widthPercent =
                  item.count > 0 ? Math.max(6, Math.round((item.count / maxSchoolCount) * 100)) : 0;
                const share = item.percentage ?? Math.round((item.count / Math.max(1, stats.activeListings)) * 100);

                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-700 truncate">{item.label}</span>
                      <span className="text-slate-500 tabular-nums shrink-0">
                        <strong className="font-semibold text-[#001B48]">{item.count}</strong> ({share}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#02457A] transition-all duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Band 4: Hoạt động gần đây */}
      <section
        aria-label="Hoạt động gần đây"
        className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,27,72,0.04)] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#001B48]">Hoạt động gần đây</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tin đăng và lịch hẹn mới nhất trên sàn
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400 tabular-nums">
            {recentActivities.length} mục mới nhất
          </span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-slate-500">
            Chưa ghi nhận hoạt động mới trên hệ thống.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivities.map((activity) => {
              const statusInfo = STATUS_LABEL_MAP[activity.status] ?? {
                label: "Đang cập nhật",
                className: "bg-slate-100 text-slate-700 border-slate-200/80",
              };
              const href = getActivityHref(activity);
              const relativeTime = formatRelativeTime(activity.time, serverNow);

              return (
                <div
                  key={activity.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                        activity.type === "listing"
                          ? "bg-[#EEF7FB] text-[#018ABE]"
                          : "bg-slate-100 text-[#02457A]"
                      }`}
                    >
                      {activity.type === "listing" ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                          />
                        </svg>
                      )}
                    </span>
                    <div className="min-w-0">
                      {href ? (
                        <Link
                          href={href}
                          className="text-sm font-medium text-[#001B48] hover:text-[#018ABE] transition-colors line-clamp-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] rounded"
                        >
                          {activity.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-[#001B48] line-clamp-1">
                          {activity.title}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {activity.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                    {relativeTime && (
                      <span className="text-[11px] text-slate-400 tabular-nums">{relativeTime}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
