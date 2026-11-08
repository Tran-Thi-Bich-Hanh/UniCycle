"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ListingForm, ListingFormValues, ListingPayload } from "@/components/listing-form";
import { Category, Product } from "@/lib/db";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [initial, setInitial] = useState<ListingFormValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      .then(([auth, cat, prodData]) => {
        if (!auth.user) {
          router.replace(`/login?redirect=/products/${id}/edit`);
          return;
        }
        const prod = prodData.product as Product;
        if (prod.seller_id !== auth.user.id && auth.user.role !== "ADMIN") {
          throw new Error("Bạn không có quyền chỉnh sửa bài đăng này.");
        }
        setCategories(cat.categories || []);
        setInitial({
          title: prod.title,
          categoryId: prod.category_id,
          condition: prod.condition,
          price: String(prod.price),
          pickupLocation: prod.pickup_location,
          description: prod.description,
          images: (prod.images || []).map((i) => i.url),
          status: prod.status === "RESERVED" ? "ACTIVE" : prod.status,
        });
      })
      .catch((err: any) => setLoadError(err.message || "Lỗi tải thông tin bài đăng."));
  }, [id, router]);

  const handleSubmit = async (payload: ListingPayload) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Cập nhật bài đăng thất bại.");
    router.push(`/products/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#02457A] mb-4 font-medium">
          <Link href="/" className="hover:text-[#018ABE] transition-colors">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link href="/profile/my-listings" className="hover:text-[#018ABE] transition-colors">Tin đăng của tôi</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#001B48] font-bold">Chỉnh sửa tin</span>
        </nav>

        {loadError ? (
          <div role="alert" className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            <p>{loadError}</p>
            <Link href="/profile/my-listings" className="inline-block mt-3 font-bold underline">
              ← Quay lại tin đăng của tôi
            </Link>
          </div>
        ) : !initial ? (
          <div className="flex items-center justify-center py-24 gap-3 text-sm text-[#02457A] font-semibold" role="status">
            <div className="w-5 h-5 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span>Đang tải thông tin bài đăng...</span>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">Chỉnh sửa tin đăng</h1>
              <p className="text-sm text-[#02457A] mt-1 font-medium">
                Cập nhật giá bán, hình ảnh hoặc mô tả món đồ của bạn
              </p>
            </div>
            <ListingForm
              mode="edit"
              initial={initial}
              categories={categories}
              submitLabel="Lưu thay đổi"
              cancelHref="/profile/my-listings"
              onSubmit={handleSubmit}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
