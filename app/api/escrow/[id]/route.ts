import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import db, { EscrowOrder, getUserWalletSummary } from "@/lib/db";
import { releaseEscrowOnChain, refundEscrowOnChain } from "@/lib/blockchain";

const EXTENSION_HOURS = 24;
const MAX_EXTENSIONS = 1;

const VALID_ACTIONS = new Set([
  "RELEASE",
  "CONFIRM_RECEIPT",
  "REFUND",
  "REQUEST_CANCEL",
  "WITHDRAW_CANCEL",
  "APPROVE_CANCEL",
  "SELLER_CANCEL",
  "EXTEND_HOLD",
  "CLAIM_EXPIRED_REFUND",
  "UPDATE_MEETING_NOTE",
]);

/**
 * Thực thi hoàn trả 100% UNIP từ hợp đồng Escrow về lại ví người mua và mở bán lại món đồ
 */
async function executeRefundToBuyer(params: {
  escrow: EscrowOrder & { product_title?: string };
  nowIso: string;
  refundReasonNote: string;
}) {
  const { escrow, nowIso, refundReasonNote } = params;
  const chainResult = await refundEscrowOnChain({ orderId: escrow.id });
  const refundTxId = `ptx_${crypto.randomBytes(8).toString("hex")}`;

  db.exec("BEGIN IMMEDIATE");
  try {
    const updateEscrow = db
      .prepare(
        `UPDATE escrow_orders
         SET status = 'REFUNDED',
             settle_tx_hash = ?,
             chain_mode = ?,
             cancel_reason = COALESCE(?, cancel_reason),
             settled_at = ?
         WHERE id = ? AND status IN ('LOCKED', 'CANCEL_REQUESTED')`
      )
      .run(
        chainResult.txHash,
        chainResult.mode,
        refundReasonNote || null,
        nowIso,
        escrow.id
      );

    if (updateEscrow.changes !== 1) {
      throw new Error("ESCROW_ALREADY_SETTLED");
    }

    db.prepare(
      "UPDATE users SET point_balance = COALESCE(point_balance, 0) + ?, updated_at = ? WHERE id = ?"
    ).run(escrow.amount, nowIso, escrow.buyer_id);

    db.prepare(
      `INSERT INTO point_transactions
        (id, user_id, type, amount, direction, reference_id, description, tx_hash, chain_mode, created_at)
       VALUES (?, ?, 'ESCROW_REFUND', ?, 'IN', ?, ?, ?, ?, ?)`
    ).run(
      refundTxId,
      escrow.buyer_id,
      escrow.amount,
      escrow.id,
      `Hoàn tiền giữ chỗ (${refundReasonNote}): ${escrow.product_title || escrow.product_id}`,
      chainResult.txHash,
      chainResult.mode,
      nowIso
    );

    db.prepare("UPDATE products SET status = 'ACTIVE', updated_at = ? WHERE id = ?").run(
      nowIso,
      escrow.product_id
    );

    db.exec("COMMIT");
  } catch (dbErr) {
    db.exec("ROLLBACK");
    throw dbErr;
  }

  return chainResult;
}

