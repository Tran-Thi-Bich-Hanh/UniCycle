import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { reconcileExpiredOrders } from "@/lib/utils/order-timeouts";
import { executeOrderCompletionAndPassportTransfer } from "@/lib/utils/passport-transfer";
import { processItemChainQueue } from "@/lib/blockchain/relayer";

async function requireAdmin() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return {
      errorResponse: NextResponse.json(
        { error: "Vui lòng đăng nhập bằng tài khoản Quản trị viên." },
        { status: 401 }
      ),
      admin: null,
      actorAdminId: null,
    };
  }

  if (sessionUser.role !== "ADMIN") {
    return {
      errorResponse: NextResponse.json(
        { error: "Bạn không có quyền truy cập khu vực Quản trị (Admin only)." },
        { status: 403 }
      ),
      admin: null,
      actorAdminId: null,
    };
  }

  let actorAdminId = sessionUser.id;
  try {
    const dbAdmin = await prisma.user.findFirst({
      where: { OR: [{ id: sessionUser.id }, { email: sessionUser.email }] },
      select: { id: true },
    });
    if (dbAdmin) {
      actorAdminId = dbAdmin.id;
    }
  } catch {
    // Fallback to session ID
  }

  return { errorResponse: null, admin: sessionUser, actorAdminId };
}

/**
 * GET /api/admin
 * Tải toàn bộ dữ liệu bảng điều khiển Quản trị viên:
 * - Đơn DISPUTED (SLA 72h)
 * - Danh sách Passport để Flag/Unflag (BR32, BR39)
 * - Báo cáo vi phạm cộng đồng (BR17)
 * - Hồ sơ Thẻ Sinh Viên chờ duyệt (NĐ 13/2023/NĐ-CP)
 * - Giám sát hàng đợi ChainTx Avalanche Fuji (BR28)
 */
