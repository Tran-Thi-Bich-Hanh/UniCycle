import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xem danh sách tin của bạn." },
        { status: 401 }
      );
    }

    try {
      const dbListings = await prisma.listing.findMany({
        where: {
          sellerId: user.id,
        },
        include: {
          category: true,
          school: true,
          item: {
            include: {
              owners: true,
            },
          },
          images: {
            orderBy: { position: "asc" },
          },
          orders: {
            select: {
              id: true,
              status: true,
              buyerId: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const nowTime = Date.now();
      const formatted = dbListings.map((l) => {
        const diffMs = l.expiresAt.getTime() - nowTime;
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const daysRemainingText = days <= 0 ? "Hết hạn" : `Còn ${days} ngày`;

        return {
          id: l.id,
          title: l.title,
          description: l.description,
          price: l.price,
          isFree: l.isFree,
          condition: l.condition,
          status: l.status,
          expiresAt: l.expiresAt.toISOString(),
          daysRemaining: daysRemainingText,
          createdAt: l.createdAt.toISOString(),
          zaloPhone: l.zaloPhone,
          hidePhone: l.hidePhone,
          category: l.category
            ? { id: l.category.id, name: l.category.name, slug: l.category.slug }
            : null,
          school: l.school
            ? { id: l.school.id, name: l.school.name, shortName: l.school.shortName }
            : null,
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
          pendingOrdersCount: l.orders.filter((o) => o.status === "PENDING").length,
          hasActiveOrder: l.orders.some((o) =>
            ["ACCEPTED", "WAITING_CONFIRMATION"].includes(o.status)
          ),
        };
      });

      return NextResponse.json({
        listings: formatted,
        total: formatted.length,
      });
    } catch (dbError) {
      console.warn("⚠️ Lỗi truy vấn Prisma /api/listings/my (dùng demo data):", dbError);

      // Trả về dữ liệu demo gắn với tài khoản demo hiện tại
      const demoListings = FALLBACK_PRODUCTS.slice(0, 3).map((p, idx) => ({
        id: p.id,
        title: p.title,
        description: "Món đồ sinh viên bảo quản kỹ, hoạt động tốt. Giao dịch trực tiếp tại KTX.",
        price: p.price,
        isFree: p.isFree,
        condition: p.condition,
        status: idx === 1 ? "RESERVED" : idx === 2 ? "SOLD" : "AVAILABLE",
        expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: "Còn 25 ngày",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        zaloPhone: "0987654321",
        hidePhone: true,
        category: p.category,
        school: p.school,
        item: p.item,
        images: p.images,
        pendingOrdersCount: idx === 1 ? 1 : 0,
        hasActiveOrder: idx === 1,
      }));

      return NextResponse.json({
        listings: demoListings,
        total: demoListings.length,
      });
    }
  } catch (error) {
    console.error("Lỗi /api/listings/my:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách tin đăng." },
      { status: 500 }
    );
  }
}
