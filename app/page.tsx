import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { ProductCardData } from "@/components/products/ProductCard";
import { CategoryItem } from "@/components/home/CategoryGrid";
import { HomeProductFeed } from "@/components/home/HomeProductFeed";
import { TrustStrip } from "@/components/home/TrustStrip";
import { CircularStorySection } from "@/components/home/CircularStorySection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { StudentTestimonialsSection } from "@/components/home/StudentTestimonialsSection";
import ScrollReveal from "@/components/ui/ScrollReveal";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import { getPublicReviewCountsByUserIds } from "@/lib/utils/reputation";
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
      const reviewCounts = await getPublicReviewCountsByUserIds(
        dbListings.map((l) => l.seller.id)
      );
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
          reviewCount: reviewCounts.get(l.seller.id) ?? 0,
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
        name: c.slug === "goc-0d-cho-tang" ? "Đồ tặng miễn phí" : c.name,
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
    <div className="flex flex-col flex-1 overflow-x-clip">
      {/* 1. Khối Hero Editorial Gradient Bleed: 001 + Thẻ nổi Góc 0đ & Hình ảnh cân đối */}
      <section className="hero-gradient-bleed text-white pt-6 pb-8 sm:pt-8 sm:pb-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            {/* Cột trái (6/12 cột): Tiêu đề, hàng Editorial 001, CTA & Số liệu */}
            <ScrollReveal variant="fade-left" className="lg:col-span-6 space-y-5">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] sm:text-xs font-semibold tracking-wide text-[#D6E8EE]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#97CADB]" aria-hidden="true" />
                Tuần hoàn đồ dùng sinh viên · KTX &amp; Làng Đại học TP.HCM
              </span>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
                Mua bán đồ cũ sinh viên tiết kiệm &amp; trao tay tận cổng trường
              </h1>

              <div className="flex items-start gap-4 sm:gap-5 pt-1">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#97CADB] tabular-nums leading-none select-none shrink-0 pt-0.5">
                  001
                </span>
                <p className="text-sm sm:text-base text-[#D6E8EE] leading-relaxed max-w-xl font-normal border-l-2 border-[#018ABE]/60 pl-4">
                  Tái sử dụng giáo trình, bàn học gấp, quạt đứng hay đồ dùng ký túc xá qua các thế hệ sinh viên. Kết nối nhanh qua Zalo, đặt hẹn giữ chỗ và kiểm tra chuỗi đời chủ qua Digital Product Passport.
                </p>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <a
                  href="#live-feed"
                  className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-white text-[#001B48] hover:bg-[#D6E8EE] font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <span>Khám phá đồ</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                </a>
                <Link
                  href="/sell"
                  className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#018ABE] hover:bg-[#02457A] border border-[#97CADB]/50 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Đăng bán</span>
                </Link>
              </div>

              {/* Thống kê nhanh nổi bật */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-white/15 max-w-lg tabular-nums">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">7+</p>
                  <p className="text-xs text-[#97CADB] mt-0.5">Trường &amp; KTX liên kết</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">0đ</p>
                  <p className="text-xs text-[#97CADB] mt-0.5">Phí trung gian</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-white">100%</p>
                  <p className="text-xs text-[#97CADB] mt-0.5">Product Passport số</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Cột phải (6/12 cột): Ảnh 3D Vòng đời tái chế & Thẻ nổi Góc 0đ */}
            <ScrollReveal variant="fade-right" className="lg:col-span-6 flex flex-col justify-center items-center relative">
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

              {/* Thẻ nổi Spotlight */}
              <div className="relative sm:absolute sm:bottom-2 sm:right-0 z-20 mt-4 sm:mt-0 max-w-xs w-full bg-white/95 backdrop-blur-md text-[#001B48] p-4 rounded-2xl shadow-[0_16px_36px_rgba(0,27,72,0.28)] border border-white/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#018ABE] motion-safe:animate-pulse shrink-0" aria-hidden="true" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#02457A]">
                    Mùa chuyển phòng KTX
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-[#001B48] leading-snug mt-1">
                  Săn combo đồ trọ &amp; giáo trình Góc 0đ từ khóa trước
                </p>
                <Link
                  href="/products?category=goc-0d-cho-tang"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#018ABE] hover:text-[#001B48] transition-colors"
                >
                  <span>Xem Góc 0đ ngay</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 2. Dải 4 Cam kết Niềm tin ngay dưới Hero */}
      <TrustStrip />

      {/* 3. Khối Câu chuyện Tuần hoàn & Hành trình 3 đời chủ */}
      <CircularStorySection />

      {/* 4. Quy trình giao dịch 3 bước an toàn tại cổng trường & KTX */}
      <HowItWorksSection />

      {/* 5. Đánh giá & Chia sẻ từ cộng đồng sinh viên Làng ĐH */}
      <StudentTestimonialsSection />

      {/* 6. Danh mục & Sản phẩm mới đăng (gộp 1 khối, kề cuối trang) */}
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

      {/* 7. Khối CTA cuối trang: lặp lại 2 nút đồng bộ với Hero */}
      <section className="py-14 sm:py-20 bg-white border-t border-[#D6E8EE]/70">
        <ScrollReveal
          variant="fade-up"
          className="max-w-3xl mx-auto px-4 sm:px-6 text-center"
        >
          <span className="inline-flex items-center px-3.5 py-1 rounded-full border border-[#D6E8EE] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#02457A]">
            Tuần hoàn đồ dùng sinh viên
          </span>
          <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold text-[#001B48] tracking-tight leading-tight">
            Trao tay món đồ cũ, tiết kiệm chi phí cho học kỳ mới
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#02457A] leading-relaxed">
            Giáo trình, bàn ghế, quạt máy và đồ dùng ký túc xá luôn sẵn sàng tìm chủ mới ngay tại cổng trường.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#live-feed"
              className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#001B48] text-white hover:bg-[#02457A] font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <span>Khám phá đồ</span>
            </a>
            <Link
              href="/sell"
              className="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-colors"
            >
              <span>Đăng bán</span>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Nút cuộn nhanh lên đầu trang */}
      <ScrollToTopButton />
    </div>
  );
}