export async function GET() {
  try {
    const { errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    await reconcileExpiredOrders();

    const [
      totalUsers,
      activeListings,
      disputedOrders,
      passports,
      reports,
      pendingStudents,
      chainTxs,
      flaggedPassportsCount,
      pendingChainTxsCount,
    ] = await Promise.all([
      prisma.user.count({ where: { status: { not: "DELETED" } } }),
      prisma.listing.count({ where: { status: "AVAILABLE" } }),
      prisma.order.findMany({
        where: { status: "DISPUTED" },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              price: true,
              status: true,
              itemId: true,
              images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
              item: { select: { id: true, passportId: true, passportStatus: true } },
            },
          },
          buyer: {
            select: { id: true, displayName: true, email: true, reputationScore: true },
          },
          seller: {
            select: { id: true, displayName: true, email: true, reputationScore: true },
          },
        },
        orderBy: { disputedAt: "asc" },
      }),
      prisma.item.findMany({
        where: { passportEnabled: true },
        include: {
          category: { select: { name: true } },
          currentOwner: { select: { id: true, displayName: true, email: true } },
          listings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, title: true, status: true },
          },
          _count: { select: { owners: true } },
          chainTxs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true, kind: true, txHash: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      prisma.report.findMany({
        include: {
          reporter: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 30,
      }),
      prisma.user.findMany({
        where: {
          studentCardUrl: { not: null },
          isStudentVerified: false,
          status: "ACTIVE",
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          studentCardUrl: true,
          dorm: true,
          createdAt: true,
          school: { select: { id: true, name: true, shortName: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.chainTx.findMany({
        include: {
          item: { select: { id: true, passportId: true, passportStatus: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.item.count({ where: { passportStatus: "FLAGGED" } }),
      prisma.chainTx.count({
        where: { status: { in: ["QUEUED", "FAILED", "NEEDS_ATTENTION"] } },
      }),
    ]);

    const pendingReportsCount = reports.filter((r) => r.status === "PENDING").length;

    return NextResponse.json({
      serverNow: new Date().toISOString(),
      stats: {
        totalUsers,
        activeListings,
        disputedOrdersCount: disputedOrders.length,
        pendingReportsCount,
        pendingStudentCardsCount: pendingStudents.length,
        flaggedPassportsCount,
        pendingChainTxsCount,
      },
      disputedOrders,
      passports,
      reports,
      pendingStudents,
      chainTxs,
    });
  } catch (error) {
    console.error("Lỗi GET /api/admin:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải dữ liệu bảng quản trị Admin." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin
 * Thực thi các nghiệp vụ kiểm duyệt & phân xử của Admin
 */
export async function POST(req: NextRequest) {
  try {
    const { errorResponse, actorAdminId } = await requireAdmin();
    if (errorResponse || !actorAdminId) return errorResponse!;

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const now = new Date();

    // ------------------------------------------------------------------
    // 1. PHÂN XỬ ĐƠN DISPUTED (SLA 72H - Mục 7.2 system-design.md)
    // ------------------------------------------------------------------
    if (action === "resolve_dispute") {
      const orderId = typeof body.orderId === "string" ? body.orderId : "";
      const conclusion = typeof body.conclusion === "string" ? body.conclusion : "";
      const resolutionNote =
        typeof body.resolutionNote === "string" ? body.resolutionNote.trim() : "";

      if (
        !orderId ||
        !["BUYER_RECEIVED", "NOT_DELIVERED", "INSUFFICIENT_EVIDENCE"].includes(conclusion)
      ) {
        return NextResponse.json(
          { error: "Thiếu mã đơn hàng hoặc kết luận phân xử không hợp lệ." },
          { status: 400 }
        );
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          listing: {
            include: { item: true },
          },
        },
      });

      if (!order) {
        return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
      }

      if (order.status !== "DISPUTED") {
        return NextResponse.json(
          { error: `Đơn hàng không ở trạng thái tranh chấp DISPUTED (Hiện tại: ${order.status}).` },
          { status: 400 }
        );
      }

      if (conclusion === "BUYER_RECEIVED") {
        const finalNote =
          resolutionNote ||
          "Admin kết luận: Người mua đã nhận hàng (hoàn tất đơn & chuyển giao Passport).";

        const result = await prisma.$transaction(async (tx) => {
          return executeOrderCompletionAndPassportTransfer(tx, order.id, "COMPLETED", {
            resolvedBy: actorAdminId,
            resolvedAt: now,
            resolutionNote: finalNote,
            buyerConfirmedAt: order.buyerConfirmedAt || now,
            sellerConfirmedAt: order.sellerConfirmedAt || now,
          });
        });

        // Bổ sung thông báo kết luận phân xử
        await prisma.notification.createMany({
          data: [
            {
              userId: order.buyerId,
              type: "DISPUTE_RESOLVED",
              title: "Admin đã phân xử khiếu nại đơn hàng",
              message: `Kết luận cho đơn "${order.listing.title}": ${finalNote}`,
              payload: JSON.stringify({ orderId: order.id, conclusion }),
            },
            {
              userId: order.sellerId,
              type: "DISPUTE_RESOLVED",
              title: "Admin đã phân xử khiếu nại đơn hàng",
              message: `Kết luận cho đơn "${order.listing.title}": ${finalNote}`,
              payload: JSON.stringify({ orderId: order.id, conclusion }),
            },
          ],
        });

        // Đồng bộ Relayer lên Fuji nếu có Passport
        if (order.listing.itemId && result.passportId) {
          await processItemChainQueue(order.listing.itemId).catch((err) =>
            console.warn("⚠️ Relayer bất đồng bộ gặp sự cố sau resolve_dispute:", err)
          );
        }

        return NextResponse.json({
          success: true,
          message:
            "Đã phân xử: Người mua đã nhận hàng -> Đơn COMPLETED, Tin SOLD và đã chuyển giao Passport!",
        });
      }

      // Kết luận NOT_DELIVERED hoặc INSUFFICIENT_EVIDENCE -> CANCELLED & nhả Listing về AVAILABLE
      const defaultNote =
        conclusion === "NOT_DELIVERED"
          ? "Admin kết luận: Chưa giao hàng hoặc giao không đúng mô tả."
          : "Admin kết luận: Không đủ căn cứ xác minh bàn giao, hủy đơn và mở lại tin đăng.";
      const finalNote = resolutionNote || defaultNote;

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            resolvedBy: actorAdminId,
            resolvedAt: now,
            resolutionNote: finalNote,
          },
        });

        if (
          order.listing.status === "RESERVED" &&
          order.listing.item?.passportStatus !== "FLAGGED"
        ) {
          await tx.listing.update({
            where: { id: order.listingId },
            data: { status: "AVAILABLE" },
          });
        }

        await tx.notification.createMany({
          data: [
            {
              userId: order.buyerId,
              type: "DISPUTE_RESOLVED",
              title: "Admin đã phân xử khiếu nại đơn hàng",
              message: `Kết luận cho đơn "${order.listing.title}": ${finalNote}`,
              payload: JSON.stringify({ orderId: order.id, conclusion }),
            },
            {
              userId: order.sellerId,
              type: "DISPUTE_RESOLVED",
              title: "Admin đã phân xử khiếu nại đơn hàng",
              message: `Kết luận cho đơn "${order.listing.title}": ${finalNote}`,
              payload: JSON.stringify({ orderId: order.id, conclusion }),
            },
          ],
        });
      });

      return NextResponse.json({
        success: true,
        message: "Đã phân xử đơn DISPUTED: Đơn chuyển CANCELLED và nhả trạng thái mở bán.",
      });
    }

    // ------------------------------------------------------------------
    // 2. GẮN CỜ PASSPORT (FLAG - Thực thi trọn vẹn BR32 & BR39)
    // ------------------------------------------------------------------
    if (action === "flag_passport") {
      const itemId = typeof body.itemId === "string" ? body.itemId : "";
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";

      if (!itemId || reason.length < 5) {
        return NextResponse.json(
          { error: "Vui lòng chọn Passport và nhập lý do gắn cờ (ít nhất 5 ký tự)." },
          { status: 400 }
        );
      }

      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          owners: { orderBy: { seq: "desc" }, take: 1 },
          events: { orderBy: { seq: "desc" }, take: 1 },
          listings: { select: { id: true, title: true, status: true } },
        },
      });

      if (!item) {
        return NextResponse.json({ error: "Không tìm thấy Passport món đồ." }, { status: 404 });
      }

      if (item.passportStatus === "FLAGGED") {
        return NextResponse.json(
          { error: "Passport này hiện đang ở trạng thái FLAGGED rồi." },
          { status: 400 }
        );
      }

      const listingIds = item.listings.map((l) => l.id);

      await prisma.$transaction(async (tx) => {
        // (a) Gắn cờ Item
        await tx.item.update({
          where: { id: item.id },
          data: {
            passportStatus: "FLAGGED",
            flagReason: reason,
            flaggedAt: now,
          },
        });

        // (b) Tin đăng liên quan chuyển HIDDEN
        if (listingIds.length > 0) {
          await tx.listing.updateMany({
            where: {
              id: { in: listingIds },
              status: { in: ["AVAILABLE", "RESERVED"] },
            },
            data: { status: "HIDDEN" },
          });

          // (c1) Đơn PENDING tự động REJECTED
          const pendingOrders = await tx.order.findMany({
            where: { listingId: { in: listingIds }, status: "PENDING" },
            select: { id: true, buyerId: true },
          });

          if (pendingOrders.length > 0) {
            await tx.order.updateMany({
              where: { id: { in: pendingOrders.map((o) => o.id) } },
              data: { status: "REJECTED" },
            });

            await tx.notification.createMany({
              data: pendingOrders.map((o) => ({
                userId: o.buyerId,
                type: "PASSPORT_FLAGGED",
                title: "Yêu cầu hẹn đã bị từ chối tự động (BR39)",
                message: `Món đồ bạn đặt hẹn tạm bị khóa do Passport đang được kiểm tra tranh chấp/vi phạm (${reason}).`,
                payload: JSON.stringify({ itemId: item.id, orderId: o.id }),
              })),
            });
          }

          // (c2) Đơn ACCEPTED / WAITING_CONFIRMATION chuyển DISPUTED
          const activeOrders = await tx.order.findMany({
            where: {
              listingId: { in: listingIds },
              status: { in: ["ACCEPTED", "WAITING_CONFIRMATION"] },
            },
            select: { id: true, buyerId: true, sellerId: true },
          });

          if (activeOrders.length > 0) {
            await tx.order.updateMany({
              where: { id: { in: activeOrders.map((o) => o.id) } },
              data: {
                status: "DISPUTED",
                disputeReason: `Tạm dừng do Passport bị gắn cờ vi phạm (BR39): ${reason}`,
                disputedAt: now,
              },
            });

            for (const o of activeOrders) {
              await tx.notification.createMany({
                data: [
                  {
                    userId: o.buyerId,
                    type: "PASSPORT_FLAGGED",
                    title: "Đơn hẹn tạm dừng để kiểm tra (BR39)",
                    message: `Đơn hẹn của bạn đã chuyển sang trạng thái tranh chấp để Admin xem xét do Passport món đồ bị gắn cờ (${reason}).`,
                    payload: JSON.stringify({ itemId: item.id, orderId: o.id }),
                  },
                  {
                    userId: o.sellerId,
                    type: "PASSPORT_FLAGGED",
                    title: "Đơn hẹn tạm dừng để kiểm tra (BR39)",
                    message: `Đơn hẹn đã chuyển sang trạng thái tranh chấp do Passport món đồ bị gắn cờ (${reason}).`,
                    payload: JSON.stringify({ itemId: item.id, orderId: o.id }),
                  },
                ],
              });
            }
          }
        }

        // (d) Thông báo chủ sở hữu hiện tại (không lộ danh tính người báo cáo)
        if (item.currentOwnerId) {
          await tx.notification.create({
            data: {
              userId: item.currentOwnerId,
              type: "PASSPORT_FLAGGED",
              title: "Cảnh báo: Passport món đồ bị gắn cờ (BR39)",
              message: `Hộ chiếu món đồ của bạn đang bị tạm khóa do: ${reason}. Tin đăng liên quan đã được tạm ẩn để xác minh.`,
              payload: JSON.stringify({ itemId: item.id, passportId: item.passportId }),
            },
          });
        }

        // (e) Ghi PassportEvent & xếp hàng ChainTx FLAG lên Fuji
        const nextSeq = (item.events[0]?.seq || 0) + 1;
        await tx.passportEvent.create({
          data: {
            itemId: item.id,
            seq: nextSeq,
            eventType: "FLAGGED",
            fromOwnerHash: item.owners[0]?.ownerHash || null,
            actorAdminId,
            reason,
            occurredAt: now,
          },
        });

        const payloadHash =
          "0x" +
          crypto
            .createHash("sha256")
            .update(`FLAG:${item.id}:${nextSeq}:${now.getTime()}`)
            .digest("hex");

        await tx.chainTx.create({
          data: {
            itemId: item.id,
            kind: "FLAG",
            payloadHash,
            status: "QUEUED",
          },
        });
      });

      // Kích hoạt Relayer ghi sự kiện FLAG lên Fuji (bất đồng bộ chịu lỗi BR28)
      await processItemChainQueue(item.id).catch((err) =>
        console.warn("⚠️ Relayer gặp lỗi khi ghi FLAG lên Fuji:", err)
      );

      return NextResponse.json({
        success: true,
        message:
          "Đã gắn cờ Passport (FLAGGED) theo đúng hiệu lực BR39, ẩn tin liên quan và xếp hàng ghi nhận lên Avalanche Fuji!",
      });
    }

    // ------------------------------------------------------------------
    // 3. GỠ CỜ PASSPORT (UNFLAG - BR39)
    // ------------------------------------------------------------------
    if (action === "unflag_passport") {
      const itemId = typeof body.itemId === "string" ? body.itemId : "";
      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : "Đã hoàn tất xác minh hợp lệ, gỡ cờ cảnh báo.";

      if (!itemId) {
        return NextResponse.json({ error: "Thiếu mã Item Passport." }, { status: 400 });
      }

      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          owners: { orderBy: { seq: "desc" }, take: 1 },
          events: { orderBy: { seq: "desc" }, take: 1 },
        },
      });

      if (!item) {
        return NextResponse.json({ error: "Không tìm thấy Passport món đồ." }, { status: 404 });
      }

      if (item.passportStatus !== "FLAGGED") {
        return NextResponse.json(
          { error: "Passport này hiện không bị gắn cờ." },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.item.update({
          where: { id: item.id },
          data: {
            passportStatus: "ACTIVE",
            flagReason: null,
            flaggedAt: null,
          },
        });

        // Khôi phục các tin đăng HIDDEN nếu còn hạn 30 ngày (BR39)
        await tx.listing.updateMany({
          where: {
            itemId: item.id,
            status: "HIDDEN",
            expiresAt: { gt: now },
          },
          data: { status: "AVAILABLE" },
        });

        const nextSeq = (item.events[0]?.seq || 0) + 1;
        await tx.passportEvent.create({
          data: {
            itemId: item.id,
            seq: nextSeq,
            eventType: "UNFLAGGED",
            toOwnerHash: item.owners[0]?.ownerHash || null,
            actorAdminId,
            reason,
            occurredAt: now,
          },
        });

        const payloadHash =
          "0x" +
          crypto
            .createHash("sha256")
            .update(`UNFLAG:${item.id}:${nextSeq}:${now.getTime()}`)
            .digest("hex");

        await tx.chainTx.create({
          data: {
            itemId: item.id,
            kind: "UNFLAG",
            payloadHash,
            status: "QUEUED",
          },
        });

        if (item.currentOwnerId) {
          await tx.notification.create({
            data: {
              userId: item.currentOwnerId,
              type: "PASSPORT_UNFLAGGED",
              title: "Passport món đồ đã được gỡ cờ (BR39)",
              message: `Hộ chiếu món đồ của bạn đã được gỡ cờ khôi phục trạng thái ACTIVE (${reason}).`,
              payload: JSON.stringify({ itemId: item.id, passportId: item.passportId }),
            },
          });
        }
      });

      await processItemChainQueue(item.id).catch((err) =>
        console.warn("⚠️ Relayer gặp lỗi khi ghi UNFLAG lên Fuji:", err)
      );

      return NextResponse.json({
        success: true,
        message: "Đã gỡ cờ Passport, khôi phục tin đăng còn hạn và đồng bộ lên Fuji!",
      });
    }

    // ------------------------------------------------------------------
    // 4. DUYỆT BÁO CÁO VI PHẠM (BR17)
    // ------------------------------------------------------------------
    if (action === "handle_report") {
      const reportId = typeof body.reportId === "string" ? body.reportId : "";
      const decision = body.decision === "DISMISSED" ? "DISMISSED" : "RESOLVED";
      const removeListing = body.removeListing === true;

      if (!reportId) {
        return NextResponse.json({ error: "Thiếu mã báo cáo." }, { status: 400 });
      }

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        return NextResponse.json({ error: "Không tìm thấy báo cáo." }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.report.update({
          where: { id: report.id },
          data: {
            status: decision,
            handledBy: actorAdminId,
          },
        });

        if (decision === "RESOLVED" && removeListing && report.targetType === "LISTING") {
          const updatedListing = await tx.listing.update({
            where: { id: report.targetId },
            data: { status: "REMOVED" },
            select: { sellerId: true, title: true },
          });

          await tx.notification.create({
            data: {
              userId: updatedListing.sellerId,
              type: "LISTING_REMOVED",
              title: "Tin đăng bị gỡ do vi phạm quy tắc (BR17)",
              message: `Tin đăng "${updatedListing.title}" đã bị Ban Quản Trị gỡ bỏ do vi phạm quy định cộng đồng UniCycle.`,
              payload: JSON.stringify({ listingId: report.targetId }),
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message:
          decision === "RESOLVED"
            ? removeListing
              ? "Đã gỡ tin đăng vi phạm (BR17) và đóng báo cáo!"
              : "Đã đánh dấu báo cáo đã xử lý!"
            : "Đã bác bỏ báo cáo vi phạm.",
      });
    }

    // ------------------------------------------------------------------
    // 5. DUYỆT THẺ SINH VIÊN & TỰ ĐỘNG XÓA ẢNH THẺ (NĐ 13/2023/NĐ-CP)
    // ------------------------------------------------------------------
    if (action === "verify_student_card") {
      const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";
      const approve = body.approve === true;

      if (!targetUserId) {
        return NextResponse.json({ error: "Thiếu mã người dùng cần xét duyệt." }, { status: 400 });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, displayName: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "Không tìm thấy tài khoản sinh viên." }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: targetUser.id },
          data: {
            isStudentVerified: approve,
            studentVerifiedAt: approve ? now : null,
            // BẮT BUỘC NĐ 13/2023/NĐ-CP: Tự động xóa vĩnh viễn ảnh thẻ ngay sau duyệt/từ chối
            studentCardUrl: null,
          },
        });

        await tx.notification.create({
          data: {
            userId: targetUser.id,
            type: approve ? "STUDENT_VERIFIED" : "STUDENT_CARD_REJECTED",
            title: approve
              ? "Thẻ sinh viên đã được phê duyệt!"
              : "Yêu cầu xác minh thẻ sinh viên chưa đạt",
            message: approve
              ? "Ban Quản Trị đã phê duyệt thẻ sinh viên và cấp Huy hiệu 'Sinh viên đã xác minh' (BR19). Ảnh thẻ đã được tự động xóa vĩnh viễn theo Nghị định 13/2023/NĐ-CP."
              : "Ảnh thẻ sinh viên chưa rõ thông tin hoặc chưa hợp lệ. Ảnh cũ đã được tự động xóa theo Nghị định 13/2023/NĐ-CP, bạn có thể gửi lại ảnh rõ nét hơn tại /verify-student.",
            payload: JSON.stringify({ approve }),
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: approve
          ? `Đã phê duyệt sinh viên ${targetUser.displayName} và tự động xóa vĩnh viễn ảnh thẻ (NĐ 13/2023/NĐ-CP)!`
          : `Đã từ chối hồ sơ của ${targetUser.displayName} và tự động xóa vĩnh viễn ảnh thẻ.`,
      });
    }

    // ------------------------------------------------------------------
    // 6. KÍCH HOẠT LẠI HÀNG ĐỢI CHAIN_TX (BR28)
    // ------------------------------------------------------------------
    if (action === "retry_chain_tx") {
      const itemId = typeof body.itemId === "string" ? body.itemId : "";
      if (!itemId) {
        return NextResponse.json({ error: "Thiếu mã Item cần đồng bộ." }, { status: 400 });
      }

      await prisma.chainTx.updateMany({
        where: {
          itemId,
          status: { in: ["QUEUED", "FAILED", "NEEDS_ATTENTION"] },
        },
        data: {
          status: "QUEUED",
          attempts: 0,
          lastError: null,
        },
      });

      const syncResult = await processItemChainQueue(itemId);
      return NextResponse.json({
        success: true,
        syncResult,
        message: `Đã xử lý hàng đợi Relayer cho món đồ (${syncResult.confirmedCount} giao dịch đã xác nhận).`,
      });
    }

    return NextResponse.json({ error: "Hành động quản trị không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("Lỗi POST /api/admin:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi thực thi thao tác quản trị." },
      { status: 500 }
    );
  }
}
