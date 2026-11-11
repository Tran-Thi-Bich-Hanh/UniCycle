import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import db, { ensureUserWallet, getUserWalletSummary, TopupRequest } from "@/lib/db";
import { mintPointsOnChain } from "@/lib/blockchain";

const MIN_TOPUP_VND = 10000;
const MAX_TOPUP_VND = 5000000;
const TOPUP_TTL_MINUTES = 15;

function generateUniqueReferenceCode(): string {
  for (let i = 0; i < 10; i++) {
    const code = `UC-${crypto.randomInt(100000, 999999)}`;
    const existing = db
      .prepare("SELECT id FROM topup_requests WHERE reference_code = ?")
      .get(code);
    if (!existing) return code;
  }
  return `UC-${Date.now().toString().slice(-6)}`;
}

/**
 * POST /api/wallet/topup
 * Quy trình nạp điểm 2 bước chuẩn ngân hàng số (PENDING -> CONFIRMED / EXPIRED / CANCELLED):
 * 1. action = "CREATE_INTENT" | "INIT":
 *    Khởi tạo lệnh nạp PENDING trong bảng topup_requests kèm mã đối soát UC-XXXXXX và hạn 15 phút.
 * 2. action = "CONFIRM_TOPUP" | "CONFIRM":
 *    Kiểm tra lệnh nạp PENDING còn hiệu lực -> Ví Chủ mint UNIP trên Avalanche Fuji -> Cộng vào số dư khả dụng.
 * 3. action = "CANCEL_TOPUP" | "CANCEL":
 *    Hủy lệnh nạp đang chờ.
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
    const action = String(body.action || "CONFIRM").trim().toUpperCase();
    const walletInfo = ensureUserWallet(user.id);

    if (!walletInfo) {
      return NextResponse.json(
        { error: "Không thể khởi tạo địa chỉ ví cho tài khoản này." },
        { status: 404 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Tự động đóng các lệnh nạp đã quá hạn 15 phút của người dùng này
    db.prepare(
      "UPDATE topup_requests SET status = 'EXPIRED' WHERE user_id = ? AND status = 'PENDING' AND expires_at < ?"
    ).run(user.id, nowIso);

    // =========================================================================
    // 1. HỦY LỆNH NẠP ĐANG CHỜ (CANCEL_TOPUP / CANCEL)
    // =========================================================================
    if (action === "CANCEL_TOPUP" || action === "CANCEL") {
      const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
      const referenceCode =
        typeof body.referenceCode === "string"
          ? body.referenceCode.trim()
          : typeof body.momoOrderId === "string"
          ? body.momoOrderId.trim()
          : "";

      if (requestId) {
        db.prepare(
          "UPDATE topup_requests SET status = 'CANCELLED' WHERE id = ? AND user_id = ? AND status = 'PENDING'"
        ).run(requestId, user.id);
      } else if (referenceCode) {
        db.prepare(
          "UPDATE topup_requests SET status = 'CANCELLED' WHERE reference_code = ? AND user_id = ? AND status = 'PENDING'"
        ).run(referenceCode, user.id);
      } else {
        db.prepare(
          "UPDATE topup_requests SET status = 'CANCELLED' WHERE user_id = ? AND status = 'PENDING'"
        ).run(user.id);
      }

      return NextResponse.json({
        success: true,
        message: "Đã hủy mã nạp điểm đang chờ.",
      });
    }

    // =========================================================================
    // 2. BƯỚC 1: TẠO MÃ NẠP ĐIỂM (CREATE_INTENT / INIT)
    // =========================================================================
    if (action === "CREATE_INTENT" || action === "INIT") {
      const rawAmount = Number(body.amount);
      if (
        !Number.isFinite(rawAmount) ||
        rawAmount < MIN_TOPUP_VND ||
        rawAmount > MAX_TOPUP_VND
      ) {
        return NextResponse.json(
          {
            error: `Số tiền nạp phải từ ${MIN_TOPUP_VND.toLocaleString("vi-VN")}đ đến ${MAX_TOPUP_VND.toLocaleString("vi-VN")}đ.`,
          },
          { status: 400 }
        );
      }

      if (Math.round(rawAmount) % 1000 !== 0) {
        return NextResponse.json(
          {
            error: "Số tiền nạp phải là bội số của 1.000đ (ví dụ: 15.000đ, 50.000đ).",
          },
          { status: 400 }
        );
      }

      const cleanAmount = Math.round(rawAmount);

      // Hủy các lệnh PENDING cũ trước khi tạo mã nạp mới để tránh nhầm lẫn mã chuyển khoản
      db.prepare(
        "UPDATE topup_requests SET status = 'CANCELLED' WHERE user_id = ? AND status = 'PENDING'"
      ).run(user.id);

      const requestId = `top_${crypto.randomBytes(8).toString("hex")}`;
      const referenceCode = generateUniqueReferenceCode();
      const expiresAt = new Date(now.getTime() + TOPUP_TTL_MINUTES * 60 * 1000).toISOString();

      db.prepare(
        `INSERT INTO topup_requests
          (id, user_id, amount, reference_code, status, tx_hash, chain_mode, expires_at, confirmed_at, created_at)
         VALUES (?, ?, ?, ?, 'PENDING', NULL, 'ONCHAIN', ?, NULL, ?)`
      ).run(requestId, user.id, cleanAmount, referenceCode, expiresAt, nowIso);

      return NextResponse.json({
        success: true,
        topupRequest: {
          id: requestId,
          userId: user.id,
          amountVnd: cleanAmount,
          amountUnip: cleanAmount,
          referenceCode,
          status: "PENDING",
          recipientWallet: walletInfo.wallet_address,
          merchantName: "Quỹ Bảo Chứng Điểm UniCycle",
          expiresAt,
          createdAt: nowIso,
        },
        momoSession: {
          requestId,
          momoOrderId: referenceCode,
          partnerCode: "UNICYCLE_CAMPUS_TOPUP",
          merchantName: "Quỹ Bảo Chứng Điểm UniCycle",
          amountVnd: cleanAmount,
          amountUnip: cleanAmount,
          recipientWallet: walletInfo.wallet_address,
          transferNote: referenceCode,
          expiresAt,
          createdAt: nowIso,
        },
      });
    }

    // =========================================================================
    // 3. BƯỚC 2: XÁC NHẬN ĐÃ CHUYỂN KHOẢN & CỘNG ĐIỂM (CONFIRM_TOPUP / CONFIRM)
    // =========================================================================
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    const inputReference =
      typeof body.referenceCode === "string" && body.referenceCode.trim()
        ? body.referenceCode.trim()
        : typeof body.momoOrderId === "string" && body.momoOrderId.trim()
        ? body.momoOrderId.trim()
        : "";

    let pendingReq: TopupRequest | undefined;

    if (requestId) {
      pendingReq = db
        .prepare("SELECT * FROM topup_requests WHERE id = ? AND user_id = ?")
        .get(requestId, user.id) as TopupRequest | undefined;
    } else if (inputReference) {
      pendingReq = db
        .prepare("SELECT * FROM topup_requests WHERE reference_code = ? AND user_id = ?")
        .get(inputReference, user.id) as TopupRequest | undefined;
    } else {
      pendingReq = db
        .prepare(
          "SELECT * FROM topup_requests WHERE user_id = ? AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1"
        )
        .get(user.id) as TopupRequest | undefined;
    }

    let cleanAmount: number;
    let finalReferenceCode: string;
    let finalRequestId: string | null = null;

    if (pendingReq) {
      if (pendingReq.status === "CONFIRMED") {
        return NextResponse.json(
          { error: "Mã nạp điểm này đã được xác nhận và cộng điểm trước đó." },
          { status: 409 }
        );
      }

      if (pendingReq.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Mã nạp điểm này đã bị hủy. Vui lòng tạo mã nạp mới." },
          { status: 400 }
        );
      }

      if (
        pendingReq.status === "EXPIRED" ||
        Date.parse(pendingReq.expires_at) < now.getTime()
      ) {
        db.prepare("UPDATE topup_requests SET status = 'EXPIRED' WHERE id = ?").run(
          pendingReq.id
        );
        return NextResponse.json(
          {
            error: "Mã nạp điểm đã hết hạn hiệu lực (15 phút). Vui lòng tạo mã nạp mới.",
          },
          { status: 400 }
        );
      }

      cleanAmount = Number(pendingReq.amount);
      finalReferenceCode = pendingReq.reference_code;
      finalRequestId = pendingReq.id;
    } else {
      // Fallback tương thích nếu client gửi trực tiếp amount + momoOrderId
      const rawAmount = Number(body.amount);
      if (
        !Number.isFinite(rawAmount) ||
        rawAmount < MIN_TOPUP_VND ||
        rawAmount > MAX_TOPUP_VND
      ) {
        return NextResponse.json(
          {
            error: `Số tiền nạp phải từ ${MIN_TOPUP_VND.toLocaleString("vi-VN")}đ đến ${MAX_TOPUP_VND.toLocaleString("vi-VN")}đ.`,
          },
          { status: 400 }
        );
      }
      cleanAmount = Math.round(rawAmount);
      finalReferenceCode = inputReference || generateUniqueReferenceCode();
    }

    const existingTx = db
      .prepare(
        "SELECT id FROM point_transactions WHERE reference_id = ? AND type = 'MOMO_TOPUP'"
      )
      .get(finalReferenceCode);

    if (existingTx) {
      return NextResponse.json(
        { error: "Mã đối soát nạp điểm này đã được cộng điểm trước đó." },
        { status: 409 }
      );
    }

    // Gọi Ví Chủ đúc đồng UNIP vào địa chỉ ví riêng của sinh viên trên Avalanche Fuji
    const chainResult = await mintPointsOnChain({
      userWallet: walletInfo.wallet_address,
      amount: cleanAmount,
      momoOrderId: finalReferenceCode,
    });

    const txId = `ptx_${crypto.randomBytes(8).toString("hex")}`;
    const description = `Nạp điểm vào ví (${finalReferenceCode}): +${cleanAmount.toLocaleString("vi-VN")} UNIP`;

    db.exec("BEGIN IMMEDIATE");
    try {
      if (finalRequestId) {
        const updateReq = db
          .prepare(
            `UPDATE topup_requests
             SET status = 'CONFIRMED', tx_hash = ?, chain_mode = ?, confirmed_at = ?
             WHERE id = ? AND status = 'PENDING'`
          )
          .run(chainResult.txHash, chainResult.mode, nowIso, finalRequestId);

        if (updateReq.changes === 0) {
          throw new Error("TOPUP_ALREADY_PROCESSED");
        }
      } else {
        const autoReqId = `top_${crypto.randomBytes(8).toString("hex")}`;
        db.prepare(
          `INSERT INTO topup_requests
            (id, user_id, amount, reference_code, status, tx_hash, chain_mode, expires_at, confirmed_at, created_at)
           VALUES (?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, ?)`
        ).run(
          autoReqId,
          user.id,
          cleanAmount,
          finalReferenceCode,
          chainResult.txHash,
          chainResult.mode,
          nowIso,
          nowIso,
          nowIso
        );
      }

      db.prepare(
        "UPDATE users SET point_balance = COALESCE(point_balance, 0) + ?, updated_at = ? WHERE id = ?"
      ).run(cleanAmount, nowIso, user.id);

      db.prepare(
        `INSERT INTO point_transactions
          (id, user_id, type, amount, direction, reference_id, description, tx_hash, chain_mode, created_at)
         VALUES (?, ?, 'MOMO_TOPUP', ?, 'IN', ?, ?, ?, ?, ?)`
      ).run(
        txId,
        user.id,
        cleanAmount,
        finalReferenceCode,
        description,
        chainResult.txHash,
        chainResult.mode,
        nowIso
      );

      db.exec("COMMIT");
    } catch (dbErr: any) {
      db.exec("ROLLBACK");
      if (dbErr?.message === "TOPUP_ALREADY_PROCESSED") {
        return NextResponse.json(
          { error: "Lệnh nạp điểm này vừa được xử lý." },
          { status: 409 }
        );
      }
      throw dbErr;
    }

    const summary = getUserWalletSummary(user.id);

    return NextResponse.json({
      success: true,
      message: `Đã xác nhận nạp thành công +${cleanAmount.toLocaleString("vi-VN")} UNIP (Mã: ${finalReferenceCode})!`,
      topup: {
        id: txId,
        momoOrderId: finalReferenceCode,
        referenceCode: finalReferenceCode,
        amountVnd: cleanAmount,
        mintedUnip: cleanAmount,
        newBalance: summary?.availableBalance ?? 0,
        availableBalance: summary?.availableBalance ?? 0,
        lockedBalance: summary?.lockedBalance ?? 0,
        totalBalance: summary?.totalBalance ?? 0,
        walletAddress: summary?.wallet_address ?? walletInfo.wallet_address,
        txHash: chainResult.txHash,
        chainMode: chainResult.mode,
        explorerUrl: chainResult.explorerUrl,
        createdAt: nowIso,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/wallet/topup] Error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý nạp điểm vào Ví UniCycle." },
      { status: 500 }
    );
  }
}
