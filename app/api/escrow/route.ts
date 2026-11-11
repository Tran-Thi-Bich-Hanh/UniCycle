import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import db, { ensureUserWallet, EscrowOrder } from "@/lib/db";
import { lockEscrowOnChain, normalizeBytes32Hash } from "@/lib/blockchain";
import { getSnowtraceTxUrl } from "@/lib/contracts/unipoint-abi";

/**
 * GET /api/escrow?productId=...
 * Lấy thông tin đơn đặt cọc đang hoạt động (LOCKED) hoặc đã hoàn tất (RELEASED) của một món đồ,
 * kèm theo số dư UNIP hiện tại của người đang xem để hiển thị khung Đặt cọc trên trang sản phẩm.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId")?.trim();
    const viewer = await getSessionUser();

    let viewerWallet: { wallet_address: string; point_balance: number } | null = null;
    if (viewer) {
      viewerWallet = ensureUserWallet(viewer.id);
    }

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
                s.full_name as seller_name
         FROM escrow_orders e
         LEFT JOIN users b ON e.buyer_id = b.id
         LEFT JOIN users s ON e.seller_id = s.id
         WHERE e.product_id = ? AND e.status IN ('LOCKED', 'RELEASED')
         ORDER BY CASE WHEN e.status = 'LOCKED' THEN 0 ELSE 1 END, e.created_at DESC
         LIMIT 1`
      )
      .get(productId) as
      | (EscrowOrder & {
          buyer_name?: string;
          buyer_university?: string;
          seller_name?: string;
        })
      | undefined;

    return NextResponse.json({
      escrow: activeOrLatestEscrow
        ? {
            ...activeOrLatestEscrow,
            lockExplorerUrl: activeOrLatestEscrow.lock_tx_hash
              ? getSnowtraceTxUrl(activeOrLatestEscrow.lock_tx_hash)
              : null,
            settleExplorerUrl: activeOrLatestEscrow.settle_tx_hash
              ? getSnowtraceTxUrl(activeOrLatestEscrow.settle_tx_hash)
              : null,
          }
        : null,
      viewerWallet: viewerWallet
        ? {
            userId: viewer!.id,
            address: viewerWallet.wallet_address,
            pointBalance: viewerWallet.point_balance,
          }
        : null,
    });
  } catch (err: any) {
    console.error("[GET /api/escrow] Error:", err);
    return NextResponse.json(
      { error: "Không thể tải thông tin đặt cọc." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/escrow
 * Đặt cọc giữ chỗ món đồ bằng đồng UNIP (1 VNĐ = 1 UNIP) và ghi vết mã băm Sổ đỏ (passport_hash)
 * lên mạng Avalanche Fuji Testnet.
 */
export async function POST(request: Request) {
  const buyer = await getSessionUser();
  if (!buyer) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để đặt cọc giữ chỗ món đồ." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";

    if (!productId) {
      return NextResponse.json(
        { error: "Thiếu mã sản phẩm cần đặt cọc." },
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
        { error: "Bạn là người đăng bán món đồ này nên không thể tự đặt cọc." },
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
        { error: "Món đồ miễn phí (0đ) không cần đặt cọc UNIP. Hãy liên hệ trực tiếp người tặng." },
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
          error: `Số dư Ví UniCycle của bạn không đủ. Cần thêm ${missing.toLocaleString("vi-VN")} UNIP để đặt cọc món đồ này.`,
          code: "INSUFFICIENT_BALANCE",
          requiredUnip: cleanAmount,
          currentBalance: buyerWallet.point_balance,
        },
        { status: 400 }
      );
    }

    const existingLocked = db
      .prepare("SELECT id FROM escrow_orders WHERE product_id = ? AND status = 'LOCKED'")
      .get(product.id);
    if (existingLocked) {
      return NextResponse.json(
        { error: "Món đồ này vừa được một bạn sinh viên khác đặt cọc giữ chỗ." },
        { status: 409 }
      );
    }

    const orderId = `esc_${crypto.randomBytes(8).toString("hex")}`;
    const passportHash = normalizeBytes32Hash(product.passport_hash, product.id);

    // Gọi Ví Chủ thực thi khóa UNIP kèm mã băm Sổ đỏ lên Avalanche Fuji
    const chainResult = await lockEscrowOnChain({
      orderId,
      buyerWallet: buyerWallet.wallet_address,
      sellerWallet: sellerWallet.wallet_address,
      amount: cleanAmount,
      passportHash,
    });

    const now = new Date().toISOString();
    const txRecordId = `ptx_${crypto.randomBytes(8).toString("hex")}`;

    db.exec("BEGIN");
    try {
      // 1. Trừ UNIP khỏi số dư khả dụng của người mua (chuyển vào hợp đồng giữ cọc)
      db.prepare(
        "UPDATE users SET point_balance = point_balance - ?, updated_at = ? WHERE id = ? AND point_balance >= ?"
      ).run(cleanAmount, now, buyer.id, cleanAmount);

      // 2. Tạo đơn đặt cọc giữ chỗ
      db.prepare(
        `INSERT INTO escrow_orders
          (id, product_id, buyer_id, seller_id, buyer_wallet, seller_wallet, amount, passport_hash, status, lock_tx_hash, settle_tx_hash, chain_mode, created_at, settled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'LOCKED', ?, NULL, ?, ?, NULL)`
      ).run(
        orderId,
        product.id,
        buyer.id,
        product.seller_id,
        buyerWallet.wallet_address,
        sellerWallet.wallet_address,
        cleanAmount,
        passportHash,
        chainResult.txHash,
        chainResult.mode,
        now
      );

      // 3. Lưu lịch sử biến động điểm cho người mua
      db.prepare(
        `INSERT INTO point_transactions
          (id, user_id, type, amount, direction, reference_id, description, tx_hash, chain_mode, created_at)
         VALUES (?, ?, 'ESCROW_LOCK', ?, 'OUT', ?, ?, ?, ?, ?)`
      ).run(
        txRecordId,
        buyer.id,
        cleanAmount,
        orderId,
        `Đặt cọc giữ chỗ: ${product.title}`,
        chainResult.txHash,
        chainResult.mode,
        now
      );

      // 4. Đổi trạng thái món đồ sang RESERVED (Đang giữ chỗ - khóa sửa bài đăng)
      db.prepare("UPDATE products SET status = 'RESERVED', updated_at = ? WHERE id = ?").run(
        now,
        product.id
      );

      db.exec("COMMIT");
    } catch (dbErr) {
      db.exec("ROLLBACK");
      throw dbErr;
    }

    const updatedBuyer = db
      .prepare("SELECT point_balance FROM users WHERE id = ?")
      .get(buyer.id) as { point_balance: number };

    return NextResponse.json({
      success: true,
      message: `Đã khóa cọc ${cleanAmount.toLocaleString("vi-VN")} UNIP trên Smart Contract! Món đồ đã được giữ chỗ cho bạn.`,
      escrow: {
        id: orderId,
        productId: product.id,
        buyerId: buyer.id,
        buyerName: buyer.full_name,
        sellerId: product.seller_id,
        amount: cleanAmount,
        passportHash,
        status: "LOCKED",
        lockTxHash: chainResult.txHash,
        lockExplorerUrl: chainResult.explorerUrl,
        chainMode: chainResult.mode,
        createdAt: now,
      },
      newBalance: updatedBuyer.point_balance,
    });
  } catch (err: any) {
    console.error("[POST /api/escrow] Error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo đơn đặt cọc giữ chỗ." },
      { status: 500 }
    );
  }
}

