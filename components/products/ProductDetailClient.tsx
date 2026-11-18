"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookingModal } from "@/components/orders/BookingModal";

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
    dorm?: string | null;
  };
  item?: {
    id: string;
    passportEnabled?: boolean;
    passportId?: string | null;
    passportStatus?: string;
    identityLevel?: string;
    owners?: Array<{
      seq: number;
      showName: boolean;
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

  // Mở Zalo qua route bảo mật /api/zalo/[listingId]
  const handleOpenZalo = useCallback(async () => {
    // Nếu chưa đăng nhập: chuyển tới trang đăng nhập với returnTo (BR01)
    if (!currentUserId) {
      router.push(`/login?returnTo=/products/${product.id}?action=zalo`);
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
          router.push(`/login?returnTo=/products/${product.id}?action=zalo`);
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
  }, [currentUserId, product.id, router]);

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
      }
    }
    fetchMe();
    return () => {
      ignore = true;
    };
  }, []);

  // Xử lý tự động kích hoạt action nếu quay lại từ redirect login (?action=zalo hoặc ?action=book)
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "zalo" && currentUserId) {
      const timer = setTimeout(() => {
        handleOpenZalo();
      }, 50);
      return () => clearTimeout(timer);
    }
    if (action === "book" && currentUserId) {
      const timer = setTimeout(() => {
        setIsBookingModalOpen(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [searchParams, currentUserId, handleOpenZalo]);

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
      router.push(`/login?returnTo=/products/${product.id}?action=book`);
      return;
    }

    if (isOwner) {
      router.push("/my-products");
      return;
    }

    setIsBookingModalOpen(true);
  };

  const isReserved = product.status === "RESERVED";
  const isSold = product.status === "SOLD";
  const hasPassport = product.item?.passportEnabled !== false && Boolean(product.item?.passportId);

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
                  🎁 Góc 0đ Cho Tặng
                </span>
              ) : null}

              {isReserved && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Đang giữ chỗ (RESERVED)
                </span>
              )}

              {isSold && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-800 text-white shadow-md">
                  Đã bán thành công
                </span>
              )}
            </div>

            {/* Badge Passport trên ảnh */}
            {hasPassport && (
              <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-xs text-white text-xs font-mono px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 shadow-lg">
                <span className="text-emerald-400">📜 Đời chủ #1</span>
                <span className="text-slate-300">
                  {product.item?.passportId?.slice(0, 10)}...{product.item?.passportId?.slice(-6)}
                </span>
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
                      ? "border-[#018ABE] shadow-md scale-102"
                      : "border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={img.url} alt={`Ảnh ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* KHỐI PRODUCT PASSPORT TIMELINE (UI/UX Section 4.3.C) */}
          {hasPassport && (
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-[#001B48] text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                    📜
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>Lịch Sử Đồ Vật (Product Passport)</span>
                    </h3>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Trạng thái: Hợp lệ • Đã đăng ký hệ thống
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-mono">Mã định danh (bytes32):</span>
                  <span className="text-xs text-[#D6E8EE] font-mono break-all font-semibold">
                    {product.item?.passportId}
                  </span>
                </div>
              </div>

              {/* Chuỗi đời chủ (BR29: Ẩn danh hóa danh tính sinh viên) */}
              <div className="space-y-4 py-2">
                <div className="relative pl-6 before:content-[''] before:absolute before:left-2 before:top-3 before:bottom-0 before:w-0.5 before:bg-[#018ABE]/40 space-y-4">
                  {/* Đời chủ #1 */}
                  <div className="relative">
                    <span className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#018ABE] ring-4 ring-slate-900" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          ● Đời chủ #1: {product.seller.displayName}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          Khởi tạo
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {product.school?.name || "Khuôn viên Đại học"} • Đăng ký vào hệ thống UniCycle
                      </p>
                    </div>
                  </div>

                  {/* Đời chủ kế tiếp */}
                  <div className="relative">
                    <span className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-slate-900 animate-pulse" />
                    <div>
                      <span className="text-xs font-bold text-emerald-300">
                        ● Đời chủ #2: Bạn đang xem món đồ này!
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Kế thừa toàn bộ hồ sơ xuất xứ khi hoàn tất xác nhận trao tay
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tuyên bố giới hạn bắt buộc (BR30) */}
              <div className="pt-3 border-t border-white/10 flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
                <span className="text-amber-400 shrink-0 text-sm">ℹ️</span>
                <span>
                  <strong>Tuyên bố giới hạn (BR30):</strong> Product Passport ghi nhận chuỗi sự kiện chuyển giao sở hữu giữa sinh viên, không đóng vai trò chứng nhận chất lượng kỹ thuật hay bảo hành thương mại của nhà sản xuất.
                </span>
              </div>
            </div>
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
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#02457A]">
              <span className="text-base">📍</span>
              <span className="font-semibold">
                Khu vực: {product.school?.name || "Làng Đại Học TP.HCM"}
              </span>
            </div>

            {/* CỤM DUAL CTA (Section 4.3.A) */}
            <div className="space-y-3 pt-2">
              {isOwner ? (
                <Link
                  href="/my-products"
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#001B48] hover:bg-[#02457A] text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>⚙️ Quản lý tin đăng của bạn (/my-products)</span>
                </Link>
              ) : isSold ? (
                <button
                  disabled
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-200 text-slate-500 text-sm font-bold cursor-not-allowed"
                >
                  Món đồ này đã bán thành công
                </button>
              ) : isReserved ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 text-sm font-bold cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Đang giữ chỗ cho người mua trước
                  </button>
                  <p className="text-[11px] text-center text-slate-500">
                    Nếu buổi hẹn không diễn ra, món đồ sẽ tự động mở bán lại sau 24h (BR37).
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
                    <span>📅 Đặt lịch hẹn</span>
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

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#001B48] group-hover:text-[#018ABE] transition-colors truncate">
                    {product.seller.displayName}
                  </span>
                  {product.seller.isStudentVerified && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Đã duyệt SV
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#02457A] truncate">
                  {product.seller.dorm || product.school?.shortName || "Sinh viên KTX"}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>⭐ {product.seller.reputationScore?.toFixed(1) || "5.0"} uy tín</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium">⚡ Phản hồi &lt; 15 phút</span>
                </div>
              </div>
            </Link>
          </div>

          {/* HỘP LƯU Ý AN TOÀN (Safety First Notice - Section 4.3.D) */}
          <div className="bg-amber-50/70 rounded-3xl p-5 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <span>🛡️ Giao dịch sinh viên an toàn</span>
            </div>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              Khuyến nghị gặp mặt trực tiếp tại các địa điểm công cộng đông người (cổng trường, căng tin, sảnh KTX). Kiểm tra món đồ cẩn thận trước khi thanh toán. <strong>Tuyệt đối không chuyển tiền cọc trước</strong> dưới mọi hình thức.
            </p>
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
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                ✕
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
                    />
                  </div>
                  <span className="text-xs text-slate-600 font-medium mt-2.5 text-center">
                    Quét mã QR bằng ứng dụng Zalo trên điện thoại
                  </span>
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
                      className="text-[11px] font-bold text-[#0068FF] hover:underline"
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
                    className="w-full py-3 px-4 rounded-xl bg-[#0068FF] hover:bg-[#0052cc] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>📱 Mở Ứng Dụng Zalo</span>
                  </a>

                  {zaloData.phoneRaw && !zaloData.hidePhone && (
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#001B48] text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>{copiedPhone ? "✓ Đã sao chép" : `Sao chép số: ${zaloData.phoneRaw}`}</span>
                    </button>
                  )}
                </div>

                {zaloData.hidePhone && (
                  <p className="text-[10px] text-center text-slate-400">
                    🛡️ Người bán đã bật chế độ bảo vệ số điện thoại chống spam (BR36).
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
