import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { checkProhibitedContent } from "@/lib/utils/prohibited-words";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const listing = await prisma.listing.findUnique({
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
                    id: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: { seq: "asc" },
            },
            events: {
              orderBy: { seq: "desc" },
            },
          },
        },
        images: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Không tìm thấy tin đăng sản phẩm." },
        { status: 404 }
      );
    }

    // Bảo mật SĐT Zalo (BR36): Nếu người bán bật hidePhone, ẩn SĐT đối với khách vãng lai
    const currentUser = await getSessionUser();
    const isOwner = currentUser?.id === listing.sellerId;
    const isAdmin = currentUser?.role === "ADMIN";

    const safeZaloPhone =
      listing.hidePhone && !isOwner && !isAdmin
        ? listing.zaloPhone.slice(0, 3) + "****" + listing.zaloPhone.slice(-3)
        : listing.zaloPhone;

    return NextResponse.json({
      listing: {
        ...listing,
        zaloPhone: safeZaloPhone,
        isOwner,
      },
    });
  } catch (error) {
    console.error("Lỗi GET /api/listings/[id]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải thông tin sản phẩm." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thực hiện thao tác này." },
        { status: 401 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        item: true,
        orders: {
          where: {
            status: { in: ["PENDING", "ACCEPTED", "WAITING_CONFIRMATION"] },
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Không tìm thấy tin đăng cần cập nhật." },
        { status: 404 }
      );
    }

    // Kiểm tra quyền sở hữu (BR03)
    if (listing.sellerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn không có quyền chỉnh sửa tin đăng này (BR03)." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    // 1. ACTION: CẬP NHẬT THÔNG TIN (update_info)
    if (action === "update_info") {
      // Tuân thủ BR18: Khóa chỉnh sửa nếu đang giữ chỗ RESERVED
      if (listing.status === "RESERVED") {
        return NextResponse.json(
          {
            error:
              "Không thể chỉnh sửa thông tin khi tin đang ở trạng thái giữ chỗ (RESERVED) cho người mua (BR18).",
          },
          { status: 400 }
        );
      }

      const {
        title,
        price,
        isFree,
        condition,
        description,
        schoolId,
        zaloPhone,
        hidePhone,
      } = body;

      if (title) {
        const prohibited = checkProhibitedContent(`${title} ${description || ""}`);
        if (prohibited) {
          return NextResponse.json(
            {
              error: `Nội dung chứa từ khóa bị cấm: "${prohibited}" (BR17).`,
            },
            { status: 400 }
          );
        }
      }

      const numericPrice = isFree ? 0 : price !== undefined ? parseInt(String(price)) : listing.price;
      const finalIsFree = isFree !== undefined ? Boolean(isFree) : listing.isFree;

      // Tuân thủ BR22: Nếu thay đổi giá hoặc tình trạng khi có đơn PENDING, thông báo người mua
      const priceChanged = numericPrice !== listing.price;
      const conditionChanged = condition && condition !== listing.condition;

      await prisma.$transaction(async (tx) => {
        await tx.listing.update({
          where: { id },
          data: {
            title: title ? title.trim() : undefined,
            price: numericPrice,
            isFree: finalIsFree,
            condition: condition || undefined,
            description: description ? description.trim() : undefined,
            schoolId: schoolId || undefined,
            zaloPhone: zaloPhone ? zaloPhone.trim() : undefined,
            hidePhone: hidePhone !== undefined ? Boolean(hidePhone) : undefined,
          },
        });

        // Bắn thông báo cho người mua có đơn PENDING theo BR22
        if ((priceChanged || conditionChanged) && listing.orders.length > 0) {
          const pendingOrders = listing.orders.filter((o) => o.status === "PENDING");
          for (const order of pendingOrders) {
            await tx.notification.create({
              data: {
                userId: order.buyerId,
                type: "LISTING_PRICE_CHANGED",
                title: "Cập nhật món đồ bạn đang đặt hẹn",
                message: `Người bán đã thay đổi ${priceChanged ? "giá" : "tình trạng"} món đồ "${listing.title}". Vui lòng kiểm tra lại đơn hẹn.`,
                payload: JSON.stringify({ listingId: listing.id, orderId: order.id }),
              },
            });
          }
        }
      });

      return NextResponse.json({ message: "Cập nhật thông tin món đồ thành công!" });
    }

    // 2. ACTION: TẠM ẨN / HIỆN LẠI (toggle_visibility)
    if (action === "toggle_visibility") {
      if (listing.status === "RESERVED") {
        return NextResponse.json(
          {
            error: "Không thể tạm ẩn món đồ đang được giữ chỗ (RESERVED) theo quy định BR18.",
          },
          { status: 400 }
        );
      }

      if (listing.item?.passportStatus === "FLAGGED") {
        return NextResponse.json(
          {
            error: "Món đồ này đang bị Admin khóa do vi phạm hoặc nghi vấn tranh chấp (BR39).",
          },
          { status: 400 }
        );
      }

      const nextStatus = listing.status === "AVAILABLE" ? "HIDDEN" : "AVAILABLE";

      await prisma.listing.update({
        where: { id },
        data: { status: nextStatus },
      });

      return NextResponse.json({
        message:
          nextStatus === "HIDDEN"
            ? "Đã tạm ẩn tin đăng. Người mua sẽ không thấy tin trên sàn."
            : "Đã mở hiển thị tin đăng trở lại trên sàn.",
        status: nextStatus,
      });
    }

    // 3. ACTION: ĐÁNH DẤU ĐÃ BÁN (mark_sold)
    if (action === "mark_sold") {
      await prisma.listing.update({
        where: { id },
        data: { status: "SOLD" },
      });

      return NextResponse.json({
        message: "Đã đánh dấu món đồ là Đã Bán (BR10).",
        status: "SOLD",
      });
    }

    // 4. ACTION: GIA HẠN 30 NGÀY (renew)
    if (action === "renew") {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 30);

      await prisma.listing.update({
        where: { id },
        data: {
          expiresAt: newExpiresAt,
          status: "AVAILABLE",
        },
      });

      return NextResponse.json({
        message: "Đã gia hạn tin đăng thêm 30 ngày (BR15)!",
        expiresAt: newExpiresAt.toISOString(),
        status: "AVAILABLE",
      });
    }

    return NextResponse.json(
      { error: "Hành động yêu cầu không hợp lệ." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Lỗi PATCH /api/listings/[id]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật tin đăng." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thực hiện thao tác này." },
        { status: 401 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: { in: ["ACCEPTED", "WAITING_CONFIRMATION"] },
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Không tìm thấy tin đăng cần xóa." },
        { status: 404 }
      );
    }

    // Kiểm tra quyền sở hữu (BR03)
    if (listing.sellerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa tin đăng này (BR03)." },
        { status: 403 }
      );
    }

    // Tuân thủ nghiêm ngặt BR18: Khóa thao tác xóa khi đang giữ chỗ
    if (listing.status === "RESERVED" || listing.orders.length > 0) {
      return NextResponse.json(
        {
          error:
            "Không thể xóa sản phẩm đang được giữ chỗ (RESERVED) cho người mua (BR18). Bạn chỉ có thể xóa khi lịch hẹn đã được hủy hoặc hoàn tất.",
        },
        { status: 400 }
      );
    }

    // Xóa tin đăng (cascade listing images)
    await prisma.listing.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Đã xóa tin đăng thành công.",
    });
  } catch (error) {
    console.error("Lỗi DELETE /api/listings/[id]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa tin đăng." },
      { status: 500 }
    );
  }
}

