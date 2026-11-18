"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ReportModal } from "@/components/reports/ReportModal";

export interface PassportOwnerData {
  id: string;
  seq: number;
  since: string;
  showName: boolean;
  displayName: string;
  schoolName: string;
  area?: string | null;
  ownerHashMasked: string;
}

export interface PassportEventData {
  id: string;
  seq: number;
  eventType: string;
  confirmationLevel: "BOTH" | "ONE_SIDE";
  transferKind: string;
  occurredAt: string;
}

export interface ListingTimelineData {
  seq: number;
  listingId: string;
  title: string;
  price: number;
  isFree: boolean;
  condition: string;
  status: string;
  createdAt: string;
  schoolName?: string;
  images: Array<{
    id: string;
    url: string;
    sha256?: string | null;
  }>;
}

export interface PassportPayload {
  passport: {
    passportId: string;
    itemId: string;
    passportStatus: string;
    flagReason?: string | null;
    flaggedAt?: string | null;
    identityLevel: string;
    itemCommit?: string | null;
    createdAt: string;
    category?: { name: string; slug: string } | null;
    currentOwnerSeq: number;
    isFlagged: boolean;
    qrUrl: string;
    passportUrl: string;
  };
  owners: PassportOwnerData[];
  events: PassportEventData[];
  listingsTimeline: ListingTimelineData[];
  chainTxs: Array<{
    id: string;
    kind: string;
    status: string;
    txHash?: string | null;
    submittedAt?: string | null;
    confirmedAt?: string | null;
  }>;
}

export interface OnChainVerificationReport {
  passportId: string;
  itemId: string;
  status: "VERIFIED_MATCH" | "PENDING_SYNC" | "MISMATCH_DETECTED" | "NOT_ANCHORED_YET" | "SIMULATED_MODE";
  contractAddress: string;
  network: string;
  checks: {
    exists: { passed: boolean; offChain: boolean; onChain: boolean };
    commitMatch: { passed: boolean; offChain: string | null; onChain: string | null };
    ownerMatch: { passed: boolean; offChain: string | null; onChain: string | null };
    transferCountMatch: { passed: boolean; offChain: number; onChain: number };
    flagStatusMatch: { passed: boolean; offChain: boolean; onChain: boolean };
  };
  explorerUrl: string;
  latestTxHash: string | null;
  message: string;
  verifiedAt: string;
}

interface PassportClientProps {
  initialData: PassportPayload;
}

