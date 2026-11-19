"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { AdminListingRecord, AdminPassportItem } from "@/lib/admin/types";
import { HEADER_CATEGORIES } from "@/lib/constants/categories";
import { formatConditionGradeLabel } from "@/lib/utils/condition";
import { removeVietnameseTones } from "@/lib/utils/vietnamese";
import { AdminActionModal, AdminActionReasonConfig } from "./AdminActionModal";

export interface AdminListingsSectionProps {
  listings: AdminListingRecord[];
  passports: AdminPassportItem[];
  onRunAction: (
    payload: Record<string, unknown>
  ) => Promise<{ ok: boolean; error?: string }>;
}

type ListingStatusFilter =
  | "all"
  | "AVAILABLE"
  | "RESERVED"
  | "HIDDEN"
  | "SOLD"
  | "REMOVED"
  | "FLAGGED";

type PendingListingAction =
  | {
      kind: "moderate_listing";
      mode: "hide" | "restore" | "remove";
      listing: AdminListingRecord;
    }
  | {
      kind: "flag_passport";
      listing: AdminListingRecord;
      itemId: string;
    }
  | {
      kind: "unflag_passport";
      listing: AdminListingRecord;
      itemId: string;
    };

const LISTING_STATUS_MAP: Record<string, { label: string; className: string }> = {
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
    className: "bg-slate-100 text-slate-600 border-dashed border-slate-300",
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
};

function resolveCategoryName(category: AdminListingRecord["category"]): string {
  if (!category) return "Chưa phân loại";
  const matched = HEADER_CATEGORIES.find((item) => item.slug === category.slug);
  return matched?.name ?? category.name;
}

function formatPriceLabel(price: number, isFree: boolean): string {
  if (isFree || price === 0) return "Miễn phí 0đ";
  return `${price.toLocaleString("vi-VN")} đ`;
}

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

function getModalConfig(action: PendingListingAction): {
  title: string;
  description: string;
  warningText?: string;
  confirmLabel: string;
  variant: "primary" | "danger";
  reasonConfig?: AdminActionReasonConfig;
} {
  if (action.kind === "moderate_listing") {
    if (action.mode === "hide") {
      return {
        title: "Tạm ẩn tin đăng",
        description: `Tin "${action.listing.title}" sẽ tạm thời không hiển thị với sinh viên tìm kiếm trên sàn.`,
        confirmLabel: "Xác nhận tạm ẩn",
        variant: "primary",
        reasonConfig: {
          label: "Lý do tạm ẩn (không bắt buộc)",
          placeholder: "Ví dụ: Thông tin mô tả chưa rõ ràng, cần người bán bổ sung ảnh thật...",
          required: false,
        },
      };
    }

    if (action.mode === "remove") {
      return {
        title: "Gỡ tin đăng vi phạm",
        description: `Xác nhận gỡ bỏ tin "${action.listing.title}" của ${action.listing.seller.displayName}.`,
        warningText:
          "Tin đăng sẽ bị gỡ khỏi sàn, các yêu cầu hẹn đang chờ duyệt sẽ tự động từ chối và người bán sẽ nhận được thông báo.",
        confirmLabel: "Gỡ tin đăng",
        variant: "danger",
        reasonConfig: {
          label: "Lý do gỡ tin",
          placeholder: "Nhập lý do cụ thể gửi đến người bán (tối thiểu 5 ký tự)...",
          required: true,
          minLength: 5,
        },
      };
    }

    const isRemoved = action.listing.status === "REMOVED";
    return {
      title: isRemoved ? "Khôi phục tin đăng" : "Mở lại tin đăng",
      description: `Hiển thị lại tin "${action.listing.title}" lên sàn. Nếu tin đã quá hạn, hệ thống sẽ tự động gia hạn thêm 30 ngày.`,
      confirmLabel: isRemoved ? "Khôi phục tin" : "Mở lại tin",
      variant: "primary",
    };
  }

  if (action.kind === "flag_passport") {
    return {
      title: "Gắn cảnh báo hành trình món đồ",
      description: `Xác nhận bật cảnh báo đối với món đồ gắn với tin "${action.listing.title}".`,
      warningText:
        "Hệ thống sẽ gắn cảnh báo lên hành trình món đồ, tự động ẩn tin đăng liên quan và tạm dừng các lịch hẹn đang diễn ra để kiểm tra.",
      confirmLabel: "Bật cảnh báo",
      variant: "danger",
      reasonConfig: {
        label: "Lý do cảnh báo",
        placeholder: "Mô tả dấu hiệu bất thường, tranh chấp hoặc nghi vấn nguồn gốc...",
        required: true,
        minLength: 5,
      },
    };
  }

  return {
    title: "Gỡ cảnh báo hành trình",
    description: `Xác nhận gỡ cảnh báo cho hành trình món đồ "${action.listing.title}". Các tin đăng tạm ẩn còn hạn sẽ được hiển thị lại bình thường.`,
    confirmLabel: "Gỡ cảnh báo",
    variant: "primary",
    reasonConfig: {
      label: "Ghi chú xác minh (không bắt buộc)",
      placeholder: "Ví dụ: Đã kiểm tra chứng từ và xác nhận hợp lệ...",
      required: false,
    },
  };
}

