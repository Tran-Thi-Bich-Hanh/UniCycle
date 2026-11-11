import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import db, { ensureUserWallet, PointTransaction, EscrowOrder } from "@/lib/db";
import { getBlockchainStatus, getOnChainPointBalance } from "@/lib/blockchain";
import { getSnowtraceAddressUrl, getSnowtraceTxUrl } from "@/lib/contracts/unipoint-abi";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để xem Ví UniCycle." },
      { status: 401 }
    );
  }

  try {
    const walletInfo = ensureUserWallet(user.id);
    if (!walletInfo) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin ví sinh viên." },
        { status: 404 }
      );
    }

    const transactions = db
      .prepare(
        `SELECT id, user_id, type, amount, direction, reference_id, description, tx_hash, chain_mode, created_at
         FROM point_transactions
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`
      )
      .all(user.id) as PointTransaction[];

    const escrows = db
      .prepare(
        `SELECT e.*,
                p.title as product_title,
                p.slug as product_slug,
                p.status as product_status,
                b.full_name as buyer_name,
                s.full_name as seller_name
         FROM escrow_orders e
         LEFT JOIN products p ON e.product_id = p.id
         LEFT JOIN users b ON e.buyer_id = b.id
         LEFT JOIN users s ON e.seller_id = s.id
         WHERE e.buyer_id = ? OR e.seller_id = ?
         ORDER BY e.created_at DESC
         LIMIT 30`
      )
      .all(user.id, user.id) as Array<
      EscrowOrder & {
        product_title?: string;
        product_slug?: string;
        product_status?: string;
        buyer_name?: string;
        seller_name?: string;
      }
    >;

    const blockchainStatus = getBlockchainStatus();
    const onChainBalance = blockchainStatus.isLiveOnChain
      ? await getOnChainPointBalance(walletInfo.wallet_address)
      : null;

    return NextResponse.json({
      wallet: {
        userId: user.id,
        fullName: user.full_name,
        university: user.university,
        address: walletInfo.wallet_address,
        addressExplorerUrl: getSnowtraceAddressUrl(walletInfo.wallet_address),
        pointBalance: walletInfo.point_balance,
        onChainBalance,
        exchangeRateText: "1 VNĐ = 1 UNIP",
      },
      blockchain: blockchainStatus,
      transactions: transactions.map((tx) => ({
        ...tx,
        explorerUrl: tx.tx_hash ? getSnowtraceTxUrl(tx.tx_hash) : null,
      })),
      escrows: escrows.map((esc) => ({
        ...esc,
        lockExplorerUrl: esc.lock_tx_hash ? getSnowtraceTxUrl(esc.lock_tx_hash) : null,
        settleExplorerUrl: esc.settle_tx_hash ? getSnowtraceTxUrl(esc.settle_tx_hash) : null,
      })),
    });
  } catch (err: any) {
    console.error("[GET /api/wallet] Error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải thông tin Ví UniCycle." },
      { status: 500 }
    );
  }
}

