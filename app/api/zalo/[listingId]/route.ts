import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";

interface RouteParams {
  params: Promise<{ listingId: string }>;
}

// In-memory rate limiting: Tối đa 20 yêu cầu / tài khoản / phút (BR36: Chống cào số Zalo hàng loạt)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function checkRateLimit(key: string, limit = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { listingId } = await params;

    // 1. Kiểm tra đăng nhập bắt buộc (BR01)
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        {
          error: "Vui lòng đăng nhập để liên hệ Zalo với người bán (BR01).",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    // 2. Kiểm tra Rate-limit chống cào số điện thoại hàng loạt (BR36)
    const rateLimitKey = `zalo:${user.id}`;
    if (!checkRateLimit(rateLimitKey, 20, 60000)) {
      return NextResponse.json(
        {
          error: "Bạn đang thao tác lấy thông tin Zalo quá nhanh. Vui lòng thử lại sau 1 phút (BR36).",
        },
        { status: 429 }
      );
    }

    // 3. Truy vấn thông tin Listing
    let listing = null;

    try {
      listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
              schoolId: true,
            },
          },
        },
      });
    } catch (dbError) {
      console.warn("⚠️ Lỗi Prisma trong /api/zalo/[listingId] (dùng fallback):", dbError);
    }

    // Fallback nếu không có trong DB
    if (!listing) {
      const fallback = FALLBACK_PRODUCTS.find((p) => p.id === listingId);
      if (fallback) {
        listing = {
          id: fallback.id,
          title: fallback.title,
          price: fallback.price,
          isFree: fallback.isFree || false,
          zaloPhone: fallback.zaloPhone || "0987654321",
          hidePhone: false,
          seller: {
            id: fallback.seller.id,
            email: null as string | null,
            displayName: fallback.seller.displayName,
            avatarUrl: fallback.seller.avatarUrl,
            schoolId: fallback.school?.id || null,
          },
        };
      }
    }

    if (!listing) {
      return NextResponse.json(
        { error: "Không tìm thấy tin đăng món đồ." },
        { status: 404 }
      );
    }

    const rawPhone = listing.zaloPhone ? listing.zaloPhone.replace(/\D/g, "") : "";
    if (!rawPhone) {
      return NextResponse.json(
        { error: "Người bán chưa cung cấp số Zalo cho món đồ này." },
        { status: 400 }
      );
    }

    const isOwner =
      user.id === listing.seller.id ||
      Boolean(
        user.email &&
          listing.seller.email &&
          user.email.toLowerCase() === listing.seller.email.toLowerCase()
      );
    const isAdmin = user.role === "ADMIN";
    const hidePhone = Boolean(listing.hidePhone);

    // Che số điện thoại dạng 098****321 nếu hidePhone = true
    const maskedPhone =
      hidePhone && !isOwner && !isAdmin
        ? rawPhone.slice(0, 3) + "****" + rawPhone.slice(-3)
        : rawPhone;

    // Tin nhắn mẫu lịch sự cho sinh viên
    const formattedPrice =
      listing.isFree || listing.price === 0
        ? "0đ (Cho tặng miễn phí)"
        : `${listing.price.toLocaleString("vi-VN")} đ`;

    const prefilledMessage = `Chào bạn, mình thấy tin đăng "${listing.title}" giá ${formattedPrice} trên UniCycle, bạn còn đồ không ạ?`;

    const zaloUrl = `https://zalo.me/${rawPhone}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(zaloUrl)}`;

    return NextResponse.json({
      zaloUrl,
      qrUrl,
      prefilledMessage,
      maskedPhone,
      hidePhone,
      phoneRaw: !hidePhone || isOwner || isAdmin ? rawPhone : null,
      sellerName: listing.seller.displayName,
    });
  } catch (error) {
    console.error("Lỗi GET /api/zalo/[listingId]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo liên kết Zalo." },
      { status: 500 }
    );
  }
}

