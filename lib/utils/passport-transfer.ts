import crypto from "crypto";
import { Prisma } from "@prisma/client";

/**
 * Hoàn tất đơn hàng và tự động chuyển giao quyền sở hữu Digital Product Passport
 * Thực thi nguyên tử (atomic) bên trong Prisma Transaction theo quy tắc BR07, BR10, BR13, BR26, BR28, BR29, BR31, BR34.
 */
export async function executeOrderCompletionAndPassportTransfer(
  tx: Prisma.TransactionClient,
  orderId: string,
  completionStatus: "COMPLETED" | "AUTO_COMPLETED",
  extraUpdateData?: Prisma.OrderUpdateInput
) {
  const now = new Date();

  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      listing: {
        include: {
          item: {
            include: {
              owners: { orderBy: { seq: "desc" }, take: 1 },
              events: { orderBy: { seq: "desc" }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Không tìm thấy đơn hàng ${orderId}`);
  }

  // Idempotency guard: tránh chuyển giao trùng lặp nếu đơn đã hoàn tất
  if (["COMPLETED", "AUTO_COMPLETED"].includes(order.status)) {
    return {
      order,
      transferredOwnerSeq: null,
      passportId: order.listing.item?.passportId || null,
    };
  }

  // 1. Cập nhật trạng thái đơn hàng
  const updatedOrder = await tx.order.update({
    where: { id: orderId },
    data: {
      ...extraUpdateData,
      status: completionStatus,
    },
  });

  // 2. Chuyển tin đăng sang trạng thái Đã bán (SOLD - BR10)
  await tx.listing.update({
    where: { id: order.listingId },
    data: { status: "SOLD" },
  });

  // 3. Chuyển giao Digital Product Passport nếu món đồ có bật Passport (BR26)
  let transferredOwnerSeq: number | null = null;
  const item = order.listing.item;

  if (order.listing.itemId && item && item.passportEnabled) {
    const prevOwner = item.owners[0];
    const nextOwnerSeq = (prevOwner?.seq || 0) + 1;
    transferredOwnerSeq = nextOwnerSeq;

    // Sinh ownerHash ngẫu nhiên độc lập per (user, item) hỗ trợ Crypto-shredding (BR34)
    const newOwnerHash = "0x" + crypto.randomBytes(32).toString("hex");

    // Tạo bản ghi Đời chủ tiếp theo (BR29: mặc định showName = false ẩn danh)
    await tx.passportOwner.create({
      data: {
        itemId: item.id,
        seq: nextOwnerSeq,
        userId: order.buyerId,
        ownerHash: newOwnerHash,
        showName: false,
        since: now,
      },
    });

    // Cập nhật chủ sở hữu hiện tại của món đồ sang người mua
    await tx.item.update({
      where: { id: item.id },
      data: { currentOwnerId: order.buyerId },
    });

    // Ghi nhật ký sự kiện chuyển giao (BR31: phân biệt BOTH vs ONE_SIDE)
    const lastEvent = item.events[0];
    const nextEventSeq = (lastEvent?.seq || 0) + 1;

    await tx.passportEvent.create({
      data: {
        itemId: item.id,
        seq: nextEventSeq,
        eventType: "TRANSFERRED",
        fromOwnerHash: prevOwner?.ownerHash || null,
        toOwnerHash: newOwnerHash,
        orderId: order.id,
        transferKind: "SALE",
        confirmationLevel: completionStatus === "AUTO_COMPLETED" ? "ONE_SIDE" : "BOTH",
        occurredAt: now,
      },
    });

    // Xếp hàng giao dịch On-chain cho lát cắt Avalanche Fuji (Sprint 5 - BR28)
    const payloadHash =
      "0x" +
      crypto
        .createHash("sha256")
        .update(`${item.id}:${order.id}:${nextEventSeq}`)
        .digest("hex");

    await tx.chainTx.create({
      data: {
        itemId: item.id,
        kind: "TRANSFER",
        payloadHash,
        status: "QUEUED",
      },
    });
  }

  // 4. Thông báo cho cả Người mua và Người bán
  const completionLabel =
    completionStatus === "AUTO_COMPLETED"
      ? "tự động hoàn tất sau 48 giờ (BR13)"
      : "hoàn tất xác nhận hai bên (BR07)";

  const buyerPassportNote =
    transferredOwnerSeq !== null
      ? ` Món đồ đã được chuyển vào mục "Đồ của tôi" (/my-items) với tư cách Đời chủ #${transferredOwnerSeq}.`
      : "";

  await tx.notification.createMany({
    data: [
      {
        userId: order.buyerId,
        type: "ORDER_COMPLETED",
        title: "Giao dịch đã hoàn tất thành công!",
        message: `Đơn hàng "${order.listing.title}" đã ${completionLabel}.${buyerPassportNote} Bạn có 48 giờ để gửi đánh giá uy tín cho người bán.`,
        payload: JSON.stringify({
          listingId: order.listingId,
          orderId: order.id,
          itemId: item?.id || null,
        }),
      },
      {
        userId: order.sellerId,
        type: "ORDER_COMPLETED",
        title: "Giao dịch đã hoàn tất thành công!",
        message: `Đơn hàng "${order.listing.title}" đã ${completionLabel}. Tin đăng đã chuyển sang Đã bán (SOLD). Bạn có 48 giờ để gửi đánh giá cho người mua.`,
        payload: JSON.stringify({
          listingId: order.listingId,
          orderId: order.id,
        }),
      },
    ],
  });

  return {
    order: updatedOrder,
    transferredOwnerSeq,
    passportId: item?.passportId || null,
  };
}

