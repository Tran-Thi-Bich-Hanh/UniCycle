import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { ProductCardData } from "@/components/products/ProductCard";
import { CategoryItem } from "@/components/home/CategoryGrid";
import { HomeProductFeed } from "@/components/home/HomeProductFeed";
import { PassportBanner } from "@/components/home/PassportBanner";
import {
  FALLBACK_PRODUCTS,
  FALLBACK_CATEGORIES,
  FALLBACK_SCHOOLS,
} from "@/lib/data/mock-fallback";

async function LiveMarketplaceFeed() {
  let products: ProductCardData[] = FALLBACK_PRODUCTS;
  let categories: CategoryItem[] = FALLBACK_CATEGORIES;
  let schools = FALLBACK_SCHOOLS;

  try {
    const [dbListings, dbCategories, dbSchools] = await Promise.all([
      prisma.listing.findMany({
        where: {
          status: "AVAILABLE",
        },
        include: {
          school: true,
          category: true,
          seller: true,
          item: {
            include: {
              owners: true,
            },
          },
          images: {
            orderBy: {
              position: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),
      prisma.category.findMany(),
      prisma.school.findMany(),
    ]);

    if (dbListings && dbListings.length > 0) {
      products = dbListings.map((l) => ({
        id: l.id,
        title: l.title,
        price: l.price,
        isFree: l.isFree,
        condition: l.condition,
        zaloPhone: l.zaloPhone,
        createdAt: l.createdAt.toISOString(),
        school: l.school
          ? {
              id: l.school.id,
              name: l.school.name,
              shortName: l.school.shortName,
              area: l.school.area,
            }
          : null,
        category: l.category
          ? {
              id: l.category.id,
              name: l.category.name,
              slug: l.category.slug,
            }
          : null,
        seller: {
          id: l.seller.id,
          displayName: l.seller.displayName,
          avatarUrl: l.seller.avatarUrl,
          isStudentVerified: l.seller.isStudentVerified,
          reputationScore: l.seller.reputationScore,
          dorm: l.seller.dorm,
        },
        item: l.item
          ? {
              id: l.item.id,
              passportEnabled: l.item.passportEnabled,
              passportId: l.item.passportId,
              passportStatus: l.item.passportStatus,
              owners: l.item.owners.map((o) => ({
                seq: o.seq,
                showName: o.showName,
              })),
            }
          : null,
        images: l.images.map((img) => ({
          id: img.id,
          url: img.url,
        })),
      }));
    }

    if (dbCategories && dbCategories.length > 0) {
      // Map số tin tương ứng hoặc fallback
      const countMap: Record<string, string> = {
        "goc-0d-cho-tang": "50+ tin",
        "giao-trinh-sach": "140+ tin",
        "do-dien-tu-phu-kien": "95+ tin",
        "xe-dap-phuong-tien": "40+ tin",
        "ban-ghe-tu-ktx": "85+ tin",
        "do-gia-dung-quat": "110+ tin",
      };

      categories = dbCategories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        imageUrl: `/categories/${c.slug}.jpg`,
        count: countMap[c.slug] || "Khám phá",
      }));
    }

    if (dbSchools && dbSchools.length > 0) {
      schools = dbSchools.map((s) => ({
        id: s.id,
        name: s.name,
        shortName: s.shortName,
      }));
    }
  } catch (error) {
    console.warn("⚠️ Không thể tải trực tiếp từ DB server (dùng dữ liệu mẫu seed):", error);
  }

  return (
    <HomeProductFeed
      initialProducts={products}
      categories={categories}
      schools={schools}
    />
  );
}

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* 1. Khối Hero Gradient Bleed: Thông điệp vòng đời đồ vật tuần hoàn & Hình ảnh cân đối */}
      <section className="hero-gradient-bleed text-white pt-2 pb-16 sm:pt-4 sm:pb-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            {/* Cột trái (6/12 cột): Tiêu đề, thông điệp & CTA */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold text-[#D6E8EE] shadow-sm">
                <Image
                  src="/icon.png"
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-sm"
                />
                <span>Chợ đồ cũ sinh viên TP.HCM · Vòng đời đồ vật tuần hoàn</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.16] text-white">
                Mua bán đồ cũ sinh viên tiết kiệm &amp; trao tay tận cổng trường
              </h1>

              <p className="text-sm sm:text-base text-[#D6E8EE] leading-relaxed max-w-xl font-normal">
                Tái sử dụng giáo trình, bàn học gấp, quạt đứng hay đồ dùng ký túc xá qua các thế hệ sinh viên. Kết nối nhanh qua Zalo, đặt hẹn giữ chỗ và kiểm tra chuỗi đời chủ qua Digital Product Passport.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <a
                  href="#live-feed"
                  className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-white text-[#001B48] hover:bg-[#D6E8EE] font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <span>Khám phá đồ quanh KTX</span>
                  <span aria-hidden="true">&darr;</span>
                </a>
                <Link
                  href="/sell"
                  className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#018ABE] hover:bg-[#02457A] border border-[#97CADB]/50 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <span>Đăng bán trong 60 giây</span>
                </Link>
              </div>

              {/* Thống kê nhanh nổi bật */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-white/15 max-w-lg">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">300k+</p>
                  <p className="text-xs text-[#97CADB] mt-0.5">Sinh viên KTX TP.HCM</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">1-chạm</p>
                  <p className="text-xs text-[#97CADB] mt-0.5">Mở Zalo &amp; Hẹn xem đồ</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">100%</p>
                  <p className="text-xs text-[#97CADB] mt-0.5">Product Passport số</p>
                </div>
              </div>
            </div>

            {/* Cột phải (6/12 cột): Ảnh 3D Vòng đời tái chế & Đồ dùng sinh viên đặt ở vị trí cân đối */}
            <div className="lg:col-span-6 flex justify-center items-center relative">
              <div className="relative w-full max-w-[540px] lg:max-w-[580px] aspect-[4/3.5] flex items-center justify-center">
                {/* Vầng sáng phía sau ảnh */}
                <div className="absolute inset-4 bg-[#018ABE]/30 rounded-full blur-3xl scale-105" aria-hidden="true" />
                <Image
                  src="/hero-recycle-lifecycle.png"
                  alt="Vòng đời tái chế và đồ dùng sinh viên: bàn học, quạt điện, balo, giáo trình, máy tính Casio và Hộ chiếu đồ vật"
                  width={800}
                  height={700}
                  className="relative z-10 w-full h-auto object-contain drop-shadow-[0_20px_45px_rgba(0,27,72,0.5)] hover:scale-[1.02] transition-transform duration-300"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Lưới Danh Mục & Feed Sản Phẩm Sinh Viên (Bọc Suspense chuẩn Next.js 16 cacheComponents) */}
      <Suspense
        fallback={
          <HomeProductFeed
            initialProducts={FALLBACK_PRODUCTS}
            categories={FALLBACK_CATEGORIES}
            schools={FALLBACK_SCHOOLS}
          />
        }
      >
        <LiveMarketplaceFeed />
      </Suspense>

      {/* 3. Banner Giới Thiệu Đặc Quyền: Digital Product Passport (off-chain & Fuji ready) */}
      <PassportBanner />
    </div>
  );
}
