import { NextRequest, NextResponse } from "next/server";
import { verifyPassportOnChain } from "@/lib/blockchain/verifier";
import { processItemChainQueue } from "@/lib/blockchain/relayer";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/passport/[id]/verify
 * Kiểm chứng trực tiếp đối chiếu dữ liệu giữa Database Off-chain và Avalanche Fuji RPC
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const report = await verifyPassportOnChain(id);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Lỗi khi kiểm chứng On-chain:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Đã xảy ra lỗi khi kiểm chứng dữ liệu on-chain.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/passport/[id]/verify
 * Kích hoạt Relayer đồng bộ ngay lập tức các giao dịch QUEUED/FAILED lên Avalanche Fuji Testnet
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Tìm món đồ
    const item = await prisma.item.findFirst({
      where: {
        OR: [{ id }, { passportId: id }],
      },
      select: { id: true, passportId: true },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Không tìm thấy món đồ hoặc Hộ chiếu hợp lệ." },
        { status: 404 }
      );
    }

    // Chạy Relayer xử lý hàng đợi
    const syncResult = await processItemChainQueue(item.id);

    // Chạy lại kiểm chứng sau khi đồng bộ
    const report = await verifyPassportOnChain(item.id);

    return NextResponse.json({
      message: "Đồng bộ giao dịch lên Avalanche Fuji thành công!",
      syncResult,
      report,
    });
  } catch (error) {
    console.error("Lỗi khi kích hoạt Relayer đồng bộ:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Đã xảy ra lỗi khi đồng bộ giao dịch lên blockchain.",
      },
      { status: 500 }
    );
  }
}
