import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import db, { ensureUserWallet, getUserWalletSummary, EscrowOrder } from "@/lib/db";
import { lockEscrowOnChain, normalizeBytes32Hash } from "@/lib/blockchain";
import { getSnowtraceTxUrl } from "@/lib/contracts/unipoint-abi";

const HOLD_DURATION_HOURS = 48;

/**
 * GET /api/escrow?productId=...
 * Lấy thông tin đơn giữ chỗ đang hoạt động (LOCKED / CANCEL_REQUESTED) hoặc đã hoàn tất (RELEASED / COMPLETED)
 * của một món đồ, kèm theo số dư khả dụng & số dư đang khóa của người đang xem.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId")?.trim();
    const viewer = await getSessionUser();

    const viewerSummary = viewer ? getUserWalletSummary(viewer.id) : null;

    if (!productId) {
      return NextResponse.json(
        { error: "Thiếu tham số productId." },
        { status: 400 }
      );
    }

    const activeOrLatestEscrow = db
      .prepare(
        `SELECT e.*,
                b.full_name as buyer_name,
                b.university as buyer_university,
                b.campus_location as buyer_campus,
                b.phone as buyer_phone,
                s.full_name as seller_name,
                s.university as seller_university,
                s.campus_location as seller_campus,
                s.phone as seller_phone
         FROM escrow_orders e
         LEFT JOIN users b ON e.buyer_id = b.id
         LEFT JOIN users s ON e.seller_id = s.id
         WHERE e.product_id = ? AND e.status IN ('LOCKED', 'CANCEL_REQUESTED', 'RELEASED', 'COMPLETED')
         ORDER BY CASE WHEN e.status IN ('LOCKED', 'CANCEL_REQUESTED') THEN 0 ELSE 1 END,
                  e.created_at DESC
         LIMIT 1`
      )
      .get(productId) as
      | (EscrowOrder & {
          buyer_name?: string;
          buyer_university?: string;
          buyer_campus?: string;
          buyer_phone?: string | null;
          seller_name?: string;
          seller_university?: string;
          seller_campus?: string;
          seller_phone?: string | null;
        })
      | undefined;

    const isParticipant =
      viewer &&
      activeOrLatestEscrow &&
      (viewer.id === activeOrLatestEscrow.buyer_id ||
        viewer.id === activeOrLatestEscrow.seller_id);

    const nowMs = Date.now();

    return NextResponse.json({
      escrow: activeOrLatestEscrow
        ? {
            ...activeOrLatestEscrow,
            buyer_phone: isParticipant ? activeOrLatestEscrow.buyer_phone : null,
            seller_phone: viewer ? activeOrLatestEscrow.seller_phone : null,
            isExpired: Boolean(
              activeOrLatestEscrow.expires_at &&
                Date.parse(activeOrLatestEscrow.expires_at) < nowMs
            ),
            lockExplorerUrl: activeOrLatestEscrow.lock_tx_hash
              ? getSnowtraceTxUrl(activeOrLatestEscrow.lock_tx_hash)
              : null,
            settleExplorerUrl: activeOrLatestEscrow.settle_tx_hash
              ? getSnowtraceTxUrl(activeOrLatestEscrow.settle_tx_hash)
              : null,
          }
        : null,
      viewerWallet: viewerSummary
        ? {
            userId: viewer!.id,
            address: viewerSummary.wallet_address,
            pointBalance: viewerSummary.availableBalance,
            availableBalance: viewerSummary.availableBalance,
            lockedBalance: viewerSummary.lockedBalance,
            totalBalance: viewerSummary.totalBalance,
          }
        : null,
    });
  } catch (err: any) {
    console.error("[GET /api/escrow] Error:", err);
    return NextResponse.json(
      { error: "Không thể tải thông tin giao dịch giữ chỗ." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/escrow
 * Thanh toán & giữ chỗ 100% giá trị món đồ bằng đồng UNIP (1 VNĐ = 1 UNIP):
 * - Khóa nguyên tử (Atomic Locking) trên SQLite (WHERE status = 'ACTIVE' và WHERE point_balance >= amount)
 * - Thiết lập thời hạn giữ chỗ 48 giờ (expires_at) + ghi chú điểm hẹn KTX (meeting_note)
 * - Ghi vết mã băm UniCycle Passport (passport_hash) lên mạng Avalanche Fuji Testnet.
 */
