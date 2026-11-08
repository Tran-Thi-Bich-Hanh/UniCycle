"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Product } from "@/lib/db";
import { formatCurrencyVND, formatRelativeTime, CONDITION_LABELS, STATUS_LABELS } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Load current user for seller owner controls
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser({ id: data.user.id });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch product detail by ID
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/products/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Không tìm thấy thông tin sản phẩm hoặc bài đăng đã bị gỡ.");
        }
        return res.json();
      })
      .then((data) => {
        const prod = data.product as Product;
        setProduct(prod);

        // Fetch similar products in same category
        if (prod.category_id) {
          fetch(`/api/products?category=${prod.category?.slug || prod.category_id}&limit=5`)
            .then((r) => r.json())
            .then((simData) => {
              if (simData.products) {
                // Filter out current product
                setSimilarProducts(
                  simData.products.filter((p: Product) => p.id !== prod.id).slice(0, 4)
                );
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        setError(err.message || "Đã xảy ra lỗi khi tải bài đăng.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Copy phone number to clipboard
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  // Toggle status for seller
  const handleToggleStatus = async (newStatus: "ACTIVE" | "SOLD" | "HIDDEN") => {
    if (!product) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setProduct({ ...product, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
          <div className="h-4 bg-[#D6E8EE]/60 rounded-md w-1/4 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="aspect-4/3 w-full bg-[#D6E8EE]/60 rounded-2xl" />
              <div className="flex gap-3">
                <div className="w-20 h-20 bg-[#D6E8EE]/50 rounded-xl" />
                <div className="w-20 h-20 bg-[#D6E8EE]/50 rounded-xl" />
                <div className="w-20 h-20 bg-[#D6E8EE]/50 rounded-xl" />
              </div>
            </div>
            <div className="lg:col-span-5 space-y-4">
              <div className="h-8 bg-[#D6E8EE]/80 rounded-lg w-3/4" />
              <div className="h-10 bg-[#D6E8EE]/60 rounded-lg w-1/2" />
              <div className="h-24 bg-[#D6E8EE]/40 rounded-xl w-full" />
              <div className="h-40 bg-[#D6E8EE]/30 rounded-2xl w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-20 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#D6E8EE] text-[#018ABE] flex items-center justify-center text-3xl mb-4">
            📦
          </div>
          <h1 className="text-2xl font-extrabold text-[#001B48] mb-2">Không tìm thấy món đồ</h1>
          <p className="text-sm text-[#02457A] mb-6 max-w-md">
            {error || "Món đồ bạn đang tìm có thể đã được người bán gỡ hoặc không tồn tại."}
          </p>
          <Link
            href="/products"
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors shadow-2xs"
          >
            ← Khám phá các món đồ khác
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isOwner = currentUser?.id === product.seller_id;
  const images = product.images && product.images.length > 0 ? product.images : [];
  const activeImage = images[activeImageIndex]?.url || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80";
  const conditionMeta = CONDITION_LABELS[product.condition] || {
    label: product.condition,
    badgeClass: "bg-[#D6E8EE] text-[#001B48] border-[#97CADB]",
    desc: "Đã qua sử dụng",
  };
  const statusMeta = STATUS_LABELS[product.status];
  const sellerPhone = product.seller?.phone || "0988888888";

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-[#02457A] mb-6 font-medium">
          <Link href="/" className="hover:text-[#018ABE] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[#018ABE] transition-colors">
            Đồ sinh viên
          </Link>
          {product.category && (
            <>
              <span>/</span>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="hover:text-[#018ABE] transition-colors truncate max-w-[150px]"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-[#001B48] font-bold truncate max-w-[200px] sm:max-w-none">
            {product.title}
          </span>
        </nav>

        {/* Core Product Presentation (2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* CỘT TRÁI: BỘ ẢNH & THÔNG SỐ (7 CỘT) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Ảnh lớn chính (Main Image Viewer) */}
            <div className="relative aspect-4/3 w-full bg-[#D6E8EE]/30 rounded-2xl border border-[#D6E8EE] overflow-hidden shadow-xs">
              <img
                src={activeImage}
                alt={product.title}
                className="w-full h-full object-cover transition-all duration-300"
              />

              {/* Tình trạng Badge */}
              <span
                className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full border shadow-xs backdrop-blur-xs ${conditionMeta.badgeClass}`}
              >
                {conditionMeta.label}
              </span>

              {/* Trạng thái tin nếu khác ACTIVE */}
              {product.status !== "ACTIVE" && (
                <span
                  className={`absolute top-4 right-4 text-xs font-extrabold px-3 py-1 rounded-full shadow-md ${
                    statusMeta?.colorClass || "bg-[#02457A] text-white"
                  }`}
                >
                  {statusMeta?.label || product.status}
                </span>
              )}

              {/* Passport Hash Pill (Chuẩn bị cho Phase 2 Web3) */}
              {product.passport_hash ? (
                <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#001B48]/90 text-white text-[11px] font-mono backdrop-blur-md border border-[#97CADB]/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#018ABE] animate-ping" />
                  <span>Passport: {product.passport_hash.slice(0, 10)}...</span>
                </div>
              ) : (
                <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 text-[#001B48] text-[11px] font-semibold backdrop-blur-md border border-[#D6E8EE] shadow-2xs">
                  <span>✨ UniCycle Verified Item</span>
                </div>
              )}
            </div>

            {/* Hàng ảnh thu nhỏ (Thumbnails Carousel) */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pr-1">
                {images.map((img, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        isActive
                          ? "border-[#018ABE] shadow-md scale-105"
                          : "border-[#D6E8EE] opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={img.url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mô tả chi tiết món đồ */}
            <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 space-y-4 shadow-2xs">
              <h2 className="text-lg font-extrabold text-[#001B48] flex items-center gap-2">
                <span>📝</span>
                <span>Mô tả chi tiết từ người bán</span>
              </h2>

              <div className="text-sm text-[#001B48] leading-relaxed whitespace-pre-line">
                {product.description}
              </div>

              {/* Thông tin phụ trợ */}
              <div className="pt-4 border-t border-[#D6E8EE] flex flex-wrap items-center justify-between text-xs text-[#02457A] gap-4">
                <div className="flex items-center gap-4">
                  <span>
                    🕒 Đăng {formatRelativeTime(product.created_at)}
                  </span>
                  <span>•</span>
                  <span>
                    👁️ {product.view_count} lượt xem
                  </span>
                </div>
                <div>
                  Mã tin: <span className="font-mono text-[#001B48] font-bold">{product.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>

            {/* Cam kết giao dịch trực tiếp khuôn viên trường */}
            <div className="bg-[#D6E8EE]/30 rounded-2xl border border-[#97CADB]/60 p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#018ABE]/15 text-[#018ABE] flex items-center justify-center shrink-0 text-xl font-bold">
                🛡️
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#001B48]">
                  Quy tắc an toàn sinh viên UniCycle
                </h3>
                <p className="text-xs text-[#02457A] leading-relaxed">
                  Luôn hẹn gặp trực tiếp tại địa điểm công cộng trong khuôn viên trường (Cổng trường, KTX, thư viện).
                  Kiểm tra kỹ hoạt động của đồ trước khi thanh toán. <strong>Tuyệt đối không chuyển tiền cọc trước</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: GIÁ, VỊ TRÍ, LIÊN HỆ NGƯỜI BÁN (5 CỘT) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Khối Thông tin chính & Giá */}
            <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-5">
              {/* Category pill */}
              {product.category && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D6E8EE]/70 text-[#001B48] border border-[#97CADB]/60">
                  <span>{product.category.icon || "📦"}</span>
                  <span>{product.category.name}</span>
                </div>
              )}

              {/* Tiêu đề */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] leading-tight">
                {product.title}
              </h1>

              {/* Giá bán VND */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#02457A]">
                  {formatCurrencyVND(product.price)}
                </span>
                <span className="text-xs font-semibold text-[#018ABE] bg-[#D6E8EE] px-2.5 py-1 rounded-md">
                  Giá sinh viên
                </span>
              </div>

              {/* Tình trạng chi tiết */}
              <div className="p-3.5 rounded-xl bg-[#D6E8EE]/30 border border-[#D6E8EE] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#018ABE] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-[#001B48]">
                    Tình trạng: {conditionMeta.label}
                  </div>
                  <div className="text-[11px] text-[#02457A] mt-0.5">
                    {conditionMeta.desc}
                  </div>
                </div>
              </div>

              {/* Địa điểm nhận hàng */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#D6E8EE]">
                <div className="w-8 h-8 rounded-lg bg-[#02457A]/10 text-[#02457A] flex items-center justify-center shrink-0 text-sm">
                  📍
                </div>
                <div>
                  <div className="text-xs font-bold text-[#001B48]">Nơi nhận đồ trực tiếp</div>
                  <div className="text-xs text-[#02457A] font-medium mt-0.5">
                    {product.pickup_location}
                  </div>
                </div>
              </div>
            </div>

            {/* Khối Người bán & Nút Liên hệ */}
            <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-5">
              <h3 className="text-sm font-extrabold text-[#001B48] uppercase tracking-wider">
                Thông tin người bán
              </h3>

              {/* Profile Card */}
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-[#02457A] text-white flex items-center justify-center text-lg font-extrabold overflow-hidden shadow-2xs">
                  {product.seller?.avatar_url ? (
                    <img
                      src={product.seller.avatar_url}
                      alt={product.seller.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{product.seller?.full_name?.charAt(0) || "U"}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-[#001B48] truncate">
                      {product.seller?.full_name || "Sinh viên UniCycle"}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#018ABE]/15 text-[#018ABE] border border-[#018ABE]/30 shrink-0">
                      ✓ Đã xác thực
                    </span>
                  </div>

                  <div className="text-xs text-[#02457A] truncate mt-0.5 font-medium">
                    🏫 {product.seller?.university || "Đại học Bách Khoa"}
                  </div>

                  {product.seller?.campus_location && (
                    <div className="text-[11px] text-[#02457A]/80 truncate">
                      🏢 {product.seller.campus_location}
                    </div>
                  )}
                </div>
              </div>

              {/* CÁC NÚT LIÊN HỆ */}
              {product.status === "ACTIVE" ? (
                <div className="space-y-2.5 pt-2">
                  {/* Nút Gọi điện ngay */}
                  <a
                    href={`tel:${sellerPhone}`}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#018ABE] text-white hover:bg-[#02457A] flex items-center justify-center gap-2 shadow-xs transition-all hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Gọi điện trực tiếp ({sellerPhone})</span>
                  </a>

                  {/* Nút Chat Zalo */}
                  <a
                    href={`https://zalo.me/${sellerPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-[#001B48] border-2 border-[#97CADB] hover:bg-[#D6E8EE]/40 flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#0068FF] text-white text-[10px] font-extrabold flex items-center justify-center">
                      Z
                    </span>
                    <span>Chat qua Zalo sinh viên</span>
                  </a>

                  {/* Nút Sao chép SĐT */}
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(sellerPhone)}
                    className="w-full py-2 text-xs font-semibold text-[#02457A] hover:text-[#018ABE] transition-colors"
                  >
                    {copiedPhone ? "✓ Đã sao chép số điện thoại!" : "📋 Sao chép số điện thoại"}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#D6E8EE]/40 text-center text-xs font-bold text-[#001B48] border border-[#97CADB]/60">
                  Món đồ này hiện đã ngừng giao dịch ({statusMeta?.label || product.status}).
                </div>
              )}
            </div>

            {/* QUYỀN CHỦ BÀI ĐĂNG (NẾU ĐANG ĐĂNG NHẬP BẰNG TÀI KHOẢN NGƯỜI BÁN) */}
            {isOwner && (
              <div className="bg-[#D6E8EE]/40 rounded-2xl border-2 border-[#018ABE] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#001B48]">
                  <span>👑</span>
                  <span>Bạn là chủ bài đăng này</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() =>
                      handleToggleStatus(product.status === "ACTIVE" ? "SOLD" : "ACTIVE")
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                      product.status === "ACTIVE"
                        ? "bg-[#02457A] text-white hover:bg-[#001B48]"
                        : "bg-[#018ABE] text-white hover:bg-[#02457A]"
                    }`}
                  >
                    {product.status === "ACTIVE" ? "Đánh dấu Đã bán" : "Mở bán lại"}
                  </button>

                  <Link
                    href={`/profile/my-listings`}
                    className="py-2 px-3 rounded-xl text-xs font-bold text-center bg-white text-[#001B48] border border-[#97CADB] hover:bg-white/80 transition-colors"
                  >
                    Quản lý tin đăng
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SẢN PHẨM CÙNG DANH MỤC (SIMILAR PRODUCTS) */}
        {similarProducts.length > 0 && (
          <div className="mt-16 pt-10 border-t border-[#D6E8EE]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#001B48]">
                  Đồ cùng danh mục có thể bạn quan tâm
                </h2>
                <p className="text-xs text-[#02457A] mt-0.5">
                  Các món đồ tương tự từ cộng đồng sinh viên quanh bạn
                </p>
              </div>
              {product.category && (
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="text-xs font-bold text-[#018ABE] hover:underline"
                >
                  Xem thêm →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {similarProducts.map((simProd) => (
                <ProductCard key={simProd.id} product={simProd} />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

