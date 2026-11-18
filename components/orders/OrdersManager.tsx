"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DisputeModal } from "@/components/orders/DisputeModal";
import { ReviewModal } from "@/components/orders/ReviewModal";

export interface OrderReview {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  tags: string[];
  submittedAt: string;
  visibleAt: string | null;
  isBlindHidden: boolean;
}

export interface OrderItem {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  proposedPrice: number;
  meetPlace: string;
  meetTime: string;
  message?: string | null;
  status:
    | "PENDING"
    | "ACCEPTED"
    | "WAITING_CONFIRMATION"
    | "COMPLETED"
    | "AUTO_COMPLETED"
    | "DISPUTED"
    | "REJECTED"
    | "CANCELLED"
    | "EXPIRED";
  confirmedFirstBy?: "BUYER" | "SELLER" | null;
  buyerConfirmedAt?: string | null;
  sellerConfirmedAt?: string | null;
  disputeReason?: string | null;
  disputedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    price: number;
    isFree?: boolean;
    condition: string;
    status: string;
    school?: { name?: string; shortName?: string } | null;
    category?: { name?: string; slug?: string } | null;
    item?: {
      id: string;
      passportEnabled?: boolean;
      passportId?: string | null;
      passportStatus?: string;
    } | null;
    images: Array<{ url: string }>;
  };
  buyer: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    isStudentVerified?: boolean;
    reputationScore?: number;
    dorm?: string | null;
  };
  seller: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    isStudentVerified?: boolean;
    reputationScore?: number;
    dorm?: string | null;
  };
  reviews?: OrderReview[];
}

