import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { reconcileExpiredOrders } from "@/lib/utils/order-timeouts";
import { executeOrderCompletionAndPassportTransfer } from "@/lib/utils/passport-transfer";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xem thông tin đơn hẹn." },
        { status: 401 }
      );
    }

    // Dọn dẹp timeout (bao gồm tự động hoàn tất đơn quá 48h theo BR13)
    await reconcileExpiredOrders();

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            images: { orderBy: { position: "asc" } },
            category: true,
            school: true,
            item: {
              include: {
                owners: {
                  orderBy: { seq: "asc" },
                  include: {
                    user: {
                      select: {
                        id: true,
                        displayName: true,
                      },
                    },
                  },
                },
                events: {
                  orderBy: { seq: "desc" },
                },
              },
            },
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
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hẹn." },
        { status: 404 }
      );
    }

    const isParticipant =
      order.buyerId === user.id ||
      order.sellerId === user.id ||
      user.role === "ADMIN";

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem đơn hẹn này." },
        { status: 403 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Lỗi GET /api/orders/[id]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải đơn hẹn." },
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
        { error: "Vui lòng đăng nhập để thực hiện thao tác." },
        { status: 401 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        listing: true,
        buyer: { select: { displayName: true } },
        seller: { select: { displayName: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hẹn." },
        { status: 404 }
      );
    }

    const isBuyer = order.buyerId === user.id;
    const isSeller = order.sellerId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json(
        { error: "Bạn không có quyền thao tác trên đơn hẹn này." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    // 1. ACTION: CHẤP NHẬN GIỮ CHỖ (accept) - Chỉ người bán
    if (action === "accept") {
      if (!isSeller && !isAdmin) {
        return NextResponse.json(
          { error: "Chỉ người bán mới có quyền chấp nhận đơn hẹn này (BR06)." },
          { status: 403 }
        );
      }

      if (order.status !== "PENDING") {
        return NextResponse.json(
          { error: `Đơn hẹn không ở trạng thái chờ duyệt (Hiện tại: ${order.status}).` },
          { status: 400 }
        );
      }

      if (order.listing.status !== "AVAILABLE") {
        return NextResponse.json(
          {
            error:
              "Món đồ hiện không ở trạng thái sẵn sàng (có thể đã có đơn khác được giữ chỗ trước đó theo BR11).",
          },
          { status: 400 }
        );
      }

      // Thực thi transaction chấp nhận và từ chối các đơn PENDING khác (BR11)
      await prisma.$transaction(async (tx) => {
        // Cập nhật đơn này thành ACCEPTED
        await tx.order.update({
          where: { id },
          data: { status: "ACCEPTED" },
        });

        // Chuyển Listing sang RESERVED
        await tx.listing.update({
          where: { id: order.listingId },
          data: { status: "RESERVED" },
        });

        // Tự động REJECTED các đơn PENDING khác cùng listing (BR11)
        const otherPendingOrders = await tx.order.findMany({
          where: {
            listingId: order.listingId,
            id: { not: order.id },
            status: "PENDING",
          },
        });

        if (otherPendingOrders.length > 0) {
          await tx.order.updateMany({
            where: {
              listingId: order.listingId,
              id: { not: order.id },
              status: "PENDING",
            },
            data: { status: "REJECTED" },
          });

          // Thông báo cho các người mua khác
          for (const other of otherPendingOrders) {
            await tx.notification.create({
              data: {
                userId: other.buyerId,
                type: "ORDER_AUTO_REJECTED",
                title: "Món đồ đã có người giữ chỗ",
                message: `Người bán đã đồng ý giữ chỗ món đồ "${order.listing.title}" cho một sinh viên khác. Yêu cầu của bạn đã bị từ chối tự động (BR11).`,
                payload: JSON.stringify({ listingId: order.listingId, orderId: other.id }),
              },
            });
          }
        }

        // Thông báo chúc mừng người mua được chọn
        await tx.notification.create({
          data: {
            userId: order.buyerId,
            type: "ORDER_ACCEPTED",
            title: "Người bán đã đồng ý giữ chỗ cho bạn!",
            message: `Người bán đã chấp nhận lịch hẹn xem món đồ "${order.listing.title}". Hãy gặp mặt tại ${order.meetPlace} đúng giờ hẹn.`,
            payload: JSON.stringify({ listingId: order.listingId, orderId: order.id }),
          },
        });
      });

      return NextResponse.json({
        message:
          "Đã chấp nhận lịch hẹn! Món đồ đã chuyển sang trạng thái Giữ chỗ (RESERVED) độc quyền theo quy định BR11.",
        status: "ACCEPTED",
      });
    }

    // 2. ACTION: TỪ CHỐI ĐƠN HẸN (reject) - Chỉ người bán (BR06)
    if (action === "reject") {
      if (!isSeller && !isAdmin) {
        return NextResponse.json(
          { error: "Chỉ người bán mới có quyền từ chối đơn hẹn này (BR06)." },
          { status: 403 }
        );
      }

      if (order.status !== "PENDING") {
        return NextResponse.json(
          { error: "Chỉ có thể từ chối đơn hẹn đang ở trạng thái chờ duyệt (PENDING)." },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { status: "REJECTED" },
        });

        await tx.notification.create({
          data: {
            userId: order.buyerId,
            type: "ORDER_REJECTED",
            title: "Yêu cầu hẹn xem hàng đã bị từ chối",
            message: `Người bán đã từ chối yêu cầu hẹn xem món đồ "${order.listing.title}". Bạn có thể tìm món đồ khác phù hợp hơn.`,
            payload: JSON.stringify({ listingId: order.listingId, orderId: order.id }),
          },
        });
      });

      return NextResponse.json({
        message: "Đã từ chối đơn hẹn.",
        status: "REJECTED",
      });
    }

    // 3. ACTION: HỦY ĐƠN HẸN (cancel) - Cả 2 bên (BR21)
    if (action === "cancel") {
      if (order.status === "WAITING_CONFIRMATION") {
        return NextResponse.json(
          {
            error:
              "Đơn hẹn đã có một bên xác nhận bàn giao. Nếu chưa nhận được hàng, người mua vui lòng bấm 'Tôi chưa nhận hàng' để khiếu nại (BR13).",
          },
          { status: 400 }
        );
      }

      if (!["PENDING", "ACCEPTED"].includes(order.status)) {
        return NextResponse.json(
          { error: "Chỉ có thể hủy đơn hẹn khi đang chờ duyệt hoặc đang giữ chỗ (BR21)." },
          { status: 400 }
        );
      }

      const otherPartyId = isBuyer ? order.sellerId : order.buyerId;
      const cancellerRole = isBuyer ? "Người mua" : "Người bán";

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { status: "CANCELLED" },
        });

        // Nếu đơn đang giữ chỗ ACCEPTED, nhả trạng thái Listing về AVAILABLE (BR21)
        if (order.status === "ACCEPTED") {
          await tx.listing.update({
            where: { id: order.listingId },
            data: { status: "AVAILABLE" },
          });
        }

        // Bắn thông báo cho bên còn lại
        await tx.notification.create({
          data: {
            userId: otherPartyId,
            type: "ORDER_CANCELLED",
            title: "Lịch hẹn đã bị hủy",
            message: `${cancellerRole} đã hủy lịch hẹn xem món đồ "${order.listing.title}". Món đồ đã được mở bán trở lại trên sàn (BR21).`,
            payload: JSON.stringify({ listingId: order.listingId, orderId: order.id }),
          },
        });
      });

      return NextResponse.json({
        message: "Đã hủy lịch hẹn thành công. Món đồ đã được mở bán trở lại trên sàn (BR21).",
        status: "CANCELLED",
      });
    }

    // 4. ACTION: XÁC NHẬN BÀN GIAO / NHẬN HÀNG (confirm_handover) - BR07, BR13, BR26
    if (action === "confirm_handover") {
      if (!isBuyer && !isSeller) {
        return NextResponse.json(
          { error: "Chỉ người mua hoặc người bán tham gia đơn mới có thể xác nhận bàn giao." },
          { status: 403 }
        );
      }

      if (order.status === "DISPUTED") {
        return NextResponse.json(
          { error: "Đơn hàng đang có khiếu nại chờ Admin xử lý (DISPUTED), không thể tự động hoàn tất." },
          { status: 400 }
        );
      }

      if (!["ACCEPTED", "WAITING_CONFIRMATION"].includes(order.status)) {
        return NextResponse.json(
          { error: `Không thể xác nhận bàn giao ở trạng thái hiện tại (${order.status}).` },
          { status: 400 }
        );
      }

      // Kiểm tra xem người dùng hiện tại đã bấm xác nhận trước đó chưa
      if ((isBuyer && order.buyerConfirmedAt) || (isSeller && order.sellerConfirmedAt)) {
        return NextResponse.json(
          { error: "Bạn đã xác nhận bàn giao trước đó rồi. Hệ thống đang chờ đối tác xác nhận đối ứng." },
          { status: 400 }
        );
      }

      const now = new Date();
      const otherConfirmed = isBuyer
        ? Boolean(order.sellerConfirmedAt)
        : Boolean(order.buyerConfirmedAt);

      // Trường hợp 1: Là bên đầu tiên bấm xác nhận -> WAITING_CONFIRMATION (cửa sổ 48h theo BR13)
      if (!otherConfirmed) {
        const expiresAt48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const otherPartyId = isBuyer ? order.sellerId : order.buyerId;

        const updatedOrder = await prisma.$transaction(async (tx) => {
          const updated = await tx.order.update({
            where: { id },
            data: {
              status: "WAITING_CONFIRMATION",
              confirmedFirstBy: isBuyer ? "BUYER" : "SELLER",
              buyerConfirmedAt: isBuyer ? now : undefined,
              sellerConfirmedAt: isSeller ? now : undefined,
              expiresAt: expiresAt48h,
            },
          });

          await tx.notification.create({
            data: {
              userId: otherPartyId,
              type: "HANDOVER_WAITING",
              title: isSeller
                ? "Người bán đã xác nhận bàn giao hàng!"
                : "Người mua đã xác nhận nhận được hàng!",
              message: isSeller
                ? `Người bán vừa xác nhận đã bàn giao món đồ "${order.listing.title}". Vui lòng bấm "Đã nhận đồ" trong 48h hoặc bấm "Tôi chưa nhận hàng" nếu có sự cố (BR13).`
                : `Người mua vừa xác nhận đã nhận món đồ "${order.listing.title}". Vui lòng bấm "Đã bàn giao" trong 48h để hoàn tất đơn hàng và chuyển giao Passport.`,
              payload: JSON.stringify({ listingId: order.listingId, orderId: order.id }),
            },
          });

          return updated;
        });

        return NextResponse.json({
          message:
            "Đã ghi nhận xác nhận của bạn! Hệ thống đang chờ đối tác xác nhận đối ứng trong vòng 48 giờ (BR13).",
          status: "WAITING_CONFIRMATION",
          order: updatedOrder,
        });
      }

      // Trường hợp 2: Đối tác đã xác nhận trước đó -> Cả hai xác nhận -> COMPLETED + Chuyển giao Passport (BR07, BR26)
      const result = await prisma.$transaction(async (tx) => {
        return executeOrderCompletionAndPassportTransfer(
          tx,
          order.id,
          "COMPLETED",
          isBuyer ? { buyerConfirmedAt: now } : { sellerConfirmedAt: now }
        );
      });

      return NextResponse.json({
        message:
          result.transferredOwnerSeq !== null
            ? `Giao dịch hoàn tất thành công! Món đồ đã được chuyển giao Digital Product Passport (Đời chủ #${result.transferredOwnerSeq}) sang người mua.`
            : "Giao dịch hoàn tất thành công! Hai bên có 48 giờ để gửi đánh giá uy tín cho nhau (BR07).",
        status: "COMPLETED",
        transferredOwnerSeq: result.transferredOwnerSeq,
        passportId: result.passportId,
      });
    }

    // 5. ACTION: KHIẾU NẠI CHƯA NHẬN HÀNG (dispute) - Chặn Auto-Complete (BR13)
    if (action === "dispute") {
      if (!isBuyer && !isAdmin) {
        return NextResponse.json(
          { error: "Chỉ người mua mới có quyền gửi khiếu nại 'Tôi chưa nhận hàng' (BR13)." },
          { status: 403 }
        );
      }

      if (!["ACCEPTED", "WAITING_CONFIRMATION"].includes(order.status)) {
        return NextResponse.json(
          { error: "Chỉ có thể gửi khiếu nại khi đơn đang giữ chỗ hoặc đang chờ xác nhận 48h." },
          { status: 400 }
        );
      }

      const reason = typeof body.disputeReason === "string" ? body.disputeReason.trim() : "";
      if (reason.length < 10) {
        return NextResponse.json(
          { error: "Vui lòng mô tả rõ lý do khiếu nại (ít nhất 10 ký tự) để Admin xem xét." },
          { status: 400 }
        );
      }

      const now = new Date();
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: {
            status: "DISPUTED",
            disputeReason: reason,
            disputedAt: now,
          },
        });

        await tx.notification.create({
          data: {
            userId: order.sellerId,
            type: "DISPUTE_OPENED",
            title: "Đơn hàng có khiếu nại chưa nhận hàng (BR13)",
            message: `Người mua đã gửi khiếu nại chưa nhận được món đồ "${order.listing.title}" (Lý do: ${reason}). Hệ thống đã chặn tự động hoàn tất và chuyển Ban Quản Trị xử lý trong 72h.`,
            payload: JSON.stringify({ listingId: order.listingId, orderId: order.id }),
          },
        });
      });

      return NextResponse.json({
        message:
          "Đã ghi nhận khiếu nại! Hệ thống đã chặn tự động hoàn tất và chuyển đơn cho Ban Quản Trị phân xử trong vòng 72 giờ (BR13).",
        status: "DISPUTED",
      });
    }

    return NextResponse.json(
      { error: "Hành động yêu cầu không hợp lệ." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Lỗi PATCH /api/orders/[id]:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật trạng thái đơn hẹn." },
      { status: 500 }
    );
  }
}

