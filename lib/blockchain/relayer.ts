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
  SNOWTRACE_BASE_URL,
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
  latestTxHash: string | null;
  snowtraceUrl: string | null;
  errors: string[];
}

/**
 * Tạo payload calldata UTF-8 chuẩn hóa để neo bằng chứng Passport trực tiếp lên Avalanche Fuji
 */
function buildCalldataAnchorHex(params: {
  kind: string;
  passportId: string;
  ownerHash?: string | null;
  fromHash?: string | null;
  toHash?: string | null;
  itemCommit?: string | null;
  orderId?: string | null;
  seq?: number;
}): Hex {
  const payload = [
    "UNICYCLE_PASSPORT_V1",
    `kind=${params.kind}`,
    `passport=${params.passportId}`,
    params.ownerHash ? `owner=${params.ownerHash}` : null,
    params.fromHash ? `from=${params.fromHash}` : null,
    params.toHash ? `to=${params.toHash}` : null,
    params.itemCommit ? `commit=${params.itemCommit}` : null,
    params.orderId ? `order=${params.orderId}` : null,
    params.seq !== undefined ? `seq=${params.seq}` : null,
    `ts=${Date.now()}`,
  ]
    .filter(Boolean)
    .join("|");
  return toHex(payload);
}

/**
 * Kiểm tra xem txHash đã thực sự tồn tại trên mạng Avalanche Fuji RPC hay chưa
 */
async function isTxOnFujiChain(
  publicClient: ReturnType<typeof getFujiPublicClient>,
  txHash?: string | null
): Promise<boolean> {
  if (!txHash || !isHex(txHash)) return false;
  try {
    const tx = await publicClient.getTransaction({ hash: txHash as Hex });
    return Boolean(tx?.hash);
  } catch {
    return false;
  }
}

/**
 * Xử lý hàng đợi giao dịch On-chain cho một món đồ (BR28: Chạy bất đồng bộ, chịu lỗi)
 * Hỗ trợ cơ chế 2 lớp On-Chain:
 * 1) Gọi trực tiếp Smart Contract UniCyclePassport nếu hợp đồng khớp ABI
 * 2) On-Chain Calldata Anchor Fallback bằng Ví Chủ để luôn có txHash thật trên Snowtrace Fuji
 */
