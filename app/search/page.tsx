import React, { Suspense } from "react";
import prisma from "@/lib/prisma";
import { ProductsExplorer } from "@/components/products/ProductsExplorer";
import { ProductCardData } from "@/components/products/ProductCard";
import { CategoryItem } from "@/components/home/CategoryGrid";
import {
  FALLBACK_PRODUCTS,
  FALLBACK_CATEGORIES,
  FALLBACK_SCHOOLS,
} from "@/lib/data/mock-fallback";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

async function SearchContent({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";

  let products: ProductCardData[] = FALLBACK_PRODUCTS;
  let categories: CategoryItem[] = FALLBACK_CATEGORIES;
  let schools = FALLBACK_SCHOOLS;

  try {
    const [dbListings, dbCategories, dbSchools] = await Promise.all([
      prisma.listing.findMany({
        where: {
          status: "AVAILABLE",
          expiresAt: {
            gt: new Date(),
          },
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
        take: 50,
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
        zaloPhone: l.hidePhone ? undefined : l.zaloPhone,
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
      categories = dbCategories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
      }));
    }

    if (dbSchools && dbSchools.length > 0) {
      schools = dbSchools.map((s) => ({
        id: s.id,
        name: s.name,
        shortName: s.shortName,
      }));
    }
  } catch (err) {
    console.warn("⚠️ Không thể kết nối DB khi tìm kiếm:", err);
  }

  return (
    <ProductsExplorer
      initialProducts={products}
      categories={categories}
      schools={schools}
      initialQuery={q}
    />
  );
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm font-semibold text-[#02457A]">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#D6E8EE] animate-pulse" />
          Đang tìm kiếm đồ dùng sinh viên...
        </div>
      }
    >
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}

