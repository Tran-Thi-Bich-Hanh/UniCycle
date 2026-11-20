import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSessionToken,
  getSessionUser,
  SESSION_COOKIE_NAME,
  SessionUser,
} from "@/lib/auth";
import { FALLBACK_SCHOOLS } from "@/lib/data/mock-fallback";
import { reconcileBlindReviews48h } from "@/lib/utils/reputation";

const FALLBACK_SCHOOL_SHORT_NAMES: Record<string, string> = {
  "ktx-b": "KTX Khu B",
  "ktx-a": "KTX Khu A",
  hcmut: "ĐH Bách Khoa",
  hcmus: "ĐH KHTN",
  ueh: "UEH",
  uit: "ĐH CNTT",
};

async function resolveSchool(schoolId?: string | null) {
  if (!schoolId) return null;
  const mappedShortName = FALLBACK_SCHOOL_SHORT_NAMES[schoolId];
  return prisma.school.findFirst({
    where: {
      OR: [
        { id: schoolId },
        ...(mappedShortName ? [{ shortName: mappedShortName }] : []),
        { shortName: { contains: schoolId, mode: "insensitive" } },
      ],
    },
  });
}

/**
 * GET /api/profile
 * Lấy thông tin hồ sơ cá nhân, thống kê giao dịch & đánh giá đã công khai (BR14)
 */
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xem hồ sơ cá nhân." },
        { status: 401 }
      );
    }

    let schools = FALLBACK_SCHOOLS.map((s) => ({
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      emailDomain: null as string | null,
      area: "TP.HCM",
    }));

    let profileData = {
      id: sessionUser.id,
      email: sessionUser.email,
      displayName: sessionUser.displayName,
      avatarUrl: sessionUser.avatarUrl || null,
      role: sessionUser.role,
      authProvider: "email",
      isStudentVerified: sessionUser.isStudentVerified,
      studentVerifiedAt: null as string | null,
      hasPendingCard: false,
      reputationScore: sessionUser.reputationScore,
      schoolId: sessionUser.schoolId || null,
      school: sessionUser.schoolShortName
        ? {
            id: sessionUser.schoolId || "ktx-b",
            name: sessionUser.schoolShortName,
            shortName: sessionUser.schoolShortName,
          }
        : null,
      dorm: sessionUser.dorm || null,
      createdAt: new Date().toISOString(),
    };

    let stats = {
      itemsCount: 0,
      listingsCount: 0,
      completedOrdersCount: 0,
      ownedItemsCount: 0,
      reviewsCount: 0,
      blockingOrdersCount: 0,
    };

    let reviews: Array<{
      id: string;
      rating: number;
      comment: string;
      tags: string[];
      submittedAt: string;
      reviewer: {
        id: string;
        displayName: string;
        avatarUrl: string | null;
        isStudentVerified: boolean;
      };
      listingTitle: string;
    }> = [];

    try {
      await reconcileBlindReviews48h();

      const dbSchools = await prisma.school.findMany({
        orderBy: { name: "asc" },
      });
      if (dbSchools.length > 0) {
        schools = dbSchools.map((s) => ({
          id: s.id,
          name: s.name,
          shortName: s.shortName,
          emailDomain: s.emailDomain,
          area: s.area,
        }));
      }

      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: sessionUser.id }, { email: sessionUser.email }],
        },
        include: { school: true },
      });

      if (dbUser) {
        profileData = {
          id: dbUser.id,
          email: dbUser.email,
          displayName: dbUser.displayName,
          avatarUrl: dbUser.avatarUrl,
          role: dbUser.role,
          authProvider: dbUser.authProvider,
          isStudentVerified: dbUser.isStudentVerified,
          studentVerifiedAt: dbUser.studentVerifiedAt
            ? dbUser.studentVerifiedAt.toISOString()
            : null,
          hasPendingCard: Boolean(dbUser.studentCardUrl && !dbUser.isStudentVerified),
          reputationScore: dbUser.reputationScore,
          schoolId: dbUser.schoolId,
          school: dbUser.school
            ? {
                id: dbUser.school.id,
                name: dbUser.school.name,
                shortName: dbUser.school.shortName,
              }
            : null,
          dorm: dbUser.dorm,
          createdAt: dbUser.createdAt.toISOString(),
        };

        const now = new Date();
        const [
          userListings,
          completedOrdersCount,
          ownedItems,
          blockingOrdersCount,
          dbReviews,
        ] = await Promise.all([
          prisma.listing.findMany({
            where: { sellerId: dbUser.id, status: { not: "REMOVED" } },
            select: { id: true, itemId: true },
          }),
          prisma.order.count({
            where: {
              OR: [{ buyerId: dbUser.id }, { sellerId: dbUser.id }],
              status: { in: ["COMPLETED", "AUTO_COMPLETED"] },
            },
          }),
          prisma.item.findMany({
            where: { currentOwnerId: dbUser.id },
            select: { id: true },
          }),
          prisma.order.count({
            where: {
              OR: [{ buyerId: dbUser.id }, { sellerId: dbUser.id }],
              status: { in: ["ACCEPTED", "WAITING_CONFIRMATION", "DISPUTED"] },
            },
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

        const ownedItemIds = new Set(ownedItems.map((item) => item.id));
        const unmatchedListingsCount = userListings.filter(
          (listing) => !listing.itemId || !ownedItemIds.has(listing.itemId)
        ).length;
        const unifiedItemsCount = ownedItems.length + unmatchedListingsCount;

        stats = {
          itemsCount: unifiedItemsCount,
          listingsCount: userListings.length,
          completedOrdersCount,
          ownedItemsCount: ownedItems.length,
          reviewsCount: dbReviews.length,
          blockingOrdersCount,
        };

        reviews = dbReviews.map((r) => {
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
      }
    } catch (dbErr) {
      console.warn("⚠️ Kết nối DB chậm khi tải /api/profile (dùng fallback session):", dbErr);
    }

    return NextResponse.json({
      profile: profileData,
      stats,
      reviews,
      schools,
    });
  } catch (error) {
    console.error("Lỗi GET /api/profile:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải thông tin hồ sơ." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Cập nhật thông tin hồ sơ cá nhân (displayName, schoolId, dorm, avatarUrl)
 */
export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để cập nhật hồ sơ." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    const schoolIdInput =
      typeof body.schoolId === "string" ? body.schoolId.trim() : "";
    const dormInput = typeof body.dorm === "string" ? body.dorm.trim() : "";
    const avatarUrlInput =
      typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : undefined;

    if (displayName.length < 2 || displayName.length > 60) {
      return NextResponse.json(
        { error: "Tên hiển thị phải từ 2 đến 60 ký tự." },
        { status: 400 }
      );
    }

    if (avatarUrlInput && avatarUrlInput.length > 0) {
      const validAvatar =
        avatarUrlInput.startsWith("https://") ||
        avatarUrlInput.startsWith("http://") ||
        avatarUrlInput.startsWith("/") ||
        avatarUrlInput.startsWith("data:image/");
      if (!validAvatar || avatarUrlInput.length > 2_000_000) {
        return NextResponse.json(
          { error: "Ảnh đại diện không hợp lệ hoặc dung lượng quá lớn." },
          { status: 400 }
        );
      }
    }

    let updatedSessionUser: SessionUser = {
      ...sessionUser,
      displayName,
      dorm: dormInput || null,
      avatarUrl:
        avatarUrlInput !== undefined ? avatarUrlInput || null : sessionUser.avatarUrl,
    };

    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: sessionUser.id }, { email: sessionUser.email }],
        },
        include: { school: true },
      });

      const matchedSchool = schoolIdInput ? await resolveSchool(schoolIdInput) : null;

      if (dbUser) {
        const updated = await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            displayName,
            schoolId: matchedSchool ? matchedSchool.id : schoolIdInput === "" ? null : dbUser.schoolId,
            dorm: dormInput || null,
            ...(avatarUrlInput !== undefined
              ? { avatarUrl: avatarUrlInput || null }
              : {}),
          },
          include: { school: true },
        });

        updatedSessionUser = {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
          avatarUrl: updated.avatarUrl,
          role: updated.role,
          isStudentVerified: updated.isStudentVerified,
          reputationScore: updated.reputationScore,
          schoolId: updated.schoolId,
          schoolShortName: updated.school?.shortName || "KTX ĐHQG",
          dorm: updated.dorm,
        };
      } else if (matchedSchool) {
        updatedSessionUser.schoolId = matchedSchool.id;
        updatedSessionUser.schoolShortName = matchedSchool.shortName;
      }
    } catch (dbErr) {
      console.warn("⚠️ Lỗi DB khi cập nhật /api/profile (cập nhật session):", dbErr);
      const fallbackSchool = FALLBACK_SCHOOLS.find((s) => s.id === schoolIdInput);
      if (fallbackSchool) {
        updatedSessionUser.schoolId = fallbackSchool.id;
        updatedSessionUser.schoolShortName = fallbackSchool.shortName;
      }
    }

    const token = createSessionToken(updatedSessionUser);
    const response = NextResponse.json({
      success: true,
      user: updatedSessionUser,
      message: "Đã cập nhật hồ sơ cá nhân thành công!",
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Lỗi PATCH /api/profile:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật hồ sơ cá nhân." },
      { status: 500 }
    );
  }
}
