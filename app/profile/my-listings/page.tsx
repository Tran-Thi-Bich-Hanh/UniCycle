"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Product } from "@/lib/db";
import { formatCurrencyVND, formatRelativeTime, CONDITION_LABELS, STATUS_LABELS } from "@/lib/utils";

type TabType = "ALL" | "ACTIVE" | "SOLD" | "HIDDEN";

export default function MyListingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<{ active: number; sold: number; hidden: number; total: number }>({
    active: 0,
    sold: 0,
    hidden: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
          setCounts(data.counts);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchListings();
  }, [activeTab]);

  // Update status (ACTIVE, SOLD, HIDDEN)
  const handleUpdateStatus = async (productId: string, newStatus: "ACTIVE" | "SOLD" | "HIDDEN") => {
    setActionLoadingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchListings();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
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
          <Link href="/profile" className="hover:text-[#018ABE] transition-colors">
            Tài khoản
          </Link>
          <span>/</span>
          <span className="text-[#001B48] font-bold">Quản lý tin đăng</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
              Quản lý tin đăng thanh lý
            </h1>
            <p className="text-sm text-[#02457A] mt-1 font-medium">
              Theo dõi tình trạng bài đăng, số lượt xem và chuyển đổi trạng thái khi đã bán
            </p>
          </div>
          <Link
            href="/products/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors shadow-2xs shrink-0"
          >
            + Đăng tin mới
          </Link>
        </div>

        {/* TABS TRẠNG THÁI */}
        <div className="flex items-center gap-2 border-b border-[#D6E8EE] mb-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "ACTIVE"
                ? "border-[#018ABE] text-[#018ABE]"
                : "border-transparent text-[#02457A] hover:text-[#001B48]"
            }`}
          >
            <span>Đang đăng bán</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "ACTIVE" ? "bg-[#018ABE] text-white" : "bg-[#D6E8EE] text-[#001B48]"
              }`}
            >
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SOLD")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "SOLD"
                ? "border-[#018ABE] text-[#018ABE]"
                : "border-transparent text-[#02457A] hover:text-[#001B48]"
            }`}
          >
            <span>Đã bán / Đã thanh lý</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "SOLD" ? "bg-[#018ABE] text-white" : "bg-[#D6E8EE] text-[#001B48]"
              }`}
            >
              {counts.sold}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("HIDDEN")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "HIDDEN"
                ? "border-[#018ABE] text-[#018ABE]"
                : "border-transparent text-[#02457A] hover:text-[#001B48]"
            }`}
          >
            <span>Tạm ẩn</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "HIDDEN" ? "bg-[#018ABE] text-white" : "bg-[#D6E8EE] text-[#001B48]"
              }`}
            >
              {counts.hidden}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "ALL"
                ? "border-[#018ABE] text-[#018ABE]"
                : "border-transparent text-[#02457A] hover:text-[#001B48]"
            }`}
          >
            <span>Tất cả tin</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "ALL" ? "bg-[#018ABE] text-white" : "bg-[#D6E8EE] text-[#001B48]"
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
                        <span>🕒 {formatRelativeTime(product.created_at)}</span>
                        <span>•</span>
                        <span>👁️ {product.view_count} lượt xem</span>
                        <span>•</span>
                        <span className="truncate">📍 {product.pickup_location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Phải: Cụm nút hành động */}
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D6E8EE]">
                    {/* Nút chuyển Đã bán / Mở bán lại */}
                    {product.status === "ACTIVE" ? (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleUpdateStatus(product.id, "SOLD")}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#02457A] hover:bg-[#001B48] text-white transition-colors text-center disabled:opacity-50"
                      >
                        {isActionLoading ? "..." : "✓ Đã bán"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleUpdateStatus(product.id, "ACTIVE")}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#018ABE] hover:bg-[#02457A] text-white transition-colors text-center disabled:opacity-50"
                      >
                        {isActionLoading ? "..." : "Mở bán lại"}
                      </button>
                    )}

                    {/* Sửa tin */}
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#001B48] border border-[#97CADB] hover:bg-[#D6E8EE]/40 transition-colors text-center"
                    >
                      ✏️ Chỉnh sửa
                    </Link>

                    {/* Ẩn tin / Bỏ ẩn */}
                    {product.status !== "HIDDEN" ? (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleUpdateStatus(product.id, "HIDDEN")}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-[11px] font-medium text-[#02457A] hover:text-red-600 transition-colors text-center"
                      >
                        Tạm ẩn
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleUpdateStatus(product.id, "ACTIVE")}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-[11px] font-medium text-[#018ABE] hover:underline transition-colors text-center"
                      >
                        Bỏ ẩn
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-[#97CADB] flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#D6E8EE]/60 flex items-center justify-center text-3xl mb-4 text-[#018ABE]">
              📦
            </div>
            <h3 className="text-lg font-bold text-[#001B48]">
              {activeTab === "ACTIVE"
                ? "Bạn chưa có món đồ nào đang đăng bán"
                : activeTab === "SOLD"
                ? "Chưa có món đồ nào được đánh dấu đã bán"
                : activeTab === "HIDDEN"
                ? "Không có món đồ nào bị tạm ẩn"
                : "Bạn chưa có bài đăng nào"}
            </h3>
            <p className="text-xs text-[#02457A] max-w-sm mt-1 mb-6">
              Bạn có sách cũ, quạt điện, bàn gấp hay đồ KTX không dùng nữa? Hãy pass lại cho bạn bè cùng trường nhé!
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

      <Footer />
    </div>
  );
}