async function handleEscrowAction(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để thực hiện thao tác này." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const rawAction = typeof body.action === "string" ? body.action.trim().toUpperCase() : "";

    if (!VALID_ACTIONS.has(rawAction)) {
      return NextResponse.json(
        { error: "Hành động xử lý đơn giữ chỗ không hợp lệ." },
        { status: 400 }
      );
    }

    const escrow = db
      .prepare(
        `SELECT e.*,
                p.title as product_title,
                b.full_name as buyer_name,
                b.university as buyer_university,
                b.campus_location as buyer_campus
         FROM escrow_orders e
         LEFT JOIN products p ON e.product_id = p.id
         LEFT JOIN users b ON e.buyer_id = b.id
         WHERE e.id = ?`
      )
      .get(id) as
      | (EscrowOrder & {
          product_title?: string;
          buyer_name?: string;
          buyer_university?: string | null;
          buyer_campus?: string | null;
        })
      | undefined;

    if (!escrow) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn giữ chỗ này." },
        { status: 404 }
      );
    }

    if (escrow.status !== "LOCKED" && escrow.status !== "CANCEL_REQUESTED") {
      return NextResponse.json(
        { error: `Đơn giữ chỗ này đã được hoàn tất trước đó (${escrow.status}).` },
        { status: 409 }
      );
    }

    const isBuyer = escrow.buyer_id === user.id;
    const isSeller = escrow.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        { error: "Chỉ người mua hoặc người bán của đơn hàng này mới có quyền thao tác." },
        { status: 403 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const currentYear = now.getFullYear();
    const isExpired = Boolean(
      escrow.expires_at && Date.parse(escrow.expires_at) < now.getTime()
    );

    // =========================================================================
    // 1. CẬP NHẬT GHI CHÚ ĐIỂM HẸN KTX / CƠ SỞ TRƯỜNG (UPDATE_MEETING_NOTE)
    // =========================================================================
    if (rawAction === "UPDATE_MEETING_NOTE") {
      const note =
        typeof body.meetingNote === "string" ? body.meetingNote.trim().slice(0, 300) : "";

      db.prepare("UPDATE escrow_orders SET meeting_note = ? WHERE id = ?").run(
        note || null,
        escrow.id
      );

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật ghi chú điểm hẹn giao dịch.",
        escrow: {
          ...escrow,
          meeting_note: note || null,
        },
      });
    }

    // =========================================================================
    // 2. GIA HẠN THỜI GIAN GIỮ CHỖ +24 GIỜ (EXTEND_HOLD)
    // =========================================================================
    if (rawAction === "EXTEND_HOLD") {
      const currentExtended = Number(escrow.extended_count || 0);
      if (currentExtended >= MAX_EXTENSIONS) {
        return NextResponse.json(
          {
            error: `Mỗi đơn giữ chỗ chỉ được gia hạn tối đa ${MAX_EXTENSIONS} lần (+${EXTENSION_HOURS} giờ).`,
          },
          { status: 400 }
        );
      }

      const baseMs = escrow.expires_at
        ? Math.max(now.getTime(), Date.parse(escrow.expires_at))
        : now.getTime();
      const newExpiresAt = new Date(
        baseMs + EXTENSION_HOURS * 60 * 60 * 1000
      ).toISOString();

      db.prepare(
        "UPDATE escrow_orders SET expires_at = ?, extended_count = COALESCE(extended_count, 0) + 1 WHERE id = ?"
      ).run(newExpiresAt, escrow.id);

      return NextResponse.json({
        success: true,
        message: `Đã gia hạn giữ chỗ thêm +${EXTENSION_HOURS} giờ để hai bạn thuận tiện sắp xếp lịch gặp mặt.`,
        escrow: {
          ...escrow,
          expires_at: newExpiresAt,
          extended_count: currentExtended + 1,
        },
      });
    }

    // =========================================================================
    // 3. XÁC NHẬN ĐÃ KIỂM TRA HÀNG & GIẢI NGÂN CHO NGƯỜI BÁN (RELEASE / CONFIRM_RECEIPT)
    // =========================================================================
    if (rawAction === "RELEASE" || rawAction === "CONFIRM_RECEIPT") {
      if (!isBuyer) {
        return NextResponse.json(
          {
            error:
              "Chỉ người mua trực tiếp kiểm tra hàng mới có quyền xác nhận nhận hàng và giải ngân.",
          },
          { status: 403 }
        );
      }

      // Kiểm tra cờ xác nhận checklist nếu client truyền lên
      if (body.inspectionConfirmed === false) {
        return NextResponse.json(
          {
            error:
              "Vui lòng tích xác nhận đủ các mục kiểm tra hàng thực tế trước khi giải ngân.",
          },
          { status: 400 }
        );
      }

      const chainResult = await releaseEscrowOnChain({ orderId: escrow.id });
      const sellerTxId = `ptx_${crypto.randomBytes(8).toString("hex")}`;
      const ownershipId = `own_${crypto.randomBytes(8).toString("hex")}`;

      db.exec("BEGIN IMMEDIATE");
      try {
        const updateOrder = db
          .prepare(
            `UPDATE escrow_orders
             SET status = 'RELEASED',
                 inspection_checked = 1,
                 settle_tx_hash = ?,
                 chain_mode = ?,
                 settled_at = ?
             WHERE id = ? AND status IN ('LOCKED', 'CANCEL_REQUESTED')`
          )
          .run(chainResult.txHash, chainResult.mode, nowIso, escrow.id);

        if (updateOrder.changes !== 1) {
          throw new Error("ESCROW_ALREADY_SETTLED");
        }

        // 1. Cộng UNIP vào ví của Người bán
        db.prepare(
          "UPDATE users SET point_balance = COALESCE(point_balance, 0) + ?, updated_at = ? WHERE id = ?"
        ).run(escrow.amount, nowIso, escrow.seller_id);

        // 2. Lưu lịch sử nhận điểm bán hàng cho Người bán
        db.prepare(
          `INSERT INTO point_transactions
            (id, user_id, type, amount, direction, reference_id, description, tx_hash, chain_mode, created_at)
           VALUES (?, ?, 'ESCROW_RELEASE', ?, 'IN', ?, ?, ?, ?, ?)`
        ).run(
          sellerTxId,
          escrow.seller_id,
          escrow.amount,
          escrow.id,
          `Nhận thanh toán bán hàng (Escrow): ${escrow.product_title || escrow.product_id}`,
          chainResult.txHash,
          chainResult.mode,
          nowIso
        );

        // 3. Đổi trạng thái món đồ sang SOLD (Đã bán)
        db.prepare("UPDATE products SET status = 'SOLD', updated_at = ? WHERE id = ?").run(
          nowIso,
          escrow.product_id
        );

        // 4. Tự động nối thêm Người mua vào Lịch sử truyền đời (UniCycle Passport)
        const latestOrderRow = db
          .prepare(
            "SELECT id, period, order_index FROM ownership_history WHERE product_id = ? ORDER BY order_index DESC LIMIT 1"
          )
          .get(escrow.product_id) as
          | { id: string; period: string | null; order_index: number }
          | undefined;

        if (latestOrderRow && latestOrderRow.period?.includes("Hiện tại")) {
          const closedPeriod = latestOrderRow.period.replace("Hiện tại", String(currentYear));
          db.prepare("UPDATE ownership_history SET period = ? WHERE id = ?").run(
            closedPeriod,
            latestOrderRow.id
          );
        }

        const nextOrderIndex = (latestOrderRow?.order_index || 0) + 1;
        const shortTx = `${chainResult.txHash.slice(0, 10)}...${chainResult.txHash.slice(-6)}`;
        db.prepare(
          `INSERT INTO ownership_history
            (id, product_id, owner_name, university, cohort, period, notes, order_index, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          ownershipId,
          escrow.product_id,
          escrow.buyer_name || user.full_name,
          escrow.buyer_university || user.university || "Sinh viên UniCycle",
          escrow.buyer_campus || user.campus_location || "Giao dịch trực tiếp tại Campus",
          `${currentYear} - Hiện tại`,
          `Chuyển quyền sở hữu qua UniCycle Escrow (${escrow.amount.toLocaleString("vi-VN")} UNIP, Tx: ${shortTx}).`,
          nextOrderIndex,
          nowIso
        );

        db.exec("COMMIT");
      } catch (dbErr: any) {
        db.exec("ROLLBACK");
        if (dbErr?.message === "ESCROW_ALREADY_SETTLED") {
          return NextResponse.json(
            { error: "Đơn giữ chỗ này vừa được xử lý." },
            { status: 409 }
          );
        }
        throw dbErr;
      }

      return NextResponse.json({
        success: true,
        message: `Đã giải ngân ${escrow.amount.toLocaleString("vi-VN")} UNIP cho người bán và cập nhật hồ sơ UniCycle Passport thành công!`,
        escrow: {
          id: escrow.id,
          productId: escrow.product_id,
          status: "RELEASED",
          settleTxHash: chainResult.txHash,
          settleExplorerUrl: chainResult.explorerUrl,
          chainMode: chainResult.mode,
          settledAt: nowIso,
        },
        walletSummary: getUserWalletSummary(user.id),
      });
    }

    // =========================================================================
    // 4. NGƯỜI MUA GỬI YÊU CẦU HỦY / BÁO HÀNG LỆCH MÔ TẢ (REQUEST_CANCEL)
    //    (Hoặc khi người mua gọi REFUND lúc đơn chưa hết hạn 48h)
    // =========================================================================
    if (
      rawAction === "REQUEST_CANCEL" ||
      (rawAction === "REFUND" && isBuyer && !isExpired)
    ) {
      if (!isBuyer) {
        return NextResponse.json(
          { error: "Chỉ người mua mới có thể gửi yêu cầu hủy đơn." },
          { status: 403 }
        );
      }

      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim().slice(0, 300)
          : "Người mua đề nghị hủy giữ chỗ / Báo sản phẩm thực tế không khớp mô tả";

      db.prepare(
        `UPDATE escrow_orders
         SET status = 'CANCEL_REQUESTED',
             cancel_reason = ?,
             cancel_requested_by = ?,
             cancel_requested_at = ?
         WHERE id = ? AND status = 'LOCKED'`
      ).run(reason, user.id, nowIso, escrow.id);

      return NextResponse.json({
        success: true,
        message:
          "Đã gửi yêu cầu hủy giữ chỗ tới người bán. Ngay khi người bán bấm đồng ý (hoặc khi hết hạn giữ chỗ 48h), 100% UNIP sẽ được hoàn về ví của bạn.",
        escrow: {
          ...escrow,
          status: "CANCEL_REQUESTED",
          cancel_reason: reason,
          cancel_requested_by: user.id,
          cancel_requested_at: nowIso,
        },
      });
    }

    // =========================================================================
    // 5. NGƯỜI MUA RÚT LẠI YÊU CẦU HỦY ĐỂ TIẾP TỤC GIAO DỊCH (WITHDRAW_CANCEL)
    // =========================================================================
    if (rawAction === "WITHDRAW_CANCEL") {
      if (!isBuyer) {
        return NextResponse.json(
          { error: "Chỉ người mua mới có thể rút lại yêu cầu hủy." },
          { status: 403 }
        );
      }

      if (escrow.status !== "CANCEL_REQUESTED") {
        return NextResponse.json(
          { error: "Đơn hàng hiện không ở trạng thái chờ duyệt hủy." },
          { status: 400 }
        );
      }

      db.prepare(
        `UPDATE escrow_orders
         SET status = 'LOCKED',
             cancel_reason = NULL,
             cancel_requested_by = NULL,
             cancel_requested_at = NULL
         WHERE id = ? AND status = 'CANCEL_REQUESTED'`
      ).run(escrow.id);

      return NextResponse.json({
        success: true,
        message: "Đã rút lại yêu cầu hủy. Hai bạn có thể tiếp tục gặp mặt và hoàn tất giao dịch.",
        escrow: {
          ...escrow,
          status: "LOCKED",
          cancel_reason: null,
          cancel_requested_by: null,
          cancel_requested_at: null,
        },
      });
    }

    // =========================================================================
    // 6. NGƯỜI BÁN ĐỒNG Ý YÊU CẦU HỦY (APPROVE_CANCEL)
    //    HOẶC NGƯỜI BÁN CHỦ ĐỘNG HỦY ĐƠN & HOÀN TIỀN NGAY (SELLER_CANCEL)
    // =========================================================================
    if (
      rawAction === "APPROVE_CANCEL" ||
      rawAction === "SELLER_CANCEL" ||
      (rawAction === "REFUND" && isSeller)
    ) {
      if (!isSeller) {
        return NextResponse.json(
          {
            error:
              "Chỉ người bán mới có quyền phê duyệt yêu cầu hủy hoặc chủ động hoàn tiền ngay.",
          },
          { status: 403 }
        );
      }

      const refundReason =
        rawAction === "APPROVE_CANCEL"
          ? escrow.cancel_reason || "Người bán đồng ý yêu cầu hủy của người mua"
          : typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim().slice(0, 300)
          : "Người bán chủ động hủy giữ chỗ và hoàn tiền";

      const chainResult = await executeRefundToBuyer({
        escrow,
        nowIso,
        refundReasonNote: refundReason,
      });

      return NextResponse.json({
        success: true,
        message: `Đã xác nhận hủy đơn và hoàn trả 100% (${escrow.amount.toLocaleString("vi-VN")} UNIP) về ví người mua. Sản phẩm đã được mở bán lại!`,
        escrow: {
          id: escrow.id,
          productId: escrow.product_id,
          status: "REFUNDED",
          cancelReason: refundReason,
          settleTxHash: chainResult.txHash,
          settleExplorerUrl: chainResult.explorerUrl,
          chainMode: chainResult.mode,
          settledAt: nowIso,
        },
        walletSummary: getUserWalletSummary(user.id),
      });
    }

    // =========================================================================
    // 7. THU HỒI & HOÀN TIỀN ĐƠN QUÁ HẠN 48H (CLAIM_EXPIRED_REFUND)
    //    (Hoặc khi người mua gọi REFUND sau khi đơn đã hết hạn 48h)
    // =========================================================================
    if (
      rawAction === "CLAIM_EXPIRED_REFUND" ||
      (rawAction === "REFUND" && isBuyer && isExpired)
    ) {
      if (!isExpired) {
        return NextResponse.json(
          {
            error:
              "Đơn giữ chỗ vẫn đang trong thời hạn hiệu lực. Nếu muốn hủy sớm, bạn hãy gửi 'Yêu cầu hủy' để người bán xác nhận.",
          },
          { status: 400 }
        );
      }

      const chainResult = await executeRefundToBuyer({
        escrow,
        nowIso,
        refundReasonNote: "Đơn giữ chỗ quá hạn 48 giờ chưa hoàn tất",
      });

      return NextResponse.json({
        success: true,
        message: `Đơn giữ chỗ đã quá hạn. Hệ thống đã hoàn trả 100% (${escrow.amount.toLocaleString("vi-VN")} UNIP) về ví người mua và mở bán lại sản phẩm.`,
        escrow: {
          id: escrow.id,
          productId: escrow.product_id,
          status: "REFUNDED",
          settleTxHash: chainResult.txHash,
          settleExplorerUrl: chainResult.explorerUrl,
          chainMode: chainResult.mode,
          settledAt: nowIso,
        },
        walletSummary: getUserWalletSummary(user.id),
      });
    }

    return NextResponse.json(
      { error: "Không thể thực hiện hành động này." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[/api/escrow/[id]] Error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý đơn giữ chỗ." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleEscrowAction(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleEscrowAction(request, context);
}
