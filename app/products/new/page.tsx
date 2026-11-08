"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ListingForm, EMPTY_LISTING, ListingPayload } from "@/components/listing-form";
import { Category } from "@/lib/db";

export default function NewProductPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([auth, cat]) => {
        if (!auth.user) {
          // Khách chưa đăng nhập: đi thẳng tới đăng nhập rồi quay lại đúng trang này
          router.replace("/login?redirect=/products/new");
          return;
        }
        setUser(auth.user);
        setCategories(cat.categories || []);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, [router]);

  const initial = useMemo(
    () => ({ ...EMPTY_LISTING, pickupLocation: user?.campus_location || "" }),
    [user]
  );

  const handleSubmit = async (payload: ListingPayload) => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Đăng tin thất bại, vui lòng kiểm tra lại thông tin.");
    router.push(`/products/${data.productId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {!authChecked || !user ? (
          <div className="flex items-center justify-center py-24 gap-3 text-sm text-[#02457A] font-semibold" role="status">
            <div className="w-5 h-5 border-2 border-[#018ABE] border-t-transparent rounded-full animate-spin" />
            <span>Đang kiểm tra tài khoản...</span>
          </div>
        ) : (
          <>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#02457A] mb-4 font-medium">
              <Link href="/" className="hover:text-[#018ABE] transition-colors">Trang chủ</Link>
              <span aria-hidden="true">/</span>
              <Link href="/products" className="hover:text-[#018ABE] transition-colors">Đồ sinh viên</Link>
              <span aria-hidden="true">/</span>
              <span className="text-[#001B48] font-bold">Đăng tin thanh lý</span>
            </nav>

            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48] tracking-tight">
                Đăng tin thanh lý đồ cũ
              </h1>
              <p className="text-sm text-[#02457A] mt-1 font-medium">
                Chia sẻ sách vở, bàn ghế, đồ điện tử không dùng đến cho bạn bè cùng trường
              </p>
            </div>

            <ListingForm
              mode="create"
              initial={initial}
              categories={categories}
              submitLabel="Đăng tin ngay"
              cancelHref="/products"
              onSubmit={handleSubmit}
            />

            <p className="mt-6 text-xs text-[#02457A] text-center">
              Bằng việc đăng tin, bạn cam kết món đồ đúng mô tả và giao dịch trực tiếp, an toàn trong khuôn viên trường.
            </p>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
