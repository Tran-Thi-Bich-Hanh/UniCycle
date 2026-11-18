"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export function MyProductsManager() {
  const router = useRouter();

  const [listings, setListings] = useState<MyListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal Sửa tin
  const [editingListing, setEditingListing] = useState<MyListingItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editIsFree, setEditIsFree] = useState(false);
  const [editCondition, setEditCondition] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editZaloPhone, setEditZaloPhone] = useState("");
  const [editHidePhone, setEditHidePhone] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Lời mời chốt bán Zalo (BR38)
  const [inviteModalData, setInviteModalData] = useState<{
    listingTitle: string;
    inviteUrl: string;
    fullInviteUrl: string;
    qrUrl: string;
  } | null>(null);
  const [generatingInviteId, setGeneratingInviteId] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Tải danh sách tin
  const loadListings = async () => {
    try {
      const res = await fetch("/api/listings/my");
      if (res.status === 401) {
        router.push("/login?returnTo=/my-products");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error("Lỗi tải tin của tôi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function initialFetch() {
      try {
        const res = await fetch("/api/listings/my");
        if (res.status === 401) {
          router.push("/login?returnTo=/my-products");
          return;
        }
        if (res.ok && !ignore) {
          const data = await res.json();
          setListings(data.listings || []);
        }
      } catch (err) {
        console.error("Lỗi tải tin ban đầu:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    initialFetch();

    return () => {
      ignore = true;
    };
  }, [router]);

  // Tính số liệu tóm tắt (Stats)
  const availableCount = listings.filter((l) => l.status === "AVAILABLE").length;
  const reservedCount = listings.filter((l) => l.status === "RESERVED").length;
  const soldCount = listings.filter((l) => l.status === "SOLD").length;
  const passportCount = listings.filter((l) => l.item?.passportEnabled).length;

  // Lọc theo Tab
  const filteredListings = listings.filter((l) => {
    if (activeTab === "all") return true;
    if (activeTab === "AVAILABLE") return l.status === "AVAILABLE";
    if (activeTab === "RESERVED") return l.status === "RESERVED";
    if (activeTab === "SOLD") return l.status === "SOLD";
    if (activeTab === "HIDDEN_EXPIRED") return l.status === "HIDDEN" || l.status === "EXPIRED";
    return true;
  });

  // Xử lý Tạm ẩn / Mở lại (toggle_visibility)
  const handleToggleVisibility = async (listing: MyListingItem) => {
    setActionError(null);
    setActionSuccess(null);

    if (listing.status === "RESERVED") {
      setActionError("Món đồ đang ở trạng thái giữ chỗ (RESERVED), không thể tạm ẩn theo quy định BR18.");
      return;
    }

    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_visibility" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Không thể thay đổi trạng thái hiển thị.");
        return;
      }

      setActionSuccess(data.message);
      await loadListings();
    } catch {
      setActionError("Lỗi kết nối khi cập nhật trạng thái.");
    }
  };

  // Xử lý Đánh dấu đã bán (mark_sold)
  const handleMarkSold = async (listingId: string) => {
    setActionError(null);
    setActionSuccess(null);

    if (!confirm("Bạn có chắc chắn muốn đánh dấu món đồ này đã bán thành công?")) return;

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_sold" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Không thể cập nhật.");
        return;
      }

      setActionSuccess("Đã đánh dấu món đồ Đã Bán thành công (BR10).");
      await loadListings();
    } catch {
      setActionError("Lỗi kết nối khi cập nhật.");
    }
  };

  // Xử lý Gia hạn 30 ngày (renew)
  const handleRenew = async (listingId: string) => {
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renew" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Không thể gia hạn tin đăng.");
        return;
      }

      setActionSuccess("Đã gia hạn tin đăng thêm 30 ngày thành công (BR15)!");
      await loadListings();
    } catch {
      setActionError("Lỗi kết nối khi gia hạn.");
    }
  };

  // Xử lý Xóa tin đăng (DELETE kèm guard BR18)
  const handleDelete = async (listing: MyListingItem) => {
    setActionError(null);
    setActionSuccess(null);

    if (listing.status === "RESERVED" || listing.hasActiveOrder) {
      setActionError("Không thể xóa sản phẩm đang được giữ chỗ (RESERVED) theo quy định BR18.");
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn tin đăng "${listing.title}"?`)) return;

    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Không thể xóa tin đăng.");
        return;
      }

      setActionSuccess("Đã xóa tin đăng thành công.");
      await loadListings();
    } catch {
      setActionError("Lỗi kết nối khi xóa tin.");
    }
  };

  // Mở modal sửa
  const openEditModal = (listing: MyListingItem) => {
    if (listing.status === "RESERVED") {
      setActionError("Món đồ đang ở trạng thái giữ chỗ (RESERVED), không thể chỉnh sửa thông tin theo BR18.");
      return;
    }

    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditPrice(listing.price.toString());
    setEditIsFree(listing.isFree);
    setEditCondition(listing.condition);
    setEditDescription(listing.description);
    setEditZaloPhone(listing.zaloPhone);
    setEditHidePhone(listing.hidePhone);
    setActionError(null);
    setActionSuccess(null);
  };

  // Lưu chỉnh sửa (update_info)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setSavingEdit(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_info",
          title: editTitle.trim(),
          price: editIsFree ? 0 : parseInt(editPrice) || 0,
          isFree: editIsFree,
          condition: editCondition,
          description: editDescription.trim(),
          zaloPhone: editZaloPhone.trim(),
          hidePhone: editHidePhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Không thể lưu thay đổi.");
        return;
      }

      setActionSuccess("Đã cập nhật thông tin món đồ thành công (kèm thông báo BR22 nếu có người mua đặt hẹn)!");
      setEditingListing(null);
      await loadListings();
    } catch {
      setActionError("Lỗi kết nối khi cập nhật thông tin.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Tạo lời mời chốt bán cho khách Zalo (BR38)
  const handleCreateInvite = async (listingId: string, listingTitle: string) => {
    setActionError(null);
    setGeneratingInviteId(listingId);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Không thể tạo lời mời chốt bán.");
        return;
      }

      setInviteModalData({
        listingTitle,
        inviteUrl: data.inviteUrl,
        fullInviteUrl: data.fullInviteUrl,
        qrUrl: data.qrUrl,
      });
    } catch {
      setActionError("Lỗi kết nối khi tạo lời mời chốt bán Zalo.");
    } finally {
      setGeneratingInviteId(null);
    }
  };

  const handleCopyInviteLink = () => {
    if (!inviteModalData?.fullInviteUrl) return;
    navigator.clipboard.writeText(inviteModalData.fullInviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* 1. HEADER & THỐNG KÊ NHANH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#018ABE] block mb-1">
            Không Gian Người Bán
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
            Quản Lý Tin Đăng Cá Nhân
          </h1>
          <p className="text-xs sm:text-sm text-[#02457A] mt-1">
            Theo dõi tình trạng đơn hẹn, bảo quản vòng đời món đồ và quản lý trao tay an toàn
          </p>
        </div>

        <Link
          href="/sell"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all"
        >
          <span>⚡ Đăng tin mới (&lt; 60s)</span>
        </Link>
      </div>

      {/* 4 Thẻ thống kê (Stats Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D6E8EE] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#02457A]">Đang Mở Bán</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#001B48]">
            {availableCount}
          </span>
          <span className="text-[11px] text-[#02457A]/80 block mt-1">Hiển thị công khai trên sàn</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D6E8EE] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700">Đang Giữ Chỗ</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-900">
            {reservedCount}
          </span>
          <span className="text-[11px] text-amber-700/80 block mt-1">Có người mua đặt lịch hẹn</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D6E8EE] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Đã Trao Tay</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            {soldCount}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Giao dịch thành công (BR10)</span>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-[#001B48] text-white rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#D6E8EE]">Digital Passport</span>
            <span className="text-sm">📜</span>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-white">
            {passportCount}
          </span>
          <span className="text-[11px] text-slate-300 block mt-1">Có hồ sơ đời chủ tuần hoàn</span>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {actionError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold text-rose-500 hover:text-rose-700 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-emerald-500 hover:text-emerald-700 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* 2. DẢI TABS BỘ LỌC TRẠNG THÁI */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar border-b border-[#D6E8EE]">
        {[
          { key: "all", label: `Tất cả (${listings.length})` },
          { key: "AVAILABLE", label: `Đang bán (${availableCount})` },
          { key: "RESERVED", label: `Đang giữ chỗ (${reservedCount})` },
          { key: "SOLD", label: `Đã bán (${soldCount})` },
          { key: "HIDDEN_EXPIRED", label: `Tạm ẩn / Hết hạn` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-[#018ABE] text-white shadow-xs"
                : "bg-white text-[#001B48] border border-[#D6E8EE] hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. DANH SÁCH TIN ĐĂNG */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-semibold text-[#02457A]">Đang tải danh sách tin của bạn...</span>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-16 border border-[#D6E8EE] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-4">
            📦
          </div>
          <h3 className="text-lg font-extrabold text-[#001B48] mb-1">
            Chưa có tin đăng nào ở mục này
          </h3>
          <p className="text-xs sm:text-sm text-[#02457A] mb-5">
            Bạn có thể đăng bán đồ dùng, giáo trình hoặc tặng đồ miễn phí cho sinh viên trong vòng chưa đầy 60 giây.
          </p>
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-xs sm:text-sm shadow-md transition-all"
          >
            <span>+ Đăng tin ngay</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredListings.map((listing) => {
            const isReserved = listing.status === "RESERVED";
            const isSold = listing.status === "SOLD";
            const isHidden = listing.status === "HIDDEN";
            const isExpired = listing.status === "EXPIRED";
            const mainImage = listing.images[0]?.url || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400";
            const daysRemainingText = listing.daysRemaining || "Còn 30 ngày";

            return (
              <div
                key={listing.id}
                className={`bg-white rounded-3xl p-4 sm:p-6 border transition-all duration-300 ${
                  isReserved
                    ? "border-amber-300 bg-amber-50/20 shadow-xs"
                    : isSold
                    ? "border-slate-200 opacity-80"
                    : "border-[#D6E8EE] hover:border-[#018ABE]/60 hover:shadow-sm"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Cột trái: Ảnh & Thông tin */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50">
                      <Image
                        src={mainImage}
                        alt={listing.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Huy hiệu trạng thái & Danh mục */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isReserved ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Đang Giữ Chỗ (RESERVED)
                          </span>
                        ) : isSold ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700">
                            Đã Bán Thành Công
                          </span>
                        ) : isHidden ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-600 border border-dashed border-slate-300">
                            Tạm Ẩn Khỏi Sàn
                          </span>
                        ) : isExpired ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700">
                            Hết Hạn 30 Ngày
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đang Mở Bán
                          </span>
                        )}

                        {listing.category && (
                          <span className="text-[11px] font-semibold text-[#02457A] bg-[#D6E8EE]/40 px-2 py-0.5 rounded-md">
                            {listing.category.name}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 font-medium">
                          {daysRemainingText} (BR15)
                        </span>
                      </div>

                      {/* Tiêu đề */}
                      <h3 className="text-base sm:text-lg font-bold text-[#001B48] truncate">
                        {listing.title}
                      </h3>

                      {/* Giá tiền & Địa điểm */}
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                        <span className="font-extrabold text-[#018ABE]">
                          {listing.isFree || listing.price === 0
                            ? "🎁 Miễn phí 0đ"
                            : `${listing.price.toLocaleString("vi-VN")} đ`}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[#02457A] font-medium">
                          {listing.condition}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[#02457A] font-medium">
                          📍 {listing.school?.shortName || "Làng ĐH"}
                        </span>
                      </div>

                      {/* Huy hiệu Passport */}
                      {listing.item?.passportEnabled && (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-mono">
                          <span className="text-emerald-400">
                            📜 Đời chủ #{listing.item.owners?.length || 1}
                          </span>
                          <span className="text-slate-400 truncate max-w-[150px] sm:max-w-[200px]">
                            {listing.item.passportId || "0x..."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cột phải: Cụm nút thao tác (Actions) */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    {/* Nút Chốt bán Zalo (BR38) */}
                    {!isReserved && !isSold && !isHidden && (
                      <button
                        type="button"
                        onClick={() => handleCreateInvite(listing.id, listing.title)}
                        disabled={generatingInviteId === listing.id}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0068FF]/10 text-[#0068FF] hover:bg-[#0068FF]/20 border border-[#0068FF]/30 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        title="Tạo link chốt bán nhanh cho khách Zalo 24h (BR38)"
                      >
                        <span>{generatingInviteId === listing.id ? "Đang tạo..." : "📲 Chốt bán Zalo"}</span>
                      </button>
                    )}

                    {/* Nút Sửa tin (khóa nếu RESERVED theo BR18) */}
                    <button
                      type="button"
                      onClick={() => openEditModal(listing)}
                      disabled={isReserved}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isReserved
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-white text-[#001B48] border-[#D6E8EE] hover:bg-[#D6E8EE]/40 hover:border-[#018ABE]"
                      }`}
                      title={isReserved ? "Không thể sửa khi đang giữ chỗ (BR18)" : "Chỉnh sửa thông tin"}
                    >
                      ✏️ Sửa tin
                    </button>

                    {/* Nút Tạm ẩn / Mở lại */}
                    {!isSold && (
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(listing)}
                        disabled={isReserved}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isReserved
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : isHidden
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                        title={isReserved ? "Không thể ẩn khi đang giữ chỗ (BR18)" : ""}
                      >
                        {isHidden ? "👁️ Mở lại" : "🔒 Tạm ẩn"}
                      </button>
                    )}

                    {/* Nút Đã Bán */}
                    {!isSold && (
                      <button
                        type="button"
                        onClick={() => handleMarkSold(listing.id)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Đánh dấu đã bán xong (BR10)"
                      >
                        🤝 Đã bán
                      </button>
                    )}

                    {/* Nút Gia hạn 30 ngày (BR15) */}
                    <button
                      type="button"
                      onClick={() => handleRenew(listing.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-[#018ABE] border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                      title="Gia hạn tin đăng 30 ngày (BR15)"
                    >
                      🔄 Gia hạn
                    </button>

                    {/* Nút Xóa tin (Khóa tuyệt đối nếu RESERVED theo BR18) */}
                    <button
                      type="button"
                      onClick={() => handleDelete(listing)}
                      disabled={isReserved || listing.hasActiveOrder}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isReserved || listing.hasActiveOrder
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      }`}
                      title={
                        isReserved
                          ? "Không thể xóa món đồ đang giữ chỗ (BR18)"
                          : "Xóa tin đăng vĩnh viễn"
                      }
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL CHỈNH SỬA THÔNG TIN */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-extrabold text-[#001B48]">
                Chỉnh Sửa Thông Tin Tin Đăng
              </h3>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Tiêu đề */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] mb-1">
                  Tiêu đề món đồ
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:border-[#018ABE] outline-none"
                  required
                />
              </div>

              {/* Tình trạng & Giá */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#001B48] mb-1">
                    Tình trạng
                  </label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-[#D6E8EE] text-xs font-semibold text-[#001B48] outline-none"
                  >
                    <option value="Mới 99%">Mới 99%</option>
                    <option value="Mới 98%">Mới 98%</option>
                    <option value="Còn rất tốt">Còn rất tốt</option>
                    <option value="Đã sử dụng">Đã sử dụng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001B48] mb-1">
                    Giá bán (VNĐ)
                  </label>
                  <input
                    type="number"
                    disabled={editIsFree}
                    value={editIsFree ? 0 : editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D6E8EE] text-sm font-bold text-[#001B48] outline-none disabled:bg-slate-100"
                    min={0}
                    step={5000}
                  />
                </div>
              </div>

              {/* Tùy chọn 0đ */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsFreeCheck"
                  checked={editIsFree}
                  onChange={(e) => setEditIsFree(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="editIsFreeCheck" className="text-xs font-bold text-emerald-700 cursor-pointer">
                  🎁 Chuyển thành tặng miễn phí 0đ
                </label>
              </div>

              {/* SĐT Zalo & Ẩn SĐT */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] mb-1">
                  Số điện thoại Zalo
                </label>
                <input
                  type="tel"
                  value={editZaloPhone}
                  onChange={(e) => setEditZaloPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                <input
                  type="checkbox"
                  id="editHidePhoneCheck"
                  checked={editHidePhone}
                  onChange={(e) => setEditHidePhone(e.target.checked)}
                  className="rounded text-[#018ABE] focus:ring-[#018ABE] cursor-pointer"
                />
                <label htmlFor="editHidePhoneCheck" className="text-xs text-[#001B48] font-semibold cursor-pointer">
                  🛡️ Ẩn SĐT công khai, người mua liên hệ qua nút Zalo bảo mật (BR36)
                </label>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#D6E8EE] text-xs text-[#001B48] outline-none resize-none"
                  required
                />
              </div>

              {/* Nút hành động Modal */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL LỜI MỜI CHỐT BÁN ZALO (BR38) */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#0068FF] text-white flex items-center justify-center text-sm font-bold">
                  📲
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#001B48]">
                    Link Chốt Bán Cho Khách Zalo
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Có hiệu lực trong 24 giờ (Quy tắc BR38)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalData(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn hãy gửi link hoặc đưa mã QR này cho bạn mua qua Zalo. Khi người mua bấm <strong>&quot;Xác nhận mua&quot;</strong>, món đồ sẽ tự động chuyển sang trạng thái <strong>Giữ chỗ (RESERVED)</strong> trên hệ thống:
            </p>

            {/* Mã QR */}
            <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="relative w-40 h-40 rounded-xl overflow-hidden bg-white p-2 border">
                <Image src={inviteModalData.qrUrl} alt="Invite QR" fill className="object-contain p-1" unoptimized />
              </div>
              <span className="text-[11px] text-slate-500 mt-2">Quét mã để mở link xác nhận mua ngay</span>
            </div>

            {/* Link & Copy */}
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={inviteModalData.fullInviteUrl}
                className="text-xs bg-transparent text-[#001B48] flex-1 outline-none font-mono truncate"
              />
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="px-3 py-1.5 rounded-lg bg-[#0068FF] hover:bg-[#0052cc] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                {copiedInvite ? "✓ Đã copy" : "Sao chép link"}
              </button>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[11px] text-[#02457A] space-y-1">
              <span className="font-bold block">💡 Lợi ích của cơ chế này:</span>
              <span>- Giúp đơn hàng được ghi nhận vào hệ thống để bảo lưu và tiếp nối chuỗi Đời chủ Product Passport.</span>
              <span>- Khóa ngay món đồ để người mua khác không đặt trùng (BR11).</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
