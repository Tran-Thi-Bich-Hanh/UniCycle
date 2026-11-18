"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProductCard, ProductCardData } from "@/components/products/ProductCard";

interface PublicUserInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isStudentVerified: boolean;
  studentVerifiedAt?: string | null;
  reputationScore: number;
  school: { id: string; name: string; shortName: string; area?: string } | null;
  dorm: string | null;
  createdAt: string;
  completedOrdersCount: number;
  isDeleted?: boolean;
}

interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  tags: string[];
  submittedAt: string;
  reviewer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isStudentVerified: boolean;
  };
  listingTitle: string;
}

interface PublicUserProfileClientProps {
  userId: string;
}

export function PublicUserProfileClient({ userId }: PublicUserProfileClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUserInfo | null>(null);
  const [listings, setListings] = useState<ProductCardData[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [activeTab, setActiveTab] = useState<"listings" | "reviews">("listings");

  useEffect(() => {
    let active = true;
    fetch(`/api/users/${encodeURIComponent(userId)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Không tìm thấy hồ sơ sinh viên này.");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        setUser(data.user || null);
        setListings(Array.isArray(data.listings) ? data.listings : []);
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải hồ sơ.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-[#02457A]">
          Đang tải hồ sơ sinh viên...
        </span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-[#D6E8EE] p-10 text-center space-y-4">
          <div className="text-4xl">👤</div>
          <h1 className="text-xl font-extrabold text-[#001B48]">
            {error || "Không tìm thấy hồ sơ người dùng"}
          </h1>
          <Link
            href="/products"
            className="inline-flex px-5 py-2.5 rounded-xl bg-[#018ABE] text-white text-xs font-bold hover:bg-[#02457A]"
          >
            Quay lại Sàn trao đổi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-[#02457A]">
        <Link href="/" className="hover:text-[#018ABE]">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[#018ABE]">
          Sàn trao đổi
        </Link>
        <span>/</span>
        <span className="text-[#001B48] font-bold truncate max-w-xs">{user.displayName}</span>
      </nav>

      {/* Profile Summary Header */}
      <div className="bg-white rounded-3xl border border-[#D6E8EE] shadow-xs overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[#001B48] via-[#02457A] to-[#018ABE]" />
        <div className="px-6 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white bg-[#D6E8EE] shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-[#001B48]">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="pt-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#001B48]">
                    {user.displayName}
                  </h1>
                  {user.isStudentVerified && !user.isDeleted && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                      <span>✓</span>
                      <span>Sinh viên đã xác minh</span>
                    </span>
                  )}
                </div>

                {!user.isDeleted && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="font-bold text-[#02457A]">
                      ⭐ {user.reputationScore.toFixed(1)} uy tín
                    </span>
                    <span>•</span>
                    <span>{user.completedOrdersCount} giao dịch hoàn tất</span>
                    {(user.dorm || user.school?.shortName) && (
                      <>
                        <span>•</span>
                        <span>📍 {user.dorm || user.school?.name}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!user.isDeleted && (
              <div className="text-[11px] text-slate-500">
                Tham gia từ {new Date(user.createdAt).toLocaleDateString("vi-VN")}
              </div>
            )}
          </div>

          {user.isDeleted && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              Tài khoản này đã xóa thông tin cá nhân theo cơ chế Crypto-shredding (BR34). Lịch sử vòng đời các món đồ trước đây trên Digital Product Passport vẫn được bảo toàn dưới dạng mã băm ẩn danh.
            </div>
          )}
        </div>
      </div>

      {/* Tabs Tin đang bán & Đánh giá uy tín */}
      {!user.isDeleted && (
        <div className="bg-white rounded-3xl border border-[#D6E8EE] shadow-xs overflow-hidden">
          <div className="flex border-b border-[#D6E8EE] bg-[#F4F9FB]">
            <button
              type="button"
              onClick={() => setActiveTab("listings")}
              className={`px-6 py-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "listings"
                  ? "bg-white text-[#001B48] border-[#018ABE]"
                  : "text-slate-600 border-transparent hover:text-[#02457A]"
              }`}
            >
              🛍️ Tin đang bán ({listings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`px-6 py-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "reviews"
                  ? "bg-white text-[#001B48] border-[#018ABE]"
                  : "text-slate-600 border-transparent hover:text-[#02457A]"
              }`}
            >
              ⭐ Đánh giá uy tín ({reviews.length})
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === "listings" ? (
              listings.length === 0 ? (
                <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
                  <div className="text-3xl">📦</div>
                  <p className="text-sm font-bold text-[#001B48]">
                    Hiện chưa có tin đăng nào đang mở bán
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {listings.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )
            ) : reviews.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
                <div className="text-3xl">⭐</div>
                <p className="text-sm font-bold text-[#001B48]">
                  Chưa có đánh giá công khai nào
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/users/${rev.reviewer.id}`}
                          className="text-xs font-extrabold text-[#001B48] hover:text-[#018ABE]"
                        >
                          {rev.reviewer.displayName}
                        </Link>
                        {rev.reviewer.isStudentVerified && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            ✓ SV
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-amber-500">
                        {"★".repeat(rev.rating)}
                        {"☆".repeat(Math.max(0, 5 - rev.rating))}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                    {rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {rev.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[#02457A]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span className="truncate max-w-md">Món đồ: {rev.listingTitle}</span>
                      <span>{new Date(rev.submittedAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
