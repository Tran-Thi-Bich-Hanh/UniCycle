"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

interface MyItemsClientProps {
  initialItems: MyItemData[];
}

export function MyItemsClient({ initialItems }: MyItemsClientProps) {
  const [items, setItems] = useState<MyItemData[]>(initialItems);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeQrItem, setActiveQrItem] = useState<MyItemData | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

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

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D6E8EE] hover:border-[#018ABE]/60 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between gap-5 relative group"
                >
                  {/* Khối trên: Ảnh đại diện + Thông tin chính */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail ảnh */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          fill
                          sizes="96px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Tiêu đề & Danh mục */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#018ABE] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                            {item.category.name}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                            Đời chủ #{item.myOwnerSeq}
                          </span>
                          {item.isCurrentlyListed && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-md">
                              Đang mở bán
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-extrabold text-[#001B48] line-clamp-2 leading-snug">
                          {item.title}
                        </h3>

                        <p className="text-[11px] text-slate-500">
                          Sở hữu từ: {formatDate(item.ownedSince)} • Tổng cộng {item.totalOwners} đời chủ
                        </p>
                      </div>
                    </div>

                    {/* Khung Passport ID */}
                    {item.passportId && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#001B48] flex items-center gap-1">
                            <span>📜</span>
                            <span>Passport ID:</span>
                          </span>
                          <Link
                            href={`/passport/${item.passportId}`}
                            className="font-bold text-[#018ABE] hover:underline"
                          >
                            Xem lịch sử ↗
                          </Link>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 truncate bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          {item.passportId}
                        </div>
                        {item.chainTx?.txHash && (
                          <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                            <span className="text-emerald-700 font-semibold">
                              ✓ On-chain ({item.chainTx.status})
                            </span>
                            <a
                              href={`https://testnet.snowtrace.io/tx/${item.chainTx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-[#018ABE] hover:underline font-mono"
                            >
                              ⛓️ Snowtrace ({item.chainTx.txHash.slice(0, 8)}...) ↗
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Toggle hiển thị tên trên Passport (BR29) */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#D6E8EE]/20 border border-[#D6E8EE]/60 text-xs">
                      <div className="space-y-0.5 pr-2">
                        <span className="font-bold text-[#001B48] block">
                          Hiển thị tên của bạn trên Passport (BR29)
                        </span>
                        <span className="text-[11px] text-[#02457A]">
                          {item.showNameOnPassport
                            ? "Đang hiển thị tên thật của bạn cho người mua sau"
                            : "Đang ở chế độ ẩn danh (Chủ #n · Trường · Tháng/Năm)"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleShowName(item.id, item.showNameOnPassport)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${item.showNameOnPassport ? "bg-emerald-600" : "bg-slate-300"
                          } disabled:opacity-50`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${item.showNameOnPassport ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Khối dưới: Nút hành động */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                    {/* Nút hiển thị QR */}
                    {item.qrUrl && (
                      <button
                        type="button"
                        onClick={() => setActiveQrItem(item)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#001B48] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>📱 Mã QR số</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Nút Bán lại (Kế thừa Passport BR24, BR25, BR33) */}
                      {!item.isCurrentlyListed ? (
                        <Link
                          href={`/sell?resellItemId=${item.id}`}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <span>🔄 Bán lại 1-chạm</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/products/${item.latestListingId}`}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
                        >
                          Xem tin đang bán ↗
                        </Link>
                      )}

                      {/* Xem chi tiết Passport */}
                      {item.passportId && (
                        <Link
                          href={`/passport/${item.passportId}`}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#02457A] border border-[#D6E8EE] text-xs font-bold transition-colors"
                        >
                          Lịch sử ↗
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
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
          className={`fixed bottom-5 right-5 left-5 sm:left-auto z-50 sm:max-w-sm rounded-2xl p-3.5 shadow-lg border flex items-start gap-2.5 text-xs sm:text-sm ${
            message.type === "success"
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

      {/* Modal QR Code Toàn Màn Hình Khi Gặp Mặt */}
      {activeQrItem && activeQrItem.qrUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveQrItem(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-[#001B48] text-base">
                Mã Định Danh Số Khi Gặp Mặt
              </h3>
              <button
                type="button"
                onClick={() => setActiveQrItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-bold text-[#001B48] line-clamp-1">
              {activeQrItem.title}
            </p>

            <div className="relative w-64 h-64 mx-auto border-2 border-dashed border-[#018ABE]/30 p-2 rounded-2xl bg-slate-50">
              <Image
                src={activeQrItem.qrUrl}
                alt="Passport QR Fullscreen"
                fill
                sizes="256px"
                className="object-contain p-2"
                unoptimized
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Đưa màn hình này cho bạn mua quét đối chiếu chuỗi đời chủ và ảnh qua các thế hệ trực tiếp tại KTX/Căng tin (BR24, BR30).
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href={`/passport/${activeQrItem.passportId}`}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#001B48] text-xs font-bold transition-colors"
              >
                Xem trang Passport
              </Link>
              <button
                type="button"
                onClick={() => setActiveQrItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

