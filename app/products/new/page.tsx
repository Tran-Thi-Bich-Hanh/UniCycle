"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Category } from "@/lib/db";
import { formatCurrencyVND, CONDITION_LABELS } from "@/lib/utils";

const CAMPUS_PRESETS = [
  "KTX Khu A (ĐHQG)",
  "KTX Khu B (ĐHQG)",
  "Cổng chính ĐH Bách Khoa",
  "Thư viện trung tâm ĐHQG",
  "Căn tin trường ĐH Bách Khoa",
  "Phòng trọ gần trường",
];

const PRICE_PRESETS = [0, 50000, 100000, 150000, 200000, 350000, 500000];

export default function NewProductPage() {
  const router = useRouter();

  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Categories list
  const [categories, setCategories] = useState<Category[]>([]);

  // Form states
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<string>("LIKE_NEW");
  const [price, setPrice] = useState<string>("");
  const [isFree, setIsFree] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);

  // UI state
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check login & load categories
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.campus_location && !pickupLocation) {
            setPickupLocation(data.user.campus_location);
          }
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
          setCategoryId(data.categories[0].id);
        }
      })
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // Handle image upload from file picker
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi tải ảnh lên.");
      }

      if (data.urls && Array.isArray(data.urls)) {
        setImages((prev) => [...prev, ...data.urls]);
      } else if (data.url) {
        setImages((prev) => [...prev, data.url]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể tải ảnh lên, vui lòng thử lại.");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  // Remove photo
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Make cover photo (move to index 0)
  const handleSetCover = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const target = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [target, ...rest];
    });
  };

  // Handle Free toggle
  const handleToggleFree = (checked: boolean) => {
    setIsFree(checked);
    if (checked) {
      setPrice("0");
    } else {
      setPrice("");
    }
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || title.trim().length < 6) {
      setErrorMessage("Tiêu đề bài đăng cần có ít nhất 6 ký tự rõ ràng.");
      return;
    }

    if (!categoryId) {
      setErrorMessage("Vui lòng chọn danh mục cho món đồ.");
      return;
    }

    if (!isFree && (!price || isNaN(Number(price)) || Number(price) < 0)) {
      setErrorMessage("Vui lòng nhập giá bán hợp lệ (hoặc chọn Tặng miễn phí).");
      return;
    }

    if (!pickupLocation.trim()) {
      setErrorMessage("Vui lòng điền địa điểm nhận hàng (KTX, khuôn viên trường).");
      return;
    }

    if (!description.trim() || description.trim().length < 15) {
      setErrorMessage("Mô tả món đồ cần tối thiểu 15 ký tự để người mua nắm rõ tình trạng.");
      return;
    }

    // Default sample image if user didn't upload any
    const finalImages =
      images.length > 0
        ? images
        : ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80"];

    setSubmitting(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          categoryId,
          condition,
          price: isFree ? 0 : Number(price),
          pickupLocation: pickupLocation.trim(),
          description: description.trim(),
          images: finalImages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng tin thất bại, vui lòng kiểm tra lại thông tin.");
      }

      // Redirect to newly created product page
      router.push(`/products/${data.productId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi khi tạo bài đăng.");
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-sm text-[#02457A] font-semibold">
            <div className="w-5 h-5 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span>Đang kiểm tra thông tin sinh viên...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Not logged in gate
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
        <Navbar />
        <main className="flex-1 max-w-lg w-full mx-auto px-4 py-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#D6E8EE] text-[#018ABE] flex items-center justify-center text-3xl mb-4">
            🎓
          </div>
          <h1 className="text-2xl font-extrabold text-[#001B48] mb-2">
            Đăng nhập để đăng tin thanh lý
          </h1>
          <p className="text-sm text-[#02457A] mb-8 leading-relaxed">
            UniCycle là sàn trao đổi nội bộ dành riêng cho sinh viên. Vui lòng đăng nhập bằng tài khoản
            sinh viên để đăng đồ cần pass nhé!
          </p>

          <div className="w-full space-y-3">
            <Link
              href="/login?redirect=/products/new"
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors flex items-center justify-center shadow-xs"
            >
              Đăng nhập tài khoản sinh viên
            </Link>
            <Link
              href="/register"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white text-[#001B48] border border-[#97CADB] hover:bg-[#D6E8EE]/30 transition-colors flex items-center justify-center"
            >
              Chưa có tài khoản? Đăng ký nhanh
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[#02457A] mb-4 font-medium">
          <Link href="/" className="hover:text-[#018ABE] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[#018ABE] transition-colors">
            Đồ sinh viên
          </Link>
          <span>/</span>
          <span className="text-[#001B48] font-bold">Đăng tin thanh lý</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
            Đăng tin thanh lý đồ cũ
          </h1>
          <p className="text-sm text-[#02457A] mt-1 font-medium">
            Chia sẻ lại sách vở, bàn ghế, đồ điện tử không dùng đến cho bạn bè cùng trường với giá tiết kiệm
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* FORM CHÍNH */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* KHỐI 1: HÌNH ẢNH SẢN PHẨM */}
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
                  <span>📸</span>
                  <span>Hình ảnh chụp thực tế món đồ</span>
                </h2>
                <p className="text-xs text-[#02457A] mt-0.5">
                  Tải lên từ 1 đến 5 ảnh chụp rõ các góc, vết trầy (nếu có) để người mua tin cậy hơn
                </p>
              </div>
              <span className="text-xs font-bold text-[#018ABE] bg-[#D6E8EE] px-2.5 py-1 rounded-full">
                {images.length}/5 ảnh
              </span>
            </div>

            {/* Grid preview & upload button */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
              {/* Existing Uploaded Images */}
              {images.map((url, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 border-[#D6E8EE] bg-[#D6E8EE]/30"
                >
                  <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />

                  {/* Cover badge */}
                  {idx === 0 ? (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold bg-[#018ABE] text-white px-1.5 py-0.5 rounded shadow-xs">
                      Ảnh bìa
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetCover(idx)}
                      className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-[#001B48]/80 hover:bg-[#018ABE] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Đặt làm bìa
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                    title="Xóa ảnh này"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Upload Drop/Click Box */}
              {images.length < 5 && (
                <label className="relative aspect-square rounded-xl border-2 border-dashed border-[#97CADB] hover:border-[#018ABE] bg-[#D6E8EE]/20 hover:bg-[#D6E8EE]/40 flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    disabled={uploading}
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-[#D6E8EE] text-[#018ABE] flex items-center justify-center text-lg mb-1">
                        +
                      </div>
                      <span className="text-[11px] font-bold text-[#001B48]">Thêm ảnh</span>
                      <span className="text-[9px] text-[#02457A]">JPG, PNG &lt; 5MB</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* KHỐI 2: THÔNG TIN CƠ BẢN */}
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-6">
            <h2 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
              <span>🏷️</span>
              <span>Thông tin cơ bản</span>
            </h2>

            {/* Tiêu đề món đồ */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                Tiêu đề món đồ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Bàn học gấp gọn chân sắt kèm giá để sách mini cho phòng KTX"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] placeholder-[#02457A]/40 focus:outline-hidden focus:border-[#018ABE] focus:ring-1 focus:ring-[#018ABE]"
              />
              <div className="flex justify-between items-center text-[11px] text-[#02457A] mt-1.5">
                <span>Nên ghi rõ tên món đồ, đặc tính nổi bật hoặc hãng sản xuất</span>
                <span>{title.length}/100</span>
              </div>
            </div>

            {/* Danh mục & Tình trạng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Danh mục */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                  Danh mục <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-[#D6E8EE] text-sm font-semibold text-[#001B48] bg-white focus:outline-hidden focus:border-[#018ABE] cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon || "📦"} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tình trạng selection */}
              <div>
                <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                  Độ mới / Tình trạng <span className="text-red-500">*</span>
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-[#D6E8EE] text-sm font-semibold text-[#001B48] bg-white focus:outline-hidden focus:border-[#018ABE] cursor-pointer"
                >
                  {Object.entries(CONDITION_LABELS).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.label} — {meta.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* KHỐI 3: GIÁ BÁN & NƠI NHẬN HÀNG */}
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-6">
            <h2 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
              <span>💰</span>
              <span>Giá bán & Nơi giao dịch</span>
            </h2>

            {/* Giá bán VND */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider">
                  Giá thanh lý (VND) <span className="text-red-500">*</span>
                </label>

                {/* Tặng miễn phí toggle */}
                <label className="flex items-center gap-2 text-xs font-bold text-[#018ABE] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => handleToggleFree(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-[#018ABE] focus:ring-[#018ABE]"
                  />
                  <span>🎁 Tặng miễn phí (0đ)</span>
                </label>
              </div>

              <div className="relative">
                <input
                  type="number"
                  disabled={isFree}
                  required={!isFree}
                  min={0}
                  step={5000}
                  placeholder="Ví dụ: 120000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#D6E8EE] text-base font-bold text-[#001B48] placeholder-[#02457A]/40 focus:outline-hidden focus:border-[#018ABE] disabled:bg-[#D6E8EE]/30 disabled:text-[#02457A]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#02457A]">
                  {isFree ? "MIỄN PHÍ 0₫" : price ? formatCurrencyVND(Number(price)) : "₫"}
                </span>
              </div>

              {/* Gợi ý giá nhanh */}
              {!isFree && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[11px] text-[#02457A] font-semibold">Gợi ý nhanh:</span>
                  {PRICE_PRESETS.slice(1).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPrice(val.toString())}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#D6E8EE]/60 hover:bg-[#D6E8EE] text-[#001B48] transition-colors"
                    >
                      {formatCurrencyVND(val)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nơi nhận đồ */}
            <div>
              <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                Nơi nhận đồ trực tiếp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: KTX Khu B (ĐHQG TP.HCM) hoặc Cổng 1 ĐH Bách Khoa"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] placeholder-[#02457A]/40 focus:outline-hidden focus:border-[#018ABE]"
              />

              {/* Gợi ý địa điểm trong trường */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[11px] text-[#02457A] font-semibold">Chọn nhanh:</span>
                {CAMPUS_PRESETS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setPickupLocation(loc)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#D6E8EE]/40 hover:bg-[#D6E8EE] text-[#001B48] transition-colors"
                  >
                    📍 {loc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KHỐI 4: MÔ TẢ CHI TIẾT */}
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
              <span>📝</span>
              <span>Mô tả chi tiết món đồ</span>
            </h2>

            <div>
              <textarea
                required
                rows={5}
                placeholder="Mô tả kỹ tình trạng thực tế của món đồ:&#10;- Thời gian bạn đã sử dụng&#10;- Các phụ kiện đi kèm (dây sạc, ốc vít, sách vở kèm theo)&#10;- Lý do bạn pass lại (chuyển phòng KTX, đổi giáo trình kỳ mới...)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] placeholder-[#02457A]/40 focus:outline-hidden focus:border-[#018ABE] focus:ring-1 focus:ring-[#018ABE]"
              />
              <div className="flex justify-between items-center text-[11px] text-[#02457A] mt-1.5">
                <span>Mô tả chi tiết và trung thực giúp món đồ của bạn thanh lý nhanh hơn 3 lần</span>
                <span>{description.length} ký tự</span>
              </div>
            </div>
          </div>

          {/* NÚT SUBMIT & CAM KẾT */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#D6E8EE]/30 border border-[#97CADB]/60 text-xs text-[#02457A] flex items-center gap-2.5">
              <span>🛡️</span>
              <span>
                Bằng việc bấm đăng tin, bạn cam kết món đồ đúng thực tế mô tả và sẽ giao dịch trực tiếp an toàn tại khuôn viên trường.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                href="/products"
                className="px-6 py-3 rounded-xl text-sm font-bold text-[#02457A] hover:bg-[#D6E8EE]/40 transition-colors"
              >
                Hủy bỏ
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3.5 rounded-xl text-sm font-extrabold bg-[#018ABE] hover:bg-[#02457A] text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang đăng tin...</span>
                  </>
                ) : (
                  <span>🚀 Đăng tin thanh lý ngay</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

