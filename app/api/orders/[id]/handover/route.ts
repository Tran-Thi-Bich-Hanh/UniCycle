import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  HANDOVER_TOKEN_TTL_SECONDS,
  createHandoverToken,
  resolveRequestOrigin,
  verifyHandoverToken,
} from "@/lib/utils/handover-token";
import { executeOrderCompletionAndPassportTransfer } from "@/lib/utils/passport-transfer";
import { processItemChainQueue } from "@/lib/blockchain/relayer";
import { SNOWTRACE_BASE_URL } from "@/lib/blockchain/abi";
import { getPublicReviewCountsByUserIds } from "@/lib/utils/reputation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const DEFAULT_THUMBNAIL =
  "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400";

function getTokenErrorResponse(
  reason: "invalid" | "expired" | "order_mismatch" | "seller_mismatch"
) {
  if (reason === "expired") {
    return NextResponse.json(
      {
        error:
          "Mã QR giao nhận đã hết hạn (sau 15 phút). Nhờ người bán mở lại mã QR mới để tiếp tục.",
        code: "TOKEN_EXPIRED",
      },
      { status: 410 }
    );
  }

  return NextResponse.json(
    {
      error: "Mã QR giao nhận không hợp lệ hoặc không khớp với đơn hàng này.",
      code: "TOKEN_INVALID",
    },
    { status: 400 }
  );
}

