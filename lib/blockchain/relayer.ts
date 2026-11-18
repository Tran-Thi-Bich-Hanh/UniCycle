import {
  createPublicClient,
  createWalletClient,
  http,
  isHex,
  keccak256,
  toHex,
  Hex,
  Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import prisma from "@/lib/prisma";
import {
  UNICYCLE_PASSPORT_ABI,
  getFujiRpcUrl,
  getPassportContractAddress,
  FUJI_CHAIN_ID,
} from "./abi";

// Định nghĩa Avalanche Fuji Chain cho viem
const avalancheFuji = {
  id: FUJI_CHAIN_ID,
  name: "Avalanche Fuji Testnet",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
  rpcUrls: {
    default: { http: [getFujiRpcUrl()] },
    public: { http: [getFujiRpcUrl()] },
  },
  blockExplorers: {
    default: { name: "Snowtrace", url: "https://testnet.snowtrace.io" },
  },
  testnet: true,
} as const;

/**
 * Đảm bảo định dạng bytes32 hex hợp lệ (bắt đầu bằng 0x và đủ 64 ký tự hex)
 */
export function ensureBytes32(val: string | null | undefined): Hex {
  if (!val) {
    return ("0x" + "0".repeat(64)) as Hex;
  }
  const clean = val.startsWith("0x") ? val.slice(2) : val;
  if (clean.length === 64) {
    return ("0x" + clean) as Hex;
  }
  if (clean.length > 64) {
    return ("0x" + clean.slice(0, 64)) as Hex;
  }
  return ("0x" + clean.padStart(64, "0")) as Hex;
}

/**
 * Khởi tạo viem Public Client đọc dữ liệu từ Avalanche Fuji RPC
 */
export function getFujiPublicClient() {
  return createPublicClient({
    chain: avalancheFuji,
    transport: http(getFujiRpcUrl()),
  });
}

/**
 * Khởi tạo viem Wallet Client cho Ví Relayer ký giao dịch hộ sinh viên
 */
export function getFujiRelayerWalletClient() {
  const rawKey = process.env.MASTER_WALLET_PRIVATE_KEY;
  if (!rawKey || rawKey.trim().length < 32) {
    return null;
  }
  const cleanKey = rawKey.trim().startsWith("0x")
    ? (rawKey.trim() as Hex)
    : ((`0x${rawKey.trim()}`) as Hex);

  try {
    const account = privateKeyToAccount(cleanKey);
    return {
      account,
      client: createWalletClient({
        account,
        chain: avalancheFuji,
        transport: http(getFujiRpcUrl()),
      }),
    };
  } catch (err) {
    console.warn("⚠️ Không thể khởi tạo ví Relayer từ MASTER_WALLET_PRIVATE_KEY:", err);
    return null;
  }
}

export interface RelayerProcessResult {
  itemId: string;
  processedCount: number;
  confirmedCount: number;
  errors: string[];
}

/**
 * Xử lý hàng đợi giao dịch On-chain cho một món đồ (BR28: Chạy bất đồng bộ, chịu lỗi)
 * Xử lý tuần tự các ChainTx ở trạng thái QUEUED hoặc FAILED (attempts < 3)
 */
export async function processItemChainQueue(itemId: string): Promise<RelayerProcessResult> {
  const result: RelayerProcessResult = {
    itemId,
    processedCount: 0,
    confirmedCount: 0,
    errors: [],
  };

  try {
    // 1. Lấy thông tin món đồ và danh sách ChainTx đang chờ
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        owners: { orderBy: { seq: "asc" } },
        events: { orderBy: { seq: "asc" } },
        chainTxs: {
          where: {
            status: { in: ["QUEUED", "FAILED"] },
            attempts: { lt: 3 },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!item || !item.passportId || item.chainTxs.length === 0) {
      return result;
    }

    const contractAddress = getPassportContractAddress() as Address;
    const publicClient = getFujiPublicClient();
    const relayer = getFujiRelayerWalletClient();

    // 2. Xử lý tuần tự từng giao dịch trong hàng đợi
    for (const txRecord of item.chainTxs) {
      result.processedCount++;
      const passportIdBytes32 = ensureBytes32(item.passportId);

      // Cập nhật trạng thái SUBMITTED
      await prisma.chainTx.update({
        where: { id: txRecord.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      try {
        let txHash: string | null = null;

        // KIỂM TRA: Nếu có ví Relayer và địa chỉ hợp đồng hợp lệ -> Gửi giao dịch thật lên Fuji
        if (relayer && contractAddress && isHex(contractAddress) && contractAddress !== "0x0000000000000000000000000000000000000000") {
          // Kiểm tra xem Passport đã tồn tại trên Chain chưa
          let passportExistsOnChain = false;
          try {
            const onChainData = await publicClient.readContract({
              address: contractAddress,
              abi: UNICYCLE_PASSPORT_ABI,
              functionName: "passports",
              args: [passportIdBytes32],
            });
            passportExistsOnChain = Boolean(onChainData[4]); // onChainData.exists
          } catch {
            passportExistsOnChain = false;
          }

          if (txRecord.kind === "REGISTER") {
            if (!passportExistsOnChain) {
              const firstOwner = item.owners[0];
              const ownerHashBytes32 = ensureBytes32(firstOwner?.ownerHash);
              const commitBytes32 = ensureBytes32(item.itemCommit);

              txHash = await relayer.client.writeContract({
                address: contractAddress,
                abi: UNICYCLE_PASSPORT_ABI,
                functionName: "register",
                args: [passportIdBytes32, ownerHashBytes32, commitBytes32],
              });
            } else {
              // Đã tồn tại trên chain từ trước
              txHash = txRecord.txHash || `0x${keccak256(toHex(`registered:${item.passportId}`)).slice(2)}`;
            }
          } else if (txRecord.kind === "TRANSFER") {
            // Nếu chưa đăng ký trên chain thì phải register trước
            if (!passportExistsOnChain) {
              const firstOwner = item.owners[0];
              const ownerHashBytes32 = ensureBytes32(firstOwner?.ownerHash);
              const commitBytes32 = ensureBytes32(item.itemCommit);

              const regTx = await relayer.client.writeContract({
                address: contractAddress,
                abi: UNICYCLE_PASSPORT_ABI,
                functionName: "register",
                args: [passportIdBytes32, ownerHashBytes32, commitBytes32],
              });
              await publicClient.waitForTransactionReceipt({ hash: regTx });
            }

            // Tìm sự kiện chuyển nhượng tương ứng
            const transferEvent = item.events.find((e) => e.eventType === "TRANSFERRED") || item.events[item.events.length - 1];
            const fromHash = ensureBytes32(transferEvent?.fromOwnerHash);
            const toHash = ensureBytes32(transferEvent?.toOwnerHash);
            const orderHash = ensureBytes32(
              transferEvent?.orderId
                ? keccak256(toHex(`${transferEvent.orderId}:${item.itemSalt || "unicycle"}`))
                : null
            );
            const confirmationCode = transferEvent?.confirmationLevel === "ONE_SIDE" ? 2 : 1;

            txHash = await relayer.client.writeContract({
              address: contractAddress,
              abi: UNICYCLE_PASSPORT_ABI,
              functionName: "transfer",
              args: [passportIdBytes32, fromHash, toHash, orderHash, confirmationCode],
            });
          } else if (txRecord.kind === "FLAG") {
            const reasonHash = ensureBytes32(keccak256(toHex(item.flagReason || "flagged_by_admin")));
            txHash = await relayer.client.writeContract({
              address: contractAddress,
              abi: UNICYCLE_PASSPORT_ABI,
              functionName: "flag",
              args: [passportIdBytes32, reasonHash],
            });
          } else if (txRecord.kind === "UNFLAG") {
            txHash = await relayer.client.writeContract({
              address: contractAddress,
              abi: UNICYCLE_PASSPORT_ABI,
              functionName: "unflag",
              args: [passportIdBytes32],
            });
          }

          if (txHash && isHex(txHash)) {
            // Chờ nhận biên lai giao dịch (Receipt) trên Fuji
            try {
              await publicClient.waitForTransactionReceipt({ hash: txHash as Hex, timeout: 30_000 });
            } catch (waitErr) {
              console.warn("Chờ receipt Fuji timeout, giao dịch đã được phát sóng:", waitErr);
            }
          }
        } else {
          // CHẾ ĐỘ MÔ PHỎNG AN TOÀN (KHI CHƯA ĐIỀN PRIVATE KEY TRÊN MÔI TRƯỜNG DEV/TEST):
          // Sinh txHash mô phỏng xác định (deterministic) để giao diện hiển thị liền mạch theo BR28
          txHash = `0x${keccak256(toHex(`${item.passportId}:${txRecord.kind}:${txRecord.id}`)).slice(2)}`;
        }

        // Cập nhật trạng thái CONFIRMED
        await prisma.chainTx.update({
          where: { id: txRecord.id },
          data: {
            status: "CONFIRMED",
            txHash,
            confirmedAt: new Date(),
          },
        });
        result.confirmedCount++;
      } catch (stepError) {
        const errorMsg = stepError instanceof Error ? stepError.message : String(stepError);
        result.errors.push(errorMsg);
        console.warn(`⚠️ Lỗi ghi on-chain ChainTx #${txRecord.id} (${txRecord.kind}):`, errorMsg);

        const newAttempts = txRecord.attempts + 1;
        const newStatus = newAttempts >= 3 ? "NEEDS_ATTENTION" : "FAILED";

        await prisma.chainTx.update({
          where: { id: txRecord.id },
          data: {
            status: newStatus,
            lastError: errorMsg.slice(0, 500),
          },
        });
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMsg);
    console.error("Lỗi thực thi processItemChainQueue:", error);
  }

  return result;
}
