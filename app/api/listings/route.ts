import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { removeVietnameseTones } from "@/lib/utils/vietnamese";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const categorySlug = searchParams.get("category");
  const campus = searchParams.get("campus"); // schoolId hoặc shortName
  const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;
  const condition = searchParams.get("condition");
  const isFree = searchParams.get("isFree") === "true";
  const hasPassport = searchParams.get("hasPassport") === "true";
  const verifiedOnly = searchParams.get("verifiedOnly") === "true";
  const sort = searchParams.get("sort") || "verified_priority"; // verified_priority, newest, price_asc, price_desc

  try {
    const where: Prisma.ListingWhereInput = {
      status: "AVAILABLE",
      expiresAt: {
        gt: new Date(),
      },
    };

    if (categorySlug && categorySlug !== "all") {
      where.category = { slug: categorySlug };
    }

    if (campus && campus !== "all") {
      where.OR = [
        { schoolId: campus },
        { school: { shortName: { contains: campus, mode: "insensitive" } } },
      ];
    }

    if (isFree) {
      where.OR = [{ isFree: true }, { price: 0 }];
    } else {
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
      }
    }

    if (condition && condition !== "all") {
      where.condition = { contains: condition, mode: "insensitive" };
    }

    if (hasPassport) {
      where.item = {
        passportEnabled: true,
      };
    }

    if (verifiedOnly) {
      where.seller = {
        isStudentVerified: true,
      };
    }

    let listings = await prisma.listing.findMany({
      where,
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
    });

    // Lọc tìm kiếm tiếng Việt có/không dấu phía backend
    if (q) {
      const normalizedQuery = removeVietnameseTones(q);
      listings = listings.filter((l) => {
        const titleNorm = removeVietnameseTones(l.title);
        const descNorm = removeVietnameseTones(l.description);
        const catNorm = l.category ? removeVietnameseTones(l.category.name) : "";
        const schoolNorm = l.school ? removeVietnameseTones(l.school.name + " " + l.school.shortName) : "";

        return (
          titleNorm.includes(normalizedQuery) ||
          descNorm.includes(normalizedQuery) ||
          catNorm.includes(normalizedQuery) ||
          schoolNorm.includes(normalizedQuery)
        );
      });
    }

    // Sắp xếp
    listings.sort((a, b) => {
      if (sort === "verified_priority") {
        // Ưu tiên tin của Sinh viên đã xác minh (BR19)
        const aVerified = a.seller?.isStudentVerified ? 1 : 0;
        const bVerified = b.seller?.isStudentVerified ? 1 : 0;
        if (aVerified !== bVerified) return bVerified - aVerified;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Định dạng dữ liệu an toàn (BR01, BR36: Ẩn SĐT công khai nếu người bán chọn hidePhone)
    const formatted = listings.map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      isFree: l.isFree,
      condition: l.condition,
      description: l.description,
      zaloPhone: l.hidePhone ? undefined : l.zaloPhone,
      hidePhone: l.hidePhone,
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

    return NextResponse.json({
      listings: formatted,
      total: formatted.length,
    });
  } catch (error) {
    console.warn("⚠️ Lỗi truy vấn Database /api/listings (dùng fallback):", error);
    return NextResponse.json({
      listings: FALLBACK_PRODUCTS,
      total: FALLBACK_PRODUCTS.length,
    });
  }
}
