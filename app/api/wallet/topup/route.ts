import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import db, { ensureUserWallet } from "@/lib/db";
import { mintPointsOnChain } from "@/lib/blockchain";

const MIN_TOPUP_VND = 10000;
const MAX_TOPUP_VND = 5000000;

/**
 * POST /api/wallet/topup
 * Hỗ trợ 2 chế độ:
 * 1. action = "INIT": Khởi tạo phiên thanh toán MoMo Test (trả về mã đơn MoMo Test & nội dung QR)
 * 2. action = "CONFIRM" (mặc định): Xác nhận thanh toán MoMo Test thành công (tiền VNĐ về Ví Chủ dự án)
 *    -> Ví Chủ tự động gọi Smart Contract đúc (mint) đúng số UNIP (1 VNĐ = 1 UNIP) vào ví riêng của sinh viên.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để nạp điểm vào Ví UniCycle." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const rawAmount = Number(body.amount);
    const action = (body.action || "CONFIRM").toUpperCase();

    if (!Number.isFinite(rawAmount) || rawAmount < MIN_TOPUP_VND || rawAmount > MAX_TOPUP_VND) {
      return NextResponse.json(
        {
          error: `Số tiền nạp phải từ ${MIN_TOPUP_VND.toLocaleString("vi-VN")}đ đến ${MAX_TOPUP_VND.toLocaleString("vi-VN")}đ.`,
        },
        { status: 400 }
      );
    }

    const cleanAmount = Math.round(rawAmount);
    const walletInfo = ensureUserWallet(user.id);
    if (!walletInfo) {
      return NextResponse.json(
        { error: "Không thể khởi tạo địa chỉ ví cho tài khoản này." },
        { status: 404 }
      );
    }

    const momoOrderId =
      typeof body.momoOrderId === "string" && body.momoOrderId.trim()
        ? body.momoOrderId.trim()
        : `MOMO_TEST_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Bước 1: Khởi tạo đơn MoMo Test để hiển thị giao diện QR / Cổng thanh toán MoMo Sandbox
    if (action === "INIT") {
      return NextResponse.json({
        success: true,
        momoSession: {
          momoOrderId,
          partnerCode: "MOMO_UNICYCLE_SANDBOX",
          merchantName: "Ví Chủ Quỹ Bảo Chứng UniCycle",
          amountVnd: cleanAmount,
          amountUnip: cleanAmount,
          recipientWallet: walletInfo.wallet_address,
          transferNote: `NAP UNIP ${user.id.slice(0, 8).toUpperCase()}`,
          createdAt: new Date().toISOString(),
        },
      });
    }

    // Bước 2: Xác nhận thanh toán MoMo Test thành công & Đúc đồng UNIP trên Avalanche Fuji
    const existingTx = db
      .prepare(
        "SELECT id FROM point_transactions WHERE reference_id = ? AND type = 'MOMO_TOPUP'"
      )
      .get(momoOrderId);

    if (existingTx) {
      return NextResponse.json(
        { error: "Mã giao dịch MoMo Test này đã được cộng điểm trước đó." },
        { status: 409 }
      );
    }

    // Gọi Ví Chủ đúc đồng UNIP vào địa chỉ ví riêng của sinh viên trên Avalanche Fuji
    const chainResult = await mintPointsOnChain({
      userWallet: walletInfo.wallet_address,
      amount: cleanAmount,
      momoOrderId,
    });

    const now = new Date().toISOString();
    const txId = `ptx_${crypto.randomBytes(8).toString("hex")}`;
    const description = `Nạp ${cleanAmount.toLocaleString("vi-VN")}đ qua MoMo Test (+${cleanAmount.toLocaleString("vi-VN")} UNIP)`;

    db.exec("BEGIN");
    try {
      db.prepare(
        "UPDATE users SET point_balance = COALESCE(point_balance, 0) + ?, updated_at = ? WHERE id = ?"
      ).run(cleanAmount, now, user.id);

      db.prepare(
        `INSERT INTO point_transactions
          (id, user_id, type, amount, direction, reference_id, description, tx_hash, chain_mode, created_at)
         VALUES (?, ?, 'MOMO_TOPUP', ?, 'IN', ?, ?, ?, ?, ?)`
      ).run(
        txId,
        user.id,
        cleanAmount,
        momoOrderId,
        description,
        chainResult.txHash,
        chainResult.mode,
        now
      );

      db.exec("COMMIT");
    } catch (dbErr) {
      db.exec("ROLLBACK");
      throw dbErr;
    }

    const updatedUser = db
      .prepare("SELECT point_balance, wallet_address FROM users WHERE id = ?")
      .get(user.id) as { point_balance: number; wallet_address: string };

    return NextResponse.json({
      success: true,
      message: `Đã nạp thành công ${cleanAmount.toLocaleString("vi-VN")} UNIP vào ví của bạn!`,
      topup: {
        id: txId,
        momoOrderId,
        amountVnd: cleanAmount,
        mintedUnip: cleanAmount,
        newBalance: updatedUser.point_balance,
        walletAddress: updatedUser.wallet_address,
        txHash: chainResult.txHash,
        chainMode: chainResult.mode,
        explorerUrl: chainResult.explorerUrl,
        createdAt: now,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/wallet/topup] Error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý nạp điểm MoMo Test." },
      { status: 500 }
    );
  }
}

