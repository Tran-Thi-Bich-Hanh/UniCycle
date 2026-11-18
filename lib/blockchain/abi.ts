/**
 * ABI và Cấu hình Avalanche Fuji C-Chain cho Smart Contract UniCyclePassport
 */

export const FUJI_CHAIN_ID = 43113;
export const DEFAULT_FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc";
export const SNOWTRACE_BASE_URL = "https://testnet.snowtrace.io";

export function getPassportContractAddress(): string {
  return (
    process.env.NEXT_PUBLIC_PASSPORT_CONTRACT_ADDRESS ||
    process.env.NEXT_PUBLIC_UNIP_CONTRACT_ADDRESS ||
    "0x54f7Ac97dd1491a35e142E06dfE18F8f17A177B4"
  );
}

export function getFujiRpcUrl(): string {
  return process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC || DEFAULT_FUJI_RPC;
}

export const UNICYCLE_PASSPORT_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "admin", type: "address", internalType: "address" },
      { name: "recorder", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPassport",
    inputs: [{ name: "passportId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "itemCommit", type: "bytes32", internalType: "bytes32" },
      { name: "currentOwner", type: "bytes32", internalType: "bytes32" },
      { name: "transferCount", type: "uint32", internalType: "uint32" },
      { name: "flagged", type: "bool", internalType: "bool" },
      { name: "exists", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "passports",
    inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "itemCommit", type: "bytes32", internalType: "bytes32" },
      { name: "currentOwner", type: "bytes32", internalType: "bytes32" },
      { name: "transferCount", type: "uint32", internalType: "uint32" },
      { name: "flagged", type: "bool", internalType: "bool" },
      { name: "exists", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "register",
    inputs: [
      { name: "passportId", type: "bytes32", internalType: "bytes32" },
      { name: "ownerHash", type: "bytes32", internalType: "bytes32" },
      { name: "itemCommit", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "passportId", type: "bytes32", internalType: "bytes32" },
      { name: "fromHash", type: "bytes32", internalType: "bytes32" },
      { name: "toHash", type: "bytes32", internalType: "bytes32" },
      { name: "orderHash", type: "bytes32", internalType: "bytes32" },
      { name: "confirmation", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "flag",
    inputs: [
      { name: "passportId", type: "bytes32", internalType: "bytes32" },
      { name: "reasonHash", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unflag",
    inputs: [{ name: "passportId", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "PassportRegistered",
    inputs: [
      { name: "passportId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "ownerHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "itemCommit", type: "bytes32", indexed: false, internalType: "bytes32" },
      { name: "timestamp", type: "uint64", indexed: false, internalType: "uint64" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "passportId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "fromHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "toHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "orderHash", type: "bytes32", indexed: false, internalType: "bytes32" },
      { name: "seq", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "confirmation", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "timestamp", type: "uint64", indexed: false, internalType: "uint64" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PassportFlagged",
    inputs: [
      { name: "passportId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "reasonHash", type: "bytes32", indexed: false, internalType: "bytes32" },
      { name: "timestamp", type: "uint64", indexed: false, internalType: "uint64" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PassportUnflagged",
    inputs: [
      { name: "passportId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "timestamp", type: "uint64", indexed: false, internalType: "uint64" },
    ],
    anonymous: false,
  },
] as const;
