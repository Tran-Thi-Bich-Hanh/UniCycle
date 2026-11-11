"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toast, useToast } from "@/components/toast";
import {
  IconWallet,
  IconShieldCheck,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconClock,
  IconRefresh,
  IconLock,
  IconArrowRight,
} from "@/components/icons";
import { formatCurrencyVND, formatRelativeTime } from "@/lib/utils";

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000, 500000];

interface WalletData {
  userId: string;
  fullName: string;
  university: string | null;
  address: string;
  addressExplorerUrl: string;
  pointBalance: number;
  onChainBalance: number | null;
  exchangeRateText: string;
}

interface BlockchainMeta {
  isLiveOnChain: boolean;
  chainId: number;
  networkName: string;
  tokenSymbol: string;
  contractAddress: string | null;
  masterAddress: string | null;
  explorerBaseUrl: string;
}

interface PointTxItem {
  id: string;
  type: "MOMO_TOPUP" | "ESCROW_LOCK" | "ESCROW_RELEASE" | "ESCROW_REFUND";
  amount: number;
  direction: "IN" | "OUT";
  reference_id: string | null;
  description: string;
  tx_hash: string | null;
  chain_mode: "ONCHAIN" | "SIMULATED";
  created_at: string;
  explorerUrl: string | null;
}

interface EscrowItem {
  id: string;
  product_id: string;
  product_title?: string;
  buyer_id: string;
  seller_id: string;
  buyer_name?: string;
  seller_name?: string;
  amount: number;
  passport_hash: string;
  status: "LOCKED" | "RELEASED" | "REFUNDED";
  lock_tx_hash: string | null;
  settle_tx_hash: string | null;
  lockExplorerUrl: string | null;
  settleExplorerUrl: string | null;
  created_at: string;
}

interface MomoSession {
  momoOrderId: string;
  partnerCode: string;
  merchantName: string;
  amountVnd: number;
  amountUnip: number;
  recipientWallet: string;
  transferNote: string;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [blockchain, setBlockchain] = useState<BlockchainMeta | null>(null);
  const [transactions, setTransactions] = useState<PointTxItem[]>([]);
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [momoSession, setMomoSession] = useState<MomoSession | null>(null);
  const [initializingMomo, setInitializingMomo] = useState(false);
  const [confirmingMomo, setConfirmingMomo] = useState(false);
  const [lastMintedReceipt, setLastMintedReceipt] = useState<{
    amountUnip: number;
    txHash: string;
    explorerUrl: string;
    momoOrderId: string;
  } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const { toast, show, dismiss } = useToast();

