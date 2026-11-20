"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  UnifiedItemStatus,
  UnifiedListingStatus,
  UnifiedMyItem,
} from "@/lib/my-items/types";
import {
  ConfirmActionTarget,
  ConfirmListingActionModal,
  EditListingModal,
  EditListingPayload,
} from "./ListingActionModals";
import { normalizeConditionValue } from "@/lib/utils/condition";

type UnifiedStatusFilter = "all" | "SELLING" | "OWNED" | "ARCHIVED";

const STATUS_BADGE_MAP: Record<
  UnifiedItemStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  AVAILABLE: {
    label: "Đang mở bán",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  RESERVED: {
    label: "Đang giữ chỗ",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  OWNED: {
    label: "Đồ đã mua",
    badgeClass: "bg-[#E3F1F9] text-[#02457A] border-[#BAE6FD]",
    dotClass: "bg-[#018ABE]",
  },
  HIDDEN: {
    label: "Đang tạm ẩn",
    badgeClass: "bg-slate-100 text-slate-700 border-dashed border-slate-300",
    dotClass: "bg-slate-400",
  },
  EXPIRED: {
    label: "Đã hết hạn",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    dotClass: "bg-rose-500",
  },
  SOLD: {
    label: "Đã bán",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
};

function formatPriceLabel(price: number, isFree: boolean): string {
  if (isFree || price === 0) {
    return "Miễn phí 0đ";
  }
  return `${price.toLocaleString("vi-VN")}đ`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface MyItemsClientProps {
  initialItems: UnifiedMyItem[];
}

export function MyItemsClient({ initialItems }: MyItemsClientProps) {
  const [records, setRecords] = useState<UnifiedMyItem[]>(initialItems);
  const [statusFilter, setStatusFilter] = useState<UnifiedStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [updatingPrivacyItemId, setUpdatingPrivacyItemId] = useState<string | null>(null);
  const [busyListingId, setBusyListingId] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const [editingListing, setEditingListing] = useState<UnifiedMyItem["listing"]>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<ConfirmActionTarget>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setMessage({ type, text });
    toastTimerRef.current = setTimeout(() => {
      setMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  // Đóng menu ⋯ khi nhấn Escape hoặc click ra ngoài vùng menu
  useEffect(() => {
    if (!openMenuKey) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        event.target instanceof Node &&
        !menuContainerRef.current.contains(event.target)
      ) {
        setOpenMenuKey(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuKey(null);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuKey]);

  const counts = useMemo(() => {
    const summary = {
      all: records.length,
      SELLING: 0,
      OWNED: 0,
      ARCHIVED: 0,
    };

    for (const record of records) {
      if (record.unifiedStatus === "AVAILABLE" || record.unifiedStatus === "RESERVED") {
        summary.SELLING += 1;
      } else if (record.unifiedStatus === "OWNED") {
        summary.OWNED += 1;
      } else {
        summary.ARCHIVED += 1;
      }
    }

    return summary;
  }, [records]);

  const filteredRecords = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return records.filter((record) => {
      if (statusFilter === "SELLING") {
        if (record.unifiedStatus !== "AVAILABLE" && record.unifiedStatus !== "RESERVED") {
          return false;
        }
      } else if (statusFilter === "OWNED") {
        if (record.unifiedStatus !== "OWNED") {
          return false;
        }
      } else if (statusFilter === "ARCHIVED") {
        if (
          record.unifiedStatus !== "HIDDEN" &&
          record.unifiedStatus !== "EXPIRED" &&
          record.unifiedStatus !== "SOLD"
        ) {
          return false;
        }
      }

      if (!keyword) return true;

      const schoolShortName = record.listing?.school?.shortName || "";
      return (
        record.title.toLowerCase().includes(keyword) ||
        record.category.name.toLowerCase().includes(keyword) ||
        schoolShortName.toLowerCase().includes(keyword)
      );
    });
  }, [records, statusFilter, searchQuery]);

  const handleToggleShowName = async (itemId: string, currentShowName: boolean) => {
    setUpdatingPrivacyItemId(itemId);
    const nextShowName = !currentShowName;

    try {
      const res = await fetch(`/api/my-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showName: nextShowName }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Không thể cập nhật tùy chọn hiển thị.");
        return;
      }

      setRecords((prev) =>
        prev.map((record) =>
          record.ownedItem?.id === itemId
            ? {
              ...record,
              ownedItem: {
                ...record.ownedItem,
                showNameOnPassport: nextShowName,
              },
            }
            : record
        )
      );

      showToast("success", data.message);
    } catch {
      showToast("error", "Lỗi kết nối khi cập nhật tùy chọn hiển thị.");
    } finally {
      setUpdatingPrivacyItemId(null);
    }
  };

  const handleToggleVisibility = async (record: UnifiedMyItem) => {
    setOpenMenuKey(null);
    const listing = record.listing;
    if (!listing || listing.ownershipTransferred) return;

    if (listing.status === "RESERVED") {
      showToast("error", "Không thể tạm ẩn món đồ đang được giữ chỗ cho người mua.");
      return;
    }
    if (listing.status === "SOLD" || listing.status === "EXPIRED") {
      return;
    }

    setBusyListingId(listing.id);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_visibility" }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Không thể cập nhật trạng thái hiển thị.");
        return;
      }

      const nextStatus: UnifiedListingStatus =
        data.status === "HIDDEN" || data.status === "AVAILABLE"
          ? data.status
          : listing.status === "AVAILABLE"
            ? "HIDDEN"
            : "AVAILABLE";

      setRecords((prev) =>
        prev.map((item) =>
          item.listing?.id === listing.id
            ? {
              ...item,
              unifiedStatus: nextStatus,
              listing: {
                ...item.listing,
                status: nextStatus,
              },
            }
            : item
        )
      );

      window.dispatchEvent(new Event("unicycle-listings-change"));
      showToast("success", data.message || "Đã cập nhật trạng thái tin đăng.");
    } catch {
      showToast("error", "Lỗi kết nối khi cập nhật trạng thái tin đăng.");
    } finally {
      setBusyListingId(null);
    }
  };

  const handleRenew = async (record: UnifiedMyItem) => {
    setOpenMenuKey(null);
    const listing = record.listing;
    if (!listing || listing.ownershipTransferred) return;

    if (listing.status === "RESERVED") {
      showToast("error", "Không thể gia hạn khi tin đang được giữ chỗ cho người mua.");
      return;
    }

    setBusyListingId(listing.id);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renew" }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Không thể gia hạn tin đăng.");
        return;
      }

      setRecords((prev) =>
        prev.map((item) =>
          item.listing?.id === listing.id
            ? {
              ...item,
              unifiedStatus: "AVAILABLE",
              listing: {
                ...item.listing,
                status: "AVAILABLE",
                expiresAt: data.expiresAt || item.listing.expiresAt,
                daysRemaining: "Còn 30 ngày",
              },
            }
            : item
        )
      );

      window.dispatchEvent(new Event("unicycle-listings-change"));
      showToast("success", data.message || "Đã gia hạn tin đăng thêm 30 ngày.");
    } catch {
      showToast("error", "Lỗi kết nối khi gia hạn tin đăng.");
    } finally {
      setBusyListingId(null);
    }
  };

  const handleOpenEdit = (record: UnifiedMyItem) => {
    setOpenMenuKey(null);
    const listing = record.listing;
    if (!listing || listing.ownershipTransferred) return;

    if (listing.status === "RESERVED") {
      showToast("error", "Không thể chỉnh sửa thông tin khi tin đang được giữ chỗ cho người mua.");
      return;
    }

    setEditError(null);
    setEditingListing(listing);
  };

  const handleSaveEdit = async (payload: EditListingPayload) => {
    if (!editingListing) return;

    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_info",
          ...payload,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || "Không thể lưu thay đổi.");
        return;
      }

      const targetListingId = editingListing.id;
      setRecords((prev) =>
        prev.map((item) =>
          item.listing?.id === targetListingId
            ? {
              ...item,
              title: payload.title,
              listing: {
                ...item.listing,
                title: payload.title,
                price: payload.price,
                isFree: payload.isFree,
                condition: payload.condition,
                description: payload.description,
                zaloPhone: payload.zaloPhone,
                hidePhone: payload.hidePhone,
              },
            }
            : item
        )
      );

      setEditingListing(null);
      showToast("success", data.message || "Đã cập nhật thông tin tin đăng.");
    } catch {
      setEditError("Lỗi kết nối khi cập nhật thông tin tin đăng.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenConfirm = (mode: "delete" | "mark_sold", record: UnifiedMyItem) => {
    setOpenMenuKey(null);
    const listing = record.listing;
    if (!listing) return;

    if (mode === "mark_sold" && (listing.ownershipTransferred || listing.status === "SOLD")) {
      return;
    }

    if (mode === "delete" && (listing.status === "RESERVED" || listing.hasActiveOrder)) {
      showToast("error", "Không thể xóa sản phẩm đang có lịch hẹn hoạt động.");
      return;
    }

    setConfirmTarget({
      mode,
      listing: { id: listing.id, title: listing.title },
      hasOwnedItem: Boolean(record.ownedItem),
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;

    const { mode, listing, hasOwnedItem } = confirmTarget;
    setConfirmingAction(true);

    try {
      if (mode === "mark_sold") {
        const res = await fetch(`/api/listings/${listing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_sold" }),
        });
        const data = await res.json();

        if (!res.ok) {
          showToast("error", data.error || "Không thể đánh dấu tin đã bán.");
          setConfirmTarget(null);
          return;
        }

        setRecords((prev) =>
          prev.map((record) =>
            record.listing?.id === listing.id
              ? {
                ...record,
                unifiedStatus: "SOLD",
                listing: {
                  ...record.listing,
                  status: "SOLD",
                },
              }
              : record
          )
        );
        window.dispatchEvent(new Event("unicycle-listings-change"));
        setConfirmTarget(null);
        showToast("success", data.message || "Đã đánh dấu món đồ là Đã bán.");
        return;
      }

      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Không thể xóa tin đăng.");
        setConfirmTarget(null);
        return;
      }

      setRecords((prev) =>
        prev.flatMap((record) => {
          if (record.listing?.id !== listing.id) {
            return [record];
          }
          if (record.ownedItem) {
            return [
              {
                ...record,
                unifiedStatus: "OWNED",
                listing: null,
              },
            ];
          }
          return [];
        })
      );

      window.dispatchEvent(new Event("unicycle-auth-change"));
      window.dispatchEvent(new Event("unicycle-listings-change"));
      setConfirmTarget(null);
      showToast(
        "success",
        hasOwnedItem
          ? "Đã xóa tin đăng. Món đồ vẫn được lưu trong mục Đồ đã mua."
          : data.message || "Đã xóa tin đăng thành công."
      );
    } catch {
      showToast("error", "Lỗi kết nối khi xử lý yêu cầu.");
      setConfirmTarget(null);
    } finally {
      setConfirmingAction(false);
    }
  };

  const filterChips: Array<{ key: UnifiedStatusFilter; label: string; count: number }> = [
    { key: "all", label: "Tất cả", count: counts.all },
    { key: "SELLING", label: "Đang bán", count: counts.SELLING },
    { key: "OWNED", label: "Đồ đã mua", count: counts.OWNED },
    { key: "ARCHIVED", label: "Ẩn / Đã bán", count: counts.ARCHIVED },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* 1. Header hợp nhất */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
                Đồ của tôi
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E3F1F9] text-[#02457A] border border-[#BAE6FD]">
                {records.length} món
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#475569] mt-1">
              Quản lý tất cả đồ dùng đang sở hữu, tin đăng bán và hành trình Passport tại một nơi.
            </p>
          </div>

          <Link
            href="/sell"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Đăng món đồ mới</span>
          </Link>
        </div>

        {/* 2. Thanh công cụ lọc trạng thái & tìm kiếm nhanh */}
        {records.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-3 sm:p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-2xs">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Lọc theo trạng thái món đồ"
            >
              {filterChips.map((chip) => {
                const isActive = statusFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setStatusFilter(chip.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-1 ${isActive
                      ? "bg-[#001B48] text-white"
                      : "bg-[#F4F9FB] text-[#02457A] hover:bg-[#D6E8EE]/70"
                      }`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`px-1.5 py-0.5 leading-none rounded-full text-[11px] font-bold tabular-nums ${
                        isActive ? "bg-white/20 text-white" : "bg-white text-[#02457A]"
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full xl:w-72 shrink-0">
              <label htmlFor="my-items-search" className="sr-only">
                Tìm kiếm đồ của tôi
              </label>
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                id="my-items-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên món đồ, danh mục..."
                className="w-full h-10 pl-9 pr-9 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white text-xs sm:text-sm text-[#001B48] placeholder:text-slate-400 focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 transition-colors [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-slate-400 hover:text-[#001B48] hover:bg-slate-200/70 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Danh sách hợp nhất / Empty State */}
        {records.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-[#D6E8EE] space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#E3F1F9] text-[#018ABE] flex items-center justify-center">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.7}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#001B48]">
              Bạn chưa có món đồ nào
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Khi bạn đăng bán đồ hoặc mua đồ có hành trình xác thực trên UniCycle, tất cả sẽ hiển
              thị tập trung tại đây.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sell"
                className="px-5 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
              >
                Đăng món đồ đầu tiên
              </Link>
              <Link
                href="/products"
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#001B48] text-xs sm:text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
              >
                Khám phá chợ sinh viên
              </Link>
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          statusFilter === "OWNED" && !searchQuery.trim() ? (
            <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-[#D6E8EE] space-y-3.5">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#E3F1F9] text-[#018ABE] flex items-center justify-center">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                Bạn chưa có đồ đã mua nào
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Món đồ bạn mua thành công trên UniCycle sẽ tự động lưu tại đây kèm Hộ chiếu số để dễ đăng bán lại khi không còn dùng.
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                <Link
                  href="/products"
                  className="px-4 py-2 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
                >
                  Khám phá đồ cũ
                </Link>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="px-4 py-2 rounded-xl bg-[#F4F9FB] hover:bg-[#D6E8EE]/70 text-[#02457A] text-xs sm:text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                >
                  Xem tất cả
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-[#D6E8EE] space-y-3.5">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#F4F9FB] text-[#02457A] flex items-center justify-center">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
                Không tìm thấy món đồ phù hợp
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Không có món đồ nào khớp với bộ lọc hoặc từ khóa bạn đang chọn.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E3F1F9] hover:bg-[#BAE6FD]/60 text-[#02457A] text-xs sm:text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredRecords.map((record) => (
              <UnifiedItemCard
                key={record.key}
                record={record}
                isMenuOpen={openMenuKey === record.key}
                menuContainerRef={menuContainerRef}
                isUpdatingPrivacy={
                  Boolean(record.ownedItem && updatingPrivacyItemId === record.ownedItem.id)
                }
                isBusyListing={Boolean(record.listing && busyListingId === record.listing.id)}
                onToggleMenu={() =>
                  setOpenMenuKey((prev) => (prev === record.key ? null : record.key))
                }
                onCloseMenu={() => setOpenMenuKey(null)}
                onToggleShowName={handleToggleShowName}
                onToggleVisibility={handleToggleVisibility}
                onRenew={handleRenew}
                onOpenEdit={handleOpenEdit}
                onOpenConfirm={handleOpenConfirm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Toast thông báo thao tác */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 left-5 sm:left-auto z-50 sm:max-w-sm rounded-2xl p-3.5 shadow-lg border flex items-start gap-2.5 text-xs sm:text-sm ${message.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
        >
          {message.type === "success" ? (
            <svg
              className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          )}
          <span className="font-semibold flex-1 leading-snug pt-0.5">{message.text}</span>
          <button
            type="button"
            onClick={() => {
              if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
                toastTimerRef.current = null;
              }
              setMessage(null);
            }}
            aria-label="Đóng thông báo"
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-current/70 hover:text-current hover:bg-black/5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Các modal thao tác tin đăng */}
      <EditListingModal
        listing={editingListing}
        saving={savingEdit}
        error={editError}
        onClose={() => {
          if (!savingEdit) setEditingListing(null);
        }}
        onSubmit={handleSaveEdit}
      />

      <ConfirmListingActionModal
        target={confirmTarget}
        submitting={confirmingAction}
        onClose={() => {
          if (!confirmingAction) setConfirmTarget(null);
        }}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}

interface UnifiedItemCardProps {
  record: UnifiedMyItem;
  isMenuOpen: boolean;
  menuContainerRef: React.RefObject<HTMLDivElement | null>;
  isUpdatingPrivacy: boolean;
  isBusyListing: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onToggleShowName: (itemId: string, currentShowName: boolean) => void;
  onToggleVisibility: (record: UnifiedMyItem) => void;
  onRenew: (record: UnifiedMyItem) => void;
  onOpenEdit: (record: UnifiedMyItem) => void;
  onOpenConfirm: (mode: "delete" | "mark_sold", record: UnifiedMyItem) => void;
}

function UnifiedItemCard({
  record,
  isMenuOpen,
  menuContainerRef,
  isUpdatingPrivacy,
  isBusyListing,
  onToggleMenu,
  onCloseMenu,
  onToggleShowName,
  onToggleVisibility,
  onRenew,
  onOpenEdit,
  onOpenConfirm,
}: UnifiedItemCardProps) {
  const { unifiedStatus, ownedItem, listing } = record;
  const statusBadge = STATUS_BADGE_MAP[unifiedStatus];

  const isReserved = unifiedStatus === "RESERVED";
  const isOwned = unifiedStatus === "OWNED";
  const isHidden = unifiedStatus === "HIDDEN";
  const isExpired = unifiedStatus === "EXPIRED";
  const isSold = unifiedStatus === "SOLD";
  const isOwnershipTransferred = Boolean(listing?.ownershipTransferred);

  const passportId =
    ownedItem?.passportId || (listing?.passportEnabled ? listing.passportId : null);

  const detailHref = listing
    ? `/products/${listing.id}`
    : passportId
      ? `/passport/${passportId}`
      : null;

  const thumbnailImage = (
    <Image
      src={record.thumbnail}
      alt={record.title}
      fill
      sizes="96px"
      className="object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
    />
  );

  return (
    <article
      className={`relative bg-white rounded-2xl p-5 border shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group ${isMenuOpen ? "z-20" : ""
        } ${isReserved
          ? "border-amber-200"
          : "border-[#D6E8EE] hover:border-[#018ABE]/60"
        }`}
    >
      {/* Vùng 1: Thông tin sản phẩm */}
      <div className="space-y-3.5">
        <div className="flex items-start gap-4">
          {detailHref ? (
            <Link
              href={detailHref}
              className="block relative w-[84px] h-[84px] sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 border border-[#E2EEF3] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              {thumbnailImage}
            </Link>
          ) : (
            <div className="relative w-[84px] h-[84px] sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 border border-[#E2EEF3] shrink-0">
              {thumbnailImage}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${statusBadge.badgeClass}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusBadge.dotClass}`}
                  aria-hidden="true"
                />
                <span>{statusBadge.label}</span>
              </span>

              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F4F9FB] text-[#02457A] border border-[#D6E8EE] whitespace-nowrap max-w-full truncate">
                {record.category.name}
              </span>

              {listing && !isSold && listing.daysRemaining && (
                <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                  {listing.daysRemaining}
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-[15px] font-bold text-[#001B48] line-clamp-2 leading-snug">
              {detailHref ? (
                <Link
                  href={detailHref}
                  className="hover:text-[#018ABE] transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  {record.title}
                </Link>
              ) : (
                record.title
              )}
            </h3>

            {listing && (
              <p className="text-sm font-extrabold text-[#016D96]">
                {formatPriceLabel(listing.price, listing.isFree)}
              </p>
            )}

            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {listing ? (
                <>
                  <span>{normalizeConditionValue(listing.condition)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5 text-[#018ABE] shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    <span>{listing.school?.shortName || "Làng ĐH"}</span>
                  </span>
                  {ownedItem && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        Đời chủ #{ownedItem.myOwnerSeq}/{ownedItem.totalOwners}
                      </span>
                    </>
                  )}
                </>
              ) : ownedItem ? (
                <>
                  <span>
                    Đời chủ #{ownedItem.myOwnerSeq}/{ownedItem.totalOwners}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Sở hữu từ {formatDate(ownedItem.ownedSince)}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        {listing && listing.pendingOrdersCount > 0 && (
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg
              className="w-4 h-4 text-amber-700 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            <span>Có {listing.pendingOrdersCount} lịch hẹn chờ duyệt</span>
          </Link>
        )}

        {listing && (isReserved || listing.hasActiveOrder) && (
          <Link
            href={listing.activeOrderId ? `/orders/${listing.activeOrderId}` : "/orders"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
          >
            <svg
              className="w-4 h-4 text-amber-700 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Đang giữ chỗ cho người mua — Xem lịch hẹn &amp; bàn giao →</span>
          </Link>
        )}

        {/* Vùng 2: Hành trình & Quyền riêng tư (chỉ hiển thị khi đang sở hữu món đồ) */}
        {ownedItem && (
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2EEF3] divide-y divide-[#E2EEF3]">
            {ownedItem.passportEnabled && ownedItem.passportId && (
              <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#001B48]">
                  <svg
                    className="w-4 h-4 text-emerald-600 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                  <span>Hành trình đã xác thực</span>
                </span>

                {ownedItem.chainTx?.txHash && (
                  <a
                    href={`https://testnet.snowtrace.io/tx/${ownedItem.chainTx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#02457A] hover:text-[#018ABE] hover:underline whitespace-nowrap rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                  >
                    <span>Tra cứu nhanh</span>
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </a>
                )}
              </div>
            )}

            <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#001B48] block">
                  Hiển thị tên trên hành trình đồ vật
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {ownedItem.showNameOnPassport
                    ? "Tên của bạn sẽ hiển thị với người xem sau."
                    : `Đang ẩn danh (hiển thị dạng Đời chủ #${ownedItem.myOwnerSeq}).`}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={ownedItem.showNameOnPassport}
                aria-busy={isUpdatingPrivacy}
                aria-label={`Hiển thị tên của bạn trên hành trình của ${record.title}`}
                disabled={isUpdatingPrivacy}
                onClick={() => onToggleShowName(ownedItem.id, ownedItem.showNameOnPassport)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2 disabled:opacity-60 ${ownedItem.showNameOnPassport ? "bg-[#018ABE]" : "bg-slate-300"
                  }`}
              >
                <span
                  className={`pointer-events-none h-5 w-5 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-200 motion-reduce:transition-none ${ownedItem.showNameOnPassport ? "translate-x-5" : "translate-x-0"
                    }`}
                >
                  {isUpdatingPrivacy && (
                    <span
                      className="w-3 h-3 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vùng 3: Hành động chân thẻ */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {passportId && (
            <Link
              href={`/passport/${passportId}`}
              className="h-9 px-3 rounded-xl bg-white hover:bg-slate-50 text-[#02457A] border border-[#D6E8EE] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Hành trình</span>
            </Link>
          )}

          {listing && (
            <Link
              href={`/products/${listing.id}`}
              className="h-9 px-3 rounded-xl bg-[#F4F9FB] hover:bg-[#D6E8EE]/70 text-[#001B48] border border-[#D6E8EE] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              <span>Xem tin</span>
              <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                />
              </svg>
            </Link>
          )}
        </div>

        <div
          className="ml-auto flex items-center gap-2"
          ref={isMenuOpen ? menuContainerRef : undefined}
        >
          {isOwned && ownedItem && (
            <Link
              href={`/sell?resellItemId=${ownedItem.id}`}
              className="h-9 px-3.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
            >
              <RefreshCycleIcon className="w-4 h-4 shrink-0" />
              <span>Đăng bán lại</span>
            </Link>
          )}

          {isReserved && listing && (
            <Link
              href={listing.activeOrderId ? `/orders/${listing.activeOrderId}` : "/orders"}
              className="h-9 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              <span>Xem lịch hẹn</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}

          {isHidden && listing && (
            <button
              type="button"
              disabled={isBusyListing}
              onClick={() => onToggleVisibility(record)}
              className="h-9 px-3.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{isBusyListing ? "Đang xử lý..." : "Mở lại tin"}</span>
            </button>
          )}

          {isExpired && listing && (
            <button
              type="button"
              disabled={isBusyListing}
              onClick={() => onRenew(record)}
              className="h-9 px-3.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
            >
              <RefreshCycleIcon className="w-4 h-4 shrink-0" />
              <span>{isBusyListing ? "Đang xử lý..." : "Gia hạn 30 ngày"}</span>
            </button>
          )}

          {listing && (
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                aria-label={`Thao tác thêm cho ${record.title}`}
                onClick={onToggleMenu}
                className="w-9 h-9 rounded-xl border border-[#D6E8EE] bg-white hover:bg-slate-50 text-[#001B48] inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>
              </button>

              {isMenuOpen && (
                <div
                  role="menu"
                  aria-label={`Tùy chọn cho ${record.title}`}
                  className="absolute right-0 top-full mt-1.5 z-30 min-w-[220px] rounded-2xl bg-white border border-[#D6E8EE] shadow-xl p-1.5 space-y-0.5"
                >
                  <Link
                    href={`/products/${listing.id}`}
                    role="menuitem"
                    onClick={onCloseMenu}
                    className="block w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#001B48] hover:bg-[#F4F9FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                  >
                    Xem trang tin đăng
                  </Link>

                  {!isOwnershipTransferred && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isReserved || isBusyListing}
                      onClick={() => onOpenEdit(record)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#001B48] hover:bg-[#F4F9FB] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col gap-0.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                    >
                      <span>Chỉnh sửa tin đăng</span>
                      {isReserved && (
                        <span className="text-[11px] font-normal text-slate-500">
                          Đang giữ chỗ cho người mua
                        </span>
                      )}
                    </button>
                  )}

                  {!isSold && !isExpired && !isOwnershipTransferred && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isReserved || isBusyListing}
                      onClick={() => onToggleVisibility(record)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#001B48] hover:bg-[#F4F9FB] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col gap-0.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                    >
                      <span>{isHidden ? "Mở lại tin đăng" : "Tạm ẩn tin đăng"}</span>
                      {isReserved && (
                        <span className="text-[11px] font-normal text-slate-500">
                          Đang giữ chỗ cho người mua
                        </span>
                      )}
                    </button>
                  )}

                  {!isSold && !isOwnershipTransferred && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isBusyListing}
                      onClick={() => onOpenConfirm("mark_sold", record)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#001B48] hover:bg-[#F4F9FB] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                    >
                      Đánh dấu đã bán
                    </button>
                  )}

                  {!isOwnershipTransferred && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isReserved || isBusyListing}
                      onClick={() => onRenew(record)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#001B48] hover:bg-[#F4F9FB] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col gap-0.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                    >
                      <span>Gia hạn thêm 30 ngày</span>
                      {isReserved && (
                        <span className="text-[11px] font-normal text-slate-500">
                          Đang giữ chỗ cho người mua
                        </span>
                      )}
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" role="separator" />

                  <button
                    type="button"
                    role="menuitem"
                    disabled={isReserved || listing.hasActiveOrder || isBusyListing}
                    onClick={() => onOpenConfirm("delete", record)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col gap-0.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    <span>Xóa tin đăng</span>
                    {(isReserved || listing.hasActiveOrder) && (
                      <span className="text-[11px] font-normal text-slate-500">
                        Đang có lịch hẹn hoạt động
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function RefreshCycleIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}
