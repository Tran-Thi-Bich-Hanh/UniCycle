import prisma from "@/lib/prisma";
import { ProductCardData } from "@/components/products/ProductCard";
import { CategoryItem } from "@/components/home/CategoryGrid";
import {
  formatCategoryCount,
  HEADER_CATEGORIES,
  syncCategoriesWithHeader,
} from "@/lib/constants/categories";
import {
  FALLBACK_CATEGORIES,
  FALLBACK_PRODUCTS,
  FALLBACK_SCHOOLS,
} from "@/lib/data/mock-fallback";
import { getPublicReviewCountsByUserIds } from "@/lib/utils/reputation";

export interface MarketplaceSchoolOption {
  id: string;
  name: string;
  shortName: string;
}

export interface MarketplaceData {
  products: ProductCardData[];
  categories: CategoryItem[];
  schools: MarketplaceSchoolOption[];
}

function createInitialCountsBySlug(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const cat of HEADER_CATEGORIES) {
    counts[cat.slug] = 0;
  }
  return counts;
}

function computeCountsFromProducts(
  products: ProductCardData[]
): Record<string, number> {
  const counts = createInitialCountsBySlug();

  for (const product of products) {
    const slug = product.category?.slug;
    const isFreeItem =
      Boolean(product.isFree) ||
      product.price === 0 ||
      slug === "goc-0d-cho-tang";

    if (isFreeItem) {
      counts["goc-0d-cho-tang"] = (counts["goc-0d-cho-tang"] ?? 0) + 1;
    }

    if (slug && slug !== "goc-0d-cho-tang") {
      counts[slug] = (counts[slug] ?? 0) + 1;
    }
  }

  return counts;
}

/**
 * Đếm số lượng tin đang mở bán (AVAILABLE & còn hạn) theo từng slug danh mục từ PostgreSQL.
 * Riêng `goc-0d-cho-tang` đếm tất cả tin miễn phí 0đ hoặc thuộc danh mục Góc Cho Tặng.
 */
export async function getCategoryListingCounts(): Promise<
  Record<string, number>
> {
  const countsBySlug = createInitialCountsBySlug();

  try {
    const now = new Date();
    const [dbCategories, groupedCounts, freeCount] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, slug: true },
      }),
      prisma.listing.groupBy({
        by: ["categoryId"],
        where: {
          status: "AVAILABLE",
          expiresAt: { gt: now },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.listing.count({
        where: {
          status: "AVAILABLE",
          expiresAt: { gt: now },
          OR: [
            { isFree: true },
            { price: 0 },
            { category: { slug: "goc-0d-cho-tang" } },
          ],
        },
      }),
    ]);

    const slugById = new Map(dbCategories.map((c) => [c.id, c.slug]));
    for (const row of groupedCounts) {
      const slug = slugById.get(row.categoryId);
      if (slug && slug !== "goc-0d-cho-tang") {
        countsBySlug[slug] = row._count._all;
      }
    }

    countsBySlug["goc-0d-cho-tang"] = freeCount;
    return countsBySlug;
  } catch (error) {
    console.warn("⚠️ Lỗi đếm tin theo danh mục (dùng dữ liệu mẫu):", error);
    return computeCountsFromProducts(FALLBACK_PRODUCTS);
  }
}

/**
 * Loader dùng chung cho Trang chủ, Sàn trao đổi, Tìm kiếm và Trang danh mục.
 */
export async function getMarketplaceData(options?: {
  limit?: number;
}): Promise<MarketplaceData> {
  const limit = options?.limit ?? 50;

  try {
    const now = new Date();
    const [dbListings, dbCategories, dbSchools, countsBySlug] =
      await Promise.all([
        prisma.listing.findMany({
          where: {
            status: "AVAILABLE",
            expiresAt: { gt: now },
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
          take: limit,
        }),
        prisma.category.findMany(),
        prisma.school.findMany(),
        getCategoryListingCounts(),
      ]);

    const reviewCounts = await getPublicReviewCountsByUserIds(
      dbListings.map((l) => l.seller.id)
    );

    const products: ProductCardData[] = dbListings.map((l) => ({
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

    const rawCategories: CategoryItem[] = dbCategories.map((c) => {
      const listingCount = countsBySlug[c.slug] ?? 0;
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        imageUrl: `/categories/${c.slug}.jpg`,
        listingCount,
        count: formatCategoryCount(listingCount),
      };
    });

    const categories: CategoryItem[] = syncCategoriesWithHeader(
      rawCategories
    ).map((cat) => {
      const listingCount = countsBySlug[cat.slug] ?? cat.listingCount ?? 0;
      return {
        ...cat,
        listingCount,
        count: formatCategoryCount(listingCount),
      };
    });

    const schools: MarketplaceSchoolOption[] =
      dbSchools.length > 0
        ? dbSchools.map((s) => ({
            id: s.id,
            name: s.name,
            shortName: s.shortName,
          }))
        : FALLBACK_SCHOOLS;

    return { products, categories, schools };
  } catch (error) {
    console.warn(
      "⚠️ Không thể tải dữ liệu sàn từ PostgreSQL (dùng dữ liệu mẫu):",
      error
    );

    const fallbackCounts = computeCountsFromProducts(FALLBACK_PRODUCTS);
    const categories: CategoryItem[] = syncCategoriesWithHeader(
      FALLBACK_CATEGORIES
    ).map((cat) => {
      const listingCount = fallbackCounts[cat.slug] ?? 0;
      return {
        ...cat,
        listingCount,
        count: formatCategoryCount(listingCount),
      };
    });

    return {
      products: FALLBACK_PRODUCTS,
      categories,
      schools: FALLBACK_SCHOOLS,
    };
  }
}
