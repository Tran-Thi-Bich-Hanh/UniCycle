"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookingModal } from "@/components/orders/BookingModal";
import { ReportModal } from "@/components/reports/ReportModal";
import {
  ItemJourneyTimeline,
  JourneyOwnerStep,
} from "@/components/passport/ItemJourneyTimeline";
import {
  formatCompletedOrdersLabel,
  formatReputationSummary,
} from "@/lib/utils/reputation-display";

export interface ProductDetailData {
  id: string;
  title: string;
  description: string;
  price: number;
  isFree?: boolean;
  condition: string;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN" | "EXPIRED";
  expiresAt?: string;
  createdAt?: string;
  school?: {
    id: string;
    name: string;
    shortName: string;
    area?: string;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  seller: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    isStudentVerified?: boolean;
    reputationScore?: number;
    reviewCount?: number;
    completedOrdersCount?: number;
    dorm?: string | null;
  };
  item?: {
    id: string;
    passportEnabled?: boolean;
    passportId?: string | null;
    passportStatus?: string;
    identityLevel?: string;
    latestTxHash?: string | null;
    owners?: Array<{
      seq: number;
      showName: boolean;
      since?: string;
      schoolShortName?: string | null;
      txHash?: string | null;
      user?: {
        displayName: string;
      } | null;
    }>;
  } | null;
  images: Array<{
    id?: string;
    url: string;
  }>;
}

interface ProductDetailClientProps {
  product: ProductDetailData;
  relatedProducts?: ProductDetailData[];
}

