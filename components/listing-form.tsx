"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Category } from "@/lib/db";
import { formatCurrencyVND, CONDITION_LABELS } from "@/lib/utils";
import {
  IconAlert,
  IconCamera,
  IconFileText,
  IconGift,
  IconMapPin,
  IconTag,
  IconWallet,
  IconX,
} from "./icons";

export interface ListingFormValues {
  title: string;
  categoryId: string;
  condition: string;
  price: string;
  pickupLocation: string;
  description: string;
  images: string[];
  status: string;
}

export interface ListingPayload {
  title: string;
  categoryId: string;
  condition: string;
  price: number;
  pickupLocation: string;
  description: string;
  images: string[];
  status: string;
}

type FieldKey = "images" | "title" | "categoryId" | "price" | "pickupLocation" | "description";

const CAMPUS_PRESETS = [
  "KTX Khu A (ĐHQG)",
  "KTX Khu B (ĐHQG)",
  "Cổng chính ĐH Bách Khoa",
  "Thư viện trung tâm ĐHQG",
  "Căn tin trường ĐH Bách Khoa",
  "Phòng trọ gần trường",
];

const PRICE_PRESETS = [50000, 100000, 150000, 200000, 350000, 500000];
const MAX_IMAGES = 5;

export const EMPTY_LISTING: ListingFormValues = {
  title: "",
  categoryId: "",
  condition: "LIKE_NEW",
  price: "",
  pickupLocation: "",
  description: "",
  images: [],
  status: "ACTIVE",
};

const inputBase =
  "w-full px-4 py-3 rounded-xl border text-sm text-[#001B48] placeholder-[#02457A]/40 focus:outline-hidden focus:ring-1";
