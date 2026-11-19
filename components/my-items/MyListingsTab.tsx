"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ConfirmActionTarget,
  ConfirmListingActionModal,
  EditListingModal,
  EditListingPayload,
  ZaloInviteData,
  ZaloInviteModal,
} from "./ListingActionModals";

export interface MyListingItem {
  id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  condition: string;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN" | "EXPIRED";
  expiresAt: string;
  daysRemaining?: string;
  createdAt: string;
  zaloPhone: string;
  hidePhone: boolean;
  category: { id: string; name: string; slug: string } | null;
  school: { id: string; name: string; shortName: string } | null;
  item: {
    id: string;
    passportEnabled: boolean;
    passportId: string | null;
    passportStatus: string;
    owners: Array<{ seq: number; showName: boolean }>;
  } | null;
  images: Array<{ id: string; url: string }>;
  pendingOrdersCount?: number;
  hasActiveOrder?: boolean;
}

type ListingStatusFilter = "all" | "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN_EXPIRED";

const LISTING_STATUS_MAP: Record<
  MyListingItem["status"],
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
  SOLD: {
    label: "Đã bán",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
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
};

const DEFAULT_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400";

async function requestMyListings(): Promise<{
  unauthorized?: boolean;
  error?: string;
  listings?: MyListingItem[];
}> {
  const res = await fetch("/api/listings/my", { cache: "no-store" });
  if (res.status === 401) {
    return { unauthorized: true };
  }
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Không thể tải danh sách tin đăng bán." };
  }
  return { listings: data.listings || [] };
}

interface MyListingsTabProps {
  onNotify: (type: "success" | "error", text: string) => void;
  onCountChange?: (count: number) => void;
}

