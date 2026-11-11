// Cấu hình mạng Avalanche Fuji Testnet & ABI rút gọn của hợp đồng UniCyclePoint (UNIP)

export const AVALANCHE_FUJI_CONFIG = {
  chainId: 43113,
  chainIdHex: "0xA869",
  name: "Avalanche Fuji C-Chain",
  rpcUrl:
    process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC ||
    "https://api.avax-test.network/ext/bc/C/rpc",
  explorerBaseUrl: "https://testnet.snowtrace.io",
  currencySymbol: "AVAX",
  tokenName: "UniCycle Point",
  tokenSymbol: "UNIP",
  decimals: 0,
};

export const UNIPOINT_ABI = [
  // ERC-20 standard functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function owner() view returns (address)",

  // UniCyclePoint custom functions (Master Wallet / Owner relayer)
  "function mintTopup(address to, uint256 amount, string momoOrderId) external",
  "function lockEscrow(string orderId, address buyer, address seller, uint256 amount, bytes32 passportHash) external",
  "function releaseEscrow(string orderId) external",
  "function refundEscrow(string orderId) external",
  "function getEscrow(string orderId) view returns (address buyer, address seller, uint256 amount, bytes32 passportHash, uint8 status, uint256 createdAt, uint256 settledAt)",
  "function processedMomoOrders(bytes32 momoKey) view returns (bool)",

  // Events
  "event MomoTopupMinted(address indexed userWallet, uint256 amount, string momoOrderId, uint256 timestamp)",
  "event EscrowLocked(string orderId, address indexed buyer, address indexed seller, uint256 amount, bytes32 indexed passportHash, uint256 timestamp)",
  "event EscrowReleased(string orderId, address indexed buyer, address indexed seller, uint256 amount, bytes32 indexed passportHash, uint256 timestamp)",
  "event EscrowRefunded(string orderId, address indexed buyer, address indexed seller, uint256 amount, bytes32 indexed passportHash, uint256 timestamp)",
] as const;

export function getSnowtraceTxUrl(txHash: string): string {
  return `${AVALANCHE_FUJI_CONFIG.explorerBaseUrl}/tx/${txHash}`;
}

export function getSnowtraceAddressUrl(address: string): string {
  return `${AVALANCHE_FUJI_CONFIG.explorerBaseUrl}/address/${address}`;
}

