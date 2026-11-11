"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { OwnershipTimeline } from "@/components/ownership-timeline";
import {
  IconAlert,
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCopy,
  IconMapPin,
  IconSchool,
  IconShieldCheck,
  IconSparkles,
  IconTag,
  IconUser,
  IconFileText,
  CategoryGlyph,
} from "@/components/icons";
import {
  formatCurrencyVND,
  formatRelativeTime,
  CONDITION_LABELS,
  STATUS_LABELS,
} from "@/lib/utils";
import { extractDisplaySpecs } from "@/lib/passport";
import { Product } from "@/lib/db";

interface VerificationState {
  status: "verifying" | "success" | "tampered";
  computedHash?: string;
  storedHash?: string;
  verifiedAt?: string;
}

export default function ProductPassportPage() {
  const params = useParams();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [verification, setVerification] = useState<VerificationState>({
    status: "verifying",
  });

  const runVerify = async (productId: string) => {
    setVerification({ status: "verifying" });
    try {
      const res = await fetch(
        `/api/passport/verify?id=${encodeURIComponent(productId)}`
      );
      const data = await res.json();
      if (data.isValid) {
        setVerification({
          status: "success",
          computedHash: data.computedHash,
          storedHash: data.storedHash,
          verifiedAt: data.verifiedAt,
        });
      } else {
        setVerification({
          status: "tampered",
          computedHash: data.computedHash,
          storedHash: data.storedHash,
        });
      }
    } catch {
      setVerification({ status: "tampered" });
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/products/${id}`)
      .then((res) => {
        if (!res.ok)
          throw new Error(
            "Không tìm thấy thông tin sản phẩm hoặc hồ sơ UniCycle Passport."
          );
        return res.json();
      })
      .then((data) => {
        setProduct(data.product);
        setLoading(false);
        runVerify(data.product.id);
      })
      .catch((err) => {
        setLoadError(
          err.message || "Lỗi tải dữ liệu hồ sơ UniCycle Passport."
        );
        setLoading(false);
      });
  }, [id]);

  const handleCopyHash = () => {
    if (!product?.passport_hash) return;
    navigator.clipboard.writeText(product.passport_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const specs = product
    ? extractDisplaySpecs(product.category_id, product.attributes)
    : [];
  const revisions = product?.revisions || [];
  const latestRevisionNumber =
    revisions.length > 0 ? revisions[0].revision_number : 1;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* BREADCRUMB */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-[#02457A] mb-6 font-medium flex-wrap"
        >
          <Link href="/" className="hover:text-[#018ABE] transition-colors">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href="/products"
            className="hover:text-[#018ABE] transition-colors"
          >
            Đồ sinh viên
          </Link>
          <span aria-hidden="true">/</span>
          {product && (
            <>
              <Link
                href={`/products/${product.id}`}
                className="hover:text-[#018ABE] transition-colors truncate max-w-[200px]"
              >
                {product.title}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className="text-[#001B48] font-bold">UniCycle Passport</span>
        </nav>

        {loading ? (
          <div
            className="flex flex-col items-center justify-center py-24 gap-3 text-sm text-[#02457A] font-semibold"
            role="status"
          >
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span>Đang tải hồ sơ chứng thực UniCycle Passport...</span>
          </div>
        ) : loadError || !product ? (
          <div
            role="alert"
            className="p-8 rounded-3xl bg-red-50 border border-red-200 text-center max-w-md mx-auto my-12"
          >
            <IconAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-800">
              Không tìm thấy hồ sơ UniCycle Passport
            </h2>
            <p className="text-xs text-red-600 mt-1">{loadError}</p>
            <Link
              href="/products"
              className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-[#001B48] text-white text-xs font-bold hover:bg-[#02457A] transition-colors"
            >
              Về danh sách đồ cũ
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* HEADER ĐIỀU HƯỚNG */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D6E8EE] text-[#001B48] text-[11px] font-extrabold mb-2">
                  <IconShieldCheck className="w-3.5 h-3.5 text-[#018ABE]" />
                  <span>Hồ sơ Chứng thực Sản phẩm • Phiên bản #{latestRevisionNumber}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#001B48] tracking-tight">
                  UniCycle Passport
                </h1>
                <p className="text-xs sm:text-sm text-[#02457A] mt-1 font-medium">
                  Chứng thực thông số cam kết, lịch sử phiên bản bài đăng và hành trình chuyền tay qua các khóa sinh viên.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/products/${product.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#D6E8EE] hover:border-[#018ABE] bg-white text-xs font-bold text-[#02457A] hover:text-[#018ABE] transition-all shadow-2xs"
                >
                  <IconArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại món đồ</span>
                </Link>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  {copiedLink ? (
                    <IconCheck className="w-3.5 h-3.5" />
                  ) : (
                    <IconCopy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLink ? "Đã chép link!" : "Chia sẻ Passport"}</span>
                </button>
              </div>
            </div>

            {/* =================================================================
                PHẦN 1: TÓM TẮT ĐỘ TIN CẬY & THÔNG SỐ CAM KẾT NGƯỜI BÁN
               ================================================================= */}
            <section className="space-y-5" aria-label="Phần 1: Tóm tắt độ tin cậy và cam kết">
              {/* Banner xác minh toàn vẹn dữ liệu */}
              <div
                role="status"
                aria-live="polite"
                className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  verification.status === "verifying"
                    ? "bg-[#D6E8EE]/30 border-[#97CADB] text-[#001B48]"
                    : verification.status === "success"
                    ? "bg-[#D6E8EE]/40 border-[#018ABE] text-[#001B48]"
                    : "bg-red-50 border-red-300 text-red-950"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  {verification.status === "verifying" ? (
                    <div className="w-9 h-9 rounded-xl bg-[#018ABE]/15 flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : verification.status === "success" ? (
                    <div className="w-9 h-9 rounded-xl bg-[#02457A] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <IconShieldCheck className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                      <IconAlert className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <h2 className="text-sm font-black">
                      {verification.status === "verifying"
                        ? "Đang đối soát chữ ký số SHA-256 của bài đăng..."
                        : verification.status === "success"
                        ? "Dữ liệu được xác minh toàn vẹn (SHA-256 & Avalanche Fuji)"
                        : "Cảnh báo: Dữ liệu hiện tại không khớp với chữ ký số đã lưu"}
                    </h2>
                    <p className="text-xs text-[#02457A] mt-0.5">
                      {verification.status === "success"
                        ? `Toàn bộ thông số, giá bán và mô tả hiện tại khớp hoàn toàn với Phiên bản #${latestRevisionNumber} trên hệ thống.`
                        : "Phát hiện sự khác biệt giữa dữ liệu bài đăng và mã băm lưu trữ."}
                    </p>
                  </div>
                </div>

                {verification.status !== "verifying" && (
                  <button
                    type="button"
                    onClick={() => runVerify(product.id)}
                    className="text-xs font-extrabold px-3.5 py-2 rounded-xl bg-white hover:bg-[#D6E8EE]/40 text-[#001B48] border border-[#97CADB] shrink-0 self-start sm:self-auto cursor-pointer transition-colors"
                  >
                    Xác minh lại
                  </button>
                )}
              </div>

              {/* Thẻ Chứng nhận UniCycle Passport */}
              <div className="relative rounded-3xl overflow-hidden shadow-md border border-[#018ABE]/30 bg-gradient-to-br from-[#001B48] via-[#02457A] to-[#001B48] text-white p-6 sm:p-7 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/15">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#018ABE] flex items-center justify-center text-white shadow-sm">
                      <IconShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] tracking-widest font-black uppercase text-[#97CADB] block">
                        Hồ sơ Chứng thực Sản phẩm Sinh viên
                      </span>
                      <span className="text-sm sm:text-base font-extrabold tracking-wide">
                        UNICYCLE PASSPORT #{product.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#018ABE]/40 border border-[#97CADB]/40 text-xs font-bold text-white">
                      {STATUS_LABELS[product.status]?.label || product.status}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-[#97CADB]">
                      Cấp ngày {new Date(product.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-5">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0].url}
                      alt={product.title}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-white/20 shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center border-2 border-white/20 shrink-0">
                      <CategoryGlyph
                        name={product.category?.icon}
                        className="w-10 h-10 text-[#97CADB]"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#018ABE] text-white text-[11px] font-extrabold">
                          {product.category?.name || "Đồ sinh viên"}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-[#97CADB] text-[11px] font-bold">
                          {CONDITION_LABELS[product.condition]?.label ||
                            product.condition}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                        {product.title}
                      </h2>
                      <div className="mt-1 text-xl font-black text-[#97CADB]">
                        {product.price === 0
                          ? "Tặng miễn phí"
                          : formatCurrencyVND(product.price)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                        <span className="text-[10px] uppercase font-bold text-[#97CADB] block mb-0.5">
                          Người bán cam kết
                        </span>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <IconUser className="w-3.5 h-3.5 text-[#018ABE]" />
                          <span>{product.seller?.full_name || "Sinh viên"}</span>
                        </div>
                        <span className="text-[11px] text-white/75 block mt-0.5">
                          {product.seller?.university ||
                            "Đại học Quốc gia TP.HCM"}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                        <span className="text-[10px] uppercase font-bold text-[#97CADB] block mb-0.5">
                          Điểm hẹn kiểm tra hàng
                        </span>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <IconMapPin className="w-3.5 h-3.5 text-[#018ABE]" />
                          <span className="truncate">
                            {product.pickup_location}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/75 block mt-0.5">
                          Đối chiếu trực tiếp trước khi giải ngân Escrow
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng thông số kỹ thuật cam kết */}
              <div className="rounded-3xl border border-[#D6E8EE] p-6 sm:p-7 bg-white shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#001B48] flex items-center gap-2">
                      <IconTag className="w-5 h-5 text-[#018ABE]" />
                      <span>1. Bảng thông số kỹ thuật người bán cam kết</span>
                    </h3>
                    <p className="text-xs text-[#02457A] mt-0.5">
                      Người mua sử dụng bảng này để đối chiếu trực tiếp khi gặp mặt nhận đồ tại KTX/Trường.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#D6E8EE]/60 text-[#001B48] text-xs font-bold">
                    {specs.length + 2} tiêu chí kiểm tra
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {specs.map((item) => (
                    <div
                      key={item.key}
                      className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                        item.isHighlight
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-[#D6E8EE]/20 border-[#D6E8EE]"
                      }`}
                    >
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#02457A]">
                          {item.label}
                        </div>
                        <div className="text-sm font-extrabold text-[#001B48] mt-1">
                          {item.value}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#02457A] bg-white px-2 py-0.5 rounded-md border border-[#97CADB] shrink-0">
                        <IconCheck className="w-3 h-3 text-[#018ABE]" />
                        <span>Cam kết</span>
                      </span>
                    </div>
                  ))}

                  <div className="p-4 rounded-2xl border border-[#D6E8EE] bg-[#D6E8EE]/20 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#02457A]">
                        Phân loại tình trạng
                      </div>
                      <div className="text-sm font-extrabold text-[#001B48] mt-1">
                        {CONDITION_LABELS[product.condition]?.label ||
                          product.condition}{" "}
                        — {CONDITION_LABELS[product.condition]?.desc}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#02457A] bg-white px-2 py-0.5 rounded-md border border-[#97CADB] shrink-0">
                      <IconCheck className="w-3 h-3 text-[#018ABE]" />
                      <span>Cam kết</span>
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#D6E8EE] bg-[#D6E8EE]/20 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#02457A]">
                        Cập nhật gần nhất
                      </div>
                      <div className="text-sm font-extrabold text-[#001B48] mt-1 flex items-center gap-1.5">
                        <IconClock className="w-4 h-4 text-[#018ABE]" />
                        <span>
                          {new Date(
                            product.updated_at || product.created_at
                          ).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#02457A] bg-white px-2 py-0.5 rounded-md border border-[#97CADB] shrink-0">
                      <span>Phiên bản #{latestRevisionNumber}</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* =================================================================
                PHẦN 2: LỊCH SỬ PHIÊN BẢN BÀI ĐĂNG (PRODUCT_REVISIONS) & SỞ HỮU
               ================================================================= */}
            <section
              className="rounded-3xl border border-[#D6E8EE] p-6 sm:p-7 bg-white shadow-2xs space-y-6"
              aria-label="Phần 2: Lịch sử phiên bản chỉnh sửa và tuần hoàn sở hữu"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#001B48] flex items-center gap-2">
                      <IconFileText className="w-5 h-5 text-[#018ABE]" />
                      <span>2. Lịch sử phiên bản bài đăng (Chống sửa đổi ngầm)</span>
                    </h3>
                    <p className="text-xs text-[#02457A] mt-0.5">
                      Mỗi lần người bán cập nhật giá hoặc thông số khi đang rao bán đều được lưu vết công khai. Khi đã có người giữ chỗ (Escrow), bài đăng tự động khóa chỉnh sửa.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#D6E8EE] text-[#001B48] text-xs font-extrabold">
                    {revisions.length || 1} phiên bản
                  </span>
                </div>

                {revisions.length > 0 ? (
                  <div className="divide-y divide-[#D6E8EE] rounded-2xl border border-[#D6E8EE] overflow-hidden">
                    {revisions.map((rev, idx) => (
                      <div
                        key={rev.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          idx === 0 ? "bg-[#D6E8EE]/25" : "bg-white"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                                idx === 0
                                  ? "bg-[#02457A] text-white"
                                  : "bg-[#D6E8EE] text-[#001B48]"
                              }`}
                            >
                              Phiên bản #{rev.revision_number}
                              {idx === 0 ? " (Hiện tại)" : ""}
                            </span>
                            <span className="text-xs font-bold text-[#001B48]">
                              {rev.change_summary}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#02457A] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>
                              Giá niêm yết:{" "}
                              <strong className="text-[#001B48]">
                                {formatCurrencyVND(rev.price)}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>{formatRelativeTime(rev.created_at)}</span>
                            {rev.editor_name && (
                              <>
                                <span>•</span>
                                <span>Bởi: {rev.editor_name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {rev.data_hash && (
                          <div className="text-[11px] font-mono text-[#02457A] bg-white px-2.5 py-1 rounded-lg border border-[#D6E8EE] shrink-0">
                            Hash: {rev.data_hash.slice(0, 10)}...
                            {rev.data_hash.slice(-6)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#D6E8EE]/20 border border-[#D6E8EE] text-xs text-[#02457A]">
                    Phiên bản #1 (Gốc): Bài đăng chưa từng chỉnh sửa kể từ khi đăng bán.
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-[#D6E8EE]">
                <OwnershipTimeline
                  history={product.ownership_history}
                  currentSellerName={product.seller?.full_name}
                  currentSellerUniversity={
                    product.seller?.university || undefined
                  }
                />
              </div>
            </section>

            {/* =================================================================
                PHẦN 3: BẰNG CHỨNG KỸ THUẬT SỐ CHUYÊN SÂU (SHA-256 & ON-CHAIN)
               ================================================================= */}
            <section
              className="rounded-3xl border border-[#D6E8EE] p-6 bg-[#D6E8EE]/20 space-y-3"
              aria-label="Phần 3: Bằng chứng kỹ thuật số"
            >
              <details className="group">
                <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-extrabold text-[#001B48] select-none">
                  <span className="inline-flex items-center gap-2">
                    <IconSparkles className="w-4 h-4 text-[#018ABE]" />
                    <span>
                      3. Chi tiết chữ ký số SHA-256 & Đối soát Smart Contract (Dành cho kiểm chứng kỹ thuật)
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#018ABE] underline group-open:hidden">
                    Mở chi tiết mã băm
                  </span>
                  <span className="text-xs font-bold text-[#018ABE] underline hidden group-open:inline">
                    Thu gọn
                  </span>
                </summary>

                <div className="mt-4 p-4 rounded-2xl bg-white border border-[#97CADB] space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#02457A]">
                      Mã băm dữ liệu chuẩn Canonical SHA-256 (bytes32):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-[#018ABE] hover:text-[#02457A] cursor-pointer"
                    >
                      {copiedHash ? (
                        <IconCheck className="w-3.5 h-3.5" />
                      ) : (
                        <IconCopy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedHash ? "Đã sao chép mã băm" : "Sao chép mã băm"}
                      </span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-[#001B48] text-[#97CADB] font-mono text-[11px] break-all select-all">
                    {product.passport_hash || "Chưa khởi tạo"}
                  </div>

                  {verification.computedHash && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-[#02457A]">
                      <div className="p-2.5 rounded-lg bg-[#D6E8EE]/30">
                        <span className="block font-bold text-[#001B48]">
                          Hash lưu trữ trên DB:
                        </span>
                        <code className="font-mono break-all">
                          {verification.storedHash}
                        </code>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#D6E8EE]/30">
                        <span className="block font-bold text-[#001B48]">
                          Hash tính toán trực tiếp từ bài đăng:
                        </span>
                        <code className="font-mono break-all">
                          {verification.computedHash}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
