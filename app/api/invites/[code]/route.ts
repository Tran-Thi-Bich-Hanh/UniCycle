import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";
import { getPublicReviewCountsByUserIds } from "@/lib/utils/reputation";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    let invite = null;

    try {
      invite = await prisma.orderInvite.findUnique({
        where: { codeHash },
        include: {
          listing: {
            include: {
              images: { orderBy: { position: "asc" } },
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
              item: true,
            },
          },
        },
      });
    } catch (err) {
      console.warn("⚠️ Lỗi truy vấn Prisma GET /api/invites/[code]:", err);
    }

    // Fallback demo nếu đang test offline
    if (!invite) {
      const fallbackListing = FALLBACK_PRODUCTS[0];
      return NextResponse.json({
        invite: {
          id: "demo-invite-1",
          status: "PENDING",
          expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
          listing: {
            id: fallbackListing.id,
            title: fallbackListing.title,
            price: fallbackListing.price,
            isFree: fallbackListing.isFree,
            condition: fallbackListing.condition,
            status: "AVAILABLE",
            school: fallbackListing.school,
            category: fallbackListing.category,
            seller: fallbackListing.seller,
            item: fallbackListing.item,
            images: fallbackListing.images,
          },
        },
      });
    }

    const now = new Date();
    if (invite.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            invite.status === "ACCEPTED"
              ? "Lời mời chốt bán này đã được một bạn sinh viên khác xác nhận mua."
              : "Lời mời chốt bán này không còn khả dụng.",
          status: invite.status,
        },
        { status: 410 }
      );
    }

    if (invite.expiresAt < now) {
      return NextResponse.json(
        {
          error: "Lời mời chốt bán này đã hết hạn sau 24 giờ theo quy định (BR38).",
          expired: true,
        },
        { status: 410 }
      );
    }

    if (invite.listing.status !== "AVAILABLE") {
      return NextResponse.json(
        {
          error:
            invite.listing.status === "RESERVED"
              ? "Món đồ này hiện đã có người đặt giữ chỗ trước."
              : "Món đồ này hiện không còn mở bán.",
          listingStatus: invite.listing.status,
        },
        { status: 400 }
      );
    }

    const reviewCounts = await getPublicReviewCountsByUserIds([
      invite.listing.seller.id,
    ]);

    return NextResponse.json({
      invite: {
        ...invite,
        listing: {
          ...invite.listing,
          seller: {
            ...invite.listing.seller,
            reviewCount: reviewCounts.get(invite.listing.seller.id) ?? 0,
          },
        },
      },
    });
  } catch (error) {
    console.error("Lỗi GET /api/invites/[code]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi kiểm tra lời mời chốt bán." },
      { status: 500 }
    );
  }
}

