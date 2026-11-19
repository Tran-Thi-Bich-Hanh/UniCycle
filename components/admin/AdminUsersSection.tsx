"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import type { AdminUserRecord, PendingStudentItem } from "@/lib/admin/types";
import { removeVietnameseTones } from "@/lib/utils/vietnamese";
import {
  AdminActionModal,
  AdminActionReasonConfig,
  StudentCardPreviewModal,
} from "./AdminActionModal";

export interface AdminUsersSectionProps {
  users: AdminUserRecord[];
  pendingStudents: PendingStudentItem[];
  currentAdminId: string;
  currentAdminEmail: string;
  onRunAction: (
    payload: Record<string, unknown>
  ) => Promise<{ ok: boolean; error?: string }>;
}

type UserFilter = "all" | "verified" | "unverified" | "pending_card" | "suspended";

type PendingUserAction =
  | {
      kind: "verify_student_card";
      student: PendingStudentItem;
      approve: boolean;
    }
  | {
      kind: "toggle_student_verified";
      user: AdminUserRecord;
      verified: boolean;
    }
  | {
      kind: "toggle_user_status";
      user: AdminUserRecord;
      nextStatus: "ACTIVE" | "SUSPENDED";
    };

type CardPreviewTarget = {
  studentName: string;
  studentEmail?: string;
  schoolName?: string | null;
  imageUrl: string;
} | null;