export function ProductDetailClient({
  product,
  relatedProducts = [],
}: ProductDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State thư viện ảnh
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // User session
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const isOwner = currentUserId === product.seller.id;

  // Zalo Contact Dialog State
  const [zaloDialogOpen, setZaloDialogOpen] = useState(false);
  const [zaloLoading, setZaloLoading] = useState(false);
  const [zaloError, setZaloError] = useState<string | null>(null);
  const [zaloData, setZaloData] = useState<{
    zaloUrl: string;
    qrUrl: string;
    prefilledMessage: string;
    maskedPhone: string;
    hidePhone: boolean;
    phoneRaw: string | null;
    sellerName: string;
  } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Booking Modal State (Task 3.2)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Report Modal State (Task 5.3)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Mở Zalo qua route bảo mật /api/zalo/[listingId]
  const handleOpenZalo = useCallback(async () => {
    const returnUrl = encodeURIComponent(`/products/${product.id}?action=zalo`);

    // Nếu đã kiểm tra session và chưa đăng nhập: chuyển tới trang đăng nhập với returnTo (BR01)
    if (authChecked && !currentUserId) {
      router.push(`/login?returnTo=${returnUrl}`);
      return;
    }

    setZaloDialogOpen(true);
    setZaloLoading(true);
    setZaloError(null);

    try {
      const res = await fetch(`/api/zalo/${product.id}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setZaloDialogOpen(false);
          router.push(`/login?returnTo=${returnUrl}`);
          return;
        }
        setZaloError(data.error || "Không thể lấy thông tin liên hệ Zalo.");
        return;
      }

      setZaloData(data);
    } catch {
      setZaloError("Đã xảy ra lỗi kết nối khi tải liên hệ Zalo.");
    } finally {
      setZaloLoading(false);
    }
  }, [authChecked, currentUserId, product.id, router]);

  // Lấy session user
  useEffect(() => {
    let ignore = false;
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.id && !ignore) {
            setCurrentUserId(data.user.id);
          }
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra session:", err);
      } finally {
        if (!ignore) {
          setAuthChecked(true);
        }
      }
    }
    fetchMe();
    return () => {
      ignore = true;
    };
  }, []);

  // Xử lý tự động kích hoạt action nếu quay lại từ redirect login (?action=zalo hoặc ?action=book)
  useEffect(() => {
    if (!authChecked) return;
    const action = searchParams.get("action");

    if (action === "zalo") {
      if (!currentUserId) {
        router.push(`/login?returnTo=${encodeURIComponent(`/products/${product.id}?action=zalo`)}`);
        return;
      }
      const timer = setTimeout(() => {
        handleOpenZalo();
      }, 50);
      return () => clearTimeout(timer);
    }

    if (action === "book") {
      if (!currentUserId) {
        router.push(`/login?returnTo=${encodeURIComponent(`/products/${product.id}?action=book`)}`);
        return;
      }
      const timer = setTimeout(() => {
        setIsBookingModalOpen(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [searchParams, authChecked, currentUserId, product.id, router, handleOpenZalo]);

  const images = product.images && product.images.length > 0
    ? product.images
    : [{ url: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800" }];

  const activeImage = images[selectedImageIndex]?.url || images[0].url;

  // Format giá
  const formattedPrice =
    product.isFree || product.price === 0
      ? "0 ₫ (Tặng miễn phí)"
      : `${product.price.toLocaleString("vi-VN")} ₫`;

  // Copy tin nhắn mẫu
  const handleCopyMessage = () => {
    if (!zaloData?.prefilledMessage) return;
    navigator.clipboard.writeText(zaloData.prefilledMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Copy SĐT (nếu không ẩn)
  const handleCopyPhone = () => {
    if (!zaloData?.phoneRaw) return;
    navigator.clipboard.writeText(zaloData.phoneRaw);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Xử lý Đặt lịch hẹn
  const handleBookMeeting = () => {
    if (!currentUserId) {
      router.push(`/login?returnTo=${encodeURIComponent(`/products/${product.id}?action=book`)}`);
      return;
    }

    if (isOwner) {
      router.push("/my-items");
      return;
    }

    setIsBookingModalOpen(true);
  };

  const isReserved = product.status === "RESERVED";
  const isSold = product.status === "SOLD";
  const isFlaggedPassport = product.item?.passportStatus === "FLAGGED";
  const hasPassport = product.item?.passportEnabled !== false && Boolean(product.item?.passportId);
  const ownersList: NonNullable<NonNullable<ProductDetailData["item"]>["owners"]> =
    product.item?.owners && product.item.owners.length > 0
      ? product.item.owners
      : [
          {
            seq: 1,
            showName: true,
            since: product.createdAt,
            schoolShortName: product.school?.shortName || null,
            txHash: product.item?.latestTxHash || null,
            user: { displayName: product.seller.displayName },
          },
        ];
  const currentOwnerSeq = ownersList[ownersList.length - 1]?.seq || ownersList.length || 1;
  const nextOwnerSeq = currentOwnerSeq + 1;

  const journeySteps: JourneyOwnerStep[] = ownersList.map((owner) => {
    const isFirst = owner.seq === 1;
    const isCurrent = owner.seq === currentOwnerSeq;
    const ownerDisplayName = owner.showName
      ? owner.user?.displayName ||
        (isCurrent ? product.seller.displayName : `Sinh viên Đời #${owner.seq}`)
      : `Sinh viên ẩn danh (${owner.schoolShortName || (isCurrent ? product.school?.shortName : null) || "UniCycle"})`;
    const schoolLabel =
      owner.schoolShortName ||
      (isCurrent ? product.school?.name : null) ||
      "Khuôn viên Đại học";
    const datePart = owner.since
      ? ` • Từ ${new Date(owner.since).toLocaleDateString("vi-VN")}`
      : "";
    const eventPart = isFirst
      ? " • Đăng ký vào hệ thống UniCycle"
      : " • Xác nhận bàn giao kế thừa Passport";

    return {
      key: owner.seq,
      seq: owner.seq,
      title: `Đời chủ #${owner.seq}: ${ownerDisplayName}`,
      badgeLabel: isFirst
        ? "Khởi tạo"
        : isCurrent
        ? "Chủ hiện tại (Đang bán lại)"
        : "Đã chuyển nhượng",
      badgeTone: isFirst ? "origin" : isCurrent ? "current" : "transferred",
      isCurrent,
      metaText: `${schoolLabel}${datePart}${eventPart}`,
      txHash: owner.txHash,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-[#02457A] mb-6 overflow-x-auto whitespace-nowrap pb-1">
        <Link href="/" className="hover:text-[#018ABE] transition-colors">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[#018ABE] transition-colors">
          Sản phẩm
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/categories/${product.category.slug}`}
              className="hover:text-[#018ABE] transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#001B48] font-bold truncate max-w-[200px] sm:max-w-xs">
          {product.title}
        </span>
      </nav>

      {/* 2. Khối chính: 2 Cột (Trái: Gallery & Passport, Phải: Thông tin & Dual CTA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* CỘT TRÁI (7/12 cột): Ảnh & Lịch sử Product Passport */}
        <div className="lg:col-span-7 space-y-6">
          {/* Khung Ảnh chính */}
          <div className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-3xl overflow-hidden bg-slate-100 border border-[#D6E8EE] shadow-xs">
            <Image
              src={activeImage}
              alt={product.title}
              fill
              priority
              className="object-cover"
            />

            {/* Badges trên ảnh */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {product.isFree || product.price === 0 ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-md">
                  Góc 0đ Cho Tặng
                </span>
              ) : null}

              {isReserved && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white motion-safe:animate-pulse" />
                  Đang giữ chỗ
                </span>
              )}

              {isSold && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-800 text-white shadow-md">
                  Đã bán thành công
                </span>
              )}
            </div>

            {/* Badge Hành trình trên ảnh */}
            {hasPassport && (
              <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 shadow-lg">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5 fill-none stroke-current shrink-0"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Đời chủ #{currentOwnerSeq}</span>
                </span>
                <span className="text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-200">Có hành trình</span>
              </div>
            )}
          </div>

          {/* Dải ảnh Thumbnail (nếu có từ 2 ảnh trở lên) */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx
                      ? "ring-2 ring-[#018ABE] ring-offset-1 border-[#018ABE] shadow-md scale-[1.02]"
                      : "border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={img.url} alt={`Ảnh ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* KHỐI HÀNH TRÌNH ĐỒ VẬT (Component dùng chung) */}
          {hasPassport && (
            <ItemJourneyTimeline
              steps={journeySteps}
              nextStep={{
                title: `Đời chủ #${nextOwnerSeq}: Bạn đang xem món đồ này!`,
                badgeLabel: "Kế thừa tiếp theo",
                description: `Kế thừa tiếp nối hồ sơ xuất xứ (từ Đời chủ #${currentOwnerSeq}) khi hoàn tất xác nhận trao tay.`,
              }}
              actions={
                <>
                  <Link
                    href={`/passport/${product.item?.passportId || product.item?.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F0F9FF] text-[#0B1F4B] border border-[#7DD3FC] hover:border-[#0088C2] text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                  >
                    <svg
                      className="w-4 h-4 text-[#0088C2] shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Tra cứu chi tiết Digital Passport</span>
                    <svg
                      className="w-3.5 h-3.5 text-[#0088C2] shrink-0"
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

                  {product.item?.latestTxHash && (
                    <a
                      href={`https://testnet.snowtrace.io/tx/${product.item.latestTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E6F6EE] hover:bg-[#D7EFE2] text-[#0B6B3A] border border-[#B7E4CB] text-xs sm:text-sm font-semibold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <svg
                        className="w-4 h-4 text-[#0B6B3A] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      <span>Xem giao dịch trên Snowtrace Fuji</span>
                      <svg
                        className="w-3.5 h-3.5 text-[#0B6B3A] shrink-0"
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
                    </a>
                  )}
                </>
              }
              footer={
                <div className="flex items-start gap-2.5 text-xs text-[#475569] leading-relaxed">
                  <svg
                    className="w-4 h-4 text-[#0088C2] shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    />
                  </svg>
                  <span>
                    <strong className="text-[#0B1F4B]">Tuyên bố giới hạn:</strong> Product Passport ghi nhận chuỗi sự kiện chuyển giao sở hữu giữa sinh viên, không đóng vai trò chứng nhận chất lượng kỹ thuật hay bảo hành thương mại của nhà sản xuất.
                  </span>
                </div>
              }
            />
          )}

          {/* Mô tả chi tiết món đồ */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D6E8EE] shadow-xs space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-[#001B48]">
              Mô tả chi tiết từ người bán
            </h3>
            <p className="text-sm text-[#001B48] leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>

        {/* CỘT PHẢI (5/12 cột): Giá, Dual CTA, Người bán & Hộp an toàn */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Thông tin chính & Giá */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D6E8EE] shadow-xs space-y-5">
            {/* Tag Danh mục & Tình trạng */}
            <div className="flex flex-wrap items-center gap-2">
              {product.category && (
                <Link
                  href={`/categories/${product.category.slug}`}
                  className="px-3 py-1 rounded-full text-xs font-bold text-[#02457A] bg-[#D6E8EE]/40 hover:bg-[#D6E8EE] transition-colors"
                >
                  {product.category.name}
                </Link>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200">
                {product.condition}
              </span>
            </div>

            {/* Tiêu đề */}
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#001B48] tracking-tight leading-snug">
              {product.title}
            </h1>

            {/* Giá bán */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE] flex items-baseline justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#02457A] uppercase tracking-wider block">
                  Giá trao tay sinh viên
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#018ABE]">
                  {formattedPrice}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Thanh toán trực tiếp khi gặp
              </span>
            </div>

            {/* Vị trí giao dịch thuận tiện */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#02457A]">
              <svg className="w-4 h-4 text-[#018ABE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-semibold">
                Khu vực: {product.school?.name || "Làng Đại Học TP.HCM"}
              </span>
            </div>

            {/* CỤM DUAL CTA (Section 4.3.A) */}
            <div className="space-y-3 pt-2">
              {isOwner ? (
                <div className="space-y-2.5">
                  <Link
                    href="/my-items"
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#001B48] hover:bg-[#02457A] text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Quản lý tin đăng của bạn</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleOpenZalo}
                    className="w-full py-2.5 px-4 rounded-2xl bg-sky-50 hover:bg-sky-100 text-[#0068FF] border border-sky-200 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.86 7.02l-.95 3.51a.6.6 0 0 0 .78.71l3.9-1.62c.76.22 1.57.38 2.41.38 5.52 0 10-4.03 10-9s-4.48-9-10-9zm5.54 11.23c-.23.63-1.18 1.18-1.65 1.25-.43.06-.99.09-1.6-.11a14.28 14.28 0 0 1-4.45-2.73 13.9 13.9 0 0 1-2.65-4.17c-.22-.61-.22-1.17-.15-1.6.07-.47.62-1.42 1.25-1.65.23-.09.49-.07.69.05.27.16 1.09 1.93 1.19 2.13.06.13.07.28.02.41-.09.23-.39.69-.47.81-.11.16-.2.27-.08.48.24.42.78 1.26 1.48 1.91.7.64 1.55 1.13 1.98 1.34.22.11.33.02.48-.09.12-.08.58-.38.81-.47.13-.05.28-.04.41.02.2.1 1.97.92 2.13 1.19.12.2.14.46.05.69z" />
                    </svg>
                    <span>Xem thông tin liên hệ Zalo</span>
                  </button>
                </div>
              ) : isSold ? (
                <button
                  disabled
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-200 text-slate-500 text-sm font-bold cursor-not-allowed"
                >
                  Món đồ này đã bán thành công
                </button>
              ) : isFlaggedPassport ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-2 text-center">
                  <svg
                    className="w-4 h-4 text-rose-600 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                  <span>Món đồ này đang bị gắn cờ nghi vấn tranh chấp hoặc vi phạm, tạm khóa giao dịch mới.</span>
                </div>
              ) : isReserved ? (
                <div className="space-y-2.5">
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 text-sm font-bold cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 motion-safe:animate-pulse" />
                    Đang giữ chỗ cho người mua trước
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenZalo}
                    className="w-full py-3 px-4 rounded-2xl bg-[#0068FF] hover:bg-[#0052cc] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.86 7.02l-.95 3.51a.6.6 0 0 0 .78.71l3.9-1.62c.76.22 1.57.38 2.41.38 5.52 0 10-4.03 10-9s-4.48-9-10-9zm5.54 11.23c-.23.63-1.18 1.18-1.65 1.25-.43.06-.99.09-1.6-.11a14.28 14.28 0 0 1-4.45-2.73 13.9 13.9 0 0 1-2.65-4.17c-.22-.61-.22-1.17-.15-1.6.07-.47.62-1.42 1.25-1.65.23-.09.49-.07.69.05.27.16 1.09 1.93 1.19 2.13.06.13.07.28.02.41-.09.23-.39.69-.47.81-.11.16-.2.27-.08.48.24.42.78 1.26 1.48 1.91.7.64 1.55 1.13 1.98 1.34.22.11.33.02.48-.09.12-.08.58-.38.81-.47.13-.05.28-.04.41.02.2.1 1.97.92 2.13 1.19.12.2.14.46.05.69z" />
                    </svg>
                    <span>Nhắn Zalo người bán</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-500">
                    Nếu buổi hẹn không diễn ra, món đồ sẽ tự động mở bán lại sau 24h.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* CTA 1: Nhắn qua Zalo (#0068FF) */}
                  <button
                    type="button"
                    onClick={handleOpenZalo}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#0068FF] hover:bg-[#0052cc] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.86 7.02l-.95 3.51a.6.6 0 0 0 .78.71l3.9-1.62c.76.22 1.57.38 2.41.38 5.52 0 10-4.03 10-9s-4.48-9-10-9zm5.54 11.23c-.23.63-1.18 1.18-1.65 1.25-.43.06-.99.09-1.6-.11a14.28 14.28 0 0 1-4.45-2.73 13.9 13.9 0 0 1-2.65-4.17c-.22-.61-.22-1.17-.15-1.6.07-.47.62-1.42 1.25-1.65.23-.09.49-.07.69.05.27.16 1.09 1.93 1.19 2.13.06.13.07.28.02.41-.09.23-.39.69-.47.81-.11.16-.2.27-.08.48.24.42.78 1.26 1.48 1.91.7.64 1.55 1.13 1.98 1.34.22.11.33.02.48-.09.12-.08.58-.38.81-.47.13-.05.28-.04.41.02.2.1 1.97.92 2.13 1.19.12.2.14.46.05.69z" />
                    </svg>
                    <span>Nhắn Zalo</span>
                  </button>

                  {/* CTA 2: Đặt lịch hẹn xem hàng (#018ABE) */}
                  <button
                    type="button"
                    onClick={handleBookMeeting}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#018ABE] hover:bg-[#02457A] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-none stroke-current shrink-0" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Đặt lịch hẹn</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* KHỐI HỒ SƠ NGƯỜI BÁN (Seller Trust Box - Section 4.3.B) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D6E8EE] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#018ABE]">
                Thông tin người bán
              </h3>
              <Link
                href={`/users/${product.seller.id}`}
                className="text-[11px] font-bold text-[#02457A] hover:text-[#018ABE] hover:underline"
              >
                Xem hồ sơ &rarr;
              </Link>
            </div>

            <Link href={`/users/${product.seller.id}`} className="flex items-center gap-3.5 group">
              <div className="relative w-13 h-13 rounded-2xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 group-hover:border-[#018ABE] transition-colors">
                <Image
                  src={
                    product.seller.avatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                  }
                  alt={product.seller.displayName}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold text-[#001B48] group-hover:text-[#018ABE] transition-colors truncate min-w-0">
                    {product.seller.displayName}
                  </span>
                  {product.seller.isStudentVerified && (
                    <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <svg className="w-2.5 h-2.5 fill-current text-emerald-600" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Đã duyệt SV
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#02457A] truncate">
                  {product.seller.dorm || product.school?.shortName || "Sinh viên KTX"}
                </p>

                {(() => {
                  const sellerReputation = formatReputationSummary(
                    product.seller.reputationScore,
                    product.seller.reviewCount
                  );
                  const sellerActivityLabel = formatCompletedOrdersLabel(
                    product.seller.completedOrdersCount
                  );
                  return (
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                      {sellerReputation.hasReviews ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#001B48]">
                          <svg
                            className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span>{sellerReputation.label}</span>
                        </span>
                      ) : (
                        <span className="font-medium text-slate-500">
                          {sellerReputation.label}
                        </span>
                      )}
                      <span aria-hidden="true">•</span>
                      <span className="text-[#02457A] font-medium">
                        {sellerActivityLabel}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </Link>
          </div>

          {/* HỘP LƯU Ý AN TOÀN (Safety First Notice - Section 4.3.D) */}
          <div className="bg-amber-50/70 rounded-3xl p-5 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Giao dịch sinh viên an toàn</span>
            </div>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              Khuyến nghị gặp mặt trực tiếp tại các địa điểm công cộng đông người (cổng trường, căng tin, sảnh KTX). Kiểm tra món đồ cẩn thận trước khi thanh toán. <strong>Tuyệt đối không chuyển tiền cọc trước</strong> dưới mọi hình thức.
            </p>
            {!isOwner && (
              <div className="pt-2 border-t border-amber-200/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  <span>Báo cáo tin đăng vi phạm</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. MODAL LIÊN HỆ ZALO BẢO MẬT (Zalo Contact Dialog) */}
      {zaloDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0068FF] text-white flex items-center justify-center">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.86 7.02l-.95 3.51a.6.6 0 0 0 .78.71l3.9-1.62c.76.22 1.57.38 2.41.38 5.52 0 10-4.03 10-9s-4.48-9-10-9zm5.54 11.23c-.23.63-1.18 1.18-1.65 1.25-.43.06-.99.09-1.6-.11a14.28 14.28 0 0 1-4.45-2.73 13.9 13.9 0 0 1-2.65-4.17c-.22-.61-.22-1.17-.15-1.6.07-.47.62-1.42 1.25-1.65.23-.09.49-.07.69.05.27.16 1.09 1.93 1.19 2.13.06.13.07.28.02.41-.09.23-.39.69-.47.81-.11.16-.2.27-.08.48.24.42.78 1.26 1.48 1.91.7.64 1.55 1.13 1.98 1.34.22.11.33.02.48-.09.12-.08.58-.38.81-.47.13-.05.28-.04.41.02.2.1 1.97.92 2.13 1.19.12.2.14.46.05.69z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#001B48]">
                    Liên hệ Zalo người bán
                  </h3>
                  <span className="text-xs text-slate-500">
                    Người bán: {zaloData?.sellerName || product.seller.displayName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setZaloDialogOpen(false)}
                aria-label="Đóng hộp thoại liên hệ Zalo"
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
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

            {zaloLoading ? (
              <div className="py-10 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-[#0068FF] border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-xs text-slate-600">Đang khởi tạo kết nối Zalo an toàn...</span>
              </div>
            ) : zaloError ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
                {zaloError}
              </div>
            ) : zaloData ? (
              <div className="space-y-4">
                {/* Khung Mã QR Zalo trên Desktop */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="relative w-44 h-44 rounded-xl overflow-hidden bg-white p-2 shadow-xs border">
                    <Image
                      src={zaloData.qrUrl}
                      alt="Zalo QR"
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                  <span className="text-xs text-slate-600 font-medium mt-2.5 text-center">
                    Quét mã QR bằng ứng dụng Zalo trên điện thoại
                  </span>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-[#001B48]">
                    <span>SĐT Zalo:</span>
                    <span className="font-mono text-[#0068FF]">
                      {zaloData.phoneRaw || zaloData.maskedPhone}
                    </span>
                    {zaloData.hidePhone && !zaloData.phoneRaw && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        Đã bảo vệ
                      </span>
                    )}
                  </div>
                </div>

                {/* Tin nhắn mẫu sinh viên */}
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#02457A]">
                      Tin nhắn gợi ý sẵn:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="text-[11px] font-bold text-[#0068FF] hover:underline cursor-pointer"
                    >
                      {copiedMessage ? "✓ Đã sao chép" : "Sao chép lời nhắn"}
                    </button>
                  </div>
                  <p className="text-xs text-[#001B48] italic bg-white p-2.5 rounded-lg border border-blue-100">
                    &quot;{zaloData.prefilledMessage}&quot;
                  </p>
                </div>

                {/* Các nút hành động */}
                <div className="space-y-2 pt-1">
                  <a
                    href={zaloData.zaloUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (zaloData.prefilledMessage && navigator.clipboard) {
                        navigator.clipboard.writeText(zaloData.prefilledMessage).catch(() => {});
                        setCopiedMessage(true);
                        setTimeout(() => setCopiedMessage(false), 2000);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-[#0068FF] hover:bg-[#0052cc] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Mở ứng dụng Zalo (Đã chép lời nhắn)</span>
                  </a>

                  {zaloData.phoneRaw && !zaloData.hidePhone && (
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#001B48] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{copiedPhone ? "✓ Đã sao chép" : `Sao chép số: ${zaloData.phoneRaw}`}</span>
                    </button>
                  )}
                </div>

                {zaloData.hidePhone && (
                  <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Người bán đã bật chế độ bảo vệ số điện thoại chống spam.</span>
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 4. MODAL ĐẶT LỊCH HẸN (Booking Modal - Task 3.2) */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        product={{
          id: product.id,
          title: product.title,
          price: product.price,
          isFree: product.isFree,
          schoolName: product.school?.shortName,
          imageUrl: activeImage,
          sellerName: product.seller.displayName,
        }}
        onSuccess={() => {
          setIsBookingModalOpen(false);
          router.push("/orders");
        }}
      />

      {/* 4b. MODAL BÁO CÁO VI PHẠM (Report Modal - Task 5.3) */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="LISTING"
        targetId={product.id}
        targetLabel={`Báo cáo tin đăng: ${product.title}`}
      />

      {/* 5. Món đồ tương tự (nếu có) */}
      {relatedProducts.length > 0 && (
        <section className="mt-14 pt-10 border-t border-[#D6E8EE]">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#001B48] mb-6">
            Món đồ tương tự cho sinh viên
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                className="group bg-white rounded-2xl border border-[#D6E8EE] p-3 hover:border-[#018ABE] hover:shadow-md transition-all"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2.5">
                  <Image
                    src={item.images[0]?.url || "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400"}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="text-xs font-bold text-[#001B48] truncate mb-1">
                  {item.title}
                </h4>
                <span className="text-xs font-extrabold text-[#018ABE]">
                  {item.isFree ? "0đ Cho Tặng" : `${item.price.toLocaleString("vi-VN")} đ`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
