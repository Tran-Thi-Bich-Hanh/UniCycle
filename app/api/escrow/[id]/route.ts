import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import db, { EscrowOrder } from "@/lib/db";
import { releaseEscrowOnChain, refundEscrowOnChain } from "@/lib/blockchain";

/**
 * PATCH /api/escrow/[id]
 * Xử lý 2 hành động trên đơn đặt cọc đang ở trạng thái LOCKED:
 * 1. action = "RELEASE": Người mua xác nhận đã gặp mặt kiểm tra đồ khớp với Sổ đỏ UniCycle Passport
 *    -> Giải ngân UNIP sang ví người bán + đổi sản phẩm thành SOLD + tự động sang tên vào ownership_history.
 * 2. action = "REFUND": Người mua hoặc người bán hủy kèo
 *    -> Hoàn trả 100% UNIP về lại ví người mua + mở bán lại sản phẩm (ACTIVE).
 */
export async function PATCH(
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
    const action = typeof body.action === "string" ? body.action.trim().toUpperCase() : "";

    if (action !== "RELEASE" && action !== "REFUND") {
      return NextResponse.json(
        { error: "Hành động không hợp lệ. Chỉ chấp nhận RELEASE hoặc REFUND." },
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
        { error: "Không tìm thấy đơn đặt cọc này." },
        { status: 404 }
      );
    }

    if (escrow.status !== "LOCKED") {
      return NextResponse.json(
        { error: `Đơn đặt cọc này đã được xử lý trước đó (${escrow.status}).` },
        { status: 409 }
      );
    }

    const isBuyer = escrow.buyer_id === user.id;
    const isSeller = escrow.seller_id === user.id;
    const isAdmin = user.role === "ADMIN";

    // Quy tắc phân quyền:
    // - Giải ngân (RELEASE): Chỉ chính Người mua (hoặc Admin) mới được xác nhận đã nhận đúng hàng để mở khóa tiền cho người bán
    // - Hoàn tiền (REFUND): Cả Người mua lẫn Người bán đều có thể chủ động hủy kèo để trả lại điểm cho Người mua
    if (action === "RELEASE" && !isBuyer && !isAdmin) {
      return NextResponse.json(
        { error: "Chỉ người mua đã đặt cọc mới có quyền xác nhận nhận hàng và giải ngân." },
        { status: 403 }
      );
    }

    if (action === "REFUND" && !isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json(
        { error: "Bạn không có quyền hủy đơn đặt cọc này." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const currentYear = new Date().getFullYear();

    if (action === "RELEASE") {
      const chainResult = await releaseEscrowOnChain({ orderId: escrow.id });
      const sellerTxId = `ptx_${crypto.randomBytes(8).toString("hex")}`;
      const ownershipId = `own_${crypto.randomBytes(8).toString("hex")}`;

      db.exec("BEGIN");
      try {
        // 1. Cộng UNIP vào ví của Người bán
        db.prepare(
          "UPDATE users SET point_balance = COALESCE(point_balance, 0) + ?, updated_at = ? WHERE id = ?"
        ).run(escrow.amount, now, escrow.seller_id);

        // 2. Cập nhật trạng thái đơn đặt cọc sang RELEASED
        db.prepare(
          "UPDATE escrow_orders SET status = 'RELEASED', settle_tx_hash = ?, chain_mode = ?, settled_at = ? WHERE id = ?"
        ).run(chainResult.txHash, chainResult.mode, now, escrow.id);

        // 3. Lưu lịch sử nhận điểm bán hàng cho Người bán
        db.prepare(
          `INSERT INTO point_transactions
            (id, user_id, type, amount, direction, reference_id, description, tx_hash, chain_mode, created_at)
           VALUES (?, ?, 'ESCROW_RELEASE', ?, 'IN', ?, ?, ?, ?, ?)`
        ).run(
          sellerTxId,
          escrow.seller_id,
          escrow.amount,
          escrow.id,
          `Nhận thanh toán bán đồ: ${escrow.product_title || escrow.product_id}`,
          chainResult.txHash,
          chainResult.mode,
          now
        );

        // 4. Đổi trạng thái món đồ sang SOLD (Đã bán)
        db.prepare("UPDATE products SET status = 'SOLD', updated_at = ? WHERE id = ?").run(
          now,
          escrow.product_id
        );

        // 5. Tự động nối thêm Người mua vào Lịch sử truyền đời (Chain of Ownership)
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
          `Sang tên tự động qua hợp đồng thông minh UniCycle Escrow (${escrow.amount.toLocaleString("vi-VN")} UNIP, Tx: ${shortTx}).`,
          nextOrderIndex,
          now
        );

        db.exec("COMMIT");
      } catch (dbErr) {
        db.exec("ROLLBACK");
        throw dbErr;
      }

      return NextResponse.json({
        success: true,
        message: `Đã giải ngân ${escrow.amount.toLocaleString("vi-VN")} UNIP cho người bán và sang tên Sổ đỏ thành công!`,
        escrow: {
          id: escrow.id,
          productId: escrow.product_id,
          status: "RELEASED",
          settleTxHash: chainResult.txHash,
          settleExplorerUrl: chainResult.explorerUrl,
          chainMode: chainResult.mode,
          settledAt: now,
        },
      });
    } else {
      // action === "REFUND"
      const chainResult = await refundEscrowOnChain({ orderId: escrow.id });
      const refundTxId = `ptx_${crypto.randomBytes(8).toString("hex")}`;

      db.exec("BEGIN");
      try {
        // 1. Hoàn trả 100% UNIP về lại ví Người mua
        db.prepare(
          "UPDATE users SET point_balance = COALESCE(point_balance, 0) + ?, updated_at = ? WHERE id = ?"
        ).run(escrow.amount, now, escrow.buyer_id);

        // 2. Cập nhật trạng thái đơn đặt cọc sang REFUNDED
        db.prepare(
          "UPDATE escrow_orders SET status = 'REFUNDED', settle_tx_hash = ?, chain_mode = ?, settled_at = ? WHERE id = ?"
        ).run(chainResult.txHash, chainResult.mode, now, escrow.id);

        // 3. Lưu lịch sử hoàn điểm cho Người mua
        db.prepare(
          `INSERT INTO point_transactions
            (id, user_id, type, amount, direction, reference_id, description, tx_hash, chain_mode, created_at)
           VALUES (?, ?, 'ESCROW_REFUND', ?, 'IN', ?, ?, ?, ?, ?)`
        ).run(
          refundTxId,
          escrow.buyer_id,
          escrow.amount,
          escrow.id,
          `Hoàn trả tiền cọc đơn hủy: ${escrow.product_title || escrow.product_id}`,
          chainResult.txHash,
          chainResult.mode,
          now
        );

        // 4. Mở bán lại sản phẩm (ACTIVE)
        db.prepare("UPDATE products SET status = 'ACTIVE', updated_at = ? WHERE id = ?").run(
          now,
          escrow.product_id
        );

        db.exec("COMMIT");
      } catch (dbErr) {
        db.exec("ROLLBACK");
        throw dbErr;
      }

      return NextResponse.json({
        success: true,
        message: `Đã hủy kèo và hoàn trả 100% (${escrow.amount.toLocaleString("vi-VN")} UNIP) về ví người mua.`,
        escrow: {
          id: escrow.id,
          productId: escrow.product_id,
          status: "REFUNDED",
          settleTxHash: chainResult.txHash,
          settleExplorerUrl: chainResult.explorerUrl,
          chainMode: chainResult.mode,
          settledAt: now,
        },
      });
    }
  } catch (err: any) {
    console.error("[PATCH /api/escrow/[id]] Error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý đơn đặt cọc." },
      { status: 500 }
    );
  }
}

