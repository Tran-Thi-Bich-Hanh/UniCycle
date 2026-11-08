"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Category, Product } from "@/lib/db";
import { formatCurrencyVND, CONDITION_LABELS } from "@/lib/utils";

const CAMPUS_PRESETS = [
  "KTX Khu A (ĐHQG)",
  "KTX Khu B (ĐHQG)",
  "Cổng chính ĐH Bách Khoa",
  "Thư viện trung tâm ĐHQG",
  "Căn tin trường ĐH Bách Khoa",
  "Phòng trọ gần trường",
];

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<string>("LIKE_NEW");
  const [price, setPrice] = useState<string>("");
  const [isFree, setIsFree] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("ACTIVE");

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch(`/api/products/${id}`).then((r) => {
        if (!r.ok) throw new Error("Không tìm thấy bài đăng.");
        return r.json();
      }),
    ])
      .then(([authData, catData, prodData]) => {
        if (!authData.user) {
          router.push(`/login?redirect=/products/${id}/edit`);
          return;
        }
        setCurrentUser(authData.user);

        if (catData.categories) {
          setCategories(catData.categories);
        }

        const prod = prodData.product as Product;
        if (prod.seller_id !== authData.user.id && authData.user.role !== "ADMIN") {
          throw new Error("Bạn không có quyền chỉnh sửa bài đăng này.");
        }

        setTitle(prod.title);
        setCategoryId(prod.category_id);
        setCondition(prod.condition);
        setPrice(prod.price.toString());
        setIsFree(prod.price === 0);
        setPickupLocation(prod.pickup_location);
        setDescription(prod.description);
        setStatus(prod.status);
        if (prod.images && prod.images.length > 0) {
          setImages(prod.images.map((img) => img.url));
        }
      })
      .catch((err: any) => {
        setErrorMessage(err.message || "Lỗi tải thông tin bài đăng.");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  // Handle image upload
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
      setErrorMessage(err.message || "Không thể tải ảnh lên.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const target = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [target, ...rest];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || title.trim().length < 6) {
      setErrorMessage("Tiêu đề bài đăng cần có ít nhất 6 ký tự.");
      return;
    }

    if (!isFree && (!price || isNaN(Number(price)) || Number(price) < 0)) {
      setErrorMessage("Vui lòng nhập giá bán hợp lệ.");
      return;
    }

    if (!pickupLocation.trim()) {
      setErrorMessage("Vui lòng điền địa điểm nhận hàng.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          categoryId,
          condition,
          price: isFree ? 0 : Number(price),
          pickupLocation: pickupLocation.trim(),
          description: description.trim(),
          status,
          images,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cập nhật bài đăng thất bại.");
      }

      router.push(`/products/${id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi khi lưu thông tin.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-sm text-[#02457A] font-semibold">
            <div className="w-5 h-5 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span>Đang tải thông tin bài đăng...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <nav className="flex items-center gap-2 text-xs text-[#02457A] mb-4 font-medium">
          <Link href="/" className="hover:text-[#018ABE] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/profile/my-listings" className="hover:text-[#018ABE] transition-colors">
            Tin đăng của tôi
          </Link>
          <span>/</span>
          <span className="text-[#001B48] font-bold">Chỉnh sửa tin</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
            Chỉnh sửa tin đăng
          </h1>
          <p className="text-sm text-[#02457A] mt-1 font-medium">
            Cập nhật lại giá bán, hình ảnh hoặc thông tin mô tả món đồ của bạn
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* HÌNH ẢNH */}
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
                  <span>📸</span>
                  <span>Hình ảnh món đồ</span>
                </h2>
                <p className="text-xs text-[#02457A] mt-0.5">
                  Thêm hoặc xóa bớt ảnh chụp món đồ
                </p>
              </div>
              <span className="text-xs font-bold text-[#018ABE] bg-[#D6E8EE] px-2.5 py-1 rounded-full">
                {images.length}/5 ảnh
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
              {images.map((url, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 border-[#D6E8EE] bg-[#D6E8EE]/30"
                >
                  <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
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
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <label className="relative aspect-square rounded-xl border-2 border-dashed border-[#97CADB] hover:border-[#018ABE] bg-[#D6E8EE]/20 flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-colors">
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
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* THÔNG TIN CƠ BẢN */}
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-6">
            <h2 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
              <span>🏷️</span>
              <span>Thông tin bài đăng</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                Tiêu đề bài đăng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:border-[#018ABE] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                  Danh mục
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-[#D6E8EE] text-sm font-semibold text-[#001B48] bg-white focus:border-[#018ABE]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon || "📦"} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                  Tình trạng
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-[#D6E8EE] text-sm font-semibold text-[#001B48] bg-white focus:border-[#018ABE]"
                >
                  {Object.entries(CONDITION_LABELS).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                  Trạng thái tin
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-[#D6E8EE] text-sm font-semibold text-[#001B48] bg-white focus:border-[#018ABE]"
                >
                  <option value="ACTIVE">Đang đăng bán (ACTIVE)</option>
                  <option value="SOLD">Đã bán (SOLD)</option>
                  <option value="HIDDEN">Tạm ẩn (HIDDEN)</option>
                </select>
              </div>
            </div>
          </div>

          {/* GIÁ & ĐỊA ĐIỂM */}
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-6">
            <h2 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
              <span>💰</span>
              <span>Giá bán & Nơi giao dịch</span>
            </h2>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider">
                  Giá bán (VND) <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-[#018ABE] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => {
                      setIsFree(e.target.checked);
                      if (e.target.checked) setPrice("0");
                    }}
                    className="w-4 h-4 rounded-sm text-[#018ABE]"
                  />
                  <span>Tặng miễn phí 0đ</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  disabled={isFree}
                  required={!isFree}
                  min={0}
                  step={5000}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#D6E8EE] text-base font-bold text-[#001B48] focus:border-[#018ABE] disabled:bg-[#D6E8EE]/30"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#02457A]">
                  {isFree ? "MIỄN PHÍ 0₫" : price ? formatCurrencyVND(Number(price)) : "₫"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                Nơi nhận đồ trực tiếp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:border-[#018ABE]"
              />
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

          {/* MÔ TẢ */}
          <div className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
              <span>📝</span>
              <span>Mô tả chi tiết</span>
            </h2>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#D6E8EE] text-sm text-[#001B48] focus:border-[#018ABE]"
            />
          </div>

          {/* NÚT LƯU THAY ĐỔI */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/profile/my-listings"
              className="px-6 py-3 rounded-xl text-sm font-bold text-[#02457A] hover:bg-[#D6E8EE]/40 transition-colors"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 rounded-xl text-sm font-extrabold bg-[#018ABE] hover:bg-[#02457A] text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? "Đang lưu..." : "💾 Lưu thay đổi bài đăng"}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

