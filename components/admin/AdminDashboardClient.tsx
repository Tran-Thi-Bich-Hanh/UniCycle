"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  AdminDashboardPayload,
  AdminOverviewStats,
  AdminSection,
} from "@/lib/admin/types";
import { AdminOverviewSection } from "./AdminOverviewSection";
import { AdminListingsSection } from "./AdminListingsSection";
import { AdminUsersSection } from "./AdminUsersSection";
import { AdminModerationSection } from "./AdminModerationSection";

export interface AdminDashboardClientProps {
  currentAdminId: string;
  currentAdminEmail: string;
}

const DEFAULT_STATS: AdminOverviewStats = {
  totalUsers: 0,
  verifiedUsersCount: 0,
  suspendedUsersCount: 0,
  activeListings: 0,
  totalListings: 0,
  passportListingsCount: 0,
  multiOwnerItemsCount: 0,
  completedOrdersCount: 0,
  activeOrdersCount: 0,
  disputedOrdersCount: 0,
  pendingReportsCount: 0,
  pendingStudentCardsCount: 0,
  flaggedPassportsCount: 0,
  pendingChainTxsCount: 0,
};

function SectionIcon({ section, active }: { section: AdminSection; active: boolean }) {
  const colorClass = active ? "text-[#018ABE]" : "text-slate-400";

  if (section === "overview") {
    return (
      <svg
        className={`w-4 h-4 shrink-0 ${colorClass}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
        />
      </svg>
    );
  }

  if (section === "listings") {
    return (
      <svg
        className={`w-4 h-4 shrink-0 ${colorClass}`}
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
      </svg>
    );
  }

  if (section === "users") {
    return (
      <svg
        className={`w-4 h-4 shrink-0 ${colorClass}`}
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
    );
  }

  return (
    <svg
      className={`w-4 h-4 shrink-0 ${colorClass}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

function AdminSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-slate-200/80" />
          <div className="h-4 w-72 rounded-md bg-slate-200/60" />
        </div>
        <div className="h-9 w-40 rounded-xl bg-slate-200/70" />
      </div>

      <div className="flex gap-2 lg:hidden">
        <div className="h-9 w-28 rounded-xl bg-slate-200/70" />
        <div className="h-9 w-32 rounded-xl bg-slate-200/60" />
        <div className="h-9 w-32 rounded-xl bg-slate-200/60" />
      </div>

      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        <div className="hidden lg:block">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 space-y-2">
            <div className="h-9 rounded-xl bg-slate-200/70" />
            <div className="h-9 rounded-xl bg-slate-100" />
            <div className="h-9 rounded-xl bg-slate-100" />
            <div className="h-9 rounded-xl bg-slate-100" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-12 rounded-2xl bg-slate-200/60" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="h-28 rounded-2xl bg-white border border-slate-200/80" />
            <div className="h-28 rounded-2xl bg-white border border-slate-200/80" />
            <div className="h-28 rounded-2xl bg-white border border-slate-200/80" />
            <div className="h-28 rounded-2xl bg-white border border-slate-200/80" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-60 rounded-2xl bg-white border border-slate-200/80" />
            <div className="h-60 rounded-2xl bg-white border border-slate-200/80" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardClient({
  currentAdminId,
  currentAdminEmail,
}: AdminDashboardClientProps) {
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [payload, setPayload] = useState<AdminDashboardPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setFeedback(null);
      toastTimerRef.current = null;
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const refreshData = useCallback(async () => {
    const res = await fetch("/api/admin", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể tải dữ liệu bảng quản trị.");
    }
    setPayload(data as AdminDashboardPayload);
    setLoadError(null);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Không thể tải dữ liệu bảng quản trị.");
        }
        return data as AdminDashboardPayload;
      })
      .then((data) => {
        if (!active) return;
        setPayload(data);
        setLoadError(null);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : "Đã xảy ra lỗi tải dữ liệu.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const runAdminAction = useCallback(
    async (
      actionPayload: Record<string, unknown>
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actionPayload),
        });
        const data = await res.json();
        if (!res.ok) {
          const errorMessage = data.error || "Thao tác quản trị thất bại.";
          showToast("error", errorMessage);
          return { ok: false, error: errorMessage };
        }
        await refreshData();
        showToast("success", data.message || "Đã thực thi thao tác thành công.");
        return { ok: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể kết nối đến máy chủ.";
        showToast("error", errorMessage);
        return { ok: false, error: errorMessage };
      }
    },
    [refreshData, showToast]
  );

  const handleRunCronNow = async () => {
    setBusyKey("cron-run");
    try {
      const res = await fetch("/api/cron/reconcile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể đối soát hệ thống lúc này.");
      }

      const confirmedCount = Number(data?.blockchainSync?.confirmedTxsCount || 0);
      await refreshData();
      showToast(
        "success",
        confirmedCount > 0
          ? `Đã đối soát đơn quá hạn và đồng bộ ${confirmedCount} bản ghi hệ thống.`
          : "Đã hoàn tất đối soát và cập nhật số liệu mới nhất."
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Lỗi khi chạy đối soát hệ thống."
      );
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <AdminSkeleton />;
  }

  if (!payload) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center space-y-4 shadow-[0_1px_2px_rgba(0,27,72,0.04)]">
          <p className="text-sm font-medium text-rose-700">
            {loadError || "Không thể kết nối đến dữ liệu quản trị."}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              refreshData()
                .catch((err) =>
                  setLoadError(err instanceof Error ? err.message : "Lỗi tải lại dữ liệu.")
                )
                .finally(() => setLoading(false));
            }}
            className="px-4 py-2 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  const stats = payload.stats ?? DEFAULT_STATS;
  const moderationCount = stats.disputedOrdersCount + stats.pendingReportsCount;
  const totalPendingWork = moderationCount + stats.pendingStudentCardsCount;

  const navItems: Array<{
    id: AdminSection;
    label: string;
    badgeCount?: number;
    badgeTone?: "slate" | "amber" | "rose";
  }> = [
    { id: "overview", label: "Tổng quan" },
    {
      id: "listings",
      label: "Quản lý tin đăng",
      badgeCount: stats.activeListings,
      badgeTone: "slate",
    },
    {
      id: "users",
      label: "Người dùng & Duyệt SV",
      badgeCount: stats.pendingStudentCardsCount > 0 ? stats.pendingStudentCardsCount : undefined,
      badgeTone: "amber",
    },
    {
      id: "moderation",
      label: "Kiểm duyệt & Khiếu nại",
      badgeCount: moderationCount > 0 ? moderationCount : undefined,
      badgeTone: "rose",
    },
  ];

  const badgeToneClassMap = {
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
  };

  const formattedUpdateTime = new Date(payload.serverNow).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#001B48] tracking-tight">
            Quản trị UniCycle
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Theo dõi vận hành, tin đăng và cộng đồng sinh viên
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-xs text-slate-400 tabular-nums">
            Cập nhật {formattedUpdateTime}
          </span>
          <button
            type="button"
            onClick={handleRunCronNow}
            disabled={busyKey === "cron-run"}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg
              className={`w-3.5 h-3.5 text-[#018ABE] ${
                busyKey === "cron-run" ? "animate-spin" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>{busyKey === "cron-run" ? "Đang đối soát..." : "Đối soát hệ thống"}</span>
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Horizontal Nav */}
      <nav aria-label="Điều hướng quản trị" className="lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => setActiveSection(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                  isActive
                    ? "bg-[#EEF7FB] border-[#97CADB] text-[#001B48] font-semibold"
                    : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-[#001B48]"
                }`}
              >
                <SectionIcon section={item.id} active={isActive} />
                <span>{item.label}</span>
                {item.badgeCount !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold leading-none tabular-nums ${
                      badgeToneClassMap[item.badgeTone ?? "slate"]
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Responsive Two-Column Shell */}
      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block sticky top-24 self-start">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(0,27,72,0.04)]">
            <nav aria-label="Danh mục quản trị" className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                      isActive
                        ? "bg-[#EEF7FB] text-[#001B48] font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#001B48] font-medium"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <SectionIcon section={item.id} active={isActive} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badgeCount !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none tabular-nums shrink-0 ${
                          badgeToneClassMap[item.badgeTone ?? "slate"]
                        }`}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div
              data-admin-id={currentAdminId}
              className="border-t border-slate-100 pt-3 mt-3 px-2.5 space-y-1.5"
            >
              <p className="text-xs font-medium text-slate-500 truncate" title={currentAdminEmail}>
                {currentAdminEmail}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    totalPendingWork === 0 ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-slate-600 tabular-nums">
                  {totalPendingWork === 0 ? "Ổn định" : `${totalPendingWork} việc chờ xử lý`}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <section className="min-w-0">
          {activeSection === "overview" ? (
            <AdminOverviewSection
              stats={stats}
              distribution={payload.distribution}
              recentActivities={payload.recentActivities}
              serverNow={payload.serverNow}
              onNavigate={setActiveSection}
            />
          ) : activeSection === "listings" ? (
            <AdminListingsSection
              listings={payload.listings}
              passports={payload.passports}
              onRunAction={runAdminAction}
            />
          ) : activeSection === "users" ? (
            <AdminUsersSection
              users={payload.users}
              pendingStudents={payload.pendingStudents}
              currentAdminId={currentAdminId}
              currentAdminEmail={currentAdminEmail}
              onRunAction={runAdminAction}
            />
          ) : (
            <AdminModerationSection
              disputedOrders={payload.disputedOrders}
              reports={payload.reports}
              chainTxs={payload.chainTxs}
              serverNow={payload.serverNow}
              onRunAction={runAdminAction}
            />
          )}
        </section>
      </div>

      {/* Floating Toast Notification */}
      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`fixed bottom-5 right-5 z-40 max-w-sm rounded-2xl border px-4 py-3 shadow-lg flex items-start gap-3 ${
            feedback.type === "success"
              ? "bg-white border-emerald-200 text-emerald-900"
              : "bg-white border-rose-200 text-rose-900"
          }`}
        >
          <span
            className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {feedback.type === "success" ? (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            )}
          </span>
          <p className="text-xs sm:text-sm font-medium leading-snug flex-1">{feedback.message}</p>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Đóng thông báo"
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
