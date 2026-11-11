"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toast, useToast } from "@/components/toast";
import { WalletTopupCard } from "@/components/wallet-topup-card";
import {
  IconWallet,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconClock,
  IconLock,
  IconPlus,
} from "@/components/icons";
import { formatCurrencyVND, formatRelativeTime } from "@/lib/utils";

type WalletTab = "TOPUP" | "ESCROWS" | "HISTORY";
type TxFilter = "ALL" | "IN" | "OUT";

interface WalletData {
  userId: string;
  fullName: string;
  university: string | null;
  address: string;
  addressExplorerUrl: string;
  pointBalance: number;
}

interface BlockchainMeta {
  isLiveOnChain: boolean;
  contractAddress: string | null;
  explorerBaseUrl: string;
}

interface PointTxItem {
  id: string;
  type: "MOMO_TOPUP" | "ESCROW_LOCK" | "ESCROW_RELEASE" | "ESCROW_REFUND";
  amount: number;
  direction: "IN" | "OUT";
  description: string;
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
  amount: number;
  status: "LOCKED" | "RELEASED" | "REFUNDED";
  chain_mode?: "ONCHAIN" | "SIMULATED";
  lockExplorerUrl: string | null;
  settleExplorerUrl: string | null;
  created_at: string;
}

function WalletPageContent() {
  const searchParams = useSearchParams();
  const initialAmountParam = Number(searchParams.get("amount") || 0);
  const returnUrlParam = searchParams.get("returnUrl");
  const initialTabParam = searchParams.get("tab") as WalletTab | null;

  const [activeTab, setActiveTab] = useState<WalletTab>(
    initialTabParam === "HISTORY" || initialTabParam === "ESCROWS" ? initialTabParam : "TOPUP"
  );
  const [txFilter, setTxFilter] = useState<TxFilter>("ALL");

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [blockchain, setBlockchain] = useState<BlockchainMeta | null>(null);
  const [transactions, setTransactions] = useState<PointTxItem[]>([]);
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
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
      if (!res.ok) throw new Error("Không thể tải dữ liệu ví.");
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
      show("Không thể sao chép.", { type: "error" });
    }
  };

  if (loading) {
    return (
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 animate-pulse space-y-6">
        <div className="h-36 bg-[#D6E8EE]/60 rounded-2xl w-full" />
        <div className="h-12 bg-[#D6E8EE]/40 rounded-xl w-full" />
        <div className="h-64 bg-[#D6E8EE]/30 rounded-2xl w-full" />
      </main>
    );
  }

  if (unauthorized || !wallet) {
    return (
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-20 text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-[#D6E8EE] text-[#018ABE] flex items-center justify-center mb-4">
          <IconWallet className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-extrabold text-[#001B48] mb-2">
          Đăng nhập để mở Ví UniCycle
        </h1>
        <p className="text-xs text-[#02457A] mb-6">
          Nạp điểm và theo dõi biến động số dư của bạn.
        </p>
        <Link
          href="/login?redirect=/wallet"
          className="px-6 py-2.5 rounded-xl font-bold text-sm bg-[#018ABE] text-white hover:bg-[#02457A] transition-colors"
        >
          Đăng nhập
        </Link>
      </main>
    );
  }

  const activeEscrowCount = escrows.filter((e) => e.status === "LOCKED").length;
  const filteredTransactions = transactions.filter((tx) =>
    txFilter === "ALL" ? true : tx.direction === txFilter
  );

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 1. THẺ SỐ DƯ TÀI KHOẢN (GỌN NHƯ APP NGÂN HÀNG) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#001B48] via-[#02457A] to-[#018ABE] text-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#D6E8EE]">Số dư khả dụng</div>
          <div
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1"
            role="status"
            aria-atomic="true"
          >
            {wallet.pointBalance.toLocaleString("vi-VN")}{" "}
            <span className="text-base font-bold text-[#97CADB]">UNIP</span>
          </div>
          <div className="text-xs text-[#D6E8EE] mt-0.5">
            = {formatCurrencyVND(wallet.pointBalance)}
          </div>
        </div>

        <div className="sm:text-right border-t sm:border-t-0 border-white/15 pt-3 sm:pt-0">
          <div className="text-sm font-bold text-white">{wallet.fullName}</div>
          {wallet.university && (
            <div className="text-xs text-[#97CADB] mt-0.5">{wallet.university}</div>
          )}
        </div>
      </div>

      {/* 2. THANH CHUYỂN TAB TÁCH BIỆT: NẠP ĐIỂM | ĐƠN GIỮ CHỖ | BIẾN ĐỘNG SỐ DƯ */}
      <div
        role="tablist"
        aria-label="Chức năng ví"
        className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-[#D6E8EE]/50 border border-[#D6E8EE]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "TOPUP"}
          onClick={() => setActiveTab("TOPUP")}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "TOPUP"
              ? "bg-white text-[#001B48] shadow-2xs"
              : "text-[#02457A] hover:text-[#001B48]"
          }`}
        >
          <IconPlus className="w-3.5 h-3.5 text-[#018ABE]" />
          <span>Nạp điểm</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ESCROWS"}
          onClick={() => setActiveTab("ESCROWS")}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "ESCROWS"
              ? "bg-white text-[#001B48] shadow-2xs"
              : "text-[#02457A] hover:text-[#001B48]"
          }`}
        >
          <IconLock className="w-3.5 h-3.5 text-[#018ABE]" />
          <span>Đơn giữ chỗ</span>
          {activeEscrowCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#018ABE] text-white">
              {activeEscrowCount}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "HISTORY"}
          onClick={() => setActiveTab("HISTORY")}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "HISTORY"
              ? "bg-white text-[#001B48] shadow-2xs"
              : "text-[#02457A] hover:text-[#001B48]"
          }`}
        >
          <IconClock className="w-3.5 h-3.5 text-[#018ABE]" />
          <span>Biến động số dư</span>
        </button>
      </div>

      {/* 3. NỘI DUNG TỪNG TAB ĐỘC LẬP (KHÔNG DỒN CHUNG GÂY RỐI MẮT) */}
      {activeTab === "TOPUP" && (
        <WalletTopupCard
          initialAmount={initialAmountParam > 0 ? initialAmountParam : undefined}
          returnUrl={returnUrlParam}
          onTopupSuccess={async (msg) => {
            show(msg);
            window.dispatchEvent(new Event("unicycle:wallet-updated"));
            await loadWallet();
          }}
          onTopupError={(err) => show(err, { type: "error" })}
        />
      )}

      {activeTab === "ESCROWS" && (
        <section className="bg-white rounded-2xl border border-[#D6E8EE] p-5 shadow-2xs">
          {escrows.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs text-[#02457A]">Bạn chưa có đơn đặt cọc giữ chỗ nào.</p>
              <Link
                href="/products"
                className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#D6E8EE]/60 text-[#001B48] hover:bg-[#D6E8EE]"
              >
                Khám phá đồ cũ sinh viên →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#D6E8EE]">
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
                    ? "Đang giữ chỗ"
                    : esc.status === "RELEASED"
                    ? "Đã hoàn tất"
                    : "Đã hoàn điểm";

                return (
                  <div
                    key={esc.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        href={`/products/${esc.product_id}`}
                        className="text-sm font-bold text-[#001B48] hover:text-[#018ABE] block truncate"
                      >
                        {esc.product_title || "Món đồ sinh viên"}
                      </Link>
                      <div className="text-[11px] text-[#02457A]">
                        {isBuyer ? "Mua hàng" : "Bán hàng"} • {formatRelativeTime(esc.created_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-sm font-extrabold text-[#001B48]">
                        {esc.amount.toLocaleString("vi-VN")} UNIP
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusBadge}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "HISTORY" && (
        <section className="bg-white rounded-2xl border border-[#D6E8EE] p-5 shadow-2xs space-y-4">
          {/* Bộ lọc Tiền vào / Tiền ra giống app ngân hàng MBBank, BIDV */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#D6E8EE]">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { key: "ALL", label: "Tất cả" },
                  { key: "IN", label: "Tiền vào (+)" },
                  { key: "OUT", label: "Tiền ra (-)" },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTxFilter(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    txFilter === item.key
                      ? "bg-[#02457A] text-white"
                      : "bg-[#D6E8EE]/40 text-[#02457A] hover:bg-[#D6E8EE]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-[#02457A] font-semibold">
              {filteredTransactions.length} giao dịch
            </span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#02457A]">
              Chưa có biến động số dư nào trong mục này.
            </div>
          ) : (
            <div className="divide-y divide-[#D6E8EE]">
              {filteredTransactions.map((tx) => {
                const isIncoming = tx.direction === "IN";
                const showLiveProof = tx.chain_mode === "ONCHAIN" && tx.explorerUrl;

                return (
                  <div
                    key={tx.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#001B48] truncate">
                        {tx.description.replace(" qua MoMo Test", " qua MoMo")}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#02457A]">
                        <span>{formatRelativeTime(tx.created_at)}</span>
                        {showLiveProof && (
                          <>
                            <span>•</span>
                            <a
                              href={tx.explorerUrl!}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-0.5 font-bold text-[#018ABE] hover:underline"
                            >
                              <span>Chứng từ</span>
                              <IconExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-sm font-extrabold shrink-0 ${
                        isIncoming ? "text-[#018ABE]" : "text-[#001B48]"
                      }`}
                    >
                      {isIncoming ? "+" : "-"}
                      {tx.amount.toLocaleString("vi-VN")} UNIP
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Thông tin kỹ thuật chỉ nằm gọn dưới đáy tab Biến động số dư */}
          <details className="pt-3 border-t border-[#D6E8EE] text-xs text-[#02457A]">
            <summary className="cursor-pointer font-semibold text-[#02457A] hover:text-[#001B48] select-none">
              Thông tin đối soát Blockchain
            </summary>
            <div className="mt-2.5 p-3 rounded-xl bg-[#D6E8EE]/25 space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span>Ví định danh:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-[#001B48]">
                    {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="font-bold text-[#018ABE] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    {copiedAddress ? <IconCheck className="w-3 h-3" /> : <IconCopy className="w-3 h-3" />}
                    <span>{copiedAddress ? "Đã chép" : "Chép"}</span>
                  </button>
                  <a
                    href={wallet.addressExplorerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-bold text-[#02457A] hover:text-[#018ABE] inline-flex items-center gap-0.5"
                  >
                    <span>Snowtrace</span>
                    <IconExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              {blockchain?.contractAddress && (
                <div className="flex items-center justify-between gap-2">
                  <span>Hợp đồng UNIP:</span>
                  <a
                    href={`${blockchain.explorerBaseUrl}/address/${blockchain.contractAddress}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono font-bold text-[#018ABE] hover:underline inline-flex items-center gap-1"
                  >
                    <span>
                      {blockchain.contractAddress.slice(0, 10)}...
                      {blockchain.contractAddress.slice(-8)}
                    </span>
                    <IconExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </details>
        </section>
      )}
    </main>
  );
}

export default function WalletPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />
      <Suspense
        fallback={
          <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 animate-pulse">
            <div className="h-36 bg-[#D6E8EE]/50 rounded-2xl w-full" />
          </main>
        }
      >
        <WalletPageContent />
      </Suspense>
      <Footer />
    </div>
  );
}