export function OrdersManager() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Tab chính: "seller" (Yêu cầu nhận được) hoặc "buyer" (Lịch hẹn đã gửi)
  const [activeTab, setActiveTab] = useState<"seller" | "buyer">("seller");
  // Lọc trạng thái phụ
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal khiếu nại BR13
  const [disputeTarget, setDisputeTarget] = useState<OrderItem | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Modal đánh giá Blind Review BR14
  const [reviewTarget, setReviewTarget] = useState<OrderItem | null>(null);

  const handleReviewSuccess = (isUnlocked: boolean, message: string) => {
    setReviewTarget(null);
    setActionMessage({
      type: "success",
      text: message,
    });
    loadOrders();
  };

  // Tải danh sách đơn
  const loadOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.status === 401) {
        router.push("/login?returnTo=/orders");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Lỗi tải đơn hẹn:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [meRes, ordersRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/orders"),
        ]);

        if (ordersRes.status === 401) {
          router.push("/login?returnTo=/orders");
          return;
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user?.id && !ignore) {
            setCurrentUserId(meData.user.id);
          }
        }

        if (ordersRes.ok && !ignore) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData.orders || []);
        }
      } catch (err) {
        console.warn("Lỗi khởi tạo:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [router]);

  // Xử lý Chấp nhận (accept), Từ chối (reject), Hủy (cancel), Xác nhận bàn giao (confirm_handover)
  const handleOrderAction = async (
    orderId: string,
    action: "accept" | "reject" | "cancel" | "confirm_handover"
  ) => {
    setActionMessage(null);

    if (action === "accept") {
      if (!confirm("Xác nhận chấp nhận lịch hẹn? Món đồ sẽ chuyển sang trạng thái GIỮ CHỖ (RESERVED) độc quyền và các yêu cầu khác sẽ tự động bị từ chối (BR11).")) {
        return;
      }
    }

    if (action === "cancel") {
      if (!confirm("Bạn có chắc chắn muốn hủy lịch hẹn này? Món đồ sẽ được mở bán lại trên sàn (BR21).")) {
        return;
      }
    }

    if (action === "confirm_handover") {
      if (!confirm("Bạn xác nhận hai bên đã gặp mặt trực tiếp và bàn giao món đồ thành công?")) {
        return;
      }
    }

    setActionLoadingId(orderId);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionMessage({ type: "error", text: data.error || "Không thể thực hiện thao tác." });
        return;
      }

      setActionMessage({ type: "success", text: data.message });
      await loadOrders();
    } catch {
      setActionMessage({ type: "error", text: "Đã xảy ra lỗi kết nối khi cập nhật đơn hẹn." });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Gửi khiếu nại chưa nhận hàng (BR13)
  const handleDisputeSubmit = async (reason: string) => {
    if (!disputeTarget) return;
    setDisputeSubmitting(true);
    setDisputeError(null);

    try {
      const res = await fetch(`/api/orders/${disputeTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispute", disputeReason: reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDisputeError(data.error || "Không thể gửi khiếu nại.");
        return;
      }

      setDisputeTarget(null);
      setActionMessage({ type: "success", text: data.message });
      await loadOrders();
    } catch {
      setDisputeError("Lỗi kết nối khi gửi khiếu nại.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  // Phân loại đơn theo tab Người Bán / Người Mua
  const sellerOrders = orders.filter((o) => o.sellerId === currentUserId);
  const buyerOrders = orders.filter((o) => o.buyerId === currentUserId);

  const pendingSellerCount = sellerOrders.filter((o) => o.status === "PENDING").length;

  const currentTabOrders = activeTab === "seller" ? sellerOrders : buyerOrders;

  // Lọc theo trạng thái
  const filteredOrders = currentTabOrders.filter((o) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "PENDING") return o.status === "PENDING";
    if (statusFilter === "ACCEPTED") {
      return ["ACCEPTED", "WAITING_CONFIRMATION", "DISPUTED"].includes(o.status);
    }
    if (statusFilter === "COMPLETED") return ["COMPLETED", "AUTO_COMPLETED"].includes(o.status);
    if (statusFilter === "CANCELLED") return ["CANCELLED", "REJECTED", "EXPIRED"].includes(o.status);
    return true;
  });

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("vi-VN", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#018ABE] block mb-1">
            Giao Dịch Sinh Viên
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
            Quản Lý Lịch Hẹn & Đơn Hàng
          </h1>
          <p className="text-xs sm:text-sm text-[#02457A] mt-1">
            Theo dõi yêu cầu xem đồ, duyệt giữ chỗ độc quyền và quản lý trao tay an toàn tại KTX
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#D6E8EE] hover:bg-[#D6E8EE]/40 text-[#001B48] text-xs sm:text-sm font-bold transition-all shadow-xs"
        >
          <span>Khám phá thêm món đồ ↗</span>
        </Link>
      </div>

      {/* Thông báo kết quả thao tác */}
      {actionMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionMessage.type === "success" ? "✅" : "⚠️"}</span>
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. DẢI TABS CHÍNH: BÁN (Nhận được) vs MUA (Đã gửi) */}
      <div className="flex items-center gap-3 p-1.5 bg-slate-100 rounded-2xl w-fit mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("seller");
            setStatusFilter("all");
          }}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "seller"
              ? "bg-white text-[#001B48] shadow-sm"
              : "text-[#02457A] hover:text-[#001B48]"
          }`}
        >
          <span>📥 Yêu Cầu Nhận Được (Bán)</span>
          {pendingSellerCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
              {pendingSellerCount} mới
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("buyer");
            setStatusFilter("all");
          }}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "buyer"
              ? "bg-white text-[#001B48] shadow-sm"
              : "text-[#02457A] hover:text-[#001B48]"
          }`}
        >
          <span>📤 Lịch Hẹn Đã Gửi (Mua)</span>
          <span className="text-xs text-slate-400">({buyerOrders.length})</span>
        </button>
      </div>

      {/* Dải bộ lọc trạng thái phụ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar border-b border-[#D6E8EE]">
        {[
          { key: "all", label: `Tất cả (${currentTabOrders.length})` },
          {
            key: "PENDING",
            label: `Chờ duyệt (${currentTabOrders.filter((o) => o.status === "PENDING").length})`,
          },
          {
            key: "ACCEPTED",
            label: `Giữ chỗ / Bàn giao (${currentTabOrders.filter((o) => ["ACCEPTED", "WAITING_CONFIRMATION", "DISPUTED"].includes(o.status)).length})`,
          },
          {
            key: "COMPLETED",
            label: `Đã hoàn tất (${currentTabOrders.filter((o) => ["COMPLETED", "AUTO_COMPLETED"].includes(o.status)).length})`,
          },
          {
            key: "CANCELLED",
            label: `Đã hủy / Từ chối (${currentTabOrders.filter((o) => ["CANCELLED", "REJECTED", "EXPIRED"].includes(o.status)).length})`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === tab.key
                ? "bg-[#018ABE] text-white shadow-xs"
                : "bg-white text-[#001B48] border border-[#D6E8EE] hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. DANH SÁCH ĐƠN HẸN */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-semibold text-[#02457A]">Đang tải danh sách lịch hẹn...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-16 border border-[#D6E8EE] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-4">
            📅
          </div>
          <h3 className="text-lg font-extrabold text-[#001B48] mb-1">
            Chưa có lịch hẹn nào ở mục này
          </h3>
          <p className="text-xs sm:text-sm text-[#02457A] mb-5">
            {activeTab === "seller"
              ? "Khi có sinh viên quan tâm và đặt lịch hẹn xem món đồ bạn đăng bán, yêu cầu sẽ xuất hiện tại đây."
              : "Bạn có thể duyệt tìm món đồ ưng ý và bấm 'Đặt lịch hẹn xem hàng' để giữ chỗ trước khi người khác mua."}
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-xs sm:text-sm shadow-md transition-all"
          >
            <span>Khám phá chợ đồ sinh viên</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isSellerRole = activeTab === "seller";
            const partner = isSellerRole ? order.buyer : order.seller;
            const isPending = order.status === "PENDING";
            const isAccepted = order.status === "ACCEPTED";
            const isWaitingConfirmation = order.status === "WAITING_CONFIRMATION";
            const isDisputed = order.status === "DISPUTED";
            const isCompleted = ["COMPLETED", "AUTO_COMPLETED"].includes(order.status);
            const isCancelled = ["CANCELLED", "REJECTED", "EXPIRED"].includes(order.status);
            const isHandoverPhase = isAccepted || isWaitingConfirmation;
            const isActing = actionLoadingId === order.id;

            const myReview = order.reviews?.find((r) => r.reviewerId === currentUserId);
            const partnerReview = order.reviews?.find((r) => r.reviewerId !== currentUserId);

            const hasConfirmedSelf = isSellerRole
              ? Boolean(order.sellerConfirmedAt)
              : Boolean(order.buyerConfirmedAt);

            const mainImage =
              order.listing.images && order.listing.images.length > 0
                ? order.listing.images[0].url
                : "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400";

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all ${
                  isDisputed
                    ? "border-rose-300 bg-rose-50/30 shadow-xs"
                    : isWaitingConfirmation
                    ? "border-indigo-300 bg-indigo-50/20 shadow-xs"
                    : isAccepted
                    ? "border-emerald-300 bg-emerald-50/20 shadow-xs"
                    : isPending
                    ? "border-amber-300 bg-amber-50/20 shadow-xs"
                    : "border-[#D6E8EE]"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Cột trái: Ảnh món đồ & Chi tiết hẹn */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Link
                      href={`/orders/${order.id}`}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50 block"
                    >
                      <Image src={mainImage} alt={order.listing.title} fill className="object-cover" />
                    </Link>

                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Huy hiệu trạng thái */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Chờ Người Bán Duyệt (48h - BR12)
                          </span>
                        )}
                        {isAccepted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                            <span>✓</span>
                            Đang Giữ Chỗ (RESERVED)
                          </span>
                        )}
                        {isWaitingConfirmation && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-600 text-white shadow-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Chờ Xác Nhận Đối Ứng (48h - BR13)
                          </span>
                        )}
                        {isDisputed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white shadow-xs">
                            🚨 Đang Khiếu Nại (SLA 72h - BR13)
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800">
                            {order.status === "AUTO_COMPLETED"
                              ? "Tự Hoàn Tất 48h (BR13)"
                              : "Đã Hoàn Tất Giao Dịch (BR07)"}
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-600">
                            {order.status === "REJECTED" ? "Đã Từ Chối" : order.status === "EXPIRED" ? "Hết Hạn (48h)" : "Đã Hủy Lịch Hẹn"}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">
                          Tạo lúc: {formatDateTime(order.createdAt)}
                        </span>
                      </div>

                      {/* Tiêu đề món đồ */}
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-base sm:text-lg font-bold text-[#001B48] hover:text-[#018ABE] transition-colors line-clamp-1 block"
                      >
                        {order.listing.title}
                      </Link>

                      {/* Chi tiết hẹn gặp mặt & Giá */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#02457A]">
                        <span className="font-extrabold text-[#018ABE] text-sm sm:text-base">
                          {order.proposedPrice === 0 ? "0đ (Cho tặng)" : `${order.proposedPrice.toLocaleString("vi-VN")} đ`}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-[#001B48]">
                          📍 {order.meetPlace}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ⏰ {formatDateTime(order.meetTime)}
                        </span>
                      </div>

                      {/* Trạng thái xác nhận bàn giao 2 chiều */}
                      {(isHandoverPhase || isCompleted || isDisputed) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold border ${
                              order.sellerConfirmedAt
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}
                          >
                            {order.sellerConfirmedAt ? "✓ Người bán đã bàn giao" : "○ Người bán chưa xác nhận"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold border ${
                              order.buyerConfirmedAt
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}
                          >
                            {order.buyerConfirmedAt ? "✓ Người mua đã nhận hàng" : "○ Người mua chưa xác nhận"}
                          </span>
                        </div>
                      )}

                      {/* Lời nhắn từ người mua */}
                      {order.message && (
                        <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200">
                          &quot;{order.message}&quot;
                        </p>
                      )}

                      {/* Lý do khiếu nại nếu DISPUTED */}
                      {isDisputed && order.disputeReason && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                          <strong>Lý do khiếu nại:</strong> {order.disputeReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cột phải: Đối tác & Cụm nút hành động */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    {/* Thẻ đối tác giao dịch */}
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                        <Image
                          src={partner.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                          alt={partner.displayName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="text-left sm:text-right lg:text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs font-bold text-[#001B48]">
                            {partner.displayName}
                          </span>
                          {partner.isStudentVerified && (
                            <span className="text-[10px] text-emerald-600" title="Đã duyệt sinh viên">✓</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          {isSellerRole ? "Người mua" : "Người bán"} • ⭐ {partner.reputationScore ? partner.reputationScore.toFixed(1) : "5.0"}
                        </span>
                      </div>
                    </div>

                    {/* Nút hành động theo trạng thái */}
                    <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                      {/* Người bán duyệt đơn PENDING (BR11) */}
                      {isSellerRole && isPending && (
                        <>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleOrderAction(order.id, "accept")}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isActing ? "Đang xử lý..." : "✓ Chấp nhận giữ đồ"}
                          </button>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleOrderAction(order.id, "reject")}
                            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                        </>
                      )}

                      {/* Người mua hủy đơn PENDING */}
                      {!isSellerRole && isPending && (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleOrderAction(order.id, "cancel")}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Hủy yêu cầu
                        </button>
                      )}

                      {/* Hai bên với đơn ACCEPTED hoặc WAITING_CONFIRMATION */}
                      {isHandoverPhase && (
                        <>
                          {!hasConfirmedSelf && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => handleOrderAction(order.id, "confirm_handover")}
                              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isActing
                                ? "Đang xử lý..."
                                : isSellerRole
                                ? "🤝 Đã bàn giao đồ"
                                : "📦 Đã nhận được đồ"}
                            </button>
                          )}

                          {/* Nút khiếu nại BR13 cho người mua khi người bán đã bấm trước */}
                          {!isSellerRole && isWaitingConfirmation && !hasConfirmedSelf && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => {
                                setDisputeError(null);
                                setDisputeTarget(order);
                              }}
                              className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              🚨 Tôi chưa nhận hàng
                            </button>
                          )}

                          <Link
                            href={`/products/${order.listingId}?action=zalo`}
                            className="px-3.5 py-2.5 rounded-xl bg-[#0068FF] hover:bg-[#0052cc] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <span>💬 Nhắn Zalo</span>
                          </Link>

                          {isAccepted && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => handleOrderAction(order.id, "cancel")}
                              className="px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                              title="Hủy lịch hẹn và mở bán lại món đồ (BR21)"
                            >
                              Hủy hẹn
                            </button>
                          )}
                        </>
                      )}

                      {isCompleted && (
                        <>
                          {!myReview ? (
                            <button
                              type="button"
                              onClick={() => setReviewTarget(order)}
                              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>⭐ Đánh giá</span>
                            </button>
                          ) : !myReview.visibleAt ? (
                            <span
                              className="px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 flex items-center gap-1.5"
                              title="Đánh giá đang được bảo mật - chờ đối tác nộp hoặc sau 48h tự mở khóa (BR14)"
                            >
                              <span>🔒 Đã gửi ({myReview.rating}★ - Chờ mở khóa)</span>
                            </span>
                          ) : (
                            <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1.5">
                              <span>✓ Đã đánh giá ({myReview.rating}★)</span>
                            </span>
                          )}

                          {!isSellerRole && order.listing.item?.passportEnabled && (
                            <Link
                              href={
                                order.listing.item?.passportId
                                  ? `/passport/${order.listing.item.passportId}`
                                  : "/my-products"
                              }
                              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-200 transition-colors"
                            >
                              📜 Xem Passport đồ vật ↗
                            </Link>
                          )}
                        </>
                      )}

                      <Link
                        href={`/orders/${order.id}`}
                        className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#02457A] text-xs font-bold border border-[#D6E8EE] transition-colors"
                      >
                        Chi tiết ↗
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Banner nhắc hẹn khi đơn ACCEPTED */}
                {isAccepted && (
                  <div className="mt-4 pt-3 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span>💡</span>
                      <span>
                        Gặp mặt tại <strong>{order.meetPlace}</strong> lúc <strong>{formatDateTime(order.meetTime)}</strong>, kiểm tra kỹ đồ rồi thanh toán trực tiếp và bấm xác nhận bàn giao.
                      </span>
                    </span>
                    <span className="text-[11px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                      Cửa sổ xác nhận 48h (BR13)
                    </span>
                  </div>
                )}

                {/* Banner nhắc xác nhận đối ứng 48h khi WAITING_CONFIRMATION */}
                {isWaitingConfirmation && (
                  <div className="mt-4 pt-3 border-t border-indigo-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-900">
                    <span className="font-medium">
                      ⏳{" "}
                      {hasConfirmedSelf
                        ? `Bạn đã xác nhận thành công. Đang chờ đối tác xác nhận đối ứng trước ${formatDateTime(order.expiresAt)} (tự động hoàn tất sau 48h theo BR13).`
                        : `Đối tác đã xác nhận bàn giao! Vui lòng xác nhận trước ${formatDateTime(order.expiresAt)} hoặc bấm "Tôi chưa nhận hàng" nếu có sự cố (BR13).`}
                    </span>
                  </div>
                )}

                {/* Khối Blind Review khi đơn đã hoàn tất (BR14) */}
                {isCompleted && partnerReview && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {partnerReview.isBlindHidden ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl">
                        <span className="flex items-center gap-2">
                          <span>🔔</span>
                          <span>
                            Đối tác đã gửi đánh giá cho bạn!{" "}
                            {!myReview ? (
                              <strong>Hãy gửi đánh giá đối ứng để cùng mở khóa xem nhận xét (BR14).</strong>
                            ) : (
                              <span>Đang chờ hoàn tất theo quy tắc Blind Review 48h (BR14).</span>
                            )}
                          </span>
                        </span>
                        {!myReview && (
                          <button
                            type="button"
                            onClick={() => setReviewTarget(order)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 cursor-pointer self-start sm:self-auto"
                          >
                            Đánh giá đối tác ngay
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200/70 p-3.5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#001B48]">
                            Nhận xét từ {isSellerRole ? order.buyer.displayName : order.seller.displayName}:
                          </span>
                          <span className="font-extrabold text-amber-500 text-sm">
                            {"★".repeat(partnerReview.rating)}{"☆".repeat(5 - partnerReview.rating)} ({partnerReview.rating}/5)
                          </span>
                        </div>
                        {partnerReview.comment && (
                          <p className="italic text-slate-600">&ldquo;{partnerReview.comment}&rdquo;</p>
                        )}
                        {partnerReview.tags && partnerReview.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {partnerReview.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full font-semibold text-slate-600"
                              >
                                ✓ {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Khiếu nại BR13 */}
      <DisputeModal
        isOpen={Boolean(disputeTarget)}
        orderTitle={disputeTarget?.listing.title || ""}
        submitting={disputeSubmitting}
        error={disputeError}
        onClose={() => {
          if (!disputeSubmitting) setDisputeTarget(null);
        }}
        onSubmit={handleDisputeSubmit}
      />

      {/* Modal Đánh giá Blind Review BR14 */}
      {reviewTarget && (
        <ReviewModal
          isOpen={Boolean(reviewTarget)}
          orderId={reviewTarget.id}
          orderTitle={reviewTarget.listing.title}
          partnerName={
            activeTab === "seller"
              ? reviewTarget.buyer.displayName
              : reviewTarget.seller.displayName
          }
          isSellerRole={activeTab === "seller"}
          onClose={() => setReviewTarget(null)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