export function PassportClient({ initialData }: PassportClientProps) {
  const { passport, owners, events, listingsTimeline, chainTxs } = initialData;
  const [copied, setCopied] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Trạng thái kiểm chứng On-Chain và Đồng bộ Relayer (Sprint 5 Task 5.1)
  const [activeChainTxs, setActiveChainTxs] = useState(chainTxs);
  const [verificationReport, setVerificationReport] = useState<OnChainVerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const handleCopyId = () => {
    if (passport.passportId) {
      navigator.clipboard.writeText(passport.passportId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerifyOnChain = async () => {
    setIsVerifying(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/passport/${passport.passportId}/verify`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể kiểm chứng dữ liệu on-chain.");
      }
      setVerificationReport(data.report);
      if (Array.isArray(data.chainTxs)) {
        setActiveChainTxs(data.chainTxs);
      }
      setFeedback({
        type: "success",
        message: data.report?.message || "Kiểm chứng trực tiếp trên Avalanche Fuji RPC hoàn tất!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Đã xảy ra lỗi khi kiểm chứng on-chain.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSyncRelayer = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/passport/${passport.passportId}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể kích hoạt Relayer đồng bộ.");
      }
      if (data.report) {
        setVerificationReport(data.report);
      }
      if (Array.isArray(data.chainTxs)) {
        setActiveChainTxs(data.chainTxs);
      }
      setFeedback({
        type: "success",
        message: data.message || "Đã kích hoạt Relayer và đồng bộ giao dịch lên Avalanche Fuji thành công!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Đã xảy ra lỗi khi kích hoạt Relayer.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const latestListing = listingsTimeline[listingsTimeline.length - 1];
  const itemTitle = latestListing?.title || "Món đồ sinh viên có Digital Passport";

  const latestTxHash =
    verificationReport?.latestTxHash ||
    activeChainTxs.find((tx) => Boolean(tx.txHash))?.txHash ||
    null;
  const latestSnowtraceTxUrl = latestTxHash
    ? `https://testnet.snowtrace.io/tx/${latestTxHash}`
    : null;

  const chronologicalTxs = [...activeChainTxs].reverse();
  const registerTx =
    chronologicalTxs.find((tx) => tx.kind === "REGISTER" && Boolean(tx.txHash)) ||
    chronologicalTxs.find((tx) => tx.kind === "REGISTER") ||
    chronologicalTxs[0] ||
    null;
  const transferTxs = chronologicalTxs.filter((tx) => tx.kind === "TRANSFER");

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Thanh điều hướng breadcrumb & Nút báo cáo */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-2 text-xs font-semibold text-[#02457A]">
            <Link href="/" className="hover:text-[#018ABE] transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href="/products" className="hover:text-[#018ABE] transition-colors">
              Sàn trao đổi
            </Link>
            <span>/</span>
            <span className="text-[#001B48] font-bold">Digital Product Passport</span>
          </nav>

          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            <span>Báo cáo Passport nghi vấn</span>
          </button>
        </div>

        {/* 2. Banner Tuyên Bố Giới Hạn Bắt Buộc (BR30) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 text-xs sm:text-sm space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-black text-amber-900 uppercase tracking-wider text-xs">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Tuyên Bố Giới Hạn Trách Nhiệm Bắt Buộc (Quy tắc BR30)</span>
          </div>
          <p className="text-amber-900/90 leading-relaxed text-xs sm:text-[13px]">
            Digital Product Passport ghi nhận chuỗi lịch sử chuyển nhượng số giữa các bạn sinh viên trên nền tảng UniCycle. <strong>Passport KHÔNG PHẢI là chứng thư giám định chất lượng, không đảm bảo tính chính hãng hay bảo hành vật lý của món đồ</strong>. Người mua có trách nhiệm kiểm tra trực tiếp tình trạng thực tế của món đồ khi gặp mặt trao tay.
          </p>
        </div>

        {/* Cảnh báo nếu Passport bị gắn cờ vi phạm (BR39) */}
        {passport.isFlagged && (
          <div className="p-4 rounded-2xl bg-rose-600 text-white text-xs sm:text-sm shadow-md flex items-start gap-3 animate-in fade-in">
            <svg className="w-6 h-6 text-white shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <strong className="block text-sm font-black uppercase tracking-wider">
                Món đồ này đang bị gắn cờ vi phạm (Flagged)!
              </strong>
              <p className="text-rose-100 text-xs mt-1">
                Lý do: {passport.flagReason || "Đang có khiếu nại tranh chấp quyền sở hữu hoặc báo cáo vi phạm."}
              </p>
            </div>
          </div>
        )}

        {/* 3. Header Thẻ Passport Sinh Viên */}
        <div className="bg-gradient-to-br from-[#001B48] via-[#02457A] to-[#018ABE] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          {/* Nền họa tiết lưới số */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/15 backdrop-blur-md border border-white/20 text-sky-200">
                  {passport.category?.name || "Đồ Dùng Sinh Viên"}
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Đời chủ hiện tại: #{passport.currentOwnerSeq}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-slate-200">
                  Mức định danh: {passport.identityLevel}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
                {itemTitle}
              </h1>

              {/* Passport ID & Nút sao chép */}
              <div className="pt-1">
                <span className="block text-[11px] text-sky-200 font-semibold mb-1 uppercase tracking-wider">
                  Mã định danh số (Passport ID):
                </span>
                <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-xs font-mono text-sky-100 max-w-full">
                  <span className="truncate">{passport.passportId}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="shrink-0 p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer text-white"
                    title="Sao chép Passport ID"
                  >
                    {copied ? (
                      <span className="text-[11px] text-emerald-300 font-bold">Đã chép ✓</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Liên kết mở trực tiếp Snowtrace Fuji Testnet */}
              <div className="pt-1 flex flex-wrap items-center gap-2">
                {latestSnowtraceTxUrl && latestTxHash ? (
                  <a
                    href={latestSnowtraceTxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-300/40 text-emerald-100 text-xs font-bold transition-all backdrop-blur-md shadow-xs"
                  >
                    <svg className="w-4 h-4 text-emerald-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>
                      Xem trực tiếp giao dịch trên Snowtrace Fuji ({latestTxHash.slice(0, 10)}...
                      {latestTxHash.slice(-6)}) ↗
                    </span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleSyncRelayer}
                    disabled={isSyncing || isVerifying}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-100 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>
                      {isSyncing
                        ? "Đang đồng bộ lên Fuji..."
                        : "Đồng bộ lấy mã giao dịch Snowtrace Fuji ngay"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Khung Mã QR số màn hình */}
            <div className="shrink-0 flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-800 shadow-lg text-center">
              <div
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden cursor-pointer group"
                onClick={() => setQrModalOpen(true)}
              >
                <Image
                  src={passport.qrUrl}
                  alt="Passport QR Code"
                  fill
                  sizes="128px"
                  className="object-contain p-1"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition-opacity rounded-xl">
                  Phóng to ↗
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-[#018ABE] uppercase tracking-wider mt-2">
                Quét đối chiếu KTX
              </span>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="text-[11px] text-[#02457A] hover:underline font-bold mt-0.5 cursor-pointer"
              >
                Mở QR toàn màn hình
              </button>
            </div>
          </div>
        </div>

        {/* 4. Timeline Chuỗi Đời Chủ (Chủ #1 ➔ Chủ #2 ➔ Chủ #3...) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E8EE] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D6E8EE]">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#001B48]">
                Chuỗi Vòng Đời & Lịch Sử Sở Hữu
              </h2>
              <p className="text-xs text-[#02457A] mt-0.5">
                Ghi nhận các thế hệ sinh viên đã từng sở hữu và bảo quản món đồ
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              Tổng cộng {owners.length} đời chủ
            </span>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#D6E8EE]">
            {owners.map((owner, idx) => {
              const isCurrentOwner = idx === owners.length - 1;
              const matchingEvent = events.find((e) => e.seq === owner.seq);
              const matchingListing = listingsTimeline[idx];
              const ownerTx =
                idx === 0
                  ? registerTx
                  : transferTxs[idx - 1] || chronologicalTxs[idx] || null;

              return (
                <div key={owner.id} className="relative group">
                  {/* Icon Node trên timeline */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black shadow-xs transition-transform group-hover:scale-110 ${
                      isCurrentOwner
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                        : "bg-[#018ABE] text-white ring-4 ring-sky-50"
                    }`}
                  >
                    {owner.seq}
                  </div>

                  <div
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isCurrentOwner
                        ? "bg-emerald-50/40 border-emerald-200 shadow-xs"
                        : "bg-slate-50/70 border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-extrabold text-[#001B48]">
                          Đời chủ #{owner.seq}: {owner.displayName}
                        </span>
                        {isCurrentOwner && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                            Chủ hiện tại
                          </span>
                        )}
                        {!owner.showName && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/70 text-slate-600" title="Chủ sở hữu chọn chế độ ẩn danh theo quy tắc BR29">
                            Ẩn danh (BR29)
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-500 font-semibold">
                        Từ: {formatDate(owner.since)}
                      </span>
                    </div>

                    {/* Trường học & Ký túc xá */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#02457A] mb-3">
                      <span className="font-semibold">🏫 {owner.schoolName}</span>
                      {owner.area && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {owner.area}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Hash: {owner.ownerHashMasked}
                      </span>
                    </div>

                    {/* Mức độ xác nhận bàn giao (BR31) */}
                    {matchingEvent && (
                      <div className="mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            matchingEvent.confirmationLevel === "BOTH"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          <span>{matchingEvent.confirmationLevel === "BOTH" ? "✓" : "○"}</span>
                          <span>
                            {matchingEvent.confirmationLevel === "BOTH"
                              ? "Hai bên xác nhận gặp mặt trực tiếp (BR31)"
                              : "Một bên xác nhận / Tự hoàn tất 48h (BR31)"}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Giao dịch Blockchain tương ứng trên Snowtrace Fuji */}
                    {ownerTx && (
                      <div className="mb-3 p-2.5 rounded-xl bg-white/90 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-[#001B48] shrink-0 inline-flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            {idx === 0
                              ? "Khởi tạo Passport (REGISTER):"
                              : "Chuyển giao sở hữu (TRANSFER):"}
                          </span>
                          <span className="font-mono text-slate-600 truncate">
                            {ownerTx.txHash
                              ? `${ownerTx.txHash.slice(0, 12)}...${ownerTx.txHash.slice(-8)}`
                              : `Trạng thái: ${ownerTx.status}`}
                          </span>
                        </div>
                        {ownerTx.txHash && (
                          <a
                            href={`https://testnet.snowtrace.io/tx/${ownerTx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#018ABE] border border-sky-200 font-bold transition-colors shrink-0"
                          >
                            <span>Xem mã giao dịch trên Snowtrace Fuji</span>
                            <span>↗</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Đối chiếu ảnh của đời chủ này (BR24) */}
                    {matchingListing && matchingListing.images.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Ảnh chụp món đồ ở đời chủ #{owner.seq} ({formatDate(matchingListing.createdAt)}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {matchingListing.images.map((img, imgIdx) => (
                            <div
                              key={img.id || imgIdx}
                              onClick={() => setSelectedPhoto(img.url)}
                              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 hover:scale-105 transition-all shadow-2xs"
                            >
                              <Image
                                src={img.url}
                                alt={`Ảnh đời chủ ${owner.seq}`}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Khối Lát Cắt Công Nghệ Blockchain (Avalanche Fuji Testnet) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E8EE] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">❄️</span>
                <h3 className="font-extrabold text-[#001B48] text-base sm:text-lg">
                  Bảo Chứng Bất Biến (Avalanche Fuji C-Chain)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kiến trúc lai On-Chain ↔ Off-Chain: Bản quyền dữ liệu cá nhân (PII) được bảo vệ an toàn trong PostgreSQL, còn mã băm cam kết món đồ và lịch sử đời chủ được bảo chứng bất biến trên chuỗi Avalanche Fuji (Chain ID 43113).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                Fuji Testnet (43113)
              </span>
            </div>
          </div>

          {/* Action Bar: Xác minh Fuji RPC & Kích hoạt Relayer */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleVerifyOnChain}
              disabled={isVerifying || isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-98"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Đang đọc Fuji RPC...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Xác minh trực tiếp trên Blockchain (Fuji RPC)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSyncRelayer}
              disabled={isVerifying || isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-98"
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Relayer đang phát sóng...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Đồng bộ Relayer lên Fuji ngay</span>
                </>
              )}
            </button>

            <a
              href={latestSnowtraceTxUrl || "https://testnet.snowtrace.io"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#02457A] hover:bg-slate-100 transition-colors ml-auto border border-slate-200"
            >
              <span>
                {latestSnowtraceTxUrl ? "Xem giao dịch trên Snowtrace Fuji" : "Snowtrace Fuji Explorer"}
              </span>
              <span>↗</span>
            </a>
          </div>

          {/* Banner thông báo kết quả */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium border flex items-start gap-2.5 animate-in fade-in ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : feedback.type === "error"
                  ? "bg-rose-50 text-rose-900 border-rose-200"
                  : "bg-sky-50 text-sky-900 border-sky-200"
              }`}
            >
              <span className="text-base leading-none shrink-0">
                {feedback.type === "success" ? (
                  <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : feedback.type === "error" ? (
                  <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </span>
              <div className="flex-1">{feedback.message}</div>
            </div>
          )}

          {/* Bảng đối chiếu 2 cột: Off-Chain (PostgreSQL) ↔ On-Chain (Avalanche Fuji) */}
          {verificationReport && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50 space-y-4 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#001B48]">
                    Bảng Đối Chiếu Tính Toàn Vẹn Độc Lập
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      verificationReport.status === "VERIFIED_MATCH"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : verificationReport.status === "PENDING_SYNC"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : verificationReport.status === "SIMULATED_MODE"
                        ? "bg-sky-100 text-sky-800 border border-sky-300"
                        : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}
                  >
                    {verificationReport.status === "VERIFIED_MATCH" && "Khớp toàn vẹn 100%"}
                    {verificationReport.status === "PENDING_SYNC" && "Chờ Relayer đồng bộ"}
                    {verificationReport.status === "SIMULATED_MODE" && "Chế độ mô phỏng"}
                    {verificationReport.status === "NOT_ANCHORED_YET" && "Chưa neo on-chain"}
                    {verificationReport.status === "MISMATCH_DETECTED" && "Cảnh báo sai lệch"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Kiểm chứng: {new Date(verificationReport.verifiedAt).toLocaleTimeString("vi-VN")}
                </div>
              </div>

              {/* Grid 2 Cột */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Cột 1: Off-Chain PostgreSQL */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-[#001B48] flex items-center gap-1.5">
                      <span>🗄️</span> CSDL Off-Chain (PostgreSQL)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                      Local DB
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[11px] text-slate-500">Mã băm cam kết món đồ (itemCommit):</div>
                      <div className="font-mono text-[11px] text-slate-800 break-all font-semibold bg-slate-50 p-1.5 rounded border border-slate-100">
                        {verificationReport.checks.commitMatch.offChain || "Chưa khởi tạo"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Mã đời chủ hiện tại (ownerHash):</div>
                      <div className="font-mono text-[11px] text-slate-800 break-all font-semibold bg-slate-50 p-1.5 rounded border border-slate-100">
                        {verificationReport.checks.ownerMatch.offChain || "Chưa có"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">Số lần chuyển giao:</span>
                      <span className="font-bold text-[#001B48]">
                        {verificationReport.checks.transferCountMatch.offChain} lần
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Tình trạng gắn cờ vi phạm:</span>
                      <span
                        className={`font-bold ${
                          verificationReport.checks.flagStatusMatch.offChain ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {verificationReport.checks.flagStatusMatch.offChain ? "Đang bị gắn cờ" : "An toàn"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cột 2: On-Chain Avalanche Fuji RPC */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-[#02457A] flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-[#018ABE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Smart Contract (Avalanche Fuji)
                    </span>
                    <span className="text-[10px] font-mono text-sky-800 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      Chain ID: 43113
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>itemCommit ghi nhận on-chain:</span>
                        {verificationReport.checks.commitMatch.passed && (
                          <span className="text-emerald-600 font-bold text-[10px]">Khớp ✓</span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-slate-800 break-all font-semibold bg-slate-50 p-1.5 rounded border border-slate-100">
                        {verificationReport.checks.commitMatch.onChain || "Chưa đồng bộ"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>ownerHash ghi nhận on-chain:</span>
                        {verificationReport.checks.ownerMatch.passed && (
                          <span className="text-emerald-600 font-bold text-[10px]">Khớp ✓</span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-slate-800 break-all font-semibold bg-slate-50 p-1.5 rounded border border-slate-100">
                        {verificationReport.checks.ownerMatch.onChain || "Chưa đồng bộ"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">Số lần chuyển giao on-chain:</span>
                      <span className="font-bold text-[#02457A] flex items-center gap-1">
                        <span>{verificationReport.checks.transferCountMatch.onChain} lần</span>
                        {verificationReport.checks.transferCountMatch.passed && (
                          <span className="text-emerald-600 text-[11px]">✓</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Tình trạng gắn cờ on-chain:</span>
                      <span
                        className={`font-bold ${
                          verificationReport.checks.flagStatusMatch.onChain ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {verificationReport.checks.flagStatusMatch.onChain ? "Bị cờ vi phạm" : "An toàn"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin Contract & Tra cứu Explorer */}
              <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                <div className="truncate max-w-md">
                  <span className="font-semibold">Hợp đồng UniCyclePassport:</span>{" "}
                  <code className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {verificationReport.contractAddress}
                  </code>
                </div>
                {verificationReport.explorerUrl && (
                  <a
                    href={verificationReport.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#018ABE] hover:underline shrink-0"
                  >
                    Xem trên Snowtrace Testnet ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Danh sách giao dịch Relayer (Chain Transactions Queue) */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-[#001B48] flex items-center justify-between">
              <span>Lịch Sử Giao Dịch Relayer On-Chain ({activeChainTxs.length})</span>
              <span className="text-[11px] font-normal text-slate-500">
                Tự động serialize nonce và trả phí gas hộ sinh viên
              </span>
            </div>

            {activeChainTxs.length > 0 ? (
              <div className="space-y-2">
                {activeChainTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#001B48]">
                          Thao tác: {tx.kind}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            tx.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : tx.status === "QUEUED"
                              ? "bg-amber-100 text-amber-800"
                              : tx.status === "SUBMITTED"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 truncate max-w-sm sm:max-w-md">
                        Tx: {tx.txHash || "Đang xếp hàng gửi lên Avalanche Fuji (QUEUED)..."}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {tx.txHash && (
                        <a
                          href={`https://testnet.snowtrace.io/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-[#018ABE] hover:bg-sky-50 transition-colors shadow-2xs"
                        >
                          Xem trên Snowtrace ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-sky-900 flex items-center justify-between">
                <span>Bản ghi đã được bảo chứng toàn vẹn trong cơ sở dữ liệu hệ thống (Off-chain DB).</span>
                <span className="text-[11px] font-bold text-sky-700">Trạng thái: Sẵn sàng</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Phóng To Ảnh */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full h-[70vh]">
            <Image
              src={selectedPhoto}
              alt="Ảnh phóng to"
              fill
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-white/20 px-3 py-1 rounded-full cursor-pointer"
            >
              Đóng [X]
            </button>
          </div>
        </div>
      )}

      {/* Modal QR Code Toàn Màn Hình */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-[#001B48] text-base">
                Mã Định Danh Số
              </h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="relative w-64 h-64 mx-auto border-2 border-dashed border-[#018ABE]/30 p-2 rounded-2xl">
              <Image
                src={passport.qrUrl}
                alt="Passport QR Fullscreen"
                fill
                sizes="256px"
                className="object-contain p-2"
                unoptimized
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Mở màn hình điện thoại này cho người mua quét trực tiếp để mở trang Digital Passport và đối chiếu lịch sử trao tay tại chỗ.
            </p>

            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Đã hiểu, đóng lại
            </button>
          </div>
        </div>
      )}
      {/* Modal Báo cáo Passport nghi vấn (Task 5.3) */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="PASSPORT"
        targetId={passport.itemId || passport.passportId}
        targetLabel={`Báo cáo Passport #${passport.passportId.slice(0, 12)}...`}
      />
    </div>
  );
}
