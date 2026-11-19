"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface MyItemData {
  id: string;
  passportId: string | null;
  passportStatus: string;
  identityLevel: string;
  category: { id: string; name: string; slug: string };
  title: string;
  thumbnail: string;
  totalOwners: number;
  myOwnerSeq: number;
  showNameOnPassport: boolean;
  ownedSince: string;
  isCurrentlyListed: boolean;
  latestListingId?: string | null;
  latestListingStatus?: string | null;
  latestListingPrice?: number | null;
  latestListingIsFree?: boolean;
  passportUrl?: string | null;
  qrUrl?: string | null;
  chainTx?: {
    id: string;
    status: string;
    txHash?: string | null;
  } | null;
}

type StatusFilter = "all" | "available" | "reserved" | "owned";

function getItemStatus(item: MyItemData): Exclude<StatusFilter, "all"> {
  if (item.latestListingStatus === "RESERVED") {
    return "reserved";
  }
  if (item.latestListingStatus === "AVAILABLE" || item.isCurrentlyListed) {
    return "available";
  }
  return "owned";
}

const STATUS_BADGE_MAP: Record<
  Exclude<StatusFilter, "all">,
  { label: string; badgeClass: string; dotClass: string }
> = {
  available: {
    label: "Đang mở bán",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  reserved: {
    label: "Đang giữ chỗ",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  owned: {
    label: "Đang sử dụng",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
};

const formatListingPrice = (price?: number | null, isFree?: boolean): string | null => {
  if (isFree || price === 0) {
    return "Miễn phí 0đ";
  }
  if (typeof price === "number" && price > 0) {
    return `${price.toLocaleString("vi-VN")}đ`;
  }
  return null;
};

interface MyItemsClientProps {
  initialItems: MyItemData[];
}

export function MyItemsClient({ initialItems }: MyItemsClientProps) {
  const [items, setItems] = useState<MyItemData[]>(initialItems);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeQrItem, setActiveQrItem] = useState<MyItemData | null>(null);
  const [qrLoadState, setQrLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [qrRetryKey, setQrRetryKey] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeQrBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const openQrModal = (item: MyItemData) => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    setCopiedLink(false);
    setQrLoadState("loading");
    setQrRetryKey(0);
    setActiveQrItem(item);
  };

  const closeQrModal = useCallback(() => {
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    setCopiedLink(false);
    setActiveQrItem(null);
  }, []);

  useEffect(() => {
    if (!activeQrItem) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const openerElement = previousFocusRef.current;
    document.body.style.overflow = "hidden";

    const frameId = requestAnimationFrame(() => {
      closeQrBtnRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeQrModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      openerElement?.focus();
    };
  }, [activeQrItem, closeQrModal]);

  const showToast = (type: "success" | "error", text: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setMessage({ type, text });
    toastTimerRef.current = setTimeout(() => {
      setMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const handleCopyPassportLink = async () => {
    if (!activeQrItem) return;

    const shareUrl =
      activeQrItem.passportId && typeof window !== "undefined"
        ? `${window.location.origin}/passport/${activeQrItem.passportId}`
        : activeQrItem.passportUrl || "";

    if (!shareUrl) {
      showToast("error", "Không tìm thấy liên kết hành trình để sao chép.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopiedLink(false);
        copyTimerRef.current = null;
      }, 2000);
    } catch {
      showToast("error", "Không thể sao chép liên kết. Vui lòng thử lại.");
    }
  };

  const counts = useMemo(() => {
    const summary = {
      all: items.length,
      available: 0,
      reserved: 0,
      owned: 0,
    };

    for (const item of items) {
      summary[getItemStatus(item)] += 1;
    }

    return summary;
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== "all" && getItemStatus(item) !== statusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return (
        item.title.toLowerCase().includes(keyword) ||
        item.category.name.toLowerCase().includes(keyword)
      );
    });
  }, [items, statusFilter, searchQuery]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Xử lý bật/tắt hiển thị tên trên hành trình đồ vật
  const handleToggleShowName = async (itemId: string, currentShowName: boolean) => {
    setUpdatingId(itemId);
    const newShowName = !currentShowName;

    try {
      const res = await fetch(`/api/my-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showName: newShowName }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error || "Không thể cập nhật tùy chọn hiển thị.");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, showNameOnPassport: newShowName } : item
        )
      );

      showToast("success", data.message);
    } catch {
      showToast("error", "Lỗi kết nối khi cập nhật tùy chọn hiển thị.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filterTabs: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: "all", label: "Tất cả", count: counts.all },
    { key: "available", label: "Đang mở bán", count: counts.available },
    { key: "reserved", label: "Đang giữ chỗ", count: counts.reserved },
    { key: "owned", label: "Đang sử dụng", count: counts.owned },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* 1. Header tinh gọn */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
                Đồ của tôi
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E3F1F9] text-[#02457A] border border-[#BAE6FD] whitespace-nowrap">
                {items.length} món
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#475569] mt-1">
              Quản lý đồ dùng đang sở hữu, mã QR đối chiếu khi gặp mặt và đăng bán lại nhanh chóng.
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
        {items.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo trạng thái món đồ">
              {filterTabs.map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-1 ${isActive
                      ? "bg-[#001B48] text-white"
                      : "bg-[#F4F9FB] text-[#02457A] hover:bg-[#D6E8EE]/70"
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 leading-none rounded-full text-[11px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-white text-[#02457A]"
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-72 shrink-0">
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
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Danh sách đồ của tôi / Empty State */}
        {items.length === 0 ? (
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
              Khi bạn mua đồ từ sinh viên khác hoặc đăng món đồ mới trên UniCycle, thông tin sở hữu và mã QR sẽ hiển thị tại đây.
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
        ) : filteredItems.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredItems.map((item) => {
              const isUpdating = updatingId === item.id;
              const itemStatus = getItemStatus(item);
              const statusBadge = STATUS_BADGE_MAP[itemStatus];
              const isListed =
                (itemStatus === "available" || itemStatus === "reserved") &&
                Boolean(item.latestListingId);
              const detailHref =
                isListed && item.latestListingId
                  ? `/products/${item.latestListingId}`
                  : item.passportId
                    ? `/passport/${item.passportId}`
                    : null;
              const priceLabel = isListed
                ? formatListingPrice(item.latestListingPrice, item.latestListingIsFree)
                : null;

              const thumbnailImage = (
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  sizes="96px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                />
              );

              return (
                <article
                  key={item.id}
                  className="bg-white rounded-2xl p-5 border border-[#D6E8EE] hover:border-[#018ABE]/60 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                >
                  {/* 1. Vùng Định Danh Sản Phẩm */}
                  <div className="space-y-4">
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
                            {item.category.name}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-[15px] font-bold text-[#001B48] line-clamp-2 leading-snug">
                          {detailHref ? (
                            <Link
                              href={detailHref}
                              className="hover:text-[#018ABE] transition-colors focus-visible:outline-none focus-visible:underline"
                            >
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}
                        </h3>

                        {priceLabel && (
                          <p className="text-sm font-extrabold text-[#018ABE]">{priceLabel}</p>
                        )}

                        <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span>
                            Đời chủ #{item.myOwnerSeq}/{item.totalOwners}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Sở hữu từ {formatDate(item.ownedSince)}</span>
                        </p>
                      </div>
                    </div>

                    {/* 2. Vùng Hành Trình & Quyền Riêng Tư Gọn Nhẹ */}
                    <div className="rounded-xl bg-[#F8FAFC] border border-[#E2EEF3] divide-y divide-[#E2EEF3]">
                      {item.passportId && (
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

                          {item.chainTx?.txHash && (
                            <a
                              href={`https://testnet.snowtrace.io/tx/${item.chainTx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-[#018ABE] hover:text-[#02457A] hover:underline whitespace-nowrap rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
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
                            {item.showNameOnPassport
                              ? "Tên của bạn sẽ hiển thị với người xem sau."
                              : `Đang ẩn danh (hiển thị dạng Đời chủ #${item.myOwnerSeq}).`}
                          </span>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.showNameOnPassport}
                          aria-busy={isUpdating}
                          aria-label={`Hiển thị tên của bạn trên hành trình của ${item.title}`}
                          disabled={isUpdating}
                          onClick={() => handleToggleShowName(item.id, item.showNameOnPassport)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2 disabled:opacity-60 ${item.showNameOnPassport ? "bg-[#018ABE]" : "bg-slate-300"
                            }`}
                        >
                          <span
                            className={`pointer-events-none h-5 w-5 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-200 motion-reduce:transition-none ${item.showNameOnPassport ? "translate-x-5" : "translate-x-0"
                              }`}
                          >
                            {isUpdating && (
                              <span
                                className="w-3 h-3 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Vùng Thanh Hành Động Chân Thẻ */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.qrUrl && (
                        <button
                          type="button"
                          onClick={() => openQrModal(item)}
                          className="h-9 px-3 rounded-xl bg-[#F4F9FB] hover:bg-[#D6E8EE]/70 text-[#001B48] border border-[#D6E8EE] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
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
                              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
                            />
                          </svg>
                          <span>Mã QR</span>
                        </button>
                      )}

                      {item.passportId && (
                        <Link
                          href={`/passport/${item.passportId}`}
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
                    </div>

                    <div className="ml-auto">
                      {!isListed ? (
                        <Link
                          href={`/sell?resellItemId=${item.id}`}
                          className="h-9 px-3.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
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
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                          </svg>
                          <span>Bán lại</span>
                        </Link>
                      ) : item.latestListingId ? (
                        <Link
                          href={`/products/${item.latestListingId}`}
                          className="h-9 px-3.5 rounded-xl bg-[#E3F1F9] hover:bg-[#BAE6FD]/70 text-[#02457A] border border-[#BAE6FD] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
                        >
                          <span>Xem tin đăng</span>
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
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Modal QR Code Khi Gặp Mặt (WCAG 2.2) */}
      {activeQrItem && activeQrItem.qrUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
          onClick={closeQrModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
            aria-describedby="qr-modal-desc"
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#D6E8EE] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h3 id="qr-modal-title" className="font-extrabold text-[#001B48] text-base text-left">
                Mã QR hành trình đồ vật
              </h3>
              <button
                ref={closeQrBtnRef}
                type="button"
                onClick={closeQrModal}
                aria-label="Đóng hộp thoại mã QR"
                className="w-10 h-10 -mr-1.5 rounded-xl text-slate-500 hover:text-[#001B48] hover:bg-slate-100 inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center space-y-0.5">
              <p className="text-sm font-bold text-[#001B48] line-clamp-2">{activeQrItem.title}</p>
              <p className="text-xs text-slate-500">
                Đời chủ #{activeQrItem.myOwnerSeq}/{activeQrItem.totalOwners}
              </p>
            </div>

            <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE] p-3 flex items-center justify-center overflow-hidden">
              {qrLoadState === "loading" && (
                <div
                  className="absolute inset-3 rounded-xl bg-slate-200/70 animate-pulse motion-reduce:animate-none flex items-center justify-center"
                  aria-hidden="true"
                >
                  <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                    />
                  </svg>
                </div>
              )}

              {qrLoadState === "error" ? (
                <div className="text-center space-y-2.5 px-3">
                  <svg
                    className="w-8 h-8 text-amber-600 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Không tải được mã QR. Bạn vẫn có thể sao chép liên kết bên dưới.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQrLoadState("loading");
                      setQrRetryKey((k) => k + 1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#E3F1F9] hover:bg-[#BAE6FD]/70 text-[#02457A] text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                  >
                    Thử tải lại
                  </button>
                </div>
              ) : (
                <Image
                  key={`${activeQrItem.id}-${qrRetryKey}`}
                  src={
                    qrRetryKey > 0
                      ? `${activeQrItem.qrUrl}${activeQrItem.qrUrl.includes("?") ? "&" : "?"}retry=${qrRetryKey}`
                      : activeQrItem.qrUrl
                  }
                  alt={`Mã QR hành trình của ${activeQrItem.title}`}
                  fill
                  sizes="256px"
                  className={`object-contain p-3 transition-opacity duration-200 motion-reduce:transition-none ${
                    qrLoadState === "loaded" ? "opacity-100" : "opacity-0"
                  }`}
                  unoptimized
                  onLoad={() => setQrLoadState("loaded")}
                  onError={() => setQrLoadState("error")}
                />
              )}
            </div>

            <p id="qr-modal-desc" className="text-xs text-slate-600 text-center leading-relaxed">
              Đưa mã này cho người mua quét trực tiếp khi gặp mặt để kiểm tra toàn bộ lịch sử đời chủ của món đồ.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyPassportLink}
                className={`flex-1 h-10 px-3.5 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] ${
                  copiedLink
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-[#F4F9FB] hover:bg-[#D6E8EE]/70 text-[#001B48] border-[#D6E8EE]"
                }`}
              >
                {copiedLink ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                    <span>Sao chép link</span>
                  </>
                )}
              </button>

              {activeQrItem.passportId && (
                <Link
                  href={`/passport/${activeQrItem.passportId}`}
                  onClick={closeQrModal}
                  className="flex-1 h-10 px-3.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
                >
                  <span>Xem hành trình</span>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