export function MyListingsTab({ onNotify, onCountChange }: MyListingsTabProps) {
  const router = useRouter();

  const [listings, setListings] = useState<MyListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ListingStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyListingId, setBusyListingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<MyListingItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmActionTarget>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [inviteModalData, setInviteModalData] = useState<ZaloInviteData | null>(null);
  const [generatingInviteId, setGeneratingInviteId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ignore = false;

    requestMyListings()
      .then((result) => {
        if (ignore) return;
        if (result.unauthorized) {
          router.push("/login?returnTo=/my-items?tab=listings");
          return;
        }
        if (result.error) {
          setFetchError(result.error);
          return;
        }
        const loaded = result.listings || [];
        setListings(loaded);
        onCountChange?.(loaded.length);
      })
      .catch(() => {
        if (!ignore) {
          setFetchError("Lỗi kết nối khi tải danh sách tin đăng bán.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [router, onCountChange]);

  const handleRetryFetch = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const result = await requestMyListings();
      if (result.unauthorized) {
        router.push("/login?returnTo=/my-items?tab=listings");
        return;
      }
      if (result.error) {
        setFetchError(result.error);
        return;
      }
      const loaded = result.listings || [];
      setListings(loaded);
      onCountChange?.(loaded.length);
    } catch {
      setFetchError("Lỗi kết nối khi tải danh sách tin đăng bán.");
    } finally {
      setLoading(false);
    }
  };

  // Đóng menu thao tác khi nhấn Escape hoặc click ra ngoài
  useEffect(() => {
    if (!openMenuId) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        event.target instanceof Node &&
        !menuContainerRef.current.contains(event.target)
      ) {
        setOpenMenuId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const counts = useMemo(() => {
    const summary = {
      all: listings.length,
      AVAILABLE: 0,
      RESERVED: 0,
      SOLD: 0,
      HIDDEN_EXPIRED: 0,
    };

    for (const listing of listings) {
      if (listing.status === "AVAILABLE") summary.AVAILABLE += 1;
      else if (listing.status === "RESERVED") summary.RESERVED += 1;
      else if (listing.status === "SOLD") summary.SOLD += 1;
      else if (listing.status === "HIDDEN" || listing.status === "EXPIRED") {
        summary.HIDDEN_EXPIRED += 1;
      }
    }

    return summary;
  }, [listings]);

  const filteredListings = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return listings.filter((listing) => {
      if (statusFilter === "HIDDEN_EXPIRED") {
        if (listing.status !== "HIDDEN" && listing.status !== "EXPIRED") {
          return false;
        }
      } else if (statusFilter !== "all" && listing.status !== statusFilter) {
        return false;
      }

      if (!keyword) return true;

      return (
        listing.title.toLowerCase().includes(keyword) ||
        (listing.category?.name || "").toLowerCase().includes(keyword)
      );
    });
  }, [listings, statusFilter, searchQuery]);

  const handleToggleVisibility = async (listing: MyListingItem) => {
    setOpenMenuId(null);
    if (listing.status === "RESERVED") {
      onNotify("error", "Không thể tạm ẩn món đồ đang được giữ chỗ cho người mua.");
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
        onNotify("error", data.error || "Không thể cập nhật trạng thái hiển thị.");
        return;
      }

      const nextStatus: MyListingItem["status"] =
        data.status || (listing.status === "AVAILABLE" ? "HIDDEN" : "AVAILABLE");

      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id ? { ...item, status: nextStatus } : item
        )
      );
      onNotify("success", data.message || "Đã cập nhật trạng thái tin đăng.");
    } catch {
      onNotify("error", "Lỗi kết nối khi cập nhật trạng thái tin đăng.");
    } finally {
      setBusyListingId(null);
    }
  };

  const handleRenew = async (listing: MyListingItem) => {
    setOpenMenuId(null);
    if (listing.status === "RESERVED") {
      onNotify("error", "Không thể gia hạn khi tin đang được giữ chỗ cho người mua.");
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
        onNotify("error", data.error || "Không thể gia hạn tin đăng.");
        return;
      }

      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id
            ? {
                ...item,
                status: "AVAILABLE",
                expiresAt: data.expiresAt || item.expiresAt,
                daysRemaining: "Còn 30 ngày",
              }
            : item
        )
      );
      onNotify("success", data.message || "Đã gia hạn tin đăng thêm 30 ngày.");
    } catch {
      onNotify("error", "Lỗi kết nối khi gia hạn tin đăng.");
    } finally {
      setBusyListingId(null);
    }
  };

  const handleOpenEdit = (listing: MyListingItem) => {
    setOpenMenuId(null);
    if (listing.status === "RESERVED") {
      onNotify("error", "Không thể chỉnh sửa thông tin khi tin đang được giữ chỗ cho người mua.");
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

      const targetId = editingListing.id;
      setListings((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? {
                ...item,
                title: payload.title,
                price: payload.price,
                isFree: payload.isFree,
                condition: payload.condition,
                description: payload.description,
                zaloPhone: payload.zaloPhone,
                hidePhone: payload.hidePhone,
              }
            : item
        )
      );

      setEditingListing(null);
      onNotify("success", data.message || "Đã cập nhật thông tin tin đăng.");
    } catch {
      setEditError("Lỗi kết nối khi cập nhật thông tin tin đăng.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenConfirm = (mode: "delete" | "mark_sold", listing: MyListingItem) => {
    setOpenMenuId(null);
    if (mode === "delete" && (listing.status === "RESERVED" || listing.hasActiveOrder)) {
      onNotify("error", "Không thể xóa sản phẩm đang có lịch hẹn hoạt động.");
      return;
    }
    setConfirmTarget({ mode, listing });
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;

    const { mode, listing } = confirmTarget;
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
          onNotify("error", data.error || "Không thể đánh dấu tin đã bán.");
          setConfirmTarget(null);
          return;
        }

        setListings((prev) =>
          prev.map((item) => (item.id === listing.id ? { ...item, status: "SOLD" } : item))
        );
        setConfirmTarget(null);
        onNotify("success", data.message || "Đã đánh dấu món đồ là Đã bán.");
        return;
      }

      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        onNotify("error", data.error || "Không thể xóa tin đăng.");
        setConfirmTarget(null);
        return;
      }

      const nextListings = listings.filter((item) => item.id !== listing.id);
      setListings(nextListings);
      onCountChange?.(nextListings.length);
      window.dispatchEvent(new Event("unicycle-auth-change"));
      setConfirmTarget(null);
      onNotify("success", data.message || "Đã xóa tin đăng thành công.");
    } catch {
      onNotify("error", "Lỗi kết nối khi xử lý yêu cầu.");
      setConfirmTarget(null);
    } finally {
      setConfirmingAction(false);
    }
  };

  const handleCreateInvite = async (listing: MyListingItem) => {
    setOpenMenuId(null);
    setGeneratingInviteId(listing.id);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        onNotify("error", data.error || "Không thể tạo link chốt bán cho khách Zalo.");
        return;
      }

      setInviteModalData({
        listingTitle: data.listingTitle || listing.title,
        inviteUrl: data.inviteUrl,
        fullInviteUrl: data.fullInviteUrl,
        qrUrl: data.qrUrl,
      });
    } catch {
      onNotify("error", "Lỗi kết nối khi tạo link chốt bán Zalo.");
    } finally {
      setGeneratingInviteId(null);
    }
  };

  const filterTabs: Array<{ key: ListingStatusFilter; label: string; count: number }> = [
    { key: "all", label: "Tất cả", count: counts.all },
    { key: "AVAILABLE", label: "Đang mở bán", count: counts.AVAILABLE },
    { key: "RESERVED", label: "Đang giữ chỗ", count: counts.RESERVED },
    { key: "SOLD", label: "Đã bán", count: counts.SOLD },
    { key: "HIDDEN_EXPIRED", label: "Tạm ẩn / Hết hạn", count: counts.HIDDEN_EXPIRED },
  ];

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Đang tải tin đăng bán">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-[#D6E8EE] animate-pulse motion-reduce:animate-none"
          >
            <div className="flex items-start gap-4">
              <div className="w-[84px] h-[84px] sm:w-24 sm:h-24 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2.5 py-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-24 rounded-full bg-slate-200" />
                  <div className="h-5 w-20 rounded-full bg-slate-100" />
                </div>
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-4 w-1/3 rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-[#D6E8EE] space-y-3.5">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
          Không tải được danh sách tin đăng
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          {fetchError}
        </p>
        <div className="pt-1">
          <button
            type="button"
            onClick={handleRetryFetch}
            className="px-4 py-2 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Thanh công cụ lọc trạng thái & tìm kiếm nhanh */}
      {listings.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#D6E8EE] p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo trạng thái tin đăng">
            {filterTabs.map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-1 ${
                    isActive
                      ? "bg-[#001B48] text-white"
                      : "bg-[#F4F9FB] text-[#02457A] hover:bg-[#D6E8EE]/70"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 leading-none rounded-full text-[11px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-[#02457A]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <label htmlFor="my-listings-search" className="sr-only">
              Tìm kiếm tin đăng bán
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
              id="my-listings-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên tin đăng, danh mục..."
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-[#D6E8EE] bg-[#F8FAFC] focus:bg-white text-xs sm:text-sm text-[#001B48] placeholder:text-slate-400 focus:outline-none focus:border-[#018ABE] focus:ring-2 focus:ring-[#018ABE]/20 transition-colors [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-slate-400 hover:text-[#001B48] hover:bg-slate-200/70 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Danh sách tin đăng / Empty State */}
      {listings.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-[#D6E8EE] space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#E3F1F9] text-[#018ABE] flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#001B48]">
            Bạn chưa có tin đăng bán nào
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Đăng bán giáo trình, đồ gia dụng KTX hoặc tặng đồ miễn phí cho các bạn sinh viên trong trường chỉ với vài bước đơn giản.
          </p>
          <div className="pt-2">
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
            >
              Đăng tin ngay
            </Link>
          </div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-[#D6E8EE] space-y-3.5">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#F4F9FB] text-[#02457A] flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#001B48]">
            Không tìm thấy tin đăng phù hợp
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Không có tin đăng nào khớp với trạng thái hoặc từ khóa bạn đang chọn.
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredListings.map((listing) => {
            const statusBadge = LISTING_STATUS_MAP[listing.status] || LISTING_STATUS_MAP.AVAILABLE;
            const isAvailable = listing.status === "AVAILABLE";
            const isReserved = listing.status === "RESERVED";
            const isSold = listing.status === "SOLD";
            const isHidden = listing.status === "HIDDEN";
            const isExpired = listing.status === "EXPIRED";
            const isBusy = busyListingId === listing.id;
            const isMenuOpen = openMenuId === listing.id;
            const mainImage = listing.images[0]?.url || DEFAULT_LISTING_IMAGE;
            const priceText =
              listing.isFree || listing.price === 0
                ? "Miễn phí 0đ"
                : `${listing.price.toLocaleString("vi-VN")}đ`;

            return (
              <article
                key={listing.id}
                className={`bg-white rounded-2xl p-5 border shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group ${
                  isReserved
                    ? "border-amber-200"
                    : "border-[#D6E8EE] hover:border-[#018ABE]/60"
                }`}
              >
                {/* 1. Vùng Thông Tin Tin Đăng */}
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <Link
                      href={`/products/${listing.id}`}
                      className="block relative w-[84px] h-[84px] sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 border border-[#E2EEF3] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                    >
                      <Image
                        src={mainImage}
                        alt={listing.title}
                        fill
                        sizes="96px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                      />
                    </Link>

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

                        {listing.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F4F9FB] text-[#02457A] border border-[#D6E8EE] whitespace-nowrap max-w-full truncate">
                            {listing.category.name}
                          </span>
                        )}

                        {!isSold && listing.daysRemaining && (
                          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                            {listing.daysRemaining}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-[15px] font-bold text-[#001B48] line-clamp-2 leading-snug">
                        <Link
                          href={`/products/${listing.id}`}
                          className="hover:text-[#018ABE] transition-colors focus-visible:outline-none focus-visible:underline"
                        >
                          {listing.title}
                        </Link>
                      </h3>

                      <p className="text-sm font-extrabold text-[#018ABE]">{priceText}</p>

                      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>{listing.condition}</span>
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
                      </p>
                    </div>
                  </div>

                  {typeof listing.pendingOrdersCount === "number" &&
                    listing.pendingOrdersCount > 0 && (
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
                </div>

                {/* 2. Vùng Thanh Hành Động Chân Thẻ */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                      </svg>
                    </Link>

                    {listing.item?.passportEnabled && (
                      <Link
                        href={`/passport/${listing.item.passportId || listing.item.id}`}
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
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Hành trình</span>
                      </Link>
                    )}
                  </div>

                  <div
                    className="ml-auto flex items-center gap-2"
                    ref={isMenuOpen ? menuContainerRef : undefined}
                  >
                    {isHidden && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleVisibility(listing)}
                        className="h-9 px-3.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{isBusy ? "Đang xử lý..." : "Mở lại tin"}</span>
                      </button>
                    )}

                    {isExpired && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRenew(listing)}
                        className="h-9 px-3.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span>{isBusy ? "Đang xử lý..." : "Gia hạn 30 ngày"}</span>
                      </button>
                    )}

                    {isAvailable && (
                      <button
                        type="button"
                        disabled={generatingInviteId === listing.id || isBusy}
                        onClick={() => handleCreateInvite(listing)}
                        className="h-9 px-3 rounded-xl bg-[#0068FF]/10 hover:bg-[#0068FF]/20 text-[#0068FF] border border-[#0068FF]/25 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.861-.861 5.972 5.972 0 011.057-3.035C4.604 15.69 4 13.93 4 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                          />
                        </svg>
                        <span>
                          {generatingInviteId === listing.id ? "Đang tạo..." : "Chốt bán Zalo"}
                        </span>
                      </button>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        aria-label={`Thao tác thêm cho ${listing.title}`}
                        onClick={() => setOpenMenuId(isMenuOpen ? null : listing.id)}
                        className="w-9 h-9 rounded-xl border border-[#D6E8EE] bg-white hover:bg-slate-50 text-[#001B48] inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                        </svg>
                      </button>

                      {isMenuOpen && (
                        <div
                          role="menu"
                          aria-label={`Tùy chọn cho ${listing.title}`}
                          className="absolute right-0 top-full mt-1.5 z-20 min-w-[215px] rounded-2xl bg-white border border-[#D6E8EE] shadow-xl p-1.5 space-y-0.5"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            disabled={isReserved || isBusy}
                            onClick={() => handleOpenEdit(listing)}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#001B48] hover:bg-[#F4F9FB] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col gap-0.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                          >
                            <span>Chỉnh sửa tin đăng</span>
                            {isReserved && (
                              <span className="text-[11px] font-normal text-slate-500">
                                Đang giữ chỗ cho người mua
                              </span>
                            )}
                          </button>

                          {!isSold && !isExpired && (
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isReserved || isBusy}
                              onClick={() => handleToggleVisibility(listing)}
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

                          {!isSold && (
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isBusy}
                              onClick={() => handleOpenConfirm("mark_sold", listing)}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#001B48] hover:bg-[#F4F9FB] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                            >
                              Đánh dấu đã bán
                            </button>
                          )}

                          <button
                            type="button"
                            role="menuitem"
                            disabled={isReserved || isBusy}
                            onClick={() => handleRenew(listing)}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#001B48] hover:bg-[#F4F9FB] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col gap-0.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                          >
                            <span>Gia hạn thêm 30 ngày</span>
                            {isReserved && (
                              <span className="text-[11px] font-normal text-slate-500">
                                Đang giữ chỗ cho người mua
                              </span>
                            )}
                          </button>

                          <div className="my-1 border-t border-slate-100" role="separator" />

                          <button
                            type="button"
                            role="menuitem"
                            disabled={isReserved || Boolean(listing.hasActiveOrder) || isBusy}
                            onClick={() => handleOpenConfirm("delete", listing)}
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
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

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

      <ZaloInviteModal
        invite={inviteModalData}
        onClose={() => setInviteModalData(null)}
        onCopyError={(msg) => onNotify("error", msg)}
      />
    </div>
  );
}