/**
 * GET /api/orders/[id]/handover
 * - Không truyền `?token`: Người bán tạo link + mã QR giao nhận 15 phút.
 * - Có `?token`: Người mua quét QR để xem màn hình xác nhận ngắn gọn (5 thông tin cốt lõi).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để sử dụng mã QR giao nhận." },
        { status: 401 }
      );
    }

    const token = new URL(req.url).searchParams.get("token")?.trim() || null;

    // Nhánh A: Người bán mở mã QR giao nhận
    if (!token) {
      const order = await prisma.order.findUnique({
        where: { id },
        select: {
          id: true,
          sellerId: true,
          buyerId: true,
          status: true,
          proposedPrice: true,
          listing: {
            select: {
              title: true,
              isFree: true,
              item: {
                select: {
                  passportStatus: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Không tìm thấy đơn hẹn." },
          { status: 404 }
        );
      }

      if (order.sellerId !== user.id) {
        return NextResponse.json(
          {
            error:
              "Chỉ người bán của đơn hẹn này mới có quyền mở mã QR giao nhận.",
          },
          { status: 403 }
        );
      }

      if (!["ACCEPTED", "WAITING_CONFIRMATION"].includes(order.status)) {
        return NextResponse.json(
          {
            error:
              "Chỉ có thể mở mã QR giao nhận khi đơn hẹn đang ở trạng thái Giữ chỗ hoặc Chờ xác nhận.",
          },
          { status: 400 }
        );
      }

      if (order.listing.item?.passportStatus === "FLAGGED") {
        return NextResponse.json(
          {
            error:
              "Món đồ đang có cảnh báo vi phạm trên Passport, không thể mở mã QR giao nhận.",
          },
          { status: 400 }
        );
      }

      const { token: handoverToken, expiresAt } = createHandoverToken(
        order.id,
        order.sellerId
      );
      const origin = resolveRequestOrigin(req);
      const handoverPath = `/orders/${order.id}/handover?token=${encodeURIComponent(handoverToken)}`;
      const handoverUrl = `${origin}${handoverPath}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(handoverUrl)}`;

      return NextResponse.json(
        {
          handoverUrl,
          handoverPath,
          qrUrl,
          expiresAt,
          ttlSeconds: HANDOVER_TOKEN_TTL_SECONDS,
          orderStatus: order.status,
          listingTitle: order.listing.title,
          proposedPrice: order.proposedPrice,
          isFree: order.listing.isFree,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Nhánh B: Người mua (hoặc người bán xem thử) mở link từ QR ?token=...
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        proposedPrice: true,
        meetPlace: true,
        meetTime: true,
        buyerConfirmedAt: true,
        sellerConfirmedAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            isFree: true,
            condition: true,
            images: {
              orderBy: { position: "asc" },
              take: 1,
              select: { url: true },
            },
            school: {
              select: { shortName: true, name: true },
            },
            item: {
              select: {
                id: true,
                passportEnabled: true,
                passportId: true,
                passportStatus: true,
                flagReason: true,
                owners: {
                  select: { seq: true },
                },
              },
            },
          },
        },
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
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hẹn." },
        { status: 404 }
      );
    }

    if (user.id !== order.buyerId && user.id !== order.sellerId) {
      return NextResponse.json(
        {
          error:
            "Mã QR giao nhận này thuộc một giao dịch riêng giữa người mua và người bán.",
        },
        { status: 403 }
      );
    }

    const verified = verifyHandoverToken(token, order.id, order.sellerId);
    if (!verified.valid) {
      return getTokenErrorResponse(verified.reason);
    }

    const reviewCounts = await getPublicReviewCountsByUserIds([order.sellerId]);
    const item = order.listing.item;
    const isFlagged = item?.passportStatus === "FLAGGED";

    return NextResponse.json(
      {
        role: user.id === order.buyerId ? "BUYER" : "SELLER",
        order: {
          id: order.id,
          status: order.status,
          proposedPrice: order.proposedPrice,
          meetPlace: order.meetPlace,
          meetTime: order.meetTime.toISOString(),
          buyerConfirmedAt: order.buyerConfirmedAt
            ? order.buyerConfirmedAt.toISOString()
            : null,
          sellerConfirmedAt: order.sellerConfirmedAt
            ? order.sellerConfirmedAt.toISOString()
            : null,
        },
        product: {
          listingId: order.listing.id,
          title: order.listing.title,
          isFree: order.listing.isFree || order.proposedPrice === 0,
          condition: order.listing.condition,
          thumbnail: order.listing.images[0]?.url || DEFAULT_THUMBNAIL,
          schoolShortName:
            order.listing.school?.shortName ||
            order.listing.school?.name ||
            null,
        },
        seller: {
          ...order.seller,
          reviewCount: reviewCounts.get(order.sellerId) ?? 0,
        },
        passport: {
          enabled: Boolean(item?.passportEnabled),
          passportId: item?.passportId || null,
          status: item?.passportStatus || "ACTIVE",
          isFlagged,
          flagReason: item?.flagReason || null,
          ownersCount: Math.max(item?.owners?.length || 1, 1),
        },
        tokenExpiresAt: new Date(verified.payload.exp * 1000).toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Lỗi GET /api/orders/[id]/handover:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi kiểm tra mã QR giao nhận." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/handover
 * Người mua quét QR và bấm "Xác nhận đã nhận hàng" → hoàn tất giao dịch & chuyển giao Passport 1 chạm.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xác nhận nhận hàng." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const token =
      body && typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json(
        { error: "Thiếu mã xác thực từ QR giao nhận." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hẹn." },
        { status: 404 }
      );
    }

    if (order.buyerId !== user.id) {
      return NextResponse.json(
        {
          error:
            "Chỉ người mua của đơn hẹn này mới có quyền xác nhận đã nhận hàng.",
        },
        { status: 403 }
      );
    }

    const verified = verifyHandoverToken(token, order.id, order.sellerId);
    if (!verified.valid) {
      return getTokenErrorResponse(verified.reason);
    }

    if (order.listing.item?.passportStatus === "FLAGGED") {
      return NextResponse.json(
        {
          error:
            "Món đồ đang có cảnh báo vi phạm trên Passport, không thể xác nhận nhận hàng.",
        },
        { status: 400 }
      );
    }

    if (["COMPLETED", "AUTO_COMPLETED"].includes(order.status)) {
      return NextResponse.json({
        alreadyCompleted: true,
        status: order.status,
        passportId: order.listing.item?.passportId ?? null,
        message: "Giao dịch này đã hoàn tất trước đó.",
      });
    }

    if (!["ACCEPTED", "WAITING_CONFIRMATION"].includes(order.status)) {
      return NextResponse.json(
        { error: "Đơn hẹn hiện không ở trạng thái chờ giao nhận." },
        { status: 400 }
      );
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      return executeOrderCompletionAndPassportTransfer(
        tx,
        order.id,
        "COMPLETED",
        {
          sellerConfirmedAt: order.sellerConfirmedAt ?? now,
          buyerConfirmedAt: now,
          confirmedFirstBy: order.confirmedFirstBy ?? "SELLER",
        }
      );
    });

    let latestTxHash: string | null = null;
    let snowtraceUrl: string | null = null;

    if (order.listing.itemId && result.passportId) {
      try {
        const syncResult = await processItemChainQueue(order.listing.itemId);
        latestTxHash = syncResult.latestTxHash;
        snowtraceUrl =
          syncResult.snowtraceUrl ||
          (latestTxHash ? `${SNOWTRACE_BASE_URL}/tx/${latestTxHash}` : null);
      } catch (chainErr) {
        console.warn(
          "⚠️ Lỗi đồng bộ chuyển giao Passport lên Fuji sau xác nhận QR:",
          chainErr
        );
      }
    }

    return NextResponse.json({
      status: "COMPLETED",
      transferredOwnerSeq: result.transferredOwnerSeq,
      passportId: result.passportId,
      txHash: latestTxHash,
      snowtraceUrl,
      message:
        result.transferredOwnerSeq !== null
          ? `Đã xác nhận nhận hàng thành công! Bạn đã tiếp nhận Digital Product Passport (Đời chủ #${result.transferredOwnerSeq}).`
          : "Đã xác nhận nhận hàng và hoàn tất giao dịch thành công!",
    });
  } catch (error) {
    console.error("Lỗi POST /api/orders/[id]/handover:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xác nhận nhận hàng." },
      { status: 500 }
    );
  }
}
