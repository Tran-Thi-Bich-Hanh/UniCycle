import crypto from "node:crypto";
import { Contract, JsonRpcProvider, Wallet, isAddress, zeroPadValue } from "ethers";
import {
  AVALANCHE_FUJI_CONFIG,
  UNIPOINT_ABI,
  getSnowtraceTxUrl,
} from "./contracts/unipoint-abi";

export interface ChainTxResult {
  txHash: string;
  mode: "ONCHAIN" | "SIMULATED";
  explorerUrl: string;
  chainId: number;
}

/**
 * Tự động khởi tạo một địa chỉ ví EVM (Avalanche C-Chain / Ethereum) riêng cho sinh viên
 * bằng thư viện chuẩn ethers.js (Wallet.createRandom).
 */
export function generateStudentWallet(): { address: string } {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
  };
}

/**
 * Chuẩn hóa khóa bí mật (MetaMask thường xuất 64 ký tự hex không có tiền tố 0x)
 */
function normalizePrivateKey(rawKey?: string): string | null {
  if (!rawKey) return null;
  const trimmed = rawKey.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  return /^0x[0-9a-fA-F]{64}$/.test(prefixed) ? prefixed : null;
}

/**
 * Chuẩn hóa mã băm Sổ đỏ (passport_hash) sang đúng chuẩn bytes32 (0x + 64 ký tự hex)
 */
export function normalizeBytes32Hash(hash?: string | null, fallbackSeed = "unicycle"): string {
  if (hash && /^0x[0-9a-fA-F]{64}$/.test(hash.trim())) {
    return hash.trim();
  }
  const digest = crypto.createHash("sha256").update(hash || fallbackSeed).digest("hex");
  return `0x${digest}`;
}

/**
 * Tạo mã giao dịch mô phỏng định dạng chuẩn 0x + 64 hex khi chạy ở môi trường chưa cấu hình khóa
 */
function createSimulatedTxHash(seed: string): string {
  const entropy = `${seed}:${Date.now()}:${crypto.randomBytes(8).toString("hex")}`;
  const digest = crypto.createHash("sha256").update(entropy).digest("hex");
  return `0x${digest}`;
}

/**
 * Khởi tạo kết nối Ví Chủ (Master Wallet) với hợp đồng UniCyclePoint trên mạng Avalanche Fuji
 */
export function getMasterContractClient(): {
  provider: JsonRpcProvider;
  masterWallet: Wallet;
  contract: Contract;
  contractAddress: string;
} | null {
  const contractAddress = (process.env.NEXT_PUBLIC_UNIP_CONTRACT_ADDRESS || "").trim();
  const privateKey = normalizePrivateKey(process.env.MASTER_WALLET_PRIVATE_KEY);

  if (!isAddress(contractAddress) || !privateKey) {
    return null;
  }

  const provider = new JsonRpcProvider(
    AVALANCHE_FUJI_CONFIG.rpcUrl,
    AVALANCHE_FUJI_CONFIG.chainId
  );
  const masterWallet = new Wallet(privateKey, provider);
  const contract = new Contract(contractAddress, UNIPOINT_ABI, masterWallet);

  return {
    provider,
    masterWallet,
    contract,
    contractAddress,
  };
}

/**
 * Kiểm tra trạng thái cấu hình kết nối Avalanche Fuji hiện tại
 */
export function getBlockchainStatus() {
  const client = getMasterContractClient();
  return {
    isLiveOnChain: Boolean(client),
    chainId: AVALANCHE_FUJI_CONFIG.chainId,
    networkName: AVALANCHE_FUJI_CONFIG.name,
    tokenSymbol: AVALANCHE_FUJI_CONFIG.tokenSymbol,
    contractAddress: client?.contractAddress || null,
    masterAddress: client?.masterWallet.address || null,
    explorerBaseUrl: AVALANCHE_FUJI_CONFIG.explorerBaseUrl,
  };
}

/**
 * 1. Đúc đồng UNIP (1 VNĐ = 1 UNIP) vào ví riêng của sinh viên sau khi nạp MoMo Test thành công
 */
export async function mintPointsOnChain(params: {
  userWallet: string;
  amount: number;
  momoOrderId: string;
}): Promise<ChainTxResult> {
  const { userWallet, amount, momoOrderId } = params;
  const cleanAmount = Math.round(amount);
  const client = getMasterContractClient();

  if (client && isAddress(userWallet)) {
    try {
      const tx = await client.contract.mintTopup(
        userWallet,
        BigInt(cleanAmount),
        momoOrderId
      );
      await tx.wait(1);
      return {
        txHash: tx.hash,
        mode: "ONCHAIN",
        explorerUrl: getSnowtraceTxUrl(tx.hash),
        chainId: AVALANCHE_FUJI_CONFIG.chainId,
      };
    } catch (err) {
      console.warn("[Blockchain] Lỗi gọi mintTopup trực tiếp, chuyển sang biên lai dự phòng:", err);
    }
  }

  const txHash = createSimulatedTxHash(`mint:${userWallet}:${cleanAmount}:${momoOrderId}`);
  return {
    txHash,
    mode: "SIMULATED",
    explorerUrl: getSnowtraceTxUrl(txHash),
    chainId: AVALANCHE_FUJI_CONFIG.chainId,
  };
}

