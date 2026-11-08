"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Toast, useToast } from "@/components/toast";
import {
  CategoryGlyph,
  IconBuilding,
  IconClock,
  IconCopy,
  IconEye,
  IconMapPin,
  IconPackage,
  IconPhone,
  IconSchool,
  IconShieldCheck,
  IconFileText,
  IconCheck,
  IconSparkles,
} from "@/components/icons";
import { Product } from "@/lib/db";
import { formatCurrencyVND, formatRelativeTime, CONDITION_LABELS, STATUS_LABELS } from "@/lib/utils";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { toast, show, dismiss } = useToast();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => data.user && setCurrentUser({ id: data.user.id }))
      .catch(() => {})
      .finally(() => setAuthLoaded(true));
  }, []);

  // Tải lại chi tiết khi trạng thái đăng nhập đã xác định (để API trả SĐT cho người đã đăng nhập)
  useEffect(() => {
    if (!id || !authLoaded) return;
    setLoading(true);
    setError(null);

    fetch(`/api/products/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Không tìm thấy món đồ hoặc bài đăng đã bị gỡ.");
        return res.json();
      })
      .then((data) => {
        const prod = data.product as Product;
        setProduct(prod);
        setActiveImageIndex(0);
        if (prod.category_id) {
          fetch(`/api/products?category=${prod.category?.slug || prod.category_id}&limit=5`)
            .then((r) => r.json())
            .then((sim) => {
              if (sim.products) {
                setSimilarProducts(sim.products.filter((p: Product) => p.id !== prod.id).slice(0, 4));
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => setError(err.message || "Đã xảy ra lỗi khi tải bài đăng."))
      .finally(() => setLoading(false));
  }, [id, authLoaded, currentUser?.id]);

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      show("Không thể sao chép, hãy chọn và sao chép thủ công.", { type: "error" });
    }
  };

  const changeStatus = async (newStatus: "ACTIVE" | "SOLD" | "HIDDEN", previous?: Product["status"]) => {
    if (!product) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const before = previous ?? product.status;
      setProduct({ ...product, status: newStatus });
      show(newStatus === "SOLD" ? "Đã đánh dấu là đã bán." : "Đã mở bán lại món đồ.", {
        actionLabel: previous ? undefined : "Hoàn tác",
        onAction: previous ? undefined : () => changeStatus(before as any, before),
      });
    } catch {
      show("Không thể cập nhật trạng thái, hãy thử lại.", { type: "error" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse" role="status" aria-label="Đang tải">
          <div className="h-4 bg-[#D6E8EE]/60 rounded-md w-1/4 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="aspect-4/3 w-full bg-[#D6E8EE]/60 rounded-2xl" />
              <div className="flex gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-20 h-20 bg-[#D6E8EE]/50 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 space-y-4">
              <div className="h-8 bg-[#D6E8EE]/80 rounded-lg w-3/4" />
              <div className="h-10 bg-[#D6E8EE]/60 rounded-lg w-1/2" />
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
          <div className="w-16 h-16 rounded-2xl bg-[#D6E8EE] text-[#018ABE] flex items-center justify-center mb-4">
            <IconPackage className="w-8 h-8" />
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
  const images = product.images || [];
  const activeImage = images[activeImageIndex]?.url || FALLBACK_IMG;
  const conditionMeta = CONDITION_LABELS[product.condition] || {
    label: product.condition,
    badgeClass: "bg-[#D6E8EE] text-[#001B48] border-[#97CADB]",
    desc: "Đã qua sử dụng",
  };
  const statusMeta = STATUS_LABELS[product.status];
  const sellerPhone = product.seller?.phone || null;
  const loginHref = `/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#02457A] mb-6 font-medium">
          <Link href="/" className="hover:text-[#018ABE] transition-colors">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link href="/products" className="hover:text-[#018ABE] transition-colors">Đồ sinh viên</Link>
          {product.category && (
            <>
              <span aria-hidden="true">/</span>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="hover:text-[#018ABE] transition-colors truncate max-w-[150px]"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span className="text-[#001B48] font-bold truncate max-w-[200px] sm:max-w-none" aria-current="page">
            {product.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* CỘT TRÁI */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative aspect-4/3 w-full bg-[#D6E8EE]/30 rounded-2xl border border-[#D6E8EE] overflow-hidden shadow-xs">
              <img src={activeImage} alt={product.title} className="w-full h-full object-cover" />

              <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full border shadow-xs backdrop-blur-xs ${conditionMeta.badgeClass}`}>
                {conditionMeta.label}
              </span>

              {product.status !== "ACTIVE" && (
                <span className={`absolute top-4 right-4 text-xs font-extrabold px-3 py-1 rounded-full shadow-md ${statusMeta?.colorClass || "bg-[#02457A] text-white"}`}>
                  {statusMeta?.label || product.status}
                </span>
              )}

              {product.passport_hash ? (
                <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#001B48]/90 text-white text-[11px] font-mono backdrop-blur-md border border-[#97CADB]/40">
                  <span className="w-2 h-2 rounded-full bg-[#018ABE]" />
                  <span>Passport: {product.passport_hash.slice(0, 10)}...</span>
                </div>
              ) : (
                <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 text-[#001B48] text-[11px] font-semibold backdrop-blur-md border border-[#D6E8EE]">
                  <IconSparkles className="w-3.5 h-3.5 text-[#018ABE]" />
                  <span>UniCycle Verified Item</span>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pr-1" role="list" aria-label="Ảnh sản phẩm">
                {images.map((img, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      role="listitem"
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`Xem ảnh ${idx + 1}`}
                      aria-current={isActive}
                      className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        isActive ? "border-[#018ABE] shadow-md" : "border-[#D6E8EE] opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}

            <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 space-y-4 shadow-2xs">
              <h2 className="text-lg font-extrabold text-[#001B48] flex items-center gap-2">
                <IconFileText className="w-5 h-5 text-[#018ABE]" />
                <span>Mô tả từ người bán</span>
              </h2>
              <div className="text-sm text-[#001B48] leading-relaxed whitespace-pre-line">{product.description}</div>

              <div className="pt-4 border-t border-[#D6E8EE] flex flex-wrap items-center justify-between text-xs text-[#02457A] gap-4">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <IconClock className="w-3.5 h-3.5" /> Đăng {formatRelativeTime(product.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconEye className="w-3.5 h-3.5" /> {product.view_count} lượt xem
                  </span>
                </div>
                <div>
                  Mã tin: <span className="font-mono text-[#001B48] font-bold">{product.id.slice(0, 8)}</span>
                </div>
              </div>
            </section>

            <div className="bg-[#D6E8EE]/30 rounded-2xl border border-[#97CADB]/60 p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#018ABE]/15 text-[#018ABE] flex items-center justify-center shrink-0">
                <IconShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#001B48]">Quy tắc an toàn sinh viên UniCycle</h3>
                <p className="text-xs text-[#02457A] leading-relaxed">
                  Luôn hẹn gặp trực tiếp tại nơi công cộng trong khuôn viên trường (cổng trường, KTX, thư viện).
                  Kiểm tra kỹ đồ trước khi thanh toán. <strong>Tuyệt đối không chuyển tiền cọc trước</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-5">
              {product.category && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D6E8EE]/70 text-[#001B48] border border-[#97CADB]/60">
                  <CategoryGlyph name={product.category.icon} className="w-3.5 h-3.5 text-[#018ABE]" />
                  <span>{product.category.name}</span>
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] leading-tight">{product.title}</h1>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#02457A]">
                  {product.price === 0 ? "Miễn phí" : formatCurrencyVND(product.price)}
                </span>
                <span className="text-xs font-semibold text-[#02457A] bg-[#D6E8EE] px-2.5 py-1 rounded-md">Giá sinh viên</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#D6E8EE]/30 border border-[#D6E8EE] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#018ABE] text-white flex items-center justify-center shrink-0">
                  <IconCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#001B48]">Tình trạng: {conditionMeta.label}</div>
                  <div className="text-[11px] text-[#02457A] mt-0.5">{conditionMeta.desc}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[#D6E8EE]">
                <div className="w-8 h-8 rounded-lg bg-[#02457A]/10 text-[#02457A] flex items-center justify-center shrink-0">
                  <IconMapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#001B48]">Nơi nhận đồ trực tiếp</div>
                  <div className="text-xs text-[#02457A] font-medium mt-0.5">{product.pickup_location}</div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-5">
              <h2 className="text-sm font-extrabold text-[#001B48] uppercase tracking-wider">Người bán</h2>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#02457A] text-white flex items-center justify-center text-lg font-extrabold overflow-hidden">
                  {product.seller?.avatar_url ? (
                    <img src={product.seller.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span aria-hidden="true">{product.seller?.full_name?.charAt(0) || "U"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-base text-[#001B48] truncate">
                    {product.seller?.full_name || "Sinh viên UniCycle"}
                  </div>
                  <div className="text-xs text-[#02457A] truncate mt-0.5 font-medium inline-flex items-center gap-1.5">
                    <IconSchool className="w-3.5 h-3.5" /> {product.seller?.university || "Sinh viên"}
                  </div>
                  {product.seller?.campus_location && (
                    <div className="text-[11px] text-[#02457A]/80 truncate inline-flex items-center gap-1.5 ml-3">
                      <IconBuilding className="w-3 h-3" /> {product.seller.campus_location}
                    </div>
                  )}
                </div>
              </div>

              {product.status !== "ACTIVE" ? (
                <div className="p-4 rounded-xl bg-[#D6E8EE]/40 text-center text-xs font-bold text-[#001B48] border border-[#97CADB]/60">
                  Món đồ này hiện đã ngừng giao dịch ({statusMeta?.label || product.status}).
                </div>
              ) : isOwner ? (
                <p className="text-xs text-[#02457A] font-medium">Đây là tin của bạn, người mua sẽ thấy nút liên hệ ở đây.</p>
              ) : !currentUser ? (
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs text-[#02457A] leading-relaxed">
                    Đăng nhập để xem số điện thoại và liên hệ trực tiếp với người bán. Việc này giúp bảo vệ thông tin của
                    sinh viên khỏi spam.
                  </p>
                  <Link
                    href={loginHref}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#018ABE] text-white hover:bg-[#02457A] flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <IconPhone className="w-4 h-4" />
                    <span>Đăng nhập để liên hệ người bán</span>
                  </Link>
                  <Link
                    href={`/register?redirect=${encodeURIComponent(`/products/${product.id}`)}`}
                    className="block text-center text-xs font-semibold text-[#02457A] hover:text-[#018ABE] py-1"
                  >
                    Chưa có tài khoản? Đăng ký miễn phí
                  </Link>
                </div>
              ) : sellerPhone ? (
                <div className="space-y-2.5 pt-1">
                  <a
                    href={`tel:${sellerPhone}`}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#018ABE] text-white hover:bg-[#02457A] flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <IconPhone className="w-4 h-4" />
                    <span>Gọi {sellerPhone}</span>
                  </a>
                  <a
                    href={`https://zalo.me/${sellerPhone}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-[#001B48] border-2 border-[#97CADB] hover:bg-[#D6E8EE]/40 flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#0068FF] text-white text-[10px] font-extrabold flex items-center justify-center" aria-hidden="true">Z</span>
                    <span>Nhắn qua Zalo</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(sellerPhone)}
                    className="w-full py-2 text-xs font-semibold text-[#02457A] hover:text-[#018ABE] transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    {copiedPhone ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
                    {copiedPhone ? "Đã sao chép số điện thoại" : "Sao chép số điện thoại"}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#D6E8EE]/40 text-xs text-[#001B48] border border-[#97CADB]/60 leading-relaxed">
                  Người bán chưa cung cấp số điện thoại. Bạn có thể hẹn gặp tại <strong>{product.pickup_location}</strong> hoặc quay lại sau.
                </div>
              )}
            </section>

            {isOwner && (
              <section className="bg-[#D6E8EE]/40 rounded-2xl border-2 border-[#018ABE] p-5 space-y-3">
                <div className="text-xs font-extrabold text-[#001B48]">Bạn là chủ bài đăng này</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => changeStatus(product.status === "ACTIVE" ? "SOLD" : "ACTIVE")}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold bg-[#02457A] text-white hover:bg-[#001B48] transition-colors disabled:opacity-50"
                  >
                    {product.status === "ACTIVE" ? "Đánh dấu đã bán" : "Mở bán lại"}
                  </button>
                  <Link
                    href={`/products/${product.id}/edit`}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold text-center bg-white text-[#001B48] border border-[#97CADB] hover:bg-white/80 transition-colors"
                  >
                    Chỉnh sửa tin
                  </Link>
                </div>
                <Link href="/profile/my-listings" className="block text-center text-xs font-semibold text-[#02457A] hover:text-[#018ABE]">
                  Quản lý tất cả tin đăng →
                </Link>
              </section>
            )}
          </div>
        </div>

        {similarProducts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[#D6E8EE]" aria-labelledby="similar-title">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 id="similar-title" className="text-xl sm:text-2xl font-extrabold text-[#001B48]">
                  Đồ cùng danh mục có thể bạn quan tâm
                </h2>
                <p className="text-xs text-[#02457A] mt-0.5">Các món đồ tương tự từ cộng đồng sinh viên</p>
              </div>
              {product.category && (
                <Link href={`/products?category=${product.category.slug}`} className="text-xs font-bold text-[#018ABE] hover:underline">
                  Xem thêm →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Toast toast={toast} onDismiss={dismiss} />
      <Footer />
    </div>
  );
}
