import React, { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";
import {
  ProductDetailClient,
  ProductDetailData,
} from "@/components/products/ProductDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  let title = "Chi tiết món đồ | UniCycle";
  let description = "Khám phá trao tay đồ dùng sinh viên an toàn tại KTX TP.HCM.";

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { title: true, description: true },
    });
    if (listing) {
      title = `${listing.title} | UniCycle Sinh Viên`;
      description = listing.description.slice(0, 160);
    }
  } catch {
    const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id);
    if (fallback) {
      title = `${fallback.title} | UniCycle Sinh Viên`;
      description = fallback.title;
    }
  }

  return {
    title,
    description,
  };
}

async function ProductDetailContent({ params }: PageProps) {
  const { id } = await params;

  let product: ProductDetailData | null = null;
  let relatedProducts: ProductDetailData[] = [];

  try {
    const dbListing = await prisma.listing.findUnique({
      where: { id },
      include: {
        category: true,
        school: true,
        seller: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            isStudentVerified: true,
            reputationScore: true,
            dorm: true,
          },
        },
        item: {
          include: {
            owners: {
              include: {
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
              orderBy: { seq: "asc" },
            },
          },
        },
        images: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (dbListing) {
      // BẢO MẬT TUYỆT ĐỐI (BR01, BR36): Tuyệt đối KHÔNG truyền zaloPhone vào HTML của khách
      product = {
        id: dbListing.id,
        title: dbListing.title,
        description: dbListing.description,
        price: dbListing.price,
        isFree: dbListing.isFree,
        condition: dbListing.condition,
        status: dbListing.status as ProductDetailData["status"],
        expiresAt: dbListing.expiresAt.toISOString(),
        createdAt: dbListing.createdAt.toISOString(),
        school: dbListing.school,
        category: dbListing.category,
        seller: dbListing.seller,
        item: dbListing.item
          ? {
              id: dbListing.item.id,
              passportEnabled: dbListing.item.passportEnabled,
              passportId: dbListing.item.passportId,
              passportStatus: dbListing.item.passportStatus,
              identityLevel: dbListing.item.identityLevel,
              owners: dbListing.item.owners.map((o) => ({
                seq: o.seq,
                showName: o.showName,
                user: o.showName && o.user ? { displayName: o.user.displayName } : null,
              })),
            }
          : null,
        images: dbListing.images.map((img) => ({
          id: img.id,
          url: img.url,
        })),
      };

      // Lấy 4 món đồ tương tự trong cùng danh mục
      const relatedDb = await prisma.listing.findMany({
        where: {
          categoryId: dbListing.categoryId,
          id: { not: dbListing.id },
          status: "AVAILABLE",
        },
        include: {
          images: { orderBy: { position: "asc" } },
          seller: true,
          category: true,
          school: true,
        },
        take: 4,
      });

      relatedProducts = relatedDb.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        price: l.price,
        isFree: l.isFree,
        condition: l.condition,
        status: l.status as ProductDetailData["status"],
        school: l.school,
        category: l.category,
        seller: l.seller,
        images: l.images,
      }));
    }
  } catch (dbError) {
    console.warn("⚠️ Lỗi Prisma khi tải chi tiết sản phẩm (dùng fallback mock):", dbError);
  }

  // Fallback sang dữ liệu mẫu nếu không tìm thấy trong DB
  if (!product) {
    const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id);
    if (!fallback) {
      notFound();
    }

    product = {
      id: fallback.id,
      title: fallback.title,
      description:
        "Món đồ dùng còn rất tốt, được bảo quản cẩn thận trong phòng KTX. Hỗ trợ giao dịch trực tiếp tại cổng KTX hoặc thư viện trường học.",
      price: fallback.price,
      isFree: fallback.isFree || false,
      condition: fallback.condition,
      status: "AVAILABLE",
      school: fallback.school,
      category: fallback.category,
      seller: fallback.seller,
      item: fallback.item
        ? {
            id: fallback.item.id,
            passportEnabled: fallback.item.passportEnabled,
            passportId: fallback.item.passportId,
            passportStatus: fallback.item.passportStatus,
            owners: fallback.item.owners?.map((o) => ({
              seq: o.seq,
              showName: o.showName,
              user: null,
            })),
          }
        : null,
      images: fallback.images,
    };

    relatedProducts = FALLBACK_PRODUCTS.filter((p) => p.id !== id).slice(0, 4).map((p) => ({
      id: p.id,
      title: p.title,
      description: "",
      price: p.price,
      isFree: p.isFree,
      condition: p.condition,
      status: "AVAILABLE",
      school: p.school,
      category: p.category,
      seller: p.seller,
      images: p.images,
    }));
  }

  return (
    <ProductDetailClient
      product={product}
      relatedProducts={relatedProducts}
    />
  );
}

export default function ProductDetailPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-semibold text-[#02457A]">
              Đang tải chi tiết món đồ...
            </span>
          </div>
        }
      >
        <ProductDetailContent params={params} />
      </Suspense>
    </main>
  );
}