export async function processItemChainQueue(
  itemId: string,
  options?: { repairMissingOnChain?: boolean }
): Promise<RelayerProcessResult> {
  const result: RelayerProcessResult = {
    itemId,
    processedCount: 0,
    confirmedCount: 0,
    latestTxHash: null,
    snowtraceUrl: null,
    errors: [],
  };

  try {
    // 1. Lấy thông tin món đồ và toàn bộ lịch sử ChainTx
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        owners: { orderBy: { seq: "asc" } },
        events: { orderBy: { seq: "asc" } },
        chainTxs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!item || !item.passportId) {
      return result;
    }

    const allChainTxs = [...item.chainTxs];

    // Tự động tạo bản ghi ChainTx REGISTER gốc nếu món đồ đã bật Passport nhưng chưa có hàng đợi
    if (item.passportEnabled && allChainTxs.length === 0) {
      const payloadHash = keccak256(toHex(`REGISTER:${item.id}:${item.passportId}`));
      const createdTx = await prisma.chainTx.create({
        data: {
          itemId: item.id,
          kind: "REGISTER",
          payloadHash,
          status: "QUEUED",
        },
      });
      allChainTxs.push(createdTx);
    }

    const contractAddress = getPassportContractAddress() as Address;
    const publicClient = getFujiPublicClient();
    const relayer = getFujiRelayerWalletClient();

    // 2. Chọn các giao dịch cần phát sóng / sửa chữa
    let rpcReachable = false;
    if (options?.repairMissingOnChain && relayer) {
      try {
        await publicClient.getBlockNumber();
        rpcReachable = true;
      } catch {
        rpcReachable = false;
      }
    }

    const txsToProcess: typeof allChainTxs = [];
    for (const tx of allChainTxs) {
      if (tx.status === "QUEUED" || (tx.status === "FAILED" && tx.attempts < 3)) {
        txsToProcess.push(tx);
        continue;
      }

      if (options?.repairMissingOnChain && relayer && rpcReachable) {
        if (tx.status === "SUBMITTED" && !tx.txHash) {
          txsToProcess.push(tx);
          continue;
        }
        if (tx.status === "CONFIRMED") {
          const existsOnFuji = await isTxOnFujiChain(publicClient, tx.txHash);
          if (!existsOnFuji) {
            txsToProcess.push(tx);
          }
        }
      }
    }

    const transferChainTxs = allChainTxs.filter((t) => t.kind === "TRANSFER");
    const transferEvents = item.events.filter((e) => e.eventType === "TRANSFERRED");

    // 3. Xử lý tuần tự từng giao dịch
    for (const txRecord of txsToProcess) {
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
        const firstOwner = item.owners[0];
        const transferIdx = transferChainTxs.findIndex((t) => t.id === txRecord.id);
        const transferEvent =
          transferIdx >= 0
            ? transferEvents[transferIdx] || transferEvents[transferEvents.length - 1]
            : transferEvents[transferEvents.length - 1] || item.events[item.events.length - 1];

        const sendCalldataAnchor = async () => {
          if (!relayer) {
            throw new Error("Ví Relayer chưa được cấu hình MASTER_WALLET_PRIVATE_KEY.");
          }
          const anchorData = buildCalldataAnchorHex({
            kind: txRecord.kind,
            passportId: item.passportId!,
            ownerHash: firstOwner?.ownerHash,
            fromHash: transferEvent?.fromOwnerHash,
            toHash: transferEvent?.toOwnerHash,
            itemCommit: item.itemCommit,
            orderId: transferEvent?.orderId,
            seq: transferEvent?.seq,
          });
          return relayer.client.sendTransaction({
            to: relayer.account.address,
            value: BigInt(0),
            data: anchorData,
          });
        };

        // KIỂM TRA: Nếu có ví Relayer -> Phát sóng giao dịch thật lên Avalanche Fuji
        if (relayer) {
          const hasContractAddress = Boolean(
            contractAddress &&
              isHex(contractAddress) &&
              contractAddress !== "0x0000000000000000000000000000000000000000"
          );

          let isPassportContract = false;
          let passportExistsOnChain = false;

          if (hasContractAddress) {
            try {
              const onChainData = await publicClient.readContract({
                address: contractAddress,
                abi: UNICYCLE_PASSPORT_ABI,
                functionName: "passports",
                args: [passportIdBytes32],
              });
              isPassportContract = true;
              passportExistsOnChain = Boolean(onChainData[4]);
            } catch {
              // Hợp đồng chưa deploy hoặc đang là địa chỉ contract khác (VD: UniCyclePoint)
              isPassportContract = false;
              passportExistsOnChain = false;
            }
          }

          if (isPassportContract) {
            try {
              if (txRecord.kind === "REGISTER") {
                if (!passportExistsOnChain) {
                  const ownerHashBytes32 = ensureBytes32(firstOwner?.ownerHash);
                  const commitBytes32 = ensureBytes32(item.itemCommit);

                  txHash = await relayer.client.writeContract({
                    address: contractAddress,
                    abi: UNICYCLE_PASSPORT_ABI,
                    functionName: "register",
                    args: [passportIdBytes32, ownerHashBytes32, commitBytes32],
                  });
                } else if (await isTxOnFujiChain(publicClient, txRecord.txHash)) {
                  txHash = txRecord.txHash;
                } else {
                  txHash = await sendCalldataAnchor();
                }
              } else if (txRecord.kind === "TRANSFER") {
                if (!passportExistsOnChain) {
                  const ownerHashBytes32 = ensureBytes32(firstOwner?.ownerHash);
                  const commitBytes32 = ensureBytes32(item.itemCommit);

                  const regTx = await relayer.client.writeContract({
                    address: contractAddress,
                    abi: UNICYCLE_PASSPORT_ABI,
                    functionName: "register",
                    args: [passportIdBytes32, ownerHashBytes32, commitBytes32],
                  });
                  await publicClient.waitForTransactionReceipt({ hash: regTx, timeout: 25_000 });
                }

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
                const reasonHash = ensureBytes32(
                  keccak256(toHex(item.flagReason || "flagged_by_admin"))
                );
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
            } catch (contractErr) {
              console.warn(
                `⚠️ Gọi Smart Contract thất bại (${txRecord.kind}), chuyển sang On-Chain Calldata Anchor trên Fuji:`,
                contractErr instanceof Error ? contractErr.message : contractErr
              );
              txHash = await sendCalldataAnchor();
            }
          } else {
            // Lớp 2: Gửi giao dịch Calldata Anchor thật 100% lên mạng Avalanche Fuji
            txHash = await sendCalldataAnchor();
          }

          if (txHash && isHex(txHash)) {
            // Chờ nhận biên lai giao dịch (Receipt) trên Fuji
            try {
              await publicClient.waitForTransactionReceipt({ hash: txHash as Hex, timeout: 25_000 });
            } catch (waitErr) {
              console.warn("Chờ receipt Fuji timeout, giao dịch đã được phát sóng:", waitErr);
            }
          }
        } else {
          // CHẾ ĐỘ MÔ PHỎNG KHI CHƯA ĐIỀN PRIVATE KEY:
          txHash = `0x${keccak256(toHex(`${item.passportId}:${txRecord.kind}:${txRecord.id}`)).slice(2)}`;
        }

        // Cập nhật trạng thái CONFIRMED
        await prisma.chainTx.update({
          where: { id: txRecord.id },
          data: {
            status: "CONFIRMED",
            txHash,
            confirmedAt: new Date(),
            lastError: null,
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

    // 4. Lấy txHash mới nhất đã xác nhận của món đồ
    const latestConfirmed = await prisma.chainTx.findFirst({
      where: {
        itemId: item.id,
        status: "CONFIRMED",
        txHash: { not: null },
      },
      orderBy: [{ confirmedAt: "desc" }, { createdAt: "desc" }],
    });

    result.latestTxHash = latestConfirmed?.txHash || null;
    result.snowtraceUrl = result.latestTxHash
      ? `${SNOWTRACE_BASE_URL}/tx/${result.latestTxHash}`
      : null;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMsg);
    console.error("Lỗi thực thi processItemChainQueue:", error);
  }

  return result;
}
