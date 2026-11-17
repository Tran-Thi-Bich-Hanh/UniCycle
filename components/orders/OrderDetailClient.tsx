"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DisputeModal } from "@/components/orders/DisputeModal";
import { ReviewModal } from "@/components/orders/ReviewModal";
import { OrderReview } from "@/components/orders/OrdersManager";

interface OrderDetailPayload {
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
  resolutionNote?: string | null;
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
    images: Array<{ url: string }>;
    item?: {
      id: string;
      passportEnabled: boolean;
      passportId?: string | null;
      passportStatus: string;
      owners?: Array<{
        seq: number;
        showName: boolean;
        since: string;
        user?: { id: string; displayName: string } | null;
      }>;
    } | null;
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

interface OrderDetailClientProps {
  orderId: string;
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetailPayload | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [acting, setActing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // Modal đánh giá Blind Review BR14
  const [reviewOpen, setReviewOpen] = useState(false);

  const handleReviewSuccess = (isUnlocked: boolean, message: string) => {
    setReviewOpen(false);
    setFeedback({
      type: "success",
      text: message,
    });
    loadOrder();
  };

  const loadOrder = async () => {
    try {
      const [meRes, orderRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/orders/${orderId}`),
      ]);

      if (orderRes.status === 401) {
        router.push(`/login?returnTo=/orders/${orderId}`);
        return;
      }

      if (meRes.ok) {
        const meJson = await meRes.json();
        if (meJson.user?.id) {
          setCurrentUserId(meJson.user.id);
        }
      }

      const orderJson = await orderRes.json();
      if (!orderRes.ok) {
        setError(orderJson.error || "Không thể tải thông tin đơn hẹn.");
        return;
      }

      setOrder(orderJson.order);
    } catch {
      setError("Lỗi kết nối khi tải chi tiết đơn hẹn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function initialFetch() {
      try {
        const [meRes, orderRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch(`/api/orders/${orderId}`),
        ]);

        if (orderRes.status === 401) {
          router.push(`/login?returnTo=/orders/${orderId}`);
          return;
        }

        if (meRes.ok && !ignore) {
          const meJson = await meRes.json();
          if (meJson.user?.id) {
            setCurrentUserId(meJson.user.id);
          }
        }

        const orderJson = await orderRes.json();
        if (!orderRes.ok) {
          if (!ignore) {
            setError(orderJson.error || "Không thể tải thông tin đơn hẹn.");
          }
          return;
        }

        if (!ignore) {
          setOrder(orderJson.order);
        }
      } catch {
        if (!ignore) {
          setError("Lỗi kết nối khi tải chi tiết đơn hẹn.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initialFetch();
    return () => {
      ignore = true;
    };
  }, [orderId, router]);

  const handleAction = async (
    action: "accept" | "reject" | "cancel" | "confirm_handover"
  ) => {
    setFeedback(null);

    if (
      action === "accept" &&
      !confirm("Chấp nhận lịch hẹn này sẽ chuyển món đồ sang Giữ chỗ (RESERVED) và từ chối các yêu cầu khác (BR11). Tiếp tục?")
    ) {
      return;
    }

    if (
      action === "cancel" &&
      !confirm("Bạn có chắc muốn hủy lịch hẹn này? Món đồ sẽ được mở bán lại trên sàn (BR21).")
    ) {
      return;
    }

    if (
      action === "confirm_handover" &&
      !confirm("Xác nhận hai bên đã gặp mặt trực tiếp và hoàn tất trao tay món đồ?")
    ) {
      return;
    }

    setActing(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Không thể thực hiện thao tác." });
        return;
      }

      setFeedback({ type: "success", text: data.message });
      await loadOrder();
    } catch {
      setFeedback({ type: "error", text: "Lỗi kết nối khi cập nhật đơn hàng." });
    } finally {
      setActing(false);
    }
  };

  const handleDisputeSubmit = async (reason: string) => {
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispute", disputeReason: reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDisputeError(data.error || "Không thể gửi khiếu nại.");
        return;
      }

      setDisputeOpen(false);
      setFeedback({ type: "success", text: data.message });
      await loadOrder();
    } catch {
      setDisputeError("Lỗi kết nối khi gửi khiếu nại.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-[#02457A]">Đang tải chi tiết đơn hẹn...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl p-8 border border-[#D6E8EE] space-y-4">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-lg font-extrabold text-[#001B48]">Không thể hiển thị đơn hẹn</h2>
          <p className="text-xs sm:text-sm text-slate-600">{error || "Đơn hẹn không tồn tại."}</p>
          <Link
            href="/orders"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#018ABE] text-white text-xs font-bold"
          >
            ← Quay lại danh sách đơn hẹn
          </Link>
        </div>
      </div>
    );
  }

  const isSeller = currentUserId === order.sellerId;
  const isBuyer = currentUserId === order.buyerId;
  const partner = isSeller ? order.buyer : order.seller;

  const isPending = order.status === "PENDING";
  const isAccepted = order.status === "ACCEPTED";
  const isWaiting = order.status === "WAITING_CONFIRMATION";
  const isDisputed = order.status === "DISPUTED";
  const isCompleted = ["COMPLETED", "AUTO_COMPLETED"].includes(order.status);
  const isHandoverPhase = isAccepted || isWaiting;

  const hasConfirmedSelf = isSeller
    ? Boolean(order.sellerConfirmedAt)
    : Boolean(order.buyerConfirmedAt);

  const myReview = order.reviews?.find((r) => r.reviewerId === currentUserId);
  const partnerReview = order.reviews?.find((r) => r.reviewerId !== currentUserId);

  const mainImage =
    order.listing.images[0]?.url ||
    "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400";

  // Xác định bước hiện tại trên stepper 4 bước
  const currentStep = isCompleted ? 4 : isWaiting ? 3 : isAccepted ? 2 : isPending ? 1 : 0;
  const steps = [
    { num: 1, label: "Đặt lịch hẹn" },
    { num: 2, label: "Giữ chỗ (RESERVED)" },
    { num: 3, label: "Xác nhận 48h" },
    { num: 4, label: "Hoàn tất & Passport" },
  ];

  const latestOwner = order.listing.item?.owners?.[order.listing.item.owners.length - 1];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#02457A] hover:text-[#018ABE] transition-colors"
        >
          <span>← Quay lại Quản lý đơn hẹn</span>
        </Link>
        <span className="text-[11px] font-mono text-slate-400">Mã đơn: {order.id.slice(0, 8)}</span>
      </div>

      {/* Feedback thông báo */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm border flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Thanh tiến trình 4 bước */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#D6E8EE] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h1 className="text-lg sm:text-xl font-extrabold text-[#001B48]">
            Tiến Trình Giao Dịch Trao Tay
          </h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold ${
              isDisputed
                ? "bg-rose-600 text-white"
                : isCompleted
                ? "bg-blue-600 text-white"
                : isWaiting
                ? "bg-indigo-600 text-white"
                : isAccepted
                ? "bg-emerald-600 text-white"
                : isPending
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {order.status}
          </span>
        </div>

        {isDisputed ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 space-y-1.5">
            <p className="font-bold">🚨 Đơn hàng đang trong trạng thái Khiếu Nại (DISPUTED - BR13)</p>
            <p>
              <strong>Lý do từ người mua:</strong> {order.disputeReason}
            </p>
            <p className="text-[11px] text-rose-600">
              Thời điểm gửi: {formatDateTime(order.disputedAt)} • Hệ thống đã chặn tự động hoàn tất và chuyển Admin xử lý trong SLA 72 giờ.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {steps.map((s) => {
              const done = currentStep >= s.num;
              return (
                <div
                  key={s.num}
                  className={`p-3 rounded-2xl border text-xs transition-all ${
                    done
                      ? "bg-[#018ABE]/10 border-[#018ABE] text-[#001B48] font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <span className="block text-[10px] uppercase tracking-wider mb-0.5">
                    Bước {s.num}
                  </span>
                  <span>{done ? "✓ " : ""}{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Thông tin Sản phẩm & Lịch hẹn */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#D6E8EE] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row gap-4 pb-5 border-b border-slate-100">
          <Link
            href={`/products/${order.listingId}`}
            className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-200 bg-slate-50"
          >
            <Image src={mainImage} alt={order.listing.title} fill className="object-cover" />
          </Link>
          <div className="space-y-1.5 flex-1">
            <span className="text-[11px] font-bold text-[#018ABE] bg-[#D6E8EE]/40 px-2.5 py-0.5 rounded-full">
              {order.listing.category?.name || "Đồ dùng sinh viên"}
            </span>
            <Link
              href={`/products/${order.listingId}`}
              className="text-base sm:text-lg font-extrabold text-[#001B48] hover:text-[#018ABE] block"
            >
              {order.listing.title}
            </Link>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="font-extrabold text-[#018ABE]">
                {order.proposedPrice === 0
                  ? "🎁 Miễn phí 0đ"
                  : `${order.proposedPrice.toLocaleString("vi-VN")} đ`}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[#02457A]">{order.listing.condition}</span>
            </div>
          </div>
        </div>

        {/* Chi tiết hẹn & Đối tác */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE] space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#018ABE] block">
              Thông tin gặp mặt
            </span>
            <p className="text-[#001B48]">
              <strong>📍 Địa điểm:</strong> {order.meetPlace}
            </p>
            <p className="text-[#001B48]">
              <strong>⏰ Thời gian hẹn:</strong> {formatDateTime(order.meetTime)}
            </p>
            <p className="text-slate-500 text-xs">
              <strong>⏳ Hạn xử lý hiện tại:</strong> {formatDateTime(order.expiresAt)}
            </p>
            {order.message && (
              <p className="text-xs italic text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                &quot;{order.message}&quot;
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#018ABE] block">
              {isSeller ? "Người mua" : "Người bán"}
            </span>
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                <Image
                  src={
                    partner.avatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                  }
                  alt={partner.displayName}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-bold text-[#001B48] text-sm">
                  {partner.displayName}{" "}
                  {partner.isStudentVerified && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                      ✓ SV Đã duyệt
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#02457A]">
                  {partner.dorm || order.listing.school?.shortName || "Sinh viên KTX"} • ⭐{" "}
                  {partner.reputationScore?.toFixed(1) || "5.0"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bảng trạng thái xác nhận bàn giao 2 chiều (BR07, BR13) */}
        {(isHandoverPhase || isCompleted || isDisputed) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-[#001B48]">
              Trạng thái xác nhận bàn giao 2 chiều (Cửa sổ 48h - BR07, BR13)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                className={`p-3 rounded-xl border ${
                  order.sellerConfirmedAt
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <span className="font-bold block">
                  {order.sellerConfirmedAt
                    ? "✓ Người bán đã xác nhận bàn giao"
                    : "○ Người bán chưa xác nhận"}
                </span>
                {order.sellerConfirmedAt && (
                  <span className="text-[11px] block mt-0.5">
                    Lúc: {formatDateTime(order.sellerConfirmedAt)}
                  </span>
                )}
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  order.buyerConfirmedAt
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <span className="font-bold block">
                  {order.buyerConfirmedAt
                    ? "✓ Người mua đã xác nhận nhận hàng"
                    : "○ Người mua chưa xác nhận"}
                </span>
                {order.buyerConfirmedAt && (
                  <span className="text-[11px] block mt-0.5">
                    Lúc: {formatDateTime(order.buyerConfirmedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. Hộp Digital Product Passport sau khi chuyển giao (BR26, BR31) */}
        {order.listing.item?.passportEnabled && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#001B48] text-white space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <span>📜 Digital Product Passport</span>
                {latestOwner && (
                  <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Đời chủ hiện tại: #{latestOwner.seq}
                  </span>
                )}
              </span>
              {order.listing.item.passportId && (
                <span className="text-[11px] font-mono text-slate-300">
                  {order.listing.item.passportId.slice(0, 12)}...
                  {order.listing.item.passportId.slice(-6)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              {isCompleted
                ? "Quyền sở hữu món đồ đã được ghi nhận chuyển giao thành công sang người mua trên hệ thống (BR26)."
                : "Sau khi hai bên xác nhận hoàn tất giao dịch, món đồ sẽ tự động chuyển giao sang người mua và xuất hiện trong mục Đồ của tôi."}
            </p>
            {isCompleted && isBuyer && (
              <Link
                href="/my-items"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                <span>Mở Đồ của tôi (/my-items) ↗</span>
              </Link>
            )}
          </div>
        )}

        {/* Khối Đánh Giá Blind Review 48 Giờ (BR14) */}
        {isCompleted && (
          <div className="bg-white rounded-3xl p-6 border border-[#D6E8EE] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6E8EE]">
              <h3 className="font-extrabold text-[#001B48] text-sm sm:text-base flex items-center gap-2">
                <span>⭐</span>
                <span>Đánh Giá Uy Tín Giao Dịch (Blind Review - BR14)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {myReview?.visibleAt ? "Đã công khai" : "Bảo mật đối ứng 48h"}
              </span>
            </div>

            {/* Trạng thái đánh giá của chính mình */}
            <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-700">
                Đánh giá của bạn:{" "}
                {myReview ? (
                  <strong className="text-amber-600 font-extrabold">
                    {myReview.rating}★ {myReview.visibleAt ? "(Công khai)" : "(Đang bảo mật 48h)"}
                  </strong>
                ) : (
                  <span className="text-rose-600 font-semibold">Bạn chưa gửi đánh giá cho đối tác</span>
                )}
              </span>
              {!myReview && (
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  ⭐ Đánh giá ngay
                </button>
              )}
            </div>

            {/* Trạng thái đánh giá của đối tác */}
            {partnerReview ? (
              partnerReview.isBlindHidden ? (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                  <span className="text-xl shrink-0">🔔</span>
                  <div className="space-y-1">
                    <strong className="block text-amber-950 font-bold">
                      Đối tác đã gửi đánh giá bí mật cho bạn!
                    </strong>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      {!myReview
                        ? "Nội dung đang được giữ kín. Hãy gửi đánh giá của bạn để cùng mở khóa nhận xét đối ứng và tích lũy điểm uy tín sinh viên nhé (BR14)!"
                        : "Cả hai nhận xét đang được bảo mật và sẽ tự động mở khóa đồng thời sau khi hệ thống đồng bộ hoặc tối đa 48h (BR14)."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#001B48]">
                      Nhận xét từ {isSeller ? order.buyer.displayName : order.seller.displayName}:
                    </span>
                    <span className="font-extrabold text-amber-500 text-sm">
                      {"★".repeat(partnerReview.rating)}{"☆".repeat(5 - partnerReview.rating)} ({partnerReview.rating}/5)
                    </span>
                  </div>
                  {partnerReview.comment && (
                    <p className="italic text-slate-700 bg-white p-3 rounded-xl border border-slate-100">
                      &ldquo;{partnerReview.comment}&rdquo;
                    </p>
                  )}
                  {partnerReview.tags && partnerReview.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {partnerReview.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-white border border-slate-200 px-2.5 py-0.5 rounded-full font-semibold text-slate-600"
                        >
                          ✓ {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-500">
                Đối tác chưa gửi đánh giá. Nếu sau 48 giờ đối tác không nộp, đánh giá của bạn sẽ tự động công khai (BR14).
              </div>
            )}
          </div>
        )}

        {/* 5. Cụm nút thao tác hành động */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          {isSeller && isPending && (
            <>
              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction("accept")}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {acting ? "Đang xử lý..." : "✓ Chấp nhận giữ đồ"}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction("reject")}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                Từ chối
              </button>
            </>
          )}

          {isBuyer && isPending && (
            <button
              type="button"
              disabled={acting}
              onClick={() => handleAction("cancel")}
              className="px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold border border-rose-200 cursor-pointer disabled:opacity-50"
            >
              Hủy yêu cầu hẹn
            </button>
          )}

          {isHandoverPhase && (
            <>
              {!hasConfirmedSelf && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => handleAction("confirm_handover")}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {acting
                    ? "Đang xác nhận..."
                    : isSeller
                    ? "🤝 Xác nhận tôi đã bàn giao đồ"
                    : "📦 Xác nhận tôi đã nhận được đồ"}
                </button>
              )}

              {isBuyer && !hasConfirmedSelf && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => {
                    setDisputeError(null);
                    setDisputeOpen(true);
                  }}
                  className="px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  🚨 Tôi chưa nhận hàng (Khiếu nại)
                </button>
              )}

              <Link
                href={`/products/${order.listingId}?action=zalo`}
                className="px-4 py-3 rounded-xl bg-[#0068FF] hover:bg-[#0052cc] text-white text-xs sm:text-sm font-bold shadow-sm"
              >
                💬 Nhắn Zalo đối tác
              </Link>

              {isAccepted && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => handleAction("cancel")}
                  className="px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold border border-rose-200 cursor-pointer disabled:opacity-50"
                >
                  Hủy lịch hẹn (BR21)
                </button>
              )}
            </>
          )}

          {isCompleted && (
            <>
              {!myReview ? (
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span>⭐ Đánh giá giao dịch</span>
                </button>
              ) : !myReview.visibleAt ? (
                <span className="px-4 py-3 rounded-xl bg-amber-50 text-amber-800 text-xs sm:text-sm font-bold border border-amber-200 flex items-center gap-1.5">
                  <span>🔒 Đã gửi đánh giá ({myReview.rating}★ - Đang chờ mở khóa đối ứng BR14)</span>
                </span>
              ) : (
                <span className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-bold border border-emerald-200 flex items-center gap-1.5">
                  <span>✓ Đã đánh giá ({myReview.rating}★ - Công khai)</span>
                </span>
              )}

              {isBuyer && order.listing.item?.passportEnabled && (
                <Link
                  href="/my-items"
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm"
                >
                  📜 Mở Đồ của tôi (/my-items)
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Khiếu nại BR13 */}
      <DisputeModal
        isOpen={disputeOpen}
        orderTitle={order.listing.title}
        submitting={disputeSubmitting}
        error={disputeError}
        onClose={() => {
          if (!disputeSubmitting) setDisputeOpen(false);
        }}
        onSubmit={handleDisputeSubmit}
      />

      {/* Modal Đánh giá Blind Review BR14 */}
      {order && (
        <ReviewModal
          isOpen={reviewOpen}
          orderId={order.id}
          orderTitle={order.listing.title}
          partnerName={isSeller ? order.buyer.displayName : order.seller.displayName}
          isSellerRole={isSeller}
          onClose={() => setReviewOpen(false)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
