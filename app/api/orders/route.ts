import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { reconcileExpiredOrders } from "@/lib/utils/order-timeouts";

export async function GET(req: NextRequest) {
  try {
    // Tự động kiểm tra và dọn dẹp các đơn/lời mời hết hạn (BR12, BR37, BR38)
    reconcileExpiredOrders().catch((err) => console.warn("Lỗi reconcile:", err));

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xem danh sách đơn hẹn." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // "buyer" | "seller" | "all"

    const where: Record<string, unknown> = {};
    if (role === "buyer") {
      where.buyerId = user.id;
    } else if (role === "seller") {
      where.sellerId = user.id;
    } else {
      where.OR = [{ buyerId: user.id }, { sellerId: user.id }];
    }

    try {
      const orders = await prisma.order.findMany({
        where,
        include: {
          listing: {
            include: {
              images: { orderBy: { position: "asc" } },
              category: true,
              school: true,
              item: true,
            },
          },
          buyer: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              isStudentVerified: true,
              reputationScore: true,
              dorm: true,
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
          reviews: {
            select: {
              id: true,
              reviewerId: true,
              revieweeId: true,
              rating: true,
              comment: true,
              tags: true,
              submittedAt: true,
              visibleAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const sanitizedOrders = orders.map((order) => ({
        ...order,
        reviews: (order.reviews || []).map((rev) => {
          const isPublic = Boolean(rev.visibleAt);
          const isAuthor = rev.reviewerId === user.id;
          if (isPublic || isAuthor) {
            let parsedTags: string[] = [];
            try {
              parsedTags = rev.tags ? JSON.parse(rev.tags) : [];
            } catch {
              parsedTags = [];
            }
            return {
              ...rev,
              tags: parsedTags,
              isBlindHidden: false,
            };
          }
          return {
            id: rev.id,
            reviewerId: rev.reviewerId,
            revieweeId: rev.revieweeId,
            rating: 0,
            comment: "",
            tags: [],
            submittedAt: rev.submittedAt,
            visibleAt: null,
            isBlindHidden: true,
          };
        }),
      }));

      return NextResponse.json({ orders: sanitizedOrders, total: sanitizedOrders.length });
    } catch (dbError) {
      console.warn("⚠️ Lỗi Prisma trong GET /api/orders (dùng mock data):", dbError);

      // Dữ liệu mock mẫu cho demo
      const mockOrders = [
        {
          id: "demo-order-1",
          listingId: "demo-casio-580",
          buyerId: user.id,
          sellerId: "demo-user-nam",
          proposedPrice: 380000,
          meetPlace: "Cổng KTX Khu B - ĐHQG",
          meetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          message: "Mình rảnh tầm 10h sáng mai, bạn đem máy tính qua cổng giúp mình kiểm tra nhé.",
          status: "ACCEPTED",
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          listing: {
            id: "demo-casio-580",
            title: "Máy tính Casio fx-580VNX chính hãng Bitex (Đời chủ #2, nguyên tem)",
            price: 380000,
            isFree: false,
            condition: "Mới 98%",
            status: "RESERVED",
            school: { shortName: "KTX Khu B" },
            category: { name: "Đồ điện tử & Máy tính" },
            images: [{ url: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600" }],
          },
          buyer: {
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            isStudentVerified: user.isStudentVerified,
            reputationScore: user.reputationScore,
            dorm: user.dorm,
          },
          seller: {
            id: "demo-user-nam",
            displayName: "Nguyễn Hoàng Nam",
            avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            isStudentVerified: true,
            reputationScore: 4.95,
            dorm: "Tòa B4 - KTX Khu B",
          },
        },
      ];

      return NextResponse.json({ orders: mockOrders, total: mockOrders.length });
    }
  } catch (error) {
    console.error("Lỗi GET /api/orders:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách đơn hẹn." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra đăng nhập (BR01)
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để đặt lịch hẹn xem hàng (BR01)." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { listingId, proposedPrice, meetPlace, meetTime, message } = body;

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Thiếu thông tin mã tin đăng món đồ." },
        { status: 400 }
      );
    }

    if (!meetPlace || typeof meetPlace !== "string" || !meetPlace.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập địa điểm hẹn gặp mặt công cộng an toàn." },
        { status: 400 }
      );
    }

    if (!meetTime || isNaN(new Date(meetTime).getTime())) {
      return NextResponse.json(
        { error: "Thời gian hẹn gặp mặt không hợp lệ." },
        { status: 400 }
      );
    }

    const meetDateObj = new Date(meetTime);
    if (meetDateObj.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Thời gian hẹn gặp mặt phải ở thời điểm tương lai." },
        { status: 400 }
      );
    }

    // 2. Tìm thông tin tin đăng
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { item: true },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Không tìm thấy tin đăng món đồ." },
        { status: 404 }
      );
    }

    // 3. Quy tắc BR04: Người mua không được tạo yêu cầu cho sản phẩm của chính mình
    if (listing.sellerId === user.id) {
      return NextResponse.json(
        { error: "Bạn không thể đặt lịch hẹn cho món đồ do chính mình đăng bán (BR04)." },
        { status: 400 }
      );
    }

    // 4. Kiểm tra trạng thái món đồ: Chỉ AVAILABLE mới được tạo đơn mới
    if (listing.status !== "AVAILABLE") {
      return NextResponse.json(
        {
          error:
            listing.status === "RESERVED"
              ? "Món đồ đang ở trạng thái Giữ chỗ (RESERVED) cho người mua khác."
              : "Món đồ này hiện không còn mở bán.",
        },
        { status: 400 }
      );
    }

    // 5. Quy tắc BR39: Passport bị Flagged không được tạo đơn mới
    if (listing.item?.passportStatus === "FLAGGED") {
      return NextResponse.json(
        {
          error:
            "Món đồ này đang bị khóa do có nghi vấn tranh chấp hoặc vi phạm cộng đồng (BR39).",
        },
        { status: 400 }
      );
    }

    // 6. Kiểm tra xem người mua này đã có đơn PENDING nào trên listing này chưa
    const existingPending = await prisma.order.findFirst({
      where: {
        listingId,
        buyerId: user.id,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error:
            "Bạn đã gửi một yêu cầu đặt hẹn cho món đồ này rồi. Vui lòng chờ người bán phản hồi.",
        },
        { status: 400 }
      );
    }

    // 7. Tạo đơn hẹn mới: Gán expiresAt = now + 48 giờ (BR12)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const finalPrice = listing.isFree ? 0 : Math.max(0, parseInt(String(proposedPrice)) || 0);

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          listingId,
          buyerId: user.id,
          sellerId: listing.sellerId,
          proposedPrice: finalPrice,
          meetPlace: meetPlace.trim(),
          meetTime: meetDateObj,
          message: message ? message.trim() : null,
          status: "PENDING",
          expiresAt,
        },
      });

      // Tạo thông báo cho người bán
      await tx.notification.create({
        data: {
          userId: listing.sellerId,
          type: "NEW_ORDER_PENDING",
          title: "Có yêu cầu hẹn xem hàng mới",
          message: `${user.displayName} vừa gửi yêu cầu hẹn xem món đồ "${listing.title}" tại ${meetPlace.trim()}.`,
          payload: JSON.stringify({ listingId, orderId: createdOrder.id }),
        },
      });

      return createdOrder;
    });

    return NextResponse.json(
      {
        message: "Đặt lịch hẹn xem hàng thành công! Đơn hẹn có hiệu lực trong 48 giờ (BR12).",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lỗi POST /api/orders:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo yêu cầu đặt hẹn." },
      { status: 500 }
    );
  }
}

