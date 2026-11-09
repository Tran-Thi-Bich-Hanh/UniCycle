"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { QrCode } from "@/components/qr-code";
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
import { CATEGORY_SPEC_CONFIG } from "@/lib/passport";
import { Product } from "@/lib/db";

interface VerificationState {
  status: "idle" | "verifying" | "success" | "tampered";
  message?: string;
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
  const [verification, setVerification] = useState<VerificationState>({ status: "idle" });

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
      })
      .catch((err) => {
        setLoadError(err.message || "Lỗi tải dữ liệu Hộ chiếu số.");
        setLoading(false);
      });
  }, [id]);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  // Thuộc tính kỹ thuật đã phân tích từ JSON
  const parsedAttributes = useMemo(() => {
    if (!product?.attributes) return {};
    try {
      return typeof product.attributes === "string"
        ? JSON.parse(product.attributes)
        : product.attributes;
    } catch {
      return {};
    }
  }, [product?.attributes]);

  // Cấu hình nhãn tiếng Việt cho thông số theo danh mục
  const specFields = useMemo(() => {
    if (!product) return [];
    const config = CATEGORY_SPEC_CONFIG[product.category_id];
    if (config && config.fields) return config.fields;
    return [];
  }, [product]);

  const handleCopyHash = () => {
    if (!product?.passport_hash) return;
    navigator.clipboard.writeText(product.passport_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Kích hoạt chế độ kiểm tra toàn vẹn (Meetup Verification)
  const handleVerifyIntegrity = async () => {
    if (!product) return;
    setVerification({ status: "verifying" });

    try {
      const res = await fetch(`/api/passport/verify?id=${encodeURIComponent(product.id)}`);
      const data = await res.json();

      // Giữ hiệu ứng radar scan trong 500ms để người dùng cảm nhận rõ quá trình đối soát
      setTimeout(() => {
        if (data.isValid) {
          setVerification({
            status: "success",
            message:
              "Ảnh chụp và thông số kỹ thuật hoàn toàn trùng khớp với dữ liệu gốc lúc đăng tin - Dữ liệu nguyên bản, không bị can thiệp.",
            computedHash: data.computedHash,
            storedHash: data.storedHash,
            verifiedAt: data.verifiedAt,
          });
        } else {
          setVerification({
            status: "tampered",
            message:
              "Cảnh báo: Dữ liệu hiện tại có sự sai lệch so với mã băm niêm phong ban đầu!",
            computedHash: data.computedHash,
            storedHash: data.storedHash,
          });
        }
      }, 500);
    } catch {
      setVerification({
        status: "tampered",
        message: "Không thể kết nối đến hệ thống kiểm định Hộ chiếu số.",
      });
    }
  };

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
                className="hover:text-[#018ABE] transition-colors line-clamp-1 max-w-[200px]"
              >
                {product.title}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className="text-[#001B48] font-bold">Hộ chiếu số UniCycle</span>
        </nav>

        {loading ? (
          <div
            className="flex flex-col items-center justify-center py-24 gap-3 text-sm text-[#02457A] font-semibold"
            role="status"
          >
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span>Đang tải chứng nhận Hộ chiếu số...</span>
          </div>
        ) : loadError || !product ? (
          <div
            role="alert"
            className="p-8 rounded-3xl bg-red-50 border border-red-200 text-center max-w-md mx-auto my-12"
          >
            <IconAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-800">Không tìm thấy Hộ chiếu số</h2>
            <p className="text-xs text-red-600 mt-1">{loadError || "Món đồ chưa được cấp Hộ chiếu số."}</p>
            <Link
              href="/products"
              className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-[#001B48] text-white text-xs font-bold hover:bg-[#02457A] transition-colors"
            >
              Về danh sách đồ cũ
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* TIÊU ĐỀ TRANG & HUY HIỆU */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D6E8EE] text-[#001B48] text-xs font-extrabold mb-2 border border-[#97CADB]">
                  <IconShieldCheck className="w-4 h-4 text-[#018ABE]" />
                  <span>Chứng nhận Hộ chiếu số độc bản</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#001B48] tracking-tight">
                  UniCycle Digital Passport
                </h1>
                <p className="text-xs sm:text-sm text-[#02457A] mt-1 font-medium">
                  Hồ sơ kỹ thuật số niêm phong tính toàn vẹn của món đồ lúc sinh viên đăng bán.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/products/${product.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#D6E8EE] hover:border-[#018ABE] bg-white text-xs font-bold text-[#02457A] hover:text-[#018ABE] transition-all shadow-2xs"
                >
                  <IconArrowLeft className="w-3.5 h-3.5" />
                  <span>Xem tin đăng</span>
                </Link>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-all shadow-2xs"
                >
                  {copiedLink ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Đã chép link!" : "Chia sẻ Passport"}</span>
                </button>
              </div>
            </div>

            {/* THẺ CHỨNG NHẬN HỘ CHIẾU SỐ (DIGITAL PASSPORT CARD - TRUST & AUTHORITY) */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl border-2 border-[#018ABE]/30 bg-gradient-to-br from-[#001B48] via-[#02457A] to-[#001B48] text-white p-6 sm:p-8">
              {/* Nền hoa văn chống giả mạo */}
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(#97CADB 1.5px, transparent 1.5px), radial-gradient(#97CADB 1.5px, #001B48 1.5px)",
                  backgroundSize: "24px 24px",
                  backgroundPosition: "0 0, 12px 12px",
                }}
              />

              {/* Dải đầu thẻ chứng nhận */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#018ABE] flex items-center justify-center text-white shadow-md border border-[#97CADB]/40">
                    <IconSchool className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] tracking-widest font-black uppercase text-[#97CADB]">
                      UniCycle Student Marketplace
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold tracking-wide">
                      GIẤY CHỨNG NHẬN HỘ CHIẾU SỐ
                    </h2>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#97CADB] block">Mã Hộ Chiếu</span>
                  <span className="text-xs sm:text-sm font-mono font-extrabold tracking-wider text-white">
                    PASSPORT-{product.id.slice(-8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Nội dung trung tâm: Món đồ & QR Code */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                {/* 2 cột bên trái: Chi tiết món đồ */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-start gap-4">
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

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-[#018ABE] text-white text-[10px] font-extrabold">
                          {product.category?.name || "Đồ sinh viên"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/15 text-[#97CADB] text-[10px] font-bold border border-white/20">
                          {CONDITION_LABELS[product.condition]?.label || product.condition}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white leading-snug line-clamp-2">
                        {product.title}
                      </h3>
                      <div className="mt-2 text-xl font-black text-[#97CADB]">
                        {product.price === 0 ? "Tặng miễn phí" : formatCurrencyVND(product.price)}
                      </div>
                    </div>
                  </div>

                  {/* Thông tin người sở hữu ban đầu */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                      <span className="text-[10px] uppercase font-bold text-[#97CADB] block mb-1">
                        Sinh viên sở hữu
                      </span>
                      <div className="flex items-center gap-2 font-bold text-white">
                        <IconUser className="w-4 h-4 text-[#018ABE]" />
                        <span>{product.seller?.full_name || "Sinh viên"}</span>
                      </div>
                      <p className="text-[11px] text-white/70 mt-0.5 pl-6">
                        {product.seller?.university || "Đại học Quốc gia TP.HCM"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                      <span className="text-[10px] uppercase font-bold text-[#97CADB] block mb-1">
                        Điểm hẹn bàn giao
                      </span>
                      <div className="flex items-center gap-2 font-bold text-white">
                        <IconMapPin className="w-4 h-4 text-[#018ABE]" />
                        <span className="line-clamp-1">{product.pickup_location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-white/70 mt-0.5 pl-6">
                        <IconClock className="w-3 h-3 text-[#97CADB]" />
                        <span>Niêm phong lúc: {new Date(product.created_at).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cột bên phải: QR Code phục vụ buổi gặp mặt (Meetup Mode) */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/10 border border-white/15 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#97CADB] mb-2">
                    Mã QR Hẹn Gặp
                  </span>
                  <div className="p-2 bg-white rounded-xl shadow-lg">
                    <QrCode value={currentUrl || `https://unicycle.edu.vn/products/${product.id}/passport`} size={130} />
                  </div>
                  <span className="text-[11px] text-white/80 font-medium mt-2.5 max-w-[160px] leading-tight">
                    Quét tại KTX hoặc cổng trường để đối chiếu trực tiếp
                  </span>
                </div>
              </div>

              {/* Dấu vân tay mật mã học SHA-256 (Cryptographic Fingerprint) */}
              <div className="relative z-10 mt-6 pt-5 border-t border-white/15">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <IconSparkles className="w-4 h-4 text-[#018ABE]" />
                    <span className="text-xs font-extrabold text-[#97CADB] uppercase tracking-wider">
                      Dấu vân tay mật mã học (SHA-256 Fingerprint)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#97CADB] transition-colors self-start sm:self-auto"
                  >
                    {copiedHash ? <IconCheck className="w-3.5 h-3.5 text-emerald-400" /> : <IconCopy className="w-3.5 h-3.5" />}
                    <span>{copiedHash ? "Đã sao chép!" : "Sao chép mã băm"}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/15 font-mono text-[11px] sm:text-xs text-emerald-400 break-all select-all flex items-center justify-between gap-3">
                  <span>{product.passport_hash || "Chưa tạo mã băm"}</span>
                </div>

                <p className="text-[10px] text-white/60 mt-2">
                  * Chuẩn mã băm 66 ký tự (tiền tố <code>0x</code>), tương thích hoàn toàn với <code>bytes32</code> của Smart Contract Avalanche C-Chain / Fuji testnet.
                </p>
              </div>
            </div>

            {/* CÔNG CỤ ĐỐI SOÁT TẠI CHỖ (MEETUP VERIFICATION TOOL) */}
            <div className="rounded-3xl border-2 border-[#D6E8EE] p-6 sm:p-8 bg-white shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#001B48] flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#018ABE] text-white">
                      <IconShieldCheck className="w-5 h-5" />
                    </span>
                    <span>Chế độ Kiểm tra tại chỗ (Meetup Verification)</span>
                  </h2>
                  <p className="text-xs text-[#02457A] mt-1">
                    Nhấn nút bên dưới để hệ thống quét và tái băm toàn bộ dữ liệu, đối chiếu với mã niêm phong gốc.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyIntegrity}
                  disabled={verification.status === "verifying"}
                  className="px-6 py-3.5 rounded-2xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs sm:text-sm font-extrabold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {verification.status === "verifying" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang đối soát mật mã...</span>
                    </>
                  ) : (
                    <>
                      <IconShieldCheck className="w-4 h-4" />
                      <span>Kiểm tra tính toàn vẹn</span>
                    </>
                  )}
                </button>
              </div>

              {/* KẾT QUẢ ĐỐI SOÁT */}
              {verification.status === "success" && (
                <div
                  role="status"
                  className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-3 animate-fadeIn"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <IconCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wide">
                        Tính toàn vẹn hợp lệ 100%
                      </h4>
                      <p className="text-xs text-emerald-800 font-medium">{verification.message}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 border border-emerald-200 text-[11px] font-mono space-y-1">
                    <div className="text-emerald-900">
                      <span className="font-bold">Mã băm lưu trữ:</span> {verification.storedHash}
                    </div>
                    <div className="text-emerald-900">
                      <span className="font-bold">Mã băm tính lại:</span> {verification.computedHash}
                    </div>
                    <div className="text-[10px] text-emerald-700 pt-1 font-sans">
                      ✓ Đã xác thực lúc: {new Date(verification.verifiedAt || "").toLocaleTimeString("vi-VN")}{" "}
                      - Bạn hoàn toàn an tâm giao dịch tiền mặt hoặc nhận đồ!
                    </div>
                  </div>
                </div>
              )}

              {verification.status === "tampered" && (
                <div
                  role="alert"
                  className="p-5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-950 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                      <IconAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-red-900 uppercase tracking-wide">
                        Cảnh báo: Dữ liệu không trùng khớp!
                      </h4>
                      <p className="text-xs text-red-800 font-medium">{verification.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hướng dẫn 3 bước cho sinh viên tại cổng trường */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-[#D6E8EE]/30 border border-[#97CADB]/40 text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#001B48] text-white flex items-center justify-center font-bold text-[11px] mb-2">
                    1
                  </div>
                  <h5 className="font-extrabold text-[#001B48] mb-0.5">Quét mã QR</h5>
                  <p className="text-[11px] text-[#02457A]">
                    Khi gặp bạn bán tại cổng trường/KTX, mở camera quét mã QR trên điện thoại người bán.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#D6E8EE]/30 border border-[#97CADB]/40 text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#018ABE] text-white flex items-center justify-center font-bold text-[11px] mb-2">
                    2
                  </div>
                  <h5 className="font-extrabold text-[#001B48] mb-0.5">Bấm Kiểm tra toàn vẹn</h5>
                  <p className="text-[11px] text-[#02457A]">
                    Bấm nút đối soát để xác nhận ảnh và thông số không bị chỉnh sửa sau khi đăng bài.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#D6E8EE]/30 border border-[#97CADB]/40 text-xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] mb-2">
                    3
                  </div>
                  <h5 className="font-extrabold text-[#001B48] mb-0.5">An tâm giao nhận</h5>
                  <p className="text-[11px] text-[#02457A]">
                    Đối chiếu thực tế với bảng cam kết thông số bên dưới trước khi trả tiền.
                  </p>
                </div>
              </div>
            </div>

            {/* BẢNG CAM KẾT THÔNG SỐ GỐC THEO DANH MỤC (ORIGINAL SPECIFICATIONS) */}
            <div className="rounded-3xl border border-[#D6E8EE] p-6 sm:p-8 bg-white shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#001B48] flex items-center gap-2">
                    <IconTag className="w-5 h-5 text-[#018ABE]" />
                    <span>Bảng cam kết thông số gốc lúc đăng tin</span>
                  </h2>
                  <p className="text-xs text-[#02457A] mt-0.5">
                    Các thông số này đã được mã hóa vào dấu vân tay SHA-256
                  </p>
                </div>
                <span className="text-xs font-bold text-[#018ABE] bg-[#D6E8EE] px-3 py-1 rounded-full">
                  {specFields.length + 3} tiêu chí
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#D6E8EE]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#D6E8EE]/40 text-[#001B48] uppercase font-extrabold text-[11px]">
                    <tr>
                      <th className="px-4 py-3 border-b border-[#D6E8EE] w-1/3">Tiêu chí kỹ thuật</th>
                      <th className="px-4 py-3 border-b border-[#D6E8EE]">Cam kết của người bán</th>
                      <th className="px-4 py-3 border-b border-[#D6E8EE] text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D6E8EE]/60 font-medium text-[#001B48]">
                    {/* Các trường đặc thù danh mục */}
                    {specFields.map((field) => {
                      const val = parsedAttributes[field.key];
                      return (
                        <tr key={field.key} className="hover:bg-[#D6E8EE]/10 transition-colors">
                          <td className="px-4 py-3 font-bold text-[#02457A]">{field.label}</td>
                          <td className="px-4 py-3">
                            {val ? (
                              <span className="font-semibold text-[#001B48]">{val}</span>
                            ) : (
                              <span className="text-[#02457A]/50 italic">Chưa điền thông số này</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <IconCheck className="w-3 h-3" />
                              <span>Niêm phong</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Trường bổ sung nếu có */}
                    {parsedAttributes.defects && (
                      <tr className="hover:bg-[#D6E8EE]/10 transition-colors bg-amber-50/40">
                        <td className="px-4 py-3 font-bold text-amber-900">Khuyết điểm lưu ý</td>
                        <td className="px-4 py-3 font-semibold text-amber-900">{parsedAttributes.defects}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                            Minh bạch
                          </span>
                        </td>
                      </tr>
                    )}

                    {/* Tiêu chí cơ bản */}
                    <tr className="hover:bg-[#D6E8EE]/10 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#02457A]">Tình trạng ngoại quan</td>
                      <td className="px-4 py-3 font-semibold">
                        {CONDITION_LABELS[product.condition]?.label || product.condition} (
                        {CONDITION_LABELS[product.condition]?.desc})
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <IconCheck className="w-3 h-3" />
                          <span>Niêm phong</span>
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#D6E8EE]/10 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#02457A]">Địa điểm hẹn gặp</td>
                      <td className="px-4 py-3 font-semibold">{product.pickup_location}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <IconCheck className="w-3 h-3" />
                          <span>Niêm phong</span>
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#D6E8EE]/10 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#02457A]">Thời điểm niêm phong</td>
                      <td className="px-4 py-3 font-semibold">
                        {new Date(product.created_at).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <IconCheck className="w-3 h-3" />
                          <span>Niêm phong</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* DẢI HÀNH ĐỘNG DƯỚI CÙNG */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#D6E8EE]">
              <Link
                href={`/products/${product.id}`}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#02457A] hover:text-[#018ABE] transition-colors"
              >
                <IconArrowLeft className="w-4 h-4" />
                <span>Quay lại xem chi tiết món đồ</span>
              </Link>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="px-5 py-2.5 rounded-xl border border-[#D6E8EE] hover:border-[#018ABE] text-xs font-bold text-[#001B48] transition-all bg-white shadow-2xs"
                >
                  {copiedHash ? "✓ Đã chép mã băm" : "Sao chép SHA-256"}
                </button>
                <Link
                  href={`/products/${product.id}`}
                  className="px-6 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-extrabold transition-all shadow-md"
                >
                  Liên hệ người bán
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