const okBorder = "border-[#D6E8EE] focus:border-[#018ABE] focus:ring-[#018ABE]";
const errBorder = "border-red-400 focus:border-red-500 focus:ring-red-400";

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="text-base font-extrabold text-[#001B48] flex items-center gap-2">
      <span className="text-[#018ABE]">{icon}</span>
      <span>{children}</span>
    </h2>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1.5">
      <IconAlert className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function ListingForm({
  initial,
  categories,
  mode,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  initial: ListingFormValues;
  categories: Category[];
  mode: "create" | "edit";
  submitLabel: string;
  cancelHref: string;
  onSubmit: (payload: ListingPayload) => Promise<void>;
}) {
  const [values, setValues] = useState<ListingFormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(initial.price === "0");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Đồng bộ khi dữ liệu ban đầu thay đổi (ví dụ trang sửa tải xong)
  useEffect(() => {
    setValues(initial);
    setIsFree(initial.price === "0");
  }, [initial]);

  // Mặc định chọn danh mục đầu tiên cho tin mới
  useEffect(() => {
    if (!values.categoryId && categories.length > 0) {
      setValues((v) => ({ ...v, categoryId: categories[0].id }));
    }
  }, [categories, values.categoryId]);

  const set = <K extends keyof ListingFormValues>(key: K, val: ListingFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (values.images.length === 0) e.images = "Hãy tải lên ít nhất 1 ảnh chụp thực tế để người mua tin tưởng.";
    if (values.title.trim().length < 6) e.title = "Tiêu đề cần có ít nhất 6 ký tự.";
    if (!values.categoryId) e.categoryId = "Vui lòng chọn danh mục.";
    if (!isFree && (values.price === "" || isNaN(Number(values.price)) || Number(values.price) < 0))
      e.price = "Nhập giá hợp lệ hoặc chọn Tặng miễn phí.";
    if (!values.pickupLocation.trim()) e.pickupLocation = "Cho biết nơi bạn có thể giao đồ (KTX, cổng trường...).";
    if (values.description.trim().length < 15) e.description = "Mô tả cần tối thiểu 15 ký tự.";
    return e;
  };

  const focusField = (key: FieldKey) => {
    const el = document.getElementById(`field-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).focus({ preventScroll: true });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - values.images.length;
    if (files.length > remaining) {
      setErrors((er) => ({ ...er, images: `Chỉ có thể thêm tối đa ${remaining} ảnh nữa.` }));
      e.target.value = "";
      return;
    }
    setUploading(true);
    setErrors((er) => ({ ...er, images: undefined }));
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải ảnh lên.");
      const urls: string[] = data.urls || (data.url ? [data.url] : []);
      setValues((v) => ({ ...v, images: [...v.images, ...urls] }));
    } catch (err: any) {
      setErrors((er) => ({ ...er, images: err.message || "Không thể tải ảnh lên, hãy thử lại." }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (i: number) => set("images", values.images.filter((_, idx) => idx !== i));
  const makeCover = (i: number) => {
    if (i === 0) return;
    set("images", [values.images[i], ...values.images.filter((_, idx) => idx !== i)]);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Đưa focus lên bản tóm tắt lỗi để người dùng (và trình đọc màn hình) thấy ngay
      requestAnimationFrame(() => {
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        summaryRef.current?.focus({ preventScroll: true });
      });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        categoryId: values.categoryId,
        condition: values.condition,
        price: isFree ? 0 : Number(values.price),
        pickupLocation: values.pickupLocation.trim(),
        description: values.description.trim(),
        images: values.images,
        status: values.status,
      });
    } catch (err: any) {
      setServerError(err.message || "Đã xảy ra lỗi, vui lòng thử lại.");
      setSubmitting(false);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  };

  const errorEntries = Object.entries(errors).filter(([, m]) => m) as [FieldKey, string][];
  const hasSummary = errorEntries.length > 0 || !!serverError;
  const describe = (k: FieldKey) => (errors[k] ? `error-${k}` : undefined);

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      {/* TÓM TẮT LỖI (focus được, link tới từng ô) */}
      <div
        ref={summaryRef}
        tabIndex={-1}
        role={hasSummary ? "alert" : undefined}
        aria-labelledby={hasSummary ? "form-error-title" : undefined}
        className={hasSummary ? "p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 outline-hidden" : "sr-only"}
      >
        {hasSummary && (
          <>
            <h2 id="form-error-title" className="text-sm font-extrabold flex items-center gap-2">
              <IconAlert className="w-4 h-4" />
              {serverError ? "Không thể lưu tin" : `Cần chỉnh ${errorEntries.length} mục trước khi tiếp tục`}
            </h2>
            {serverError && <p className="text-sm mt-1 font-medium">{serverError}</p>}
            {errorEntries.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm list-disc pl-5">
                {errorEntries.map(([k, m]) => (
                  <li key={k}>
                    <a
                      href={`#field-${k}`}
                      onClick={(e) => {
                        e.preventDefault();
                        focusField(k);
                      }}
                      className="underline font-semibold"
                    >
                      {m}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* ẢNH */}
      <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-4" aria-labelledby="sec-images">
        <div className="flex items-center justify-between">
          <div>
            <div id="sec-images">
              <SectionTitle icon={<IconCamera className="w-5 h-5" />}>
                Hình ảnh thực tế <span className="text-red-500" aria-hidden="true">*</span>
              </SectionTitle>
            </div>
            <p className="text-xs text-[#02457A] mt-0.5">
              Cần ít nhất 1 ảnh (tối đa {MAX_IMAGES}). Chụp rõ các góc và vết trầy nếu có.
            </p>
          </div>
          <span className="text-xs font-bold text-[#018ABE] bg-[#D6E8EE] px-2.5 py-1 rounded-full">
            {values.images.length}/{MAX_IMAGES} ảnh
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
          {values.images.map((url, idx) => (
            <div
              key={url + idx}
              className="group relative aspect-square rounded-xl overflow-hidden border-2 border-[#D6E8EE] bg-[#D6E8EE]/30"
            >
              <img src={url} alt={`Ảnh món đồ ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 ? (
                <span className="absolute top-1.5 left-1.5 text-[10px] font-extrabold bg-[#018ABE] text-white px-1.5 py-0.5 rounded">
                  Ảnh bìa
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(idx)}
                  className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-[#001B48]/85 hover:bg-[#018ABE] text-white px-1.5 py-0.5 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  Đặt làm bìa
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                aria-label={`Xóa ảnh ${idx + 1}`}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
          ))}

          {values.images.length < MAX_IMAGES && (
            <label
              className={`relative aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#018ABE] ${
                errors.images
                  ? "border-red-400 bg-red-50/50"
                  : "border-[#97CADB] hover:border-[#018ABE] bg-[#D6E8EE]/20 hover:bg-[#D6E8EE]/40"
              }`}
            >
              <input
                id="field-images"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={uploading}
                onChange={handleUpload}
                aria-describedby={describe("images")}
                aria-invalid={!!errors.images}
                className="sr-only"
              />
              {uploading ? (
                <>
                  <div className="w-6 h-6 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] font-bold text-[#02457A] mt-1">Đang tải lên...</span>
                </>
              ) : (
                <>
                  <span className="w-8 h-8 rounded-full bg-[#D6E8EE] text-[#018ABE] flex items-center justify-center text-lg font-bold mb-1" aria-hidden="true">
                    +
                  </span>
                  <span className="text-[11px] font-bold text-[#001B48]">Thêm ảnh</span>
                  <span className="text-[10px] text-[#02457A]">JPG, PNG &lt; 5MB</span>
                </>
              )}
            </label>
          )}
        </div>
        <FieldError id="error-images" message={errors.images} />
      </section>

      {/* THÔNG TIN CƠ BẢN */}
      <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-6">
        <SectionTitle icon={<IconTag className="w-5 h-5" />}>Thông tin cơ bản</SectionTitle>

        <div>
          <label htmlFor="field-title" className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
            Tiêu đề món đồ <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="field-title"
            type="text"
            placeholder="Ví dụ: Bàn học gấp gọn chân sắt kèm giá sách mini cho KTX"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={100}
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={describe("title")}
            className={`${inputBase} ${errors.title ? errBorder : okBorder}`}
          />
          <FieldError id="error-title" message={errors.title} />
          <div className="flex justify-between text-[11px] text-[#02457A] mt-1.5">
            <span>Ghi rõ tên món đồ, đặc điểm nổi bật hoặc hãng sản xuất</span>
            <span>{values.title.length}/100</span>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-5 ${mode === "edit" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <div>
            <label htmlFor="field-categoryId" className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
              Danh mục <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="field-categoryId"
              value={values.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              aria-invalid={!!errors.categoryId}
              aria-describedby={describe("categoryId")}
              className={`${inputBase} bg-white font-semibold cursor-pointer ${errors.categoryId ? errBorder : okBorder}`}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError id="error-categoryId" message={errors.categoryId} />
          </div>

          <div>
            <label htmlFor="field-condition" className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
              Tình trạng <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="field-condition"
              value={values.condition}
              onChange={(e) => set("condition", e.target.value)}
              className={`${inputBase} bg-white font-semibold cursor-pointer ${okBorder}`}
            >
              {Object.entries(CONDITION_LABELS).map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-[#02457A]">{CONDITION_LABELS[values.condition]?.desc}</p>
          </div>

          {mode === "edit" && (
            <div>
              <label htmlFor="field-status" className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
                Trạng thái tin
              </label>
              <select
                id="field-status"
                value={values.status}
                onChange={(e) => set("status", e.target.value)}
                className={`${inputBase} bg-white font-semibold cursor-pointer ${okBorder}`}
              >
                <option value="ACTIVE">Đang đăng bán</option>
                <option value="SOLD">Đã bán</option>
                <option value="HIDDEN">Tạm ẩn</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* GIÁ & ĐỊA ĐIỂM */}
      <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-6">
        <SectionTitle icon={<IconWallet className="w-5 h-5" />}>Giá bán và nơi giao dịch</SectionTitle>

        <div>
          <div className="flex items-center justify-between mb-2 gap-3">
            <label htmlFor="field-price" className="block text-xs font-bold text-[#001B48] uppercase tracking-wider">
              Giá thanh lý (VND) <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-[#018ABE] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => {
                  setIsFree(e.target.checked);
                  set("price", e.target.checked ? "0" : "");
                }}
                className="w-4 h-4 rounded-sm text-[#018ABE] focus:ring-[#018ABE]"
              />
              <IconGift className="w-4 h-4" />
              <span>Tặng miễn phí</span>
            </label>
          </div>
          <div className="relative">
            <input
              id="field-price"
              type="number"
              inputMode="numeric"
              disabled={isFree}
              min={0}
              step={1000}
              placeholder="Ví dụ: 120000"
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
              aria-required={!isFree}
              aria-invalid={!!errors.price}
              aria-describedby={describe("price")}
              className={`${inputBase} text-base font-bold pr-32 disabled:bg-[#D6E8EE]/30 disabled:text-[#02457A] ${
                errors.price ? errBorder : okBorder
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#02457A] pointer-events-none">
              {isFree ? "Miễn phí" : values.price ? formatCurrencyVND(Number(values.price)) : "₫"}
            </span>
          </div>
          <FieldError id="error-price" message={errors.price} />
          {!isFree && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] text-[#02457A] font-semibold">Gợi ý:</span>
              {PRICE_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("price", val.toString())}
                  className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-[#D6E8EE]/60 hover:bg-[#D6E8EE] text-[#001B48] transition-colors"
                >
                  {formatCurrencyVND(val)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="field-pickupLocation" className="block text-xs font-bold text-[#001B48] uppercase tracking-wider mb-2">
            Nơi nhận đồ trực tiếp <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="field-pickupLocation"
            type="text"
            placeholder="Ví dụ: KTX Khu B (ĐHQG TP.HCM)"
            value={values.pickupLocation}
            onChange={(e) => set("pickupLocation", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.pickupLocation}
            aria-describedby={describe("pickupLocation")}
            className={`${inputBase} ${errors.pickupLocation ? errBorder : okBorder}`}
          />
          <FieldError id="error-pickupLocation" message={errors.pickupLocation} />
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[11px] text-[#02457A] font-semibold">Chọn nhanh:</span>
            {CAMPUS_PRESETS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => set("pickupLocation", loc)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-[#D6E8EE]/40 hover:bg-[#D6E8EE] text-[#001B48] transition-colors"
              >
                <IconMapPin className="w-3 h-3" />
                {loc}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* MÔ TẢ */}
      <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-4">
        <SectionTitle icon={<IconFileText className="w-5 h-5" />}>Mô tả chi tiết</SectionTitle>
        <div>
          <label htmlFor="field-description" className="sr-only">
            Mô tả chi tiết món đồ
          </label>
          <textarea
            id="field-description"
            rows={5}
            placeholder={"Mô tả tình trạng thực tế:\n- Thời gian đã sử dụng\n- Phụ kiện đi kèm\n- Lý do bạn pass lại"}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.description}
            aria-describedby={describe("description")}
            className={`${inputBase} ${errors.description ? errBorder : okBorder}`}
          />
          <FieldError id="error-description" message={errors.description} />
          <div className="flex justify-between text-[11px] text-[#02457A] mt-1.5">
            <span>Mô tả trung thực giúp món đồ được thanh lý nhanh hơn</span>
            <span>{values.description.length} ký tự</span>
          </div>
        </div>
      </section>

      {/* GỬI */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href={cancelHref}
          className="px-6 py-3 rounded-xl text-sm font-bold text-[#02457A] hover:bg-[#D6E8EE]/40 transition-colors"
        >
          Hủy
        </Link>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="px-8 py-3.5 rounded-xl text-sm font-extrabold bg-[#018ABE] hover:bg-[#02457A] text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <span>{submitLabel}</span>
          )}
        </button>
      </div>
    </form>
  );
}
