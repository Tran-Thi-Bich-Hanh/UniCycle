import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEMO_USERS } from "@/lib/auth";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";
import { reconcileBlindReviews48h } from "@/lib/utils/reputation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const DEMO_ID_TO_EMAIL: Record<string, string> = {
  "user-nam": "hoangnam.bka@gmail.com",
  "demo-user-nam": "hoangnam.bka@gmail.com",
  "user-yen": "haiyen.khtn@gmail.com",
  "demo-user-yen": "haiyen.khtn@gmail.com",
  "demo-user-admin": "admin@unicycle.vn",
};

/**
 * GET /api/users/[id]
 * Lấy hồ sơ công khai của một sinh viên (Mục 6.5 IA)
 * Tuyệt đối KHÔNG trả về email, SĐT Zalo, MSSV, ảnh thẻ sinh viên hay mật khẩu.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    try {
      await reconcileBlindReviews48h();

      // Tìm theo ID thực tế, hoặc ánh xạ ID mẫu sang email seed trong DB nếu cần
      const mappedEmail = DEMO_ID_TO_EMAIL[id];
      const dbUser = await prisma.user.findFirst({
        where: mappedEmail ? { OR: [{ id }, { email: mappedEmail }] } : { id },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          isStudentVerified: true,
          studentVerifiedAt: true,
          reputationScore: true,
          dorm: true,
          status: true,
          createdAt: true,
          school: {
            select: {
              id: true,
              name: true,
              shortName: true,
              area: true,
            },
          },
        },
      });

      if (dbUser) {
        if (dbUser.status === "DELETED") {
          return NextResponse.json({
            user: {
              id: dbUser.id,
              displayName: "Cựu sinh viên (Đã xóa tài khoản)",
              avatarUrl: null,
              isStudentVerified: false,
              reputationScore: 0,
              school: null,
              dorm: null,
              createdAt: dbUser.createdAt.toISOString(),
              completedOrdersCount: 0,
              isDeleted: true,
            },
            listings: [],
            reviews: [],
          });
        }

        const now = new Date();
        const [completedOrdersCount, dbListings, dbReviews] = await Promise.all([
          prisma.order.count({
            where: {
              OR: [{ buyerId: dbUser.id }, { sellerId: dbUser.id }],
              status: { in: ["COMPLETED", "AUTO_COMPLETED"] },
            },
          }),
          prisma.listing.findMany({
            where: {
              sellerId: dbUser.id,
              status: { in: ["AVAILABLE", "RESERVED"] },
              expiresAt: { gt: now },
            },
            include: {
              school: {
                select: { id: true, name: true, shortName: true, area: true },
              },
              category: {
                select: { id: true, name: true, slug: true },
              },
              images: {
                orderBy: { position: "asc" },
                select: { id: true, url: true },
              },
              item: {
                select: {
                  id: true,
                  passportEnabled: true,
                  passportId: true,
                  passportStatus: true,
                  owners: {
                    orderBy: { seq: "asc" },
                    select: { seq: true, showName: true },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.review.findMany({
            where: {
              revieweeId: dbUser.id,
              visibleAt: { not: null, lte: now },
            },
            include: {
              reviewer: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                  isStudentVerified: true,
                },
              },
              order: {
                select: {
                  listing: {
                    select: { title: true },
                  },
                },
              },
            },
            orderBy: { submittedAt: "desc" },
            take: 20,
          }),
        ]);

        // Định dạng listings KHÔNG bao gồm zaloPhone
        const formattedListings = dbListings.map((l) => ({
          id: l.id,
          title: l.title,
          price: l.price,
          isFree: l.isFree,
          condition: l.condition,
          createdAt: l.createdAt.toISOString(),
          school: l.school,
          category: l.category,
          seller: {
            id: dbUser.id,
            displayName: dbUser.displayName,
            avatarUrl: dbUser.avatarUrl,
            isStudentVerified: dbUser.isStudentVerified,
            reputationScore: dbUser.reputationScore,
            dorm: dbUser.dorm,
          },
          item: l.item,
          images: l.images,
        }));

        const formattedReviews = dbReviews.map((r) => {
          let parsedTags: string[] = [];
          if (r.tags) {
            try {
              parsedTags = JSON.parse(r.tags);
            } catch {
              parsedTags = [];
            }
          }
          return {
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            tags: parsedTags,
            submittedAt: r.submittedAt.toISOString(),
            reviewer: r.reviewer,
            listingTitle: r.order.listing.title,
          };
        });

        return NextResponse.json({
          user: {
            id: dbUser.id,
            displayName: dbUser.displayName,
            avatarUrl: dbUser.avatarUrl,
            isStudentVerified: dbUser.isStudentVerified,
            studentVerifiedAt: dbUser.studentVerifiedAt
              ? dbUser.studentVerifiedAt.toISOString()
              : null,
            reputationScore: dbUser.reputationScore,
            school: dbUser.school,
            dorm: dbUser.dorm,
            createdAt: dbUser.createdAt.toISOString(),
            completedOrdersCount,
            isDeleted: false,
          },
          listings: formattedListings,
          reviews: formattedReviews,
        });
      }
    } catch (dbErr) {
      console.warn("⚠️ Kết nối DB chậm khi tải /api/users/[id] (kiểm tra fallback):", dbErr);
    }

    // Fallback cho dữ liệu mẫu khi DB chưa seed hoặc offline
    const demoEmail = DEMO_ID_TO_EMAIL[id];
    const demoUser = demoEmail ? DEMO_USERS[demoEmail] : null;
    const fallbackProducts = FALLBACK_PRODUCTS.filter(
      (p) => p.seller.id === id || (demoUser && p.seller.displayName === demoUser.displayName)
    ).map((p) => {
      const { zaloPhone: _removedPhone, ...safeProduct } = p;
      void _removedPhone;
      return safeProduct;
    });

    if (demoUser) {
      return NextResponse.json({
        user: {
          id,
          displayName: demoUser.displayName,
          avatarUrl: demoUser.avatarUrl || null,
          isStudentVerified: demoUser.isStudentVerified,
          reputationScore: demoUser.reputationScore,
          school: demoUser.schoolShortName
            ? {
                id: demoUser.schoolId || "ktx-b",
                name: demoUser.schoolShortName,
                shortName: demoUser.schoolShortName,
                area: "TP.HCM",
              }
            : null,
          dorm: demoUser.dorm || null,
          createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          completedOrdersCount: fallbackProducts.length > 0 ? 4 : 0,
          isDeleted: false,
        },
        listings: fallbackProducts,
        reviews: [],
      });
    }

    return NextResponse.json(
      { error: "Không tìm thấy hồ sơ người dùng này." },
      { status: 404 }
    );
  } catch (error) {
    console.error("Lỗi GET /api/users/[id]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải hồ sơ công khai." },
      { status: 500 }
    );
  }
}