function formatDateLabel(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function getModalConfig(action: PendingUserAction): {
  title: string;
  description: string;
  warningText?: string;
  confirmLabel: string;
  variant: "primary" | "danger";
  reasonConfig?: AdminActionReasonConfig;
} {
  if (action.kind === "verify_student_card") {
    if (action.approve) {
      return {
        title: "Phê duyệt thẻ sinh viên",
        description: `Xác nhận cấp huy hiệu "Sinh viên đã xác minh" cho tài khoản ${action.student.displayName} (${action.student.email}).`,
        warningText:
          "Ảnh thẻ sinh viên sẽ được hệ thống tự động xóa vĩnh viễn ngay sau khi phê duyệt để bảo vệ thông tin cá nhân.",
        confirmLabel: "Phê duyệt sinh viên",
        variant: "primary",
      };
    }

    return {
      title: "Từ chối hồ sơ thẻ sinh viên",
      description: `Xác nhận từ chối ảnh thẻ sinh viên do ${action.student.displayName} gửi lên.`,
      warningText:
        "Ảnh thẻ cũ sẽ tự động xóa vĩnh viễn và hệ thống sẽ gửi thông báo hướng dẫn sinh viên tải lại ảnh rõ nét hơn.",
      confirmLabel: "Từ chối hồ sơ",
      variant: "danger",
    };
  }

  if (action.kind === "toggle_student_verified") {
    if (action.verified) {
      return {
        title: "Cấp huy hiệu Sinh viên đã xác minh",
        description: `Xác nhận gắn huy hiệu Sinh viên đã xác minh cho tài khoản ${action.user.displayName} (${action.user.email}).`,
        confirmLabel: "Cấp huy hiệu",
        variant: "primary",
      };
    }

    return {
      title: "Thu hồi huy hiệu Sinh viên đã xác minh",
      description: `Xác nhận gỡ huy hiệu Sinh viên đã xác minh khỏi tài khoản ${action.user.displayName}. Người dùng vẫn có thể gửi lại thẻ để xác minh sau.`,
      confirmLabel: "Gỡ huy hiệu",
      variant: "danger",
    };
  }

  if (action.nextStatus === "SUSPENDED") {
    return {
      title: "Tạm khóa tài khoản người dùng",
      description: `Xác nhận tạm khóa tài khoản của ${action.user.displayName} (${action.user.email}).`,
      warningText:
        "Người dùng sẽ không thể đăng nhập trong thời gian bị khóa và toàn bộ tin đang mở bán của tài khoản này sẽ tự động được tạm ẩn.",
      confirmLabel: "Khóa tài khoản",
      variant: "danger",
      reasonConfig: {
        label: "Lý do tạm khóa",
        placeholder: "Nhập lý do cụ thể (ví dụ: Đăng tin rác, gian lận hẹn xem đồ...)",
        required: true,
        minLength: 5,
      },
    };
  }

  return {
    title: "Mở khóa tài khoản người dùng",
    description: `Kích hoạt lại quyền hoạt động và giao dịch cho tài khoản ${action.user.displayName} (${action.user.email}).`,
    confirmLabel: "Mở khóa tài khoản",
    variant: "primary",
  };
}

export function AdminUsersSection({
  users,
  pendingStudents,
  currentAdminId,
  currentAdminEmail,
  onRunAction,
}: AdminUsersSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [cardPreview, setCardPreview] = useState<CardPreviewTarget>(null);

  const filterCounts = useMemo(() => {
    const counts = {
      all: users.length,
      verified: 0,
      unverified: 0,
      pending_card: 0,
      suspended: 0,
    };

    for (const user of users) {
      if (user.isStudentVerified) counts.verified += 1;
      else counts.unverified += 1;

      if (user.studentCardUrl && !user.isStudentVerified) {
        counts.pending_card += 1;
      }

      if (user.status === "SUSPENDED") {
        counts.suspended += 1;
      }
    }

    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = removeVietnameseTones(searchQuery);

    return users.filter((user) => {
      if (userFilter === "verified" && !user.isStudentVerified) return false;
      if (userFilter === "unverified" && user.isStudentVerified) return false;
      if (userFilter === "pending_card" && !(user.studentCardUrl && !user.isStudentVerified)) {
        return false;
      }
      if (userFilter === "suspended" && user.status !== "SUSPENDED") return false;

      if (normalizedQuery) {
        const haystack = removeVietnameseTones(
          [
            user.displayName,
            user.email,
            user.school?.name ?? "",
            user.school?.shortName ?? "",
            user.dorm ?? "",
          ].join(" ")
        );
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [users, searchQuery, userFilter]);

  const hasActiveFilters = searchQuery.trim() !== "" || userFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setUserFilter("all");
  };

  const handleConfirmAction = async (reason: string) => {
    if (!pendingAction) return;
    setSubmitting(true);
    setModalError(null);

    let requestPayload: Record<string, unknown>;
    if (pendingAction.kind === "verify_student_card") {
      requestPayload = {
        action: "verify_student_card",
        targetUserId: pendingAction.student.id,
        approve: pendingAction.approve,
      };
    } else if (pendingAction.kind === "toggle_student_verified") {
      requestPayload = {
        action: "toggle_student_verified",
        targetUserId: pendingAction.user.id,
        verified: pendingAction.verified,
      };
    } else {
      requestPayload = {
        action: "toggle_user_status",
        targetUserId: pendingAction.user.id,
        nextStatus: pendingAction.nextStatus,
        reason,
      };
    }

    const result = await onRunAction(requestPayload);
    setSubmitting(false);

    if (result.ok) {
      setPendingAction(null);
      setModalError(null);
    } else {
      setModalError(result.error || "Không thể thực thi thao tác.");
    }
  };

  const filterChips: Array<{ id: UserFilter; label: string; count: number }> = [
    { id: "all", label: "Tất cả", count: filterCounts.all },
    { id: "verified", label: "Đã xác minh SV", count: filterCounts.verified },
    { id: "unverified", label: "Chưa xác minh", count: filterCounts.unverified },
    { id: "pending_card", label: "Chờ duyệt thẻ", count: filterCounts.pending_card },
    { id: "suspended", label: "Đang bị khóa", count: filterCounts.suspended },
  ];

  const modalConfig = pendingAction ? getModalConfig(pendingAction) : null;
  const normalizedAdminEmail = currentAdminEmail.toLowerCase();

  return (
    <div className="space-y-5">
      {/* Khối 1: Hàng đợi duyệt thẻ sinh viên (chỉ hiện khi có hồ sơ chờ) */}
      {pendingStudents.length > 0 && (
        <section
          aria-label="Hồ sơ chờ duyệt thẻ sinh viên"
          className="rounded-2xl border border-sky-200/80 bg-[#F4FAFD] p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm sm:text-base font-bold text-[#001B48]">
                  Hồ sơ chờ duyệt thẻ sinh viên
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#018ABE] text-white text-[11px] font-semibold leading-none tabular-nums">
                  {pendingStudents.length}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Ảnh thẻ sẽ tự động xóa vĩnh viễn ngay sau khi phê duyệt hoặc từ chối để bảo vệ thông tin cá nhân.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingStudents.map((student) => {
              const schoolLabel = student.school?.shortName || student.school?.name;
              const submittedDate = formatDateLabel(student.createdAt);

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3 shadow-[0_1px_2px_rgba(0,27,72,0.03)]"
                >
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-sm font-semibold text-[#001B48] truncate">
                      {student.displayName}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">{student.email}</p>
                    <p className="text-xs text-slate-500">
                      {[schoolLabel, student.dorm, submittedDate ? `Đăng ký ${submittedDate}` : ""]
                        .filter(Boolean)
                        .join(" · ") || "Chưa cập nhật trường / KTX"}
                    </p>
                  </div>

                  {student.studentCardUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setCardPreview({
                          studentName: student.displayName,
                          studentEmail: student.email,
                          schoolName: schoolLabel,
                          imageUrl: student.studentCardUrl!,
                        })
                      }
                      className="group relative w-full rounded-xl overflow-hidden border border-slate-200/80 bg-slate-50 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                    >
                      <Image
                        src={student.studentCardUrl}
                        alt={`Ảnh thẻ sinh viên của ${student.displayName}`}
                        width={480}
                        height={240}
                        unoptimized
                        className="w-full h-36 object-cover"
                      />
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#001B48]/80 text-white text-[11px] font-medium absolute bottom-2 right-2 group-hover:bg-[#001B48] transition-colors">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                          />
                        </svg>
                        <span>Phóng to ảnh thẻ</span>
                      </span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAction({
                          kind: "verify_student_card",
                          student,
                          approve: true,
                        })
                      }
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
                    >
                      Phê duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAction({
                          kind: "verify_student_card",
                          student,
                          approve: false,
                        })
                      }
                      className="py-2 px-3.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Khối 2: Thanh tìm kiếm & Bộ lọc tài khoản */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-[0_1px_2px_rgba(0,27,72,0.04)]">
        <div className="relative">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email, trường hoặc ký túc xá..."
            aria-label="Tìm kiếm thành viên"
            className="w-full h-10 pl-10 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-[#001B48] placeholder:text-slate-400 focus:border-[#018ABE] focus:outline-none focus:ring-2 focus:ring-[#018ABE]/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Xóa từ khóa tìm kiếm"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Lọc tài khoản thành viên"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
        >
          {filterChips.map((chip) => {
            const isActive = userFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setUserFilter(chip.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                  isActive
                    ? "bg-[#EEF7FB] border-[#97CADB] text-[#001B48] font-semibold"
                    : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-[#001B48]"
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] leading-none tabular-nums ${
                    isActive ? "bg-white text-[#02457A]" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs text-slate-500">
          <span className="tabular-nums">
            Hiển thị <strong className="font-semibold text-[#001B48]">{filteredUsers.length}</strong> /{" "}
            {users.length} thành viên
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="font-semibold text-[#018ABE] hover:text-[#02457A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] rounded px-1"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Khối 3: Danh sách thành viên */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,27,72,0.04)] overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
              <svg
                className="w-5 h-5"
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
            </div>
            <p className="text-sm font-medium text-slate-600">
              {users.length === 0
                ? "Chưa có tài khoản thành viên nào trên hệ thống."
                : "Không tìm thấy thành viên nào phù hợp bộ lọc."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#001B48] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((user) => {
              const isSelf =
                user.id === currentAdminId ||
                user.email.toLowerCase() === normalizedAdminEmail;
              const isAdminAccount = user.role === "ADMIN";
              const isProtectedAdmin = isAdminAccount || isSelf;
              const isSuspended = user.status === "SUSPENDED";
              const hasPendingCard = Boolean(user.studentCardUrl && !user.isStudentVerified);
              const schoolLabel = user.school?.shortName || user.school?.name;
              const totalOrders = user._count.buyingOrders + user._count.sellingOrders;
              const joinedDate = formatDateLabel(user.createdAt);

              const avatarClass = isAdminAccount
                ? "bg-[#001B48] text-white"
                : isSuspended
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-[#EEF7FB] text-[#02457A] border border-sky-200/80";

              return (
                <div
                  key={user.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Avatar Monogram */}
                    <div
                      className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-sm font-bold ${avatarClass}`}
                      aria-hidden="true"
                    >
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>

                    {/* User Details */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Line 1: Name + Status Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#001B48]">
                          {user.displayName}
                        </span>

                        {isAdminAccount && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#001B48]/20 bg-[#001B48] text-white text-[11px] font-medium whitespace-nowrap">
                            Quản trị viên
                          </span>
                        )}

                        {isSelf && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-sky-200 bg-[#EEF7FB] text-[#02457A] text-[11px] font-medium whitespace-nowrap">
                            Bạn
                          </span>
                        )}

                        {isSuspended && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-medium whitespace-nowrap">
                            Đang tạm khóa
                          </span>
                        )}

                        {!isAdminAccount && (
                          <>
                            {user.isStudentVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200/80 bg-emerald-50 text-emerald-700 text-[11px] font-medium whitespace-nowrap">
                                <svg
                                  className="w-3 h-3 shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span>Đã xác minh SV</span>
                              </span>
                            ) : hasPendingCard ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-200/80 bg-amber-50 text-amber-800 text-[11px] font-medium whitespace-nowrap">
                                Chờ duyệt thẻ
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-slate-200/80 bg-slate-100 text-slate-600 text-[11px] font-medium whitespace-nowrap">
                                Chưa xác minh
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Line 2: Email · School · Dorm */}
                      <p className="text-xs text-slate-500 break-all sm:break-normal">
                        {[user.email, schoolLabel, user.dorm].filter(Boolean).join(" · ")}
                      </p>

                      {/* Line 3: Metrics */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 tabular-nums">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <svg
                            className="w-3.5 h-3.5 text-amber-500 shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Điểm uy tín {user.reputationScore.toFixed(1)}/5</span>
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span>{user._count.listings} tin đăng</span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span>{totalOrders} đơn hẹn</span>
                        {joinedDate && (
                          <>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span>Tham gia {joinedDate}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isProtectedAdmin ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-medium text-slate-500">
                        Tài khoản quản trị
                      </span>
                    ) : (
                      <>
                        {hasPendingCard && user.studentCardUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setCardPreview({
                                studentName: user.displayName,
                                studentEmail: user.email,
                                schoolName: schoolLabel,
                                imageUrl: user.studentCardUrl!,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-[#97CADB] bg-[#EEF7FB] hover:bg-[#D6E8EE] text-xs font-semibold text-[#02457A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                          >
                            Xem ảnh thẻ
                          </button>
                        )}

                        {user.isStudentVerified ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "toggle_student_verified",
                                user,
                                verified: false,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                          >
                            Gỡ huy hiệu SV
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "toggle_student_verified",
                                user,
                                verified: true,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-[#97CADB] bg-white hover:bg-[#EEF7FB] text-xs font-semibold text-[#02457A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                          >
                            Cấp huy hiệu SV
                          </button>
                        )}

                        {isSuspended ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "toggle_user_status",
                                user,
                                nextStatus: "ACTIVE",
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-xs font-semibold text-emerald-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                          >
                            Mở khóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "toggle_user_status",
                                user,
                                nextStatus: "SUSPENDED",
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            Khóa tài khoản
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal xác nhận thao tác tài khoản / duyệt thẻ */}
      {modalConfig && (
        <AdminActionModal
          open={Boolean(pendingAction)}
          title={modalConfig.title}
          description={modalConfig.description}
          warningText={modalConfig.warningText}
          confirmLabel={modalConfig.confirmLabel}
          variant={modalConfig.variant}
          reasonConfig={modalConfig.reasonConfig}
          submitting={submitting}
          error={modalError}
          onClose={() => {
            if (!submitting) {
              setPendingAction(null);
              setModalError(null);
            }
          }}
          onConfirm={handleConfirmAction}
        />
      )}

      {/* Modal phóng to ảnh thẻ sinh viên */}
      <StudentCardPreviewModal
        open={Boolean(cardPreview)}
        studentName={cardPreview?.studentName ?? ""}
        studentEmail={cardPreview?.studentEmail}
        schoolName={cardPreview?.schoolName}
        imageUrl={cardPreview?.imageUrl ?? null}
        onClose={() => setCardPreview(null)}
      />
    </div>
  );
}
