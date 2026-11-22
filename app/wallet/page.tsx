"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toast, useToast } from "@/components/toast";
import {
  WalletTopupCard,
  PendingTopupItem,
} from "@/components/wallet-topup-card";
import {
  IconWallet,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconClock,
  IconLock,
  IconPlus,
  IconArrowRight,
  IconMapPin,
} from "@/components/icons";
import { formatCurrencyVND, formatRelativeTime } from "@/lib/utils";

type WalletTab = "TOPUP" | "ESCROWS" | "HISTORY";
type TxFilter = "ALL" | "IN" | "OUT" | "ESCROW";

interface WalletData {
  userId: string;
  fullName: string;
  university: string | null;
  address: string;
  addressExplorerUrl: string;
  pointBalance: number;
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
  activeEscrowCount: number;
  incomingLockedBalance: number;
  incomingEscrowCount: number;
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
  pickup_location?: string;
  buyer_id: string;
  seller_id: string;
  buyer_name?: string;
  seller_name?: string;
  amount: number;
  status: "LOCKED" | "CANCEL_REQUESTED" | "RELEASED" | "COMPLETED" | "REFUNDED";
  chain_mode?: "ONCHAIN" | "SIMULATED";
  expires_at?: string | null;
  meeting_note?: string | null;
  cancel_reason?: string | null;
  isExpired?: boolean;
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
    initialTabParam === "HISTORY" || initialTabParam === "ESCROWS"
      ? initialTabParam
      : "TOPUP"
  );
  const [txFilter, setTxFilter] = useState<TxFilter>("ALL");

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [pendingTopups, setPendingTopups] = useState<PendingTopupItem[]>([]);
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
      setPendingTopups(data.pendingTopups || []);
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 animate-pulse space-y-6">
        <div className="h-44 bg-[#D6E8EE]/60 rounded-2xl w-full" />
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
          Nạp điểm, theo dõi số dư khả dụng và các đơn đang giữ chỗ của bạn.
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

  const availableBalance = wallet.availableBalance ?? wallet.pointBalance ?? 0;
  const lockedBalance = wallet.lockedBalance ?? 0;
  const totalBalance = wallet.totalBalance ?? availableBalance + lockedBalance;

  const activeEscrows = escrows.filter(
    (e) => e.status === "LOCKED" || e.status === "CANCEL_REQUESTED"
  );

  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === "ALL") return true;
    if (txFilter === "IN") return tx.direction === "IN";
    if (txFilter === "OUT") return tx.direction === "OUT";
    if (txFilter === "ESCROW") {
      return (
        tx.type === "ESCROW_LOCK" ||
        tx.type === "ESCROW_RELEASE" ||
        tx.type === "ESCROW_REFUND"
      );
    }
    return true;
  });

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 1. THẺ TỔNG QUAN TÀI SẢN CHUẨN NGÂN HÀNG SỐ (3 CHỈ SỐ TÁCH BẠCH) */}
      <section
        aria-label="Tổng quan số dư Ví UniCycle"
        className="rounded-3xl bg-gradient-to-br from-[#001B48] via-[#02457A] to-[#018ABE] text-white p-6 sm:p-7 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D6E8EE]">
              <IconWallet className="w-4 h-4 text-[#97CADB]" />
              <span>Số dư khả dụng (Sẵn sàng thanh toán)</span>
            </div>
            <div
              className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1"
              role="status"
              aria-atomic="true"
            >
              {availableBalance.toLocaleString("vi-VN")}{" "}
              <span className="text-base font-bold text-[#97CADB]">UNIP</span>
            </div>
            <div className="text-xs text-[#D6E8EE] mt-0.5">
              = {formatCurrencyVND(availableBalance)} (1 VNĐ = 1 UNIP)
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 border-white/15 pt-3 sm:pt-0">
            <div className="text-sm font-extrabold text-white">{wallet.fullName}</div>
            {wallet.university && (
              <div className="text-xs text-[#97CADB] mt-0.5">{wallet.university}</div>
            )}
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D6E8EE] hover:text-white mt-1.5 underline"
            >
              <span>Hồ sơ cá nhân →</span>
            </Link>
          </div>
        </div>

        {/* Lưới 3 chỉ số chuẩn ngân hàng: Khả dụng | Đang giữ trong Escrow | Tổng số dư */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/15">
          <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-3.5 border border-white/15">
            <div className="text-[11px] text-[#D6E8EE] font-medium">
              1. Số dư khả dụng
            </div>
            <div className="text-base font-extrabold text-white mt-0.5">
              {availableBalance.toLocaleString("vi-VN")} UNIP
            </div>
            <div className="text-[10px] text-[#97CADB] mt-0.5">
              Dùng để giữ chỗ món đồ ngay
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("ESCROWS")}
            className="text-left rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xs p-3.5 border border-white/15 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] text-[#D6E8EE] font-medium">
              <span>2. Đang giữ trong Escrow</span>
              {wallet.activeEscrowCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#018ABE] text-white text-[10px] font-bold">
                  {wallet.activeEscrowCount} đơn mua
                </span>
              )}
            </div>
            <div className="text-base font-extrabold text-white mt-0.5">
              {lockedBalance.toLocaleString("vi-VN")} UNIP
            </div>
            <div className="text-[10px] text-[#97CADB] mt-0.5 underline">
              Chờ gặp mặt kiểm tra hàng →
            </div>
          </button>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-3.5 border border-white/15">
            <div className="text-[11px] text-[#D6E8EE] font-medium">
              3. Tổng số dư tài khoản
            </div>
            <div className="text-base font-extrabold text-white mt-0.5">
              {totalBalance.toLocaleString("vi-VN")} UNIP
            </div>
            <div className="text-[10px] text-[#97CADB] mt-0.5">
              = Khả dụng + Đang giữ chỗ
            </div>
          </div>
        </div>

        {/* Nếu người dùng đang là người bán có đơn khách đặt giữ chỗ */}
        {wallet.incomingEscrowCount > 0 && (
          <div className="rounded-xl bg-white/15 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              Bạn đang có <strong>{wallet.incomingEscrowCount} đơn bán hàng</strong> được khách giữ chỗ (chờ nhận{" "}
              <strong>+{wallet.incomingLockedBalance.toLocaleString("vi-VN")} UNIP</strong>)
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("ESCROWS")}
              className="font-extrabold text-[#D6E8EE] hover:text-white underline cursor-pointer"
            >
              Xem đơn bán hàng →
            </button>
          </div>
        )}
      </section>

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
          {pendingTopups.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
              Chờ
            </span>
          )}
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
          {activeEscrows.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#018ABE] text-white">
              {activeEscrows.length}
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

      {/* 3. NỘI DUNG TỪNG TAB ĐỘC LẬP */}
      {activeTab === "TOPUP" && (
        <WalletTopupCard
          initialAmount={initialAmountParam > 0 ? initialAmountParam : undefined}
          returnUrl={returnUrlParam}
          pendingTopup={pendingTopups[0] || null}
          onPendingChanged={loadWallet}
          onTopupSuccess={async (msg) => {
            show(msg);
            window.dispatchEvent(new Event("unicycle:wallet-updated"));
            await loadWallet();
          }}
          onTopupError={(err) => show(err, { type: "error" })}
        />
      )}

      {activeTab === "ESCROWS" && (
        <section className="bg-white rounded-2xl border border-[#D6E8EE] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6E8EE] pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#001B48]">
                Danh sách đơn giao dịch qua Escrow
              </h2>
              <p className="text-[11px] text-[#02457A]">
                Bấm vào từng đơn để mở trang sản phẩm xác nhận nhận hàng hoặc duyệt hoàn tiền
              </p>
            </div>
            <span className="text-xs font-bold text-[#02457A]">
              {escrows.length} đơn
            </span>
          </div>

          {escrows.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs text-[#02457A]">
                Bạn chưa có đơn thanh toán giữ chỗ nào.
              </p>
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
                const isPending =
                  esc.status === "LOCKED" || esc.status === "CANCEL_REQUESTED";

                const statusBadge =
                  esc.status === "CANCEL_REQUESTED"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : esc.status === "LOCKED"
                    ? "bg-[#D6E8EE] text-[#02457A]"
                    : esc.status === "RELEASED" || esc.status === "COMPLETED"
                    ? "bg-[#018ABE] text-white"
                    : "bg-slate-100 text-slate-600";

                const statusLabel =
                  esc.status === "CANCEL_REQUESTED"
                    ? "Chờ duyệt hủy"
                    : esc.status === "LOCKED"
                    ? "Đang giữ chỗ"
                    : esc.status === "RELEASED" || esc.status === "COMPLETED"
                    ? "Đã giải ngân"
                    : "Đã hoàn điểm";

                return (
                  <div
                    key={esc.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            isBuyer
                              ? "bg-[#02457A] text-white"
                              : "bg-[#018ABE]/15 text-[#02457A]"
                          }`}
                        >
                          {isBuyer ? "Đơn bạn mua" : "Đơn bạn bán"}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadge}`}
                        >
                          {statusLabel}
                        </span>
                        <span className="text-[11px] text-[#02457A]">
                          • {formatRelativeTime(esc.created_at)}
                        </span>
                      </div>

                      <Link
                        href={`/products/${esc.product_id}`}
                        className="text-sm font-extrabold text-[#001B48] hover:text-[#018ABE] block truncate"
                      >
                        {esc.product_title || "Món đồ sinh viên"}
                      </Link>

                      <div className="text-xs text-[#02457A] flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          {isBuyer
                            ? `Người bán: ${esc.seller_name || "Sinh viên"}`
                            : `Người mua: ${esc.buyer_name || "Sinh viên"}`}
                        </span>
                        {esc.pickup_location && (
                          <span className="inline-flex items-center gap-1">
                            <IconMapPin className="w-3 h-3 text-[#018ABE]" />
                            {esc.pickup_location}
                          </span>
                        )}
                      </div>

                      {esc.meeting_note && (
                        <div className="text-[11px] text-[#001B48] bg-[#D6E8EE]/30 px-2.5 py-1 rounded-lg w-fit">
                          Lịch hẹn: <strong>{esc.meeting_note}</strong>
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <span className="text-sm font-extrabold text-[#001B48]">
                        {esc.amount.toLocaleString("vi-VN")} UNIP
                      </span>
                      <Link
                        href={`/products/${esc.product_id}`}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          isPending
                            ? "bg-[#02457A] text-white hover:bg-[#001B48]"
                            : "bg-[#D6E8EE]/50 text-[#001B48] hover:bg-[#D6E8EE]"
                        }`}
                      >
                        <span>{isPending ? "Xử lý đơn" : "Xem chi tiết"}</span>
                        <IconArrowRight className="w-3 h-3" />
                      </Link>
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
          {/* Bộ lọc chuẩn ngân hàng số */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D6E8EE]">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: "ALL", label: "Tất cả" },
                  { key: "IN", label: "Tiền vào (+)" },
                  { key: "OUT", label: "Tiền ra (-)" },
                  { key: "ESCROW", label: "Giữ chỗ (Escrow)" },
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
              Chưa có biến động số dư nào trong phân loại này.
            </div>
          ) : (
            <div className="divide-y divide-[#D6E8EE]">
              {filteredTransactions.map((tx) => {
                const isIncoming = tx.direction === "IN";
                const showLiveProof =
                  tx.chain_mode === "ONCHAIN" && tx.explorerUrl;

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

          {/* Thông tin kỹ thuật nằm gọn dưới đáy tab Biến động số dư */}
          <details className="pt-3 border-t border-[#D6E8EE] text-xs text-[#02457A]">
            <summary className="cursor-pointer font-semibold text-[#02457A] hover:text-[#001B48] select-none">
              Thông tin đối soát Blockchain (Avalanche Fuji)
            </summary>
            <div className="mt-2.5 p-3 rounded-xl bg-[#D6E8EE]/25 space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span>Ví định danh của bạn:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-[#001B48]">
                    {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="font-bold text-[#018ABE] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    {copiedAddress ? (
                      <IconCheck className="w-3 h-3" />
                    ) : (
                      <IconCopy className="w-3 h-3" />
                    )}
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

      <Toast toast={toast} onDismiss={dismiss} />
    </main>
  );
}

export default function WalletPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#001B48]">
      <Navbar />
      <Suspense
        fallback={
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 animate-pulse">
            <div className="h-44 bg-[#D6E8EE]/50 rounded-2xl w-full" />
          </main>
        }
      >
        <WalletPageContent />
      </Suspense>
      <Footer />
    </div>
  );
}
