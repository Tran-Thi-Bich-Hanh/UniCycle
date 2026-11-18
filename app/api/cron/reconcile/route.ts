import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { reconcileExpiredOrders } from "@/lib/utils/order-timeouts";
import { processItemChainQueue } from "@/lib/blockchain/relayer";

/**
 * GET /api/cron/reconcile
 * Cron Job định kỳ (hoặc Admin kích hoạt thủ công):
 * 1. Đối soát timeout đơn PENDING 48h (BR12), ACCEPTED meet_time+24h (BR37), WAITING_CONFIRMATION 48h (BR13)
 * 2. Mở khóa Blind Review 48h (BR14), hết hạn tin đăng 30 ngày (BR15), SLA 72h đơn DISPUTED
 * 3. Retry hàng đợi ChainTx (QUEUED / FAILED với attempts < 3) lên Avalanche Fuji (BR28)
 */
export async function GET(req: NextRequest) {
  try {
    // Tùy chọn kiểm tra CRON_SECRET nếu được cấu hình trên môi trường production (Vercel Cron)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      const querySecret = new URL(req.url).searchParams.get("secret");
      if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
        return NextResponse.json(
          { error: "Unauthorized cron invocation." },
          { status: 401 }
        );
      }
    }

    // 1. Chạy bộ đối soát tất cả timeout nghiệp vụ & SLA
    await reconcileExpiredOrders();

    // 2. Xử lý hàng đợi Relayer Avalanche Fuji (tối đa 5 item mỗi lượt để tránh timeout serverless)
    let processedItemsCount = 0;
    let confirmedTxsCount = 0;
    const errors: string[] = [];

    try {
      const pendingTxs = await prisma.chainTx.findMany({
        where: {
          status: { in: ["QUEUED", "FAILED"] },
          attempts: { lt: 3 },
        },
        select: { itemId: true },
        distinct: ["itemId"],
        take: 5,
      });

      for (const entry of pendingTxs) {
        const res = await processItemChainQueue(entry.itemId);
        processedItemsCount++;
        confirmedTxsCount += res.confirmedCount;
        if (res.errors.length > 0) {
          errors.push(...res.errors);
        }
      }
    } catch (chainErr) {
      console.warn("⚠️ Lỗi khi retry hàng đợi ChainTx trong cron:", chainErr);
      errors.push(chainErr instanceof Error ? chainErr.message : String(chainErr));
    }

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      blockchainSync: {
        processedItemsCount,
        confirmedTxsCount,
        errors,
      },
      message: `Đã hoàn tất đối soát timeout (BR12, BR13, BR14, BR15, BR37, SLA 72h) và đồng bộ ${confirmedTxsCount} giao dịch Fuji.`,
    });
  } catch (error) {
    console.error("Lỗi GET /api/cron/reconcile:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi chạy tác vụ đối soát định kỳ." },
      { status: 500 }
    );
  }
}