  const loadWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet");
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Không thể tải dữ liệu Ví UniCycle.");
      const data = await res.json();
      setWallet(data.wallet);
      setBlockchain(data.blockchain);
      setTransactions(data.transactions || []);
      setEscrows(data.escrows || []);
      setUnauthorized(false);
    } catch (err: any) {
      show(err.message || "Lỗi kết nối máy chủ.", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleCopyAddress = async () => {
    if (!wallet?.address) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      show("Không thể sao chép địa chỉ ví.", { type: "error" });
    }
  };

  const handleStartMomoTopup = async () => {
    if (selectedAmount < 10000) {
      show("Số tiền nạp tối thiểu là 10.000đ.", { type: "error" });
      return;
    }
    setInitializingMomo(true);
    setLastMintedReceipt(null);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selectedAmount, action: "INIT" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể khởi tạo đơn MoMo Test.");
      setMomoSession(data.momoSession);
    } catch (err: any) {
      show(err.message, { type: "error" });
    } finally {
      setInitializingMomo(false);
    }
  };

  const handleConfirmMomoPayment = async () => {
    if (!momoSession) return;
    setConfirmingMomo(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: momoSession.amountVnd,
          momoOrderId: momoSession.momoOrderId,
          action: "CONFIRM",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xác nhận nạp điểm thất bại.");

      setLastMintedReceipt({
        amountUnip: data.topup.mintedUnip,
        txHash: data.topup.txHash,
        explorerUrl: data.topup.explorerUrl,
        momoOrderId: data.topup.momoOrderId,
      });
      setMomoSession(null);
      show(data.message || "Nạp điểm thành công!");
      window.dispatchEvent(new Event("unicycle:wallet-updated"));
      await loadWallet();
    } catch (err: any) {
      show(err.message, { type: "error" });
    } finally {
      setConfirmingMomo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
          <div className="h-8 bg-[#D6E8EE] rounded-lg w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 h-72 bg-[#D6E8EE]/50 rounded-2xl" />
            <div className="lg:col-span-7 h-72 bg-[#D6E8EE]/40 rounded-2xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (unauthorized || !wallet) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
        <Navbar />
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-20 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#D6E8EE] text-[#018ABE] flex items-center justify-center mb-4">
            <IconWallet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#001B48] mb-2">
            Đăng nhập để mở Ví UniCycle
          </h1>
          <p className="text-sm text-[#02457A] mb-6 leading-relaxed">
            Mỗi tài khoản sinh viên được tự động cấp một địa chỉ ví riêng trên mạng Avalanche Fuji để nạp điểm MoMo Test và đặt cọc mua đồ an toàn.
          </p>
          <Link
            href="/login?redirect=/wallet"
            className="px-6 py-3 rounded-xl font-bold text-sm bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors"
          >
            Đăng nhập ngay
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Tiêu đề trang */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D6E8EE] pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D6E8EE]/70 text-[#02457A] text-xs font-bold mb-2">
              <IconShieldCheck className="w-4 h-4 text-[#018ABE]" />
              <span>Avalanche Fuji C-Chain (Chain ID: 43113)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001B48]">
              Ví Điểm Sinh Viên UniCycle (UNIP)
            </h1>
            <p className="text-xs sm:text-sm text-[#02457A] mt-1">
              Tỷ giá cố định <strong>1 VNĐ = 1 UNIP</strong>. Tiền nạp qua MoMo Test bảo chứng tại Ví Chủ, mọi giao dịch mua bán ghi vết công khai trên Blockchain.
            </p>
          </div>

          <button
            type="button"
            onClick={loadWallet}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#02457A] bg-[#D6E8EE]/50 hover:bg-[#D6E8EE] border border-[#97CADB] transition-colors cursor-pointer"
          >
            <IconRefresh className="w-4 h-4" />
            <span>Làm mới số dư</span>
          </button>
        </div>

        {/* Khối chính: Thẻ Ví (Cột trái) & Nạp MoMo Test (Cột phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI: THẺ VÍ BLOCKCHAIN CỦA SINH VIÊN */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-2xl bg-gradient-to-br from-[#001B48] via-[#02457A] to-[#018ABE] text-white p-6 shadow-md space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D6E8EE]">
                  Số dư khả dụng
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/15 text-white border border-white/20">
                  1 UNIP = 1 VNĐ
                </span>
              </div>

              <div>
                <div
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight"
                  role="status"
                  aria-atomic="true"
                >
                  {wallet.pointBalance.toLocaleString("vi-VN")}{" "}
                  <span className="text-lg font-bold text-[#97CADB]">UNIP</span>
                </div>
                <p className="text-xs text-[#D6E8EE] mt-1">
                  Tương đương giá trị bảo chứng: {formatCurrencyVND(wallet.pointBalance)}
                </p>
              </div>

              <div className="pt-4 border-t border-white/15 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#D6E8EE]">
                  <span>Địa chỉ Ví Blockchain riêng của bạn:</span>
                  <a
                    href={wallet.addressExplorerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 font-bold text-[#97CADB] hover:text-white underline"
                  >
                    <span>Snowtrace</span>
                    <IconExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between gap-2 bg-[#001B48]/60 border border-white/15 rounded-xl px-3 py-2">
                  <code className="text-xs font-mono text-[#D6E8EE] truncate">
                    {wallet.address}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                  >
                    {copiedAddress ? (
                      <>
                        <IconCheck className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <IconCopy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Hộp giải thích cơ chế Gasless UX cho sinh viên */}
            <div className="rounded-2xl border border-[#D6E8EE] bg-[#D6E8EE]/25 p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#001B48]">
                  Trạng thái mạng Avalanche Fuji
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#D6E8EE] text-[#02457A]">
                  <span className="w-2 h-2 rounded-full bg-[#018ABE]" />
                  {blockchain?.isLiveOnChain
                    ? "Đã kết nối Hợp đồng UNIP"
                    : "Chế độ Local / Dự phòng"}
                </span>
              </div>
              <p className="text-xs text-[#02457A] leading-relaxed">
                Hệ thống tự động tài trợ 100% phí mạng lưới (Gasless UX) qua Ví Chủ. Bạn không cần cài đặt MetaMask hay mua đồng AVAX mà vẫn có biên lai giao dịch thật trên Blockchain.
              </p>
              {blockchain?.contractAddress && (
                <div className="pt-1 text-[11px] text-[#02457A] flex items-center justify-between">
                  <span>Hợp đồng UNIP:</span>
                  <a
                    href={`${blockchain.explorerBaseUrl}/address/${blockchain.contractAddress}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono font-bold text-[#018ABE] hover:underline inline-flex items-center gap-1"
                  >
                    <span>
                      {blockchain.contractAddress.slice(0, 8)}...
                      {blockchain.contractAddress.slice(-6)}
                    </span>
                    <IconExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: CỔNG NẠP ĐIỂM QUA MOMO MÔI TRƯỜNG TEST */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#001B48]">
                  Nạp điểm UniPoint qua MoMo (Môi trường Test)
                </h2>
                <p className="text-xs text-[#02457A] mt-0.5">
                  Chọn mệnh giá nạp thử nghiệm. Ngay khi xác nhận thanh toán MoMo Test, Ví Chủ sẽ đúc (mint) đúng số UNIP tương ứng vào ví riêng của bạn.
                </p>
              </div>
              <span className="shrink-0 px-3 py-1 rounded-lg bg-[#D6E8EE]/60 text-[#001B48] font-extrabold text-xs border border-[#97CADB]">
                MoMo Sandbox
              </span>
            </div>

            {/* Chọn mệnh giá */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#001B48]">
                1. Chọn mệnh giá nạp (VNĐ):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {PRESET_AMOUNTS.map((amt) => {
                  const active = selectedAmount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setMomoSession(null);
                      }}
                      className={`py-3 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        active
                          ? "bg-[#02457A] text-white border-[#02457A] shadow-xs"
                          : "bg-white text-[#001B48] border-[#D6E8EE] hover:border-[#018ABE] hover:bg-[#D6E8EE]/30"
                      }`}
                    >
                      <div>{amt.toLocaleString("vi-VN")}đ</div>
                      <div
                        className={`text-[10px] font-semibold mt-0.5 ${
                          active ? "text-[#D6E8EE]" : "text-[#018ABE]"
                        }`}
                      >
                        +{amt.toLocaleString("vi-VN")} UNIP
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hộp xem trước quy đổi */}
            <div className="p-4 rounded-xl bg-[#D6E8EE]/30 border border-[#97CADB]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs text-[#02457A] font-medium">
                  Số tiền thanh toán trên MoMo Test:
                </div>
                <div className="text-lg font-extrabold text-[#001B48]">
                  {formatCurrencyVND(selectedAmount)}
                </div>
              </div>
              <IconArrowRight className="hidden sm:block w-5 h-5 text-[#018ABE]" />
              <div className="space-y-0.5 sm:text-right">
                <div className="text-xs text-[#02457A] font-medium">
                  Điểm UNIP đúc vào ví {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}:
                </div>
                <div className="text-lg font-extrabold text-[#018ABE]">
                  +{selectedAmount.toLocaleString("vi-VN")} UNIP
                </div>
              </div>
            </div>

            {/* Nếu chưa mở phiên QR MoMo Test */}
            {!momoSession ? (
              <button
                type="button"
                disabled={initializingMomo}
                onClick={handleStartMomoTopup}
                className="w-full py-3.5 px-5 rounded-xl font-extrabold text-sm bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {initializingMomo
                  ? "Đang khởi tạo đơn thanh toán MoMo Test..."
                  : `Tạo mã thanh toán MoMo Test (${formatCurrencyVND(selectedAmount)})`}
              </button>
            ) : (
              /* Khung mô phỏng cổng QR MoMo Test */
              <div className="rounded-2xl border-2 border-[#018ABE] bg-[#D6E8EE]/20 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#97CADB]/60 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#018ABE]">
                      Cổng Thanh Toán MoMo Môi Trường Test
                    </span>
                    <h3 className="text-sm font-extrabold text-[#001B48]">
                      Mã đơn: {momoSession.momoOrderId}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMomoSession(null)}
                    className="text-xs font-bold text-[#02457A] hover:underline cursor-pointer"
                  >
                    Đổi mệnh giá
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Khung QR Vector minh họa */}
                  <div className="sm:col-span-4 flex flex-col items-center justify-center bg-white p-3.5 rounded-xl border border-[#D6E8EE]">
                    <svg
                      viewBox="0 0 120 120"
                      className="w-28 h-28 text-[#001B48]"
                      role="img"
                      aria-label="Mã QR thanh toán MoMo môi trường Test"
                    >
                      <rect width="120" height="120" rx="8" fill="#FFFFFF" />
                      <path
                        fill="currentColor"
                        d="M12 12h32v32H12V12zm6 6v20h20V18H18zm6 6h8v8h-8v-8zm52-12h32v32H76V12zm6 6v20h20V18H82zm6 6h8v8h-8v-8zM12 76h32v32H12V76zm6 6v20h20V82H18zm6 6h8v8h-8v-8zm30-70h8v16h-8V18zm12 8h8v20h-8V26zM52 52h16v16H52V52zm-28 0h16v8H24v-8zm56 0h28v8H80v-8zm-8 24h16v16H72V76zm20 12h16v20H92V88zm-40 4h12v16H52V92z"
                      />
                    </svg>
                    <span className="text-[10px] font-bold text-[#02457A] mt-1">
                      QR MoMo Sandbox
                    </span>
                  </div>

                  <div className="sm:col-span-8 space-y-2 text-xs text-[#001B48]">
                    <div className="flex justify-between py-1 border-b border-[#D6E8EE]">
                      <span className="text-[#02457A]">Đơn vị nhận bảo chứng:</span>
                      <span className="font-bold">{momoSession.merchantName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D6E8EE]">
                      <span className="text-[#02457A]">Số tiền thanh toán:</span>
                      <span className="font-extrabold text-[#001B48]">
                        {formatCurrencyVND(momoSession.amountVnd)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#D6E8EE]">
                      <span className="text-[#02457A]">Số điểm phát hành:</span>
                      <span className="font-extrabold text-[#018ABE]">
                        +{momoSession.amountUnip.toLocaleString("vi-VN")} UNIP
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#02457A]">Nội dung chuyển:</span>
                      <span className="font-mono font-bold">{momoSession.transferNote}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={confirmingMomo}
                  onClick={handleConfirmMomoPayment}
                  className="w-full py-3.5 px-5 rounded-xl font-extrabold text-sm bg-[#02457A] text-white hover:bg-[#001B48] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {confirmingMomo
                    ? "Đang xác nhận MoMo & Đúc đồng UNIP trên Avalanche Fuji..."
                    : `Xác nhận đã thanh toán MoMo Test (+${momoSession.amountUnip.toLocaleString("vi-VN")} UNIP)`}
                </button>
              </div>
            )}

            {/* Biên lai Blockchain vừa đúc thành công */}
            {lastMintedReceipt && (
              <div
                className="rounded-xl bg-[#D6E8EE]/45 border border-[#018ABE] p-4 space-y-2"
                role="status"
                aria-atomic="true"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#001B48] inline-flex items-center gap-1.5">
                    <IconCheck className="w-4 h-4 text-[#018ABE]" />
                    Đã đúc +{lastMintedReceipt.amountUnip.toLocaleString("vi-VN")} UNIP vào ví của bạn!
                  </span>
                  <a
                    href={lastMintedReceipt.explorerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs font-bold text-[#018ABE] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Xem trên Snowtrace</span>
                    <IconExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-[11px] text-[#02457A] font-mono break-all">
                  TxHash: {lastMintedReceipt.txHash}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DANH SÁCH ĐƠN ĐẶT CỌC GIỮ CHỖ (ESCROW) CỦA BẠN */}
        {escrows.length > 0 && (
          <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#001B48] flex items-center gap-2">
                <IconLock className="w-5 h-5 text-[#018ABE]" />
                <span>Đơn đặt cọc Smart Escrow của bạn ({escrows.length})</span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#D6E8EE] text-[#02457A]">
                    <th className="py-2.5 pr-4 font-bold">Món đồ</th>
                    <th className="py-2.5 px-3 font-bold">Vai trò</th>
                    <th className="py-2.5 px-3 font-bold">Số điểm cọc</th>
                    <th className="py-2.5 px-3 font-bold">Trạng thái</th>
                    <th className="py-2.5 pl-3 font-bold text-right">Chứng từ On-Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D6E8EE]/60">
                  {escrows.map((esc) => {
                    const isBuyer = esc.buyer_id === wallet.userId;
                    const statusBadge =
                      esc.status === "LOCKED"
                        ? "bg-[#D6E8EE] text-[#02457A]"
                        : esc.status === "RELEASED"
                        ? "bg-[#018ABE] text-white"
                        : "bg-slate-100 text-slate-600";
                    const statusLabel =
                      esc.status === "LOCKED"
                        ? "Đang giữ cọc"
                        : esc.status === "RELEASED"
                        ? "Đã giải ngân"
                        : "Đã hoàn điểm";
                    const proofUrl = esc.settleExplorerUrl || esc.lockExplorerUrl;

                    return (
                      <tr key={esc.id} className="hover:bg-[#D6E8EE]/20">
                        <td className="py-3 pr-4">
                          <Link
                            href={`/products/${esc.product_id}`}
                            className="font-bold text-[#001B48] hover:text-[#018ABE]"
                          >
                            {esc.product_title || esc.product_id}
                          </Link>
                          <div className="text-[11px] text-[#02457A] font-mono">
                            Passport: {esc.passport_hash.slice(0, 12)}...
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#02457A]">
                          {isBuyer ? "Người mua" : "Người bán"}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-[#001B48]">
                          {esc.amount.toLocaleString("vi-VN")} UNIP
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusBadge}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-3 pl-3 text-right">
                          {proofUrl && (
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 font-bold text-[#018ABE] hover:underline"
                            >
                              <span>Snowtrace</span>
                              <IconExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* LỊCH SỬ BIẾN ĐỘNG SỐ DƯ UNIP */}
        <section className="bg-white rounded-2xl border border-[#D6E8EE] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#001B48] flex items-center gap-2">
              <IconClock className="w-5 h-5 text-[#018ABE]" />
              <span>Lịch sử giao dịch đồng UNIP trên Blockchain</span>
            </h2>
            <span className="text-xs text-[#02457A] font-semibold">
              {transactions.length} giao dịch
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#02457A] bg-[#D6E8EE]/20 rounded-xl border border-[#D6E8EE]">
              Chưa có giao dịch nào. Hãy chọn một mệnh giá ở trên để nạp thử UNIP qua MoMo Test!
            </div>
          ) : (
            <div className="divide-y divide-[#D6E8EE]">
              {transactions.map((tx) => {
                const isIncoming = tx.direction === "IN";
                return (
                  <div
                    key={tx.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs sm:text-sm font-bold text-[#001B48]">
                        {tx.description}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#02457A]">
                        <span>{formatRelativeTime(tx.created_at)}</span>
                        {tx.tx_hash && (
                          <span className="font-mono">
                            Tx: {tx.tx_hash.slice(0, 12)}...{tx.tx_hash.slice(-6)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span
                        className={`text-sm font-extrabold ${
                          isIncoming ? "text-[#018ABE]" : "text-[#001B48]"
                        }`}
                      >
                        {isIncoming ? "+" : "-"}
                        {tx.amount.toLocaleString("vi-VN")} UNIP
                      </span>

                      {tx.explorerUrl && (
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#D6E8EE]/60 hover:bg-[#D6E8EE] text-[#02457A] transition-colors"
                        >
                          <span>Snowtrace</span>
                          <IconExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Toast toast={toast} onDismiss={dismiss} />
      <Footer />
    </div>
  );
}

