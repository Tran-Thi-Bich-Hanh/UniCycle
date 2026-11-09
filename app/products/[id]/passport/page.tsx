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
  CategoryGlyph,
} from "@/components/icons";
import { formatCurrencyVND, CONDITION_LABELS } from "@/lib/utils";
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
  const [verification, setVerification] = useState<VerificationState>({ status: "verifying" });

  // Tự động tải thông tin sản phẩm & tự động đối soát tính toàn vẹn ngay khi mở trang
  const runVerify = async (productId: string) => {
    setVerification({ status: "verifying" });
    try {
      const res = await fetch(`/api/passport/verify?id=${encodeURIComponent(productId)}`);
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
        if (!res.ok) throw new Error("Không tìm thấy thông tin sản phẩm hoặc Hộ chiếu.");
        return res.json();
      })
      .then((data) => {
        setProduct(data.product);
        setLoading(false);
        runVerify(data.product.id);
      })
      .catch((err) => {
        setLoadError(err.message || "Lỗi tải dữ liệu Hộ chiếu số.");
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

  const specs = product ? extractDisplaySpecs(product.category_id, product.attributes) : [];

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
          <Link href="/products" className="hover:text-[#018ABE] transition-colors">
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
          <span className="text-[#001B48] font-bold">Hộ chiếu món đồ</span>
        </nav>

        {loading ? (
          <div
            className="flex flex-col items-center justify-center py-24 gap-3 text-sm text-[#02457A] font-semibold"
            role="status"
          >
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span>Đang mở hồ sơ Hộ chiếu món đồ...</span>
          </div>
        ) : loadError || !product ? (
          <div
            role="alert"
            className="p-8 rounded-3xl bg-red-50 border border-red-200 text-center max-w-md mx-auto my-12"
          >
            <IconAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-800">Không tìm thấy Hộ chiếu</h2>
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
            {/* THANH ĐIỀU HƯỚNG TRÊN CÙNG */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#001B48] tracking-tight">
                  Hộ chiếu & Lý lịch Món đồ
                </h1>
                <p className="text-xs sm:text-sm text-[#02457A] mt-1 font-medium">
                  Bản lưu trữ nguyên bản thông số cam kết và hành trình chuyền tay qua các khóa sinh viên.
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
                  {copiedLink ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Đã chép link!" : "Chia sẻ"}</span>
                </button>
              </div>
            </div>

            {/* BANNER TRẠNG THÁI ĐỐI SOÁT TỰ ĐỘNG (AUTO-VERIFIED STATUS) */}
            <div
              role="status"
              aria-live="polite"
              className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                verification.status === "verifying"
                  ? "bg-[#D6E8EE]/30 border-[#97CADB] text-[#001B48]"
                  : verification.status === "success"
                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                  : "bg-red-50 border-red-300 text-red-950"
              }`}
            >
              <div className="flex items-start sm:items-center gap-3.5">
                {verification.status === "verifying" ? (
                  <div className="w-9 h-9 rounded-xl bg-[#018ABE]/15 flex items-center justify-center shrink-0">
                    <div className="w-4 h-4 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : verification.status === "success" ? (
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
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
                      ? "Đang tự động kiểm tra tính nguyên bản..."
                      : verification.status === "success"
                      ? "Đã xác thực tự động: Thông số & Hình ảnh nguyên bản 100%"
                      : "Cảnh báo: Thông tin bài đăng có dấu hiệu sai lệch so với bản niêm phong"}
                  </h2>
                  <p className="text-xs opacity-85 mt-0.5">
                    {verification.status === "success"
                      ? "Mọi cam kết bên dưới hoàn toàn trùng khớp với thời điểm người bán niêm phong tin đăng."
                      : "Hệ thống đang đối chiếu chữ ký số của món đồ."}
                  </p>
                </div>
              </div>

              {verification.status !== "verifying" && (
                <button
                  type="button"
                  onClick={() => runVerify(product.id)}
                  className="text-xs font-extrabold px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-[#001B48] border border-current/20 shrink-0 self-start sm:self-auto cursor-pointer transition-colors"
                >
                  Kiểm tra lại
                </button>
              )}
            </div>

            {/* THẺ HỘ CHIẾU SỐ SINH VIÊN (TINH GỌN, THân THIỆN) */}
            <div className="relative rounded-3xl overflow-hidden shadow-lg border border-[#018ABE]/30 bg-gradient-to-br from-[#001B48] via-[#02457A] to-[#001B48] text-white p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#018ABE] flex items-center justify-center text-white shadow-sm">
                    <IconSchool className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] tracking-widest font-black uppercase text-[#97CADB] block">
                      Chứng nhận đồ cũ sinh viên
                    </span>
                    <span className="text-sm sm:text-base font-extrabold tracking-wide">
                      UNICYCLE PASSPORT #{product.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-[#97CADB]">
                  Niêm phong ngày {new Date(product.created_at).toLocaleDateString("vi-VN")}
                </span>
              </div>

              {/* Tóm tắt món đồ & Người bán */}
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0].url}
                    alt={product.title}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-white/20 shrink-0 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center border-2 border-white/20 shrink-0">
                    <CategoryGlyph name={product.category?.icon} className="w-10 h-10 text-[#97CADB]" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#018ABE] text-white text-[11px] font-extrabold">
                        {product.category?.name || "Đồ sinh viên"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-[#97CADB] text-[11px] font-bold">
                        {CONDITION_LABELS[product.condition]?.label || product.condition}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                      {product.title}
                    </h2>
                    <div className="mt-1 text-xl font-black text-[#97CADB]">
                      {product.price === 0 ? "Tặng miễn phí" : formatCurrencyVND(product.price)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                      <span className="text-[10px] uppercase font-bold text-[#97CADB] block mb-0.5">
                        Sinh viên đăng bán
                      </span>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <IconUser className="w-3.5 h-3.5 text-[#018ABE]" />
                        <span>{product.seller?.full_name || "Sinh viên"}</span>
                      </div>
                      <span className="text-[11px] text-white/75 block mt-0.5">
                        {product.seller?.university || "Đại học Quốc gia TP.HCM"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                      <span className="text-[10px] uppercase font-bold text-[#97CADB] block mb-0.5">
                        Điểm hẹn giao nhận
                      </span>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <IconMapPin className="w-3.5 h-3.5 text-[#018ABE]" />
                        <span className="truncate">{product.pickup_location}</span>
                      </div>
                      <span className="text-[11px] text-white/75 block mt-0.5">
                        Giao dịch trực tiếp tại trường
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thu gọn Chi tiết kỹ thuật mật mã học (Technical Abstraction) */}
              <details className="group pt-4 border-t border-white/15 text-xs">
                <summary className="cursor-pointer list-none flex items-center justify-between text-[#97CADB] hover:text-white font-bold select-none">
                  <span className="inline-flex items-center gap-1.5">
                    <IconSparkles className="w-4 h-4 text-[#018ABE]" />
                    <span>Thông số kỹ thuật bảo mật & Web3 Smart Contract (Dành cho hệ thống)</span>
                  </span>
                  <span className="text-[11px] underline group-open:hidden">Mở xem mã băm</span>
                  <span className="text-[11px] underline hidden group-open:inline">Thu gọn</span>
                </summary>
                <div className="mt-3 p-3.5 rounded-xl bg-black/35 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/75">
                      Mã vân tay dữ liệu (SHA-256 / Avalanche bytes32):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#97CADB] hover:text-white cursor-pointer"
                    >
                      {copiedHash ? <IconCheck className="w-3.5 h-3.5 text-emerald-400" /> : <IconCopy className="w-3.5 h-3.5" />}
                      <span>{copiedHash ? "Đã sao chép" : "Sao chép mã"}</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-emerald-400 break-all select-all">
                    {product.passport_hash || "Chưa tạo mã"}
                  </div>
                </div>
              </details>
            </div>

            {/* BẢNG CAM KẾT THÔNG SỐ GỐC */}
            <section className="rounded-3xl border border-[#D6E8EE] p-6 sm:p-8 bg-white shadow-2xs space-y-5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#001B48] flex items-center gap-2">
                  <IconTag className="w-5 h-5 text-[#018ABE]" />
                  <span>Bảng thông số người bán đã cam kết</span>
                </h2>
                <p className="text-xs text-[#02457A] mt-0.5">
                  Dùng bảng này để kiểm tra nhanh tình trạng món đồ khi hai bạn gặp nhau nhận hàng.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                      <div className="text-sm font-extrabold text-[#001B48] mt-1">{item.value}</div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                      <IconCheck className="w-3 h-3" />
                      <span>Đã cam kết</span>
                    </span>
                  </div>
                ))}

                <div className="p-4 rounded-2xl border border-[#D6E8EE] bg-[#D6E8EE]/20 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#02457A]">
                      Tình trạng chung
                    </div>
                    <div className="text-sm font-extrabold text-[#001B48] mt-1">
                      {CONDITION_LABELS[product.condition]?.label || product.condition} —{" "}
                      {CONDITION_LABELS[product.condition]?.desc}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                    <IconCheck className="w-3 h-3" />
                    <span>Đã cam kết</span>
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-[#D6E8EE] bg-[#D6E8EE]/20 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#02457A]">
                      Thời gian niêm phong
                    </div>
                    <div className="text-sm font-extrabold text-[#001B48] mt-1 flex items-center gap-1.5">
                      <IconClock className="w-4 h-4 text-[#018ABE]" />
                      <span>{new Date(product.created_at).toLocaleString("vi-VN")}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                    <IconCheck className="w-3 h-3" />
                    <span>Gốc</span>
                  </span>
                </div>
              </div>
            </section>

            {/* CÂY LỊCH SỬ TUẦN HOÀN SỞ HỮU (ĐẶT TẠI ĐÂY ĐỂ KHÔNG LẶP VỚI TRANG CHI TIẾT) */}
            <section className="rounded-3xl border border-[#D6E8EE] p-6 sm:p-8 bg-white shadow-2xs">
              <OwnershipTimeline
                history={product.ownership_history}
                currentSellerName={product.seller?.full_name}
                currentSellerUniversity={product.seller?.university || undefined}
              />
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