/**
 * 2. Khóa điểm UNIP từ ví người mua vào Smart Contract kèm mã băm Sổ đỏ (Passport Hash)
 */
export async function lockEscrowOnChain(params: {
  orderId: string;
  buyerWallet: string;
  sellerWallet: string;
  amount: number;
  passportHash: string | null;
}): Promise<ChainTxResult> {
  const { orderId, buyerWallet, sellerWallet, amount, passportHash } = params;
  const cleanAmount = Math.round(amount);
  const bytes32Hash = normalizeBytes32Hash(passportHash, orderId);
  const client = getMasterContractClient();

  if (client && isAddress(buyerWallet) && isAddress(sellerWallet)) {
    try {
      const tx = await client.contract.lockEscrow(
        orderId,
        buyerWallet,
        sellerWallet,
        BigInt(cleanAmount),
        zeroPadValue(bytes32Hash, 32)
      );
      await tx.wait(1);
      return {
        txHash: tx.hash,
        mode: "ONCHAIN",
        explorerUrl: getSnowtraceTxUrl(tx.hash),
        chainId: AVALANCHE_FUJI_CONFIG.chainId,
      };
    } catch (err) {
      console.warn("[Blockchain] Lỗi gọi lockEscrow trực tiếp, chuyển sang biên lai dự phòng:", err);
    }
  }

  const txHash = createSimulatedTxHash(
    `lock:${orderId}:${buyerWallet}:${sellerWallet}:${cleanAmount}:${bytes32Hash}`
  );
  return {
    txHash,
    mode: "SIMULATED",
    explorerUrl: getSnowtraceTxUrl(txHash),
    chainId: AVALANCHE_FUJI_CONFIG.chainId,
  };
}

/**
 * 3. Giải ngân UNIP từ Smart Contract sang ví người bán khi người mua xác nhận đã nhận đúng đồ
 */
export async function releaseEscrowOnChain(params: {
  orderId: string;
}): Promise<ChainTxResult> {
  const { orderId } = params;
  const client = getMasterContractClient();

  if (client) {
    try {
      const tx = await client.contract.releaseEscrow(orderId);
      await tx.wait(1);
      return {
        txHash: tx.hash,
        mode: "ONCHAIN",
        explorerUrl: getSnowtraceTxUrl(tx.hash),
        chainId: AVALANCHE_FUJI_CONFIG.chainId,
      };
    } catch (err) {
      console.warn("[Blockchain] Lỗi gọi releaseEscrow trực tiếp, chuyển sang biên lai dự phòng:", err);
    }
  }

  const txHash = createSimulatedTxHash(`release:${orderId}`);
  return {
    txHash,
    mode: "SIMULATED",
    explorerUrl: getSnowtraceTxUrl(txHash),
    chainId: AVALANCHE_FUJI_CONFIG.chainId,
  };
}

/**
 * 4. Hoàn trả 100% UNIP từ Smart Contract về lại ví người mua khi hủy giao dịch
 */
export async function refundEscrowOnChain(params: {
  orderId: string;
}): Promise<ChainTxResult> {
  const { orderId } = params;
  const client = getMasterContractClient();

  if (client) {
    try {
      const tx = await client.contract.refundEscrow(orderId);
      await tx.wait(1);
      return {
        txHash: tx.hash,
        mode: "ONCHAIN",
        explorerUrl: getSnowtraceTxUrl(tx.hash),
        chainId: AVALANCHE_FUJI_CONFIG.chainId,
      };
    } catch (err) {
      console.warn("[Blockchain] Lỗi gọi refundEscrow trực tiếp, chuyển sang biên lai dự phòng:", err);
    }
  }

  const txHash = createSimulatedTxHash(`refund:${orderId}`);
  return {
    txHash,
    mode: "SIMULATED",
    explorerUrl: getSnowtraceTxUrl(txHash),
    chainId: AVALANCHE_FUJI_CONFIG.chainId,
  };
}

/**
 * Đọc số dư UNIP trực tiếp trên chuỗi Avalanche Fuji của một địa chỉ ví
 */
export async function getOnChainPointBalance(walletAddress: string): Promise<number | null> {
  const client = getMasterContractClient();
  if (!client || !isAddress(walletAddress)) return null;

  try {
    const rawBalance = await client.contract.balanceOf(walletAddress);
    return Number(rawBalance);
  } catch {
    return null;
  }
}

