"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toast, useToast } from "@/components/toast";
import {
  IconClock,
  IconEdit,
  IconEye,
  IconMapPin,
  IconPackage,
  IconLock,
  IconWallet,
  IconArrowRight,
  IconShieldCheck,
} from "@/components/icons";
import { Product } from "@/lib/db";
import {
  formatCurrencyVND,
  formatRelativeTime,
  CONDITION_LABELS,
  STATUS_LABELS,
} from "@/lib/utils";

type TabType = "ACTIVE" | "RESERVED" | "SOLD" | "HIDDEN" | "ALL";

export default function MyListingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<{
    active: number;
    reserved: number;
    sold: number;
    hidden: number;
    total: number;
  }>({
    active: 0,
    reserved: 0,
    sold: 0,
    hidden: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { toast, show, dismiss } = useToast();

  const fetchListings = () => {
    setLoading(true);
    fetch(`/api/my-listings?status=${activeTab}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/login?redirect=/profile/my-listings");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setProducts(data.products || []);
        if (data.counts) {
          setCounts({
            active: data.counts.active || 0,
            reserved: data.counts.reserved || 0,
            sold: data.counts.sold || 0,
            hidden: data.counts.hidden || 0,
            total: data.counts.total || 0,
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchListings();
  }, [activeTab]);

  const STATUS_MESSAGES: Record<string, string> = {
    SOLD: "Đã đánh dấu là đã bán.",
    HIDDEN: "Đã tạm ẩn tin khỏi kết quả tìm kiếm.",
    ACTIVE: "Tin đã được mở bán lại.",
  };

  const handleUpdateStatus = async (
    product: Product,
    newStatus: "ACTIVE" | "SOLD" | "HIDDEN",
    isUndo = false
  ) => {
    const previousStatus = product.status as "ACTIVE" | "SOLD" | "HIDDEN";
    setActionLoadingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật trạng thái");
      fetchListings();
      show(
        isUndo ? "Đã hoàn tác." : STATUS_MESSAGES[newStatus],
        isUndo
          ? {}
          : {
              actionLabel: "Hoàn tác",
              onAction: () => handleUpdateStatus(product, previousStatus, true),
            }
      );
    } catch (err: any) {
      show(err.message || "Không thể cập nhật trạng thái, hãy thử lại.", {
        type: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[#02457A] mb-4 font-medium">
          <Link href="/" className="hover:text-[#018ABE] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link
            href="/profile"
            className="hover:text-[#018ABE] transition-colors"
          >
            Hồ sơ
          </Link>
          <span>/</span>
          <span className="text-[#001B48] font-bold">Quản lý tin đăng</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
              Quản lý tin đăng thanh lý
            </h1>
            <p className="text-sm text-[#02457A] mt-1 font-medium">
              Theo dõi tình trạng bài đăng, đơn đang giữ chỗ (Escrow) và hồ sơ UniCycle Passport
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/wallet?tab=ESCROWS"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#D6E8EE]/60 text-[#001B48] hover:bg-[#D6E8EE] transition-colors"
            >
              <IconWallet className="w-3.5 h-3.5 text-[#018ABE]" />
              <span>Ví & Đơn Escrow</span>
            </Link>
            <Link
              href="/products/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors shadow-2xs"
            >
              + Đăng tin mới
            </Link>
          </div>
        </div>

        {/* Thông báo nổi bật nếu có đơn đang được khách giữ chỗ */}
        {counts.reserved > 0 && activeTab !== "RESERVED" && (
          <div className="mb-6 p-4 rounded-2xl bg-[#D6E8EE]/50 border border-[#018ABE] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs font-bold text-[#001B48]">
              <IconLock className="w-4 h-4 text-[#018ABE]" />
              <span>
                Bạn đang có <strong>{counts.reserved} món đồ</strong> được sinh viên khác giữ chỗ qua Escrow!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("RESERVED")}
              className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#02457A] text-white hover:bg-[#001B48] transition-colors cursor-pointer"
            >
              Xem đơn giữ chỗ →
            </button>
          </div>
        )}

        {/* TABS TRẠNG THÁI */}
        <div className="flex items-center gap-2 border-b border-[#D6E8EE] mb-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "ACTIVE"
                ? "border-[#018ABE] text-[#018ABE]"
                : "border-transparent text-[#02457A] hover:text-[#001B48]"
            }`}
          >
            <span>Đang đăng bán</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "ACTIVE"
                  ? "bg-[#018ABE] text-white"
                  : "bg-[#D6E8EE] text-[#001B48]"
              }`}
            >
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("RESERVED")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "RESERVED"
                ? "border-[#018ABE] text-[#018ABE]"
                : "border-transparent text-[#02457A] hover:text-[#001B48]"
            }`}
          >
            <span>Đang giữ chỗ (Escrow)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "RESERVED"
                  ? "bg-[#018ABE] text-white"
                  : "bg-[#D6E8EE] text-[#001B48]"
              }`}
            >
              {counts.reserved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SOLD")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "SOLD"
                ? "border-[#018ABE] text-[#018ABE]"
                : "border-transparent text-[#02457A] hover:text-[#001B48]"
            }`}
          >
            <span>Đã thanh lý</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "SOLD"
                  ? "bg-[#018ABE] text-white"
                  : "bg-[#D6E8EE] text-[#001B48]"
              }`}
            >
              {counts.sold}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("HIDDEN")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "HIDDEN"
                ? "border-[#018ABE] text-[#018ABE]"
                : "border-transparent text-[#02457A] hover:text-[#001B48]"
            }`}
          >
            <span>Tạm ẩn</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "HIDDEN"
                  ? "bg-[#018ABE] text-white"
                  : "bg-[#D6E8EE] text-[#001B48]"
              }`}
            >
              {counts.hidden}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "ALL"
                ? "border-[#018ABE] text-[#018ABE]"
                : "border-transparent text-[#02457A] hover:text-[#001B48]"
            }`}
          >
            <span>Tất cả tin</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "ALL"
                  ? "bg-[#018ABE] text-white"
                  : "bg-[#D6E8EE] text-[#001B48]"
              }`}
            >
              {counts.total}
            </span>
          </button>
        </div>

        {/* DANH SÁCH BÀI ĐĂNG */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse bg-white rounded-2xl border border-[#D6E8EE] p-4 flex gap-4 items-center"
              >
                <div className="w-24 h-24 bg-[#D6E8EE]/60 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-[#D6E8EE]/70 rounded w-1/2" />
                  <div className="h-4 bg-[#D6E8EE]/50 rounded w-1/4" />
                  <div className="h-4 bg-[#D6E8EE]/40 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product) => {
              const coverImage =
                product.images && product.images.length > 0
                  ? product.images[0].url
                  : "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&auto=format&fit=crop&q=80";
              const conditionMeta = CONDITION_LABELS[product.condition];
              const statusMeta = STATUS_LABELS[product.status];
              const isActionLoading = actionLoadingId === product.id;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-[#D6E8EE] p-4 sm:p-5 shadow-2xs hover:border-[#97CADB] transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                >
                  {/* Trái: Ảnh và thông tin */}
                  <div className="flex gap-4 items-center min-w-0 flex-1">
                    <Link
                      href={`/products/${product.id}`}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#D6E8EE]/30 shrink-0 border border-[#D6E8EE] group block"
                    >
                      <img
                        src={coverImage}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </Link>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            statusMeta?.colorClass || "bg-[#02457A] text-white"
                          }`}
                        >
                          {statusMeta?.label || product.status}
                        </span>
                        {conditionMeta && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D6E8EE] text-[#001B48]">
                            {conditionMeta.label}
                          </span>
                        )}
                        {product.category && (
                          <span className="text-[10px] text-[#02457A]">
                            • {product.category.name}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/products/${product.id}`}
                        className="block font-extrabold text-sm sm:text-base text-[#001B48] hover:text-[#018ABE] transition-colors truncate"
                      >
                        {product.title}
                      </Link>

                      <div className="text-base font-extrabold text-[#02457A]">
                        {formatCurrencyVND(product.price)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#02457A]">
                        <span className="inline-flex items-center gap-1">
                          <IconClock className="w-3.5 h-3.5" />{" "}
                          {formatRelativeTime(product.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <IconEye className="w-3.5 h-3.5" />{" "}
                          {product.view_count}
                        </span>
                        <span className="inline-flex items-center gap-1 truncate">
                          <IconMapPin className="w-3.5 h-3.5 shrink-0" />{" "}
                          <span className="truncate">
                            {product.pickup_location}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Phải: Cụm nút hành động */}
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D6E8EE]">
                    {product.status === "RESERVED" ? (
                      <>
                        <Link
                          href={`/products/${product.id}`}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#02457A] text-white hover:bg-[#001B48] transition-colors"
                        >
                          <span>Xử lý đơn giữ chỗ</span>
                          <IconArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/products/${product.id}/passport`}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#D6E8EE]/50 text-[#001B48] hover:bg-[#D6E8EE] transition-colors"
                        >
                          <IconShieldCheck className="w-3.5 h-3.5 text-[#018ABE]" />
                          <span>Xem Passport</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        {product.status === "ACTIVE" ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleUpdateStatus(product, "SOLD")}
                            className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#02457A] hover:bg-[#001B48] text-white transition-colors text-center disabled:opacity-50 cursor-pointer"
                          >
                            {isActionLoading ? "..." : "Đã bán"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleUpdateStatus(product, "ACTIVE")
                            }
                            className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#018ABE] hover:bg-[#02457A] text-white transition-colors text-center disabled:opacity-50 cursor-pointer"
                          >
                            {isActionLoading ? "..." : "Mở bán lại"}
                          </button>
                        )}

                        {product.status === "ACTIVE" && (
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#001B48] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors text-center"
                          >
                            <IconEdit className="w-3.5 h-3.5" /> Chỉnh sửa
                          </Link>
                        )}

                        {product.status !== "HIDDEN" ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleUpdateStatus(product, "HIDDEN")
                            }
                            className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-[11px] font-medium text-[#02457A] hover:text-red-600 transition-colors text-center cursor-pointer"
                          >
                            Tạm ẩn
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleUpdateStatus(product, "ACTIVE")
                            }
                            className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-[11px] font-medium text-[#018ABE] hover:underline transition-colors text-center cursor-pointer"
                          >
                            Bỏ ẩn
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-[#97CADB] flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#D6E8EE]/60 flex items-center justify-center mb-4 text-[#018ABE]">
              <IconPackage className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#001B48]">
              {activeTab === "ACTIVE"
                ? "Bạn chưa có món đồ nào đang đăng bán"
                : activeTab === "RESERVED"
                ? "Hiện chưa có món đồ nào đang được giữ chỗ"
                : activeTab === "SOLD"
                ? "Chưa có món đồ nào được đánh dấu đã bán"
                : activeTab === "HIDDEN"
                ? "Không có món đồ nào bị tạm ẩn"
                : "Bạn chưa có bài đăng nào"}
            </h3>
            <p className="text-xs text-[#02457A] max-w-sm mt-1 mb-6">
              Bạn có sách cũ, quạt điện, bàn gấp hay đồ KTX không dùng nữa? Hãy
              pass lại cho bạn bè cùng trường nhé!
            </p>
            <Link
              href="/products/new"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors shadow-2xs"
            >
              + Đăng tin thanh lý ngay
            </Link>
          </div>
        )}
      </main>

      <Toast toast={toast} onDismiss={dismiss} />
      <Footer />
    </div>
  );
}