export async function POST(request: Request) {
  const buyer = await getSessionUser();
  if (!buyer) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để thanh toán và giữ chỗ món đồ." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const meetingNote =
      typeof body.meetingNote === "string" && body.meetingNote.trim()
        ? body.meetingNote.trim().slice(0, 300)
        : null;

    if (!productId) {
      return NextResponse.json(
        { error: "Thiếu mã sản phẩm cần giữ chỗ." },
        { status: 400 }
      );
    }

    const product = db
      .prepare(
        "SELECT id, title, price, status, seller_id, passport_hash FROM products WHERE id = ?"
      )
      .get(productId) as
      | {
          id: string;
          title: string;
          price: number;
          status: string;
          seller_id: string;
          passport_hash: string | null;
        }
      | undefined;

    if (!product) {
      return NextResponse.json(
        { error: "Không tìm thấy món đồ này." },
        { status: 404 }
      );
    }

    if (product.seller_id === buyer.id) {
      return NextResponse.json(
        { error: "Bạn là người đăng bán món đồ này nên không thể tự đặt mua." },
        { status: 400 }
      );
    }

    if (product.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Món đồ này hiện đã có người giữ chỗ hoặc đã ngừng bán." },
        { status: 409 }
      );
    }

    const cleanAmount = Math.round(Number(product.price));
    if (cleanAmount <= 0) {
      return NextResponse.json(
        {
          error:
            "Món đồ miễn phí (0đ) không cần khóa điểm Escrow. Hãy liên hệ trực tiếp người tặng.",
        },
        { status: 400 }
      );
    }

    const buyerWallet = ensureUserWallet(buyer.id);
    const sellerWallet = ensureUserWallet(product.seller_id);

    if (!buyerWallet || !sellerWallet) {
      return NextResponse.json(
        { error: "Không tìm thấy địa chỉ ví của người mua hoặc người bán." },
        { status: 404 }
      );
    }

    if (buyerWallet.point_balance < cleanAmount) {
      const missing = cleanAmount - buyerWallet.point_balance;
      return NextResponse.json(
        {
          error: `Số dư khả dụng của bạn không đủ. Cần thêm ${missing.toLocaleString("vi-VN")} UNIP để giữ chỗ món đồ này.`,
          code: "INSUFFICIENT_BALANCE",
          requiredUnip: cleanAmount,
          currentBalance: buyerWallet.point_balance,
        },
        { status: 400 }
      );
    }

    const orderId = `esc_${crypto.randomBytes(8).toString("hex")}`;
    const txRecordId = `ptx_${crypto.randomBytes(8).toString("hex")}`;
    const passportHash = normalizeBytes32Hash(product.passport_hash, product.id);
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAtIso = new Date(
      now.getTime() + HOLD_DURATION_HOURS * 60 * 60 * 1000
    ).toISOString();

    // Bước 1: Khóa nguyên tử (Atomic Lock) trong SQLite trước khi gọi RPC On-Chain
    // Đảm bảo nếu 2 sinh viên bấm mua cùng một mili-giây thì chỉ đúng 1 người giữ chỗ thành công
    db.exec("BEGIN IMMEDIATE");
    try {
      const existingActiveEscrow = db
        .prepare(
          "SELECT id FROM escrow_orders WHERE product_id = ? AND status IN ('LOCKED', 'CANCEL_REQUESTED')"
        )
        .get(product.id);

      if (existingActiveEscrow) {
        throw new Error("PRODUCT_ALREADY_LOCKED");
      }

      const reserveProduct = db
        .prepare(
          "UPDATE products SET status = 'RESERVED', updated_at = ? WHERE id = ? AND status = 'ACTIVE'"
        )
        .run(nowIso, product.id);

      if (reserveProduct.changes !== 1) {
        throw new Error("PRODUCT_ALREADY_LOCKED");
      }

      const deductBuyer = db
        .prepare(
          "UPDATE users SET point_balance = point_balance - ?, updated_at = ? WHERE id = ? AND point_balance >= ?"
        )
        .run(cleanAmount, nowIso, buyer.id, cleanAmount);

      if (deductBuyer.changes !== 1) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      db.prepare(
        `INSERT INTO escrow_orders
          (id, product_id, buyer_id, seller_id, buyer_wallet, seller_wallet, amount, passport_hash,
           status, lock_tx_hash, settle_tx_hash, chain_mode, expires_at, extended_count, meeting_note,
           cancel_reason, cancel_requested_by, cancel_requested_at, inspection_checked, created_at, settled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'LOCKED', NULL, NULL, 'ONCHAIN', ?, 0, ?, NULL, NULL, NULL, 0, ?, NULL)`
      ).run(
        orderId,
        product.id,
        buyer.id,
        product.seller_id,
        buyerWallet.wallet_address,
        sellerWallet.wallet_address,
        cleanAmount,
        passportHash,
        expiresAtIso,
        meetingNote,
        nowIso
      );

      db.exec("COMMIT");
    } catch (lockErr: any) {
      db.exec("ROLLBACK");
      if (lockErr?.message === "PRODUCT_ALREADY_LOCKED") {
        return NextResponse.json(
          { error: "Món đồ này vừa được một bạn sinh viên khác thanh toán giữ chỗ." },
          { status: 409 }
        );
      }
      if (lockErr?.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          {
            error: "Số dư khả dụng trong Ví UniCycle của bạn không đủ để giữ chỗ.",
            code: "INSUFFICIENT_BALANCE",
          },
          { status: 400 }
        );
      }
      throw lockErr;
    }

    // Bước 2: Gọi Ví Chủ thực thi khóa UNIP kèm mã băm UniCycle Passport lên Avalanche Fuji
    let chainResult: { txHash: string; explorerUrl: string; mode: "ONCHAIN" | "SIMULATED" };
    try {
      chainResult = await lockEscrowOnChain({
        orderId,
        buyerWallet: buyerWallet.wallet_address,
        sellerWallet: sellerWallet.wallet_address,
        amount: cleanAmount,
        passportHash,
      });
    } catch (chainErr) {
      // Hoàn tác lại trạng thái nếu lỗi không mong muốn xảy ra
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(
          "UPDATE users SET point_balance = point_balance + ?, updated_at = ? WHERE id = ?"
        ).run(cleanAmount, nowIso, buyer.id);
        db.prepare("DELETE FROM escrow_orders WHERE id = ?").run(orderId);
        db.prepare(
          "UPDATE products SET status = 'ACTIVE', updated_at = ? WHERE id = ?"
        ).run(nowIso, product.id);
        db.exec("COMMIT");
      } catch {
        db.exec("ROLLBACK");
      }
      throw chainErr;
    }

    // Bước 3: Cập nhật mã giao dịch On-chain và ghi lịch sử biến động số dư
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(
        "UPDATE escrow_orders SET lock_tx_hash = ?, chain_mode = ? WHERE id = ?"
      ).run(chainResult.txHash, chainResult.mode, orderId);

      db.prepare(
        `INSERT INTO point_transactions
          (id, user_id, type, amount, direction, reference_id, description, tx_hash, chain_mode, created_at)
         VALUES (?, ?, 'ESCROW_LOCK', ?, 'OUT', ?, ?, ?, ?, ?)`
      ).run(
        txRecordId,
        buyer.id,
        cleanAmount,
        orderId,
        `Thanh toán giữ chỗ (Escrow 48h): ${product.title}`,
        chainResult.txHash,
        chainResult.mode,
        nowIso
      );

      db.exec("COMMIT");
    } catch (txLogErr) {
      db.exec("ROLLBACK");
      throw txLogErr;
    }

    const updatedSummary = getUserWalletSummary(buyer.id);

    return NextResponse.json({
      success: true,
      message: `Đã giữ chỗ thành công! ${cleanAmount.toLocaleString("vi-VN")} UNIP được bảo vệ trong Escrow trong 48 giờ để hai bạn gặp mặt kiểm tra hàng.`,
      escrow: {
        id: orderId,
        productId: product.id,
        buyerId: buyer.id,
        buyerName: buyer.full_name,
        sellerId: product.seller_id,
        amount: cleanAmount,
        passportHash,
        status: "LOCKED",
        expiresAt: expiresAtIso,
        extendedCount: 0,
        meetingNote,
        lockTxHash: chainResult.txHash,
        lockExplorerUrl: chainResult.explorerUrl,
        chainMode: chainResult.mode,
        createdAt: nowIso,
      },
      newBalance: updatedSummary?.availableBalance ?? 0,
      walletSummary: updatedSummary,
    });
  } catch (err: any) {
    console.error("[POST /api/escrow] Error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo đơn thanh toán giữ chỗ." },
      { status: 500 }
    );
  }
}