export function AdminListingsSection({
  listings,
  passports,
  onRunAction,
}: AdminListingsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListingStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [pendingAction, setPendingAction] = useState<PendingListingAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const flagReasonByItemId = useMemo(() => {
    const map = new Map<string, string>();
    for (const passport of passports) {
      if (passport.flagReason) {
        map.set(passport.id, passport.flagReason);
      }
    }
    return map;
  }, [passports]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: listings.length,
      AVAILABLE: 0,
      RESERVED: 0,
      HIDDEN: 0,
      SOLD: 0,
      REMOVED: 0,
      FLAGGED: 0,
    };
    for (const listing of listings) {
      if (listing.status === "AVAILABLE") counts.AVAILABLE += 1;
      else if (listing.status === "RESERVED") counts.RESERVED += 1;
      else if (listing.status === "HIDDEN") counts.HIDDEN += 1;
      else if (listing.status === "SOLD") counts.SOLD += 1;
      else if (listing.status === "REMOVED") counts.REMOVED += 1;
      if (listing.item?.passportStatus === "FLAGGED") counts.FLAGGED += 1;
    }
    return counts;
  }, [listings]);

  const filteredListings = useMemo(() => {
    const normalizedQuery = removeVietnameseTones(searchQuery);

    return listings.filter((listing) => {
      if (statusFilter === "FLAGGED") {
        if (listing.item?.passportStatus !== "FLAGGED") return false;
      } else if (statusFilter !== "all" && listing.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== "all" && listing.category?.slug !== categoryFilter) {
        return false;
      }

      if (normalizedQuery) {
        const haystack = removeVietnameseTones(
          [
            listing.title,
            listing.seller.displayName,
            listing.seller.email,
            listing.school?.name ?? "",
            listing.school?.shortName ?? "",
            listing.seller.school?.shortName ?? "",
          ].join(" ")
        );
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [listings, searchQuery, statusFilter, categoryFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  const handleConfirmAction = async (reason: string) => {
    if (!pendingAction) return;
    setSubmitting(true);
    setModalError(null);

    let requestPayload: Record<string, unknown>;
    if (pendingAction.kind === "moderate_listing") {
      requestPayload = {
        action: "moderate_listing",
        listingId: pendingAction.listing.id,
        mode: pendingAction.mode,
        reason,
      };
    } else if (pendingAction.kind === "flag_passport") {
      requestPayload = {
        action: "flag_passport",
        itemId: pendingAction.itemId,
        reason,
      };
    } else {
      requestPayload = {
        action: "unflag_passport",
        itemId: pendingAction.itemId,
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

  const statusChips: Array<{ id: ListingStatusFilter; label: string; count: number }> = [
    { id: "all", label: "Tất cả", count: statusCounts.all },
    { id: "AVAILABLE", label: "Đang mở bán", count: statusCounts.AVAILABLE },
    { id: "RESERVED", label: "Đang giữ chỗ", count: statusCounts.RESERVED },
    { id: "HIDDEN", label: "Tạm ẩn", count: statusCounts.HIDDEN },
    { id: "SOLD", label: "Đã bán", count: statusCounts.SOLD },
    { id: "REMOVED", label: "Đã gỡ", count: statusCounts.REMOVED },
    { id: "FLAGGED", label: "Cảnh báo hành trình", count: statusCounts.FLAGGED },
  ];

  const modalConfig = pendingAction ? getModalConfig(pendingAction) : null;

  return (
    <div className="space-y-5">
      {/* Toolbar tìm kiếm & bộ lọc */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-[0_1px_2px_rgba(0,27,72,0.04)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
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
              placeholder="Tìm tên tin đăng, người bán, email hoặc trường..."
              aria-label="Tìm kiếm tin đăng"
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

          <div className="sm:w-56 shrink-0">
            <label htmlFor="admin-listing-category-filter" className="sr-only">
              Lọc theo danh mục
            </label>
            <select
              id="admin-listing-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-[#001B48] focus:border-[#018ABE] focus:outline-none focus:ring-2 focus:ring-[#018ABE]/20 cursor-pointer"
            >
              <option value="all">Tất cả danh mục</option>
              {HEADER_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chip lọc trạng thái */}
        <div
          role="group"
          aria-label="Lọc theo trạng thái tin đăng"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
        >
          {statusChips.map((chip) => {
            const isActive = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStatusFilter(chip.id)}
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

        {/* Thanh tóm tắt kết quả lọc */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs text-slate-500">
          <span className="tabular-nums">
            Hiển thị <strong className="font-semibold text-[#001B48]">{filteredListings.length}</strong> /{" "}
            {listings.length} tin đăng
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

      {/* Danh sách tin đăng */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,27,72,0.04)] overflow-hidden">
        {filteredListings.length === 0 ? (
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
                  d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">
              {listings.length === 0
                ? "Chưa có tin đăng nào trên hệ thống."
                : "Không tìm thấy tin đăng nào phù hợp bộ lọc."}
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
            {filteredListings.map((listing) => {
              const statusInfo = LISTING_STATUS_MAP[listing.status] ?? {
                label: "Đang cập nhật",
                className: "bg-slate-100 text-slate-700 border-slate-200/80",
              };
              const thumbUrl = listing.images[0]?.url;
              const categoryName = resolveCategoryName(listing.category);
              const conditionLabel = formatConditionGradeLabel(listing.condition);
              const schoolName = listing.school?.shortName || listing.seller.school?.shortName;
              const createdLabel = formatDateLabel(listing.createdAt);
              const isFlagged = listing.item?.passportStatus === "FLAGGED";
              const flagReason = listing.item ? flagReasonByItemId.get(listing.item.id) : undefined;
              const ownerSeq = listing.item?.currentOwnerSeq ?? 0;

              return (
                <div
                  key={listing.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <Link
                      href={`/products/${listing.id}`}
                      className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200/80 bg-slate-50 shrink-0 relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                      aria-label={`Xem chi tiết ${listing.title}`}
                    >
                      {thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={listing.title}
                          fill
                          sizes="64px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <svg
                          className="w-6 h-6 text-slate-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                          />
                        </svg>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Line 1: Title + Status & Passport Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/products/${listing.id}`}
                          className="text-sm font-semibold text-[#001B48] hover:text-[#018ABE] transition-colors line-clamp-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] rounded"
                        >
                          {listing.title}
                        </Link>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                        {isFlagged ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-rose-200/80 bg-rose-50 text-rose-700 text-[11px] font-medium whitespace-nowrap">
                            Cảnh báo hành trình
                          </span>
                        ) : (
                          listing.item?.passportEnabled && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-sky-200/80 bg-[#EEF7FB] text-[#02457A] text-[11px] font-medium whitespace-nowrap tabular-nums">
                              Có hành trình{ownerSeq > 1 ? ` · Đời chủ #${ownerSeq}` : ""}
                            </span>
                          )
                        )}
                        {listing.reportsCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-200/80 bg-amber-50 text-amber-800 text-[11px] font-medium whitespace-nowrap tabular-nums">
                            {listing.reportsCount} báo cáo
                          </span>
                        )}
                      </div>

                      {/* Line 2: Price · Condition · Category */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
                        <span className="font-semibold text-[#001B48] tabular-nums">
                          {formatPriceLabel(listing.price, listing.isFree)}
                        </span>
                        {conditionLabel && (
                          <>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span>{conditionLabel}</span>
                          </>
                        )}
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span>{categoryName}</span>
                      </div>

                      {/* Line 3: Seller · School · Date · Orders */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <span>{listing.seller.displayName}</span>
                          {listing.seller.isStudentVerified && (
                            <svg
                              className="w-3.5 h-3.5 text-[#018ABE] shrink-0"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              role="img"
                              aria-label="Sinh viên đã xác minh"
                            >
                              <title>Sinh viên đã xác minh</title>
                              <path
                                fillRule="evenodd"
                                d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="text-slate-400">({listing.seller.email})</span>
                        {schoolName && (
                          <>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span>{schoolName}</span>
                          </>
                        )}
                        {createdLabel && (
                          <>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="tabular-nums">{createdLabel}</span>
                          </>
                        )}
                        {listing.ordersCount > 0 && (
                          <>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="tabular-nums">{listing.ordersCount} lượt hẹn</span>
                          </>
                        )}
                      </div>

                      {/* Optional Line 4: Flag reason */}
                      {isFlagged && flagReason && (
                        <p className="text-xs text-rose-700 bg-rose-50/70 border border-rose-200/70 rounded-lg px-2.5 py-1 inline-block">
                          Lý do cảnh báo: {flagReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {listing.status === "AVAILABLE" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAction({
                              kind: "moderate_listing",
                              mode: "hide",
                              listing,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                        >
                          Tạm ẩn
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAction({
                              kind: "moderate_listing",
                              mode: "remove",
                              listing,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          Gỡ tin
                        </button>
                      </>
                    )}

                    {(listing.status === "HIDDEN" ||
                      listing.status === "EXPIRED" ||
                      listing.status === "REMOVED") && (
                      <>
                        {!isFlagged && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "moderate_listing",
                                mode: "restore",
                                listing,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-[#97CADB] bg-white hover:bg-[#EEF7FB] text-xs font-semibold text-[#02457A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                          >
                            {listing.status === "REMOVED" ? "Khôi phục" : "Mở lại tin"}
                          </button>
                        )}
                        {(listing.status === "HIDDEN" || listing.status === "EXPIRED") && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "moderate_listing",
                                mode: "remove",
                                listing,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            Gỡ tin
                          </button>
                        )}
                      </>
                    )}

                    {listing.status === "RESERVED" && (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-medium text-slate-500">
                        Đang có lịch hẹn
                      </span>
                    )}

                    {listing.item?.passportEnabled && listing.item.id && (
                      <>
                        {listing.item.passportStatus === "FLAGGED" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "unflag_passport",
                                listing,
                                itemId: listing.item!.id,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-xs font-semibold text-emerald-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                          >
                            Gỡ cảnh báo
                          </button>
                        ) : listing.item.passportStatus === "ACTIVE" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAction({
                                kind: "flag_passport",
                                listing,
                                itemId: listing.item!.id,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 text-xs font-semibold text-amber-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          >
                            Cảnh báo hành trình
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal xác nhận thao tác */}
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
    </div>
  );
}
