"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InviteData {
  id: string;
  status: string;
  expiresAt: string;
  listing: {
    id: string;
    title: string;
    price: number;
    isFree?: boolean;
    condition: string;
    status: string;
    school?: { name?: string; shortName?: string } | null;
    category?: { name?: string; slug?: string } | null;
    seller: {
      id: string;
      displayName: string;
      avatarUrl?: string | null;
      isStudentVerified?: boolean;
      reputationScore?: number;
      dorm?: string | null;
    };
    item?: {
      passportEnabled?: boolean;
      passportId?: string | null;
    } | null;
    images: Array<{ url: string }>;
  };
}

interface InviteAcceptClientProps {
  code: string;
}

export function InviteAcceptClient({ code }: InviteAcceptClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        // Lấy session
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user?.id && !ignore) {
            setCurrentUserId(meData.user.id);
          }
        }

        // Lấy thông tin lời mời
        const inviteRes = await fetch(`/api/invites/${code}`);
        const inviteJson = await inviteRes.json();

        if (!inviteRes.ok) {
          if (!ignore) setError(inviteJson.error || "Không thể tải lời mời chốt bán.");
          return;
        }

        if (!ignore) {
          setInvite(inviteJson.invite);
        }
      } catch {
        if (!ignore) setError("Lỗi kết nối khi tải lời mời.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [code]);

  const handleAccept = async () => {
    if (!currentUserId) {
      router.push(`/login?returnTo=/invites/${code}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invites/${code}/accept`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể xác nhận chốt mua.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/orders");
      }, 1500);
    } catch {
      setError("Đã xảy ra lỗi khi xác nhận chốt mua.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-[#02457A]">Đang kiểm tra lời mời chốt bán...</span>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl mx-auto mb-4">
          ⚠️
        </div>
        <h2 className="text-xl font-extrabold text-[#001B48] mb-2">
          Lời Mời Không Khả Dụng
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
          {error || "Lời mời chốt bán này đã hết hạn sau 24 giờ hoặc đã được người khác xác nhận mua trước đó."}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold shadow-md transition-all"
        >
          <span>Khám phá món đồ khác</span>
        </Link>
      </div>
    );
  }

  const { listing } = invite;
  const isSeller = currentUserId === listing.seller.id;
  const mainImage =
    listing.images && listing.images.length > 0
      ? listing.images[0].url
      : "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E8EE] shadow-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5 pb-5 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#0068FF]/10 text-[#0068FF]">
            <span>Lời Mời Chốt Bán Qua Zalo</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#001B48] tracking-tight">
            Xác Nhận Giữ Chỗ Món Đồ
          </h1>
          <p className="text-xs text-[#02457A]">
            Người bán đã gửi lời mời cho bạn để đảm bảo quyền lợi và cấp Digital Product Passport
          </p>
        </div>

        {/* Thông tin món đồ */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white">
            <Image src={mainImage} alt={listing.title} fill className="object-cover" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-[#02457A] bg-[#D6E8EE]/40 px-2 py-0.5 rounded">
              {listing.category?.name || "Đồ sinh viên"}
            </span>
            <h3 className="text-sm font-bold text-[#001B48] line-clamp-2">
              {listing.title}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold text-[#018ABE] text-sm">
                {listing.isFree ? "0đ (Cho tặng)" : `${listing.price.toLocaleString("vi-VN")} đ`}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">{listing.condition}</span>
            </div>
          </div>
        </div>

        {/* Thông tin người bán */}
        <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-blue-200">
              <Image
                src={
                  listing.seller.avatarUrl ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                }
                alt={listing.seller.displayName}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#001B48]">
                  {listing.seller.displayName}
                </span>
                {listing.seller.isStudentVerified && (
                  <span className="text-[10px] text-emerald-600 font-bold" title="Sinh viên đã duyệt">✓ SV</span>
                )}
              </div>
              <span className="text-[11px] text-[#02457A]">
                {listing.seller.dorm || listing.school?.shortName || "Sinh viên KTX"}
              </span>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            ⭐ {listing.seller.reputationScore?.toFixed(1) || "5.0"}
          </span>
        </div>

        {/* 3 Lợi ích khi chốt trên UniCycle */}
        <div className="space-y-2.5 p-4 rounded-2xl bg-[#F8FAFC] border border-[#D6E8EE] text-xs text-[#001B48]">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">✓</span>
            <span>
              <strong>Giữ chỗ độc quyền (RESERVED):</strong> Không bị người khác mua mất.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">✓</span>
            <span>
              <strong>Digital Product Passport:</strong> Kế thừa hồ sơ vòng đời Đời chủ #2.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">✓</span>
            <span>
              <strong>Bảo vệ 48 giờ & Uy tín:</strong> Nút khiếu nại nếu hàng không đúng mô tả.
            </span>
          </div>
        </div>

        {/* Thông báo thành công */}
        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm text-center font-bold animate-in fade-in">
            🎉 Xác nhận chốt mua thành công! Đang chuyển đến trang đơn hẹn...
          </div>
        )}

        {/* Nút hành động */}
        {!success && (
          <div className="pt-2 space-y-3">
            {isSeller ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 text-center font-medium">
                Bạn là người bán món đồ này. Hãy gửi đường link này cho bạn mua qua Zalo để bạn ấy xác nhận.
              </div>
            ) : !currentUserId ? (
              <Link
                href={`/login?returnTo=/invites/${code}`}
                className="w-full py-3.5 px-4 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>🔑 Đăng Nhập Để Xác Nhận Mua</span>
              </Link>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleAccept}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xác nhận giữ chỗ...</span>
                  </>
                ) : (
                  <span>🤝 Xác Nhận Chốt Mua & Giữ Chỗ Ngay</span>
                )}
              </button>
            )}

            <p className="text-[11px] text-center text-slate-400">
              Thanh toán trực tiếp khi gặp mặt nhận đồ • Không cần nạp tiền trước
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

