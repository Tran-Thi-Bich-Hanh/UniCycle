"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ReportModal } from "@/components/reports/ReportModal";
import {
  ItemJourneyTimeline,
  JourneyOwnerStep,
} from "@/components/passport/ItemJourneyTimeline";

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
    qrUrl?: string;
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
  status:
    | "VERIFIED_MATCH"
    | "PENDING_SYNC"
    | "MISMATCH_DETECTED"
    | "NOT_ANCHORED_YET"
    | "SIMULATED_MODE";
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

function formatShortHash(value?: string | null, start = 8, end = 6): string {
  if (!value) return "";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function formatTxKind(kind: string): string {
  switch (kind) {
    case "REGISTER":
      return "Khởi tạo hộ chiếu";
    case "TRANSFER":
      return "Chuyển giao sở hữu";
    case "FLAG":
      return "Gắn cờ cảnh báo";
    default:
      return kind;
  }
}

function formatTxStatus(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "Đã xác nhận";
    case "QUEUED":
      return "Đang chờ gửi";
    case "SUBMITTED":
      return "Đang xác nhận";
    case "FAILED":
      return "Chưa đồng bộ";
    default:
      return status;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function VerificationCheckItem({
  label,
  passed,
  detail,
}: {
  label: string;
  passed: boolean;
  detail?: string;
}) {
  return (
    <div
      className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
        passed
          ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-950"
          : "bg-amber-50/70 border-amber-200/80 text-amber-950"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {passed ? (
          <svg
            className="w-4 h-4 text-emerald-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-amber-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        )}
        <span className="font-semibold truncate">{label}</span>
      </div>
      <span
        className={`text-[11px] font-bold shrink-0 whitespace-nowrap ${
          passed ? "text-emerald-700" : "text-amber-700"
        }`}
      >
        {detail || (passed ? "Đạt" : "Chưa khớp")}
      </span>
    </div>
  );
}

export function PassportClient({ initialData }: PassportClientProps) {
  const { passport, owners, events, listingsTimeline, chainTxs } = initialData;
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; alt: string } | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  // Trạng thái kiểm chứng On-Chain và Đồng bộ Relayer
  const [activeChainTxs, setActiveChainTxs] = useState(chainTxs);
  const [verificationReport, setVerificationReport] = useState<OnChainVerificationReport | null>(
    null
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const copyIdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyLinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closePhotoBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    return () => {
      if (copyIdTimerRef.current) clearTimeout(copyIdTimerRef.current);
      if (copyLinkTimerRef.current) clearTimeout(copyLinkTimerRef.current);
    };
  }, []);

  const openPhotoModal = (url: string, alt: string) => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }
    setSelectedPhoto({ url, alt });
  };

  const closePhotoModal = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  useEffect(() => {
    if (!selectedPhoto) return;

    const previousOverflow = document.body.style.overflow;
    const openerElement = previousFocusRef.current;
    document.body.style.overflow = "hidden";

    const frameId = requestAnimationFrame(() => {
      closePhotoBtnRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePhotoModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      openerElement?.focus();
    };
  }, [selectedPhoto, closePhotoModal]);

  const handleCopyId = async () => {
    if (!passport.passportId) return;
    try {
      await navigator.clipboard.writeText(passport.passportId);
      setCopied(true);
      if (copyIdTimerRef.current) clearTimeout(copyIdTimerRef.current);
      copyIdTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyIdTimerRef.current = null;
      }, 2000);
    } catch {
      setFeedback({
        type: "error",
        message: "Không thể sao chép mã hộ chiếu. Vui lòng thử lại.",
      });
    }
  };

  const handleCopyPassportLink = async () => {
    const shareUrl =
      passport.passportId && typeof window !== "undefined"
        ? `${window.location.origin}/passport/${passport.passportId}`
        : passport.passportUrl;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      if (copyLinkTimerRef.current) clearTimeout(copyLinkTimerRef.current);
      copyLinkTimerRef.current = setTimeout(() => {
        setCopiedLink(false);
        copyLinkTimerRef.current = null;
      }, 2000);
    } catch {
      setFeedback({
        type: "error",
        message: "Không thể sao chép liên kết. Vui lòng thử lại.",
      });
    }
  };

  const handleVerifyOnChain = async () => {
    setIsVerifying(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/passport/${passport.passportId}/verify`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể kiểm chứng dữ liệu trên chuỗi.");
      }
      setVerificationReport(data.report);
      if (Array.isArray(data.chainTxs)) {
        setActiveChainTxs(data.chainTxs);
      }
      setFeedback({
        type: "success",
        message: data.report?.message || "Kiểm tra tính toàn vẹn trên Avalanche Fuji hoàn tất.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Đã xảy ra lỗi khi kiểm chứng dữ liệu.",
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
        throw new Error(data.error || "Không thể kích hoạt đồng bộ dữ liệu.");
      }
      if (data.report) {
        setVerificationReport(data.report);
      }
      if (Array.isArray(data.chainTxs)) {
        setActiveChainTxs(data.chainTxs);
      }
      setFeedback({
        type: "success",
        message: data.message || "Đã đồng bộ giao dịch lên Avalanche Fuji thành công.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Đã xảy ra lỗi khi đồng bộ giao dịch.",
      });
    } finally {
      setIsSyncing(false);
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

  const journeySteps: JourneyOwnerStep[] = owners.map((owner, idx) => {
    const isFirst = idx === 0;
    const isCurrent = idx === owners.length - 1;
    const matchingEvent = events.find((e) => e.seq === owner.seq);
    const matchingListing = listingsTimeline[idx];
    const ownerTx =
      idx === 0 ? registerTx : transferTxs[idx - 1] || chronologicalTxs[idx] || null;

    const locationLabel = owner.area
      ? `${owner.schoolName} · ${owner.area}`
      : owner.schoolName;
    const confirmationLabel = matchingEvent
      ? matchingEvent.confirmationLevel === "BOTH"
        ? "Xác nhận gặp mặt 2 chiều"
        : "Xác nhận 1 chiều · Tự hoàn tất 48h"
      : null;
    const metaText = [locationLabel, `Từ ${formatDate(owner.since)}`, confirmationLabel]
      .filter(Boolean)
      .join(" • ");

    const extraContent =
      matchingListing && matchingListing.images.length > 0 ? (
        <div className="pt-2.5 mt-1 border-t border-slate-200/70">
          <span className="block text-[11px] font-semibold text-slate-600 mb-2">
            Ảnh chụp món đồ tại đời chủ #{owner.seq} ({formatDate(matchingListing.createdAt)})
          </span>
          <div className="flex flex-wrap gap-2">
            {matchingListing.images.map((img, imgIdx) => {
              const altText = `Ảnh món đồ ở đời chủ #${owner.seq} (${imgIdx + 1})`;
              return (
                <button
                  key={img.id || imgIdx}
                  type="button"
                  onClick={() => openPhotoModal(img.url, altText)}
                  aria-label={`Phóng to ${altText}`}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:border-[#018ABE] hover:scale-105 transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                >
                  <Image
                    src={img.url}
                    alt={altText}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : undefined;

    return {
      key: owner.id,
      seq: owner.seq,
      title: `Đời chủ #${owner.seq}: ${owner.displayName}`,
      badgeLabel: isCurrent ? "Chủ hiện tại" : isFirst ? "Khởi tạo" : "Đã chuyển nhượng",
      badgeTone: isCurrent ? "current" : isFirst ? "origin" : "transferred",
      isCurrent,
      metaText,
      txHash: ownerTx?.txHash || null,
      extraContent,
    };
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Thanh điều hướng breadcrumb & Nút báo cáo */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Điều hướng"
            className="flex items-center gap-2 text-xs font-semibold text-[#02457A] min-w-0 flex-wrap"
          >
            <Link
              href="/"
              className="hover:text-[#018ABE] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              Trang chủ
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/products"
              className="hover:text-[#018ABE] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              Sàn trao đổi
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#001B48] font-bold">Digital Product Passport</span>
          </nav>

          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <svg
              className="w-3.5 h-3.5 text-rose-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
              />
            </svg>
            <span>Báo cáo nghi vấn</span>
          </button>
        </div>

        {/* 2. Cảnh báo nếu Passport bị gắn cờ vi phạm */}
        {passport.isFlagged && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-600 text-white text-xs sm:text-sm shadow-md flex items-start gap-3"
          >
            <svg
              className="w-5 h-5 text-white shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div className="min-w-0">
              <strong className="block text-sm font-black">
                Món đồ này đang bị gắn cờ cảnh báo!
              </strong>
              <p className="text-rose-100 text-xs mt-1 leading-relaxed">
                Lý do:{" "}
                {passport.flagReason ||
                  "Đang có khiếu nại tranh chấp quyền sở hữu hoặc báo cáo vi phạm."}
              </p>
            </div>
          </div>
        )}

        {/* 3. Header Thẻ Passport Sinh Viên (chống tràn ngang min-w-0 flex-1) */}
        <div className="bg-gradient-to-br from-[#001B48] via-[#02457A] to-[#018ABE] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Cột trái: min-w-0 flex-1 tránh đẩy QR ra khỏi khung */}
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/15 backdrop-blur-md border border-white/20 text-sky-100 whitespace-nowrap">
                  {passport.category?.name || "Đồ Dùng Sinh Viên"}
                </span>
                {passport.isFlagged ? (
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/80 border border-rose-300/60 text-white whitespace-nowrap">
                    Đang bị gắn cờ
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/25 border border-emerald-400/40 text-emerald-100 inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 motion-safe:animate-pulse shrink-0" />
                    <span>Đời chủ hiện tại: #{passport.currentOwnerSeq}</span>
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug text-balance">
                {itemTitle}
              </h1>

              {/* Mã hộ chiếu rút gọn + Copy & Trạng thái bảo chứng */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <div className="inline-flex items-center gap-2 bg-black/25 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-xs text-sky-100 max-w-full">
                  <span className="text-sky-200 shrink-0">Mã hộ chiếu:</span>
                  <span className="font-mono font-semibold text-white">
                    {formatShortHash(passport.passportId, 8, 6)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    aria-label="Sao chép mã Passport đầy đủ"
                    className="shrink-0 p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    title="Sao chép mã Passport đầy đủ"
                  >
                    {copied ? (
                      <span
                        role="status"
                        aria-live="polite"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-bold whitespace-nowrap"
                      >
                        <svg
                          className="w-3.5 h-3.5 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                        <span>Đã chép</span>
                      </span>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {latestSnowtraceTxUrl ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-300/35 text-emerald-100 text-xs font-semibold whitespace-nowrap">
                    <svg
                      className="w-4 h-4 text-emerald-300 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                      />
                    </svg>
                    <span>Đã bảo chứng trên Avalanche Fuji</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400/20 border border-amber-300/35 text-amber-100 text-xs font-semibold whitespace-nowrap">
                    <svg
                      className="w-4 h-4 text-amber-200 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Chờ đồng bộ on-chain</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleCopyPassportLink}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                    copiedLink
                      ? "bg-emerald-500/25 border-emerald-300/50 text-emerald-100"
                      : "bg-white/15 hover:bg-white/25 border-white/25 text-white"
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <svg
                        className="w-4 h-4 text-emerald-300 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span>Đã sao chép liên kết</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                        />
                      </svg>
                      <span>Sao chép liên kết</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Lưu ý phạm vi xác thực (đặt ngay dưới thẻ Hero) */}
        <div className="p-4 rounded-2xl bg-amber-50/75 border border-amber-200/80 text-amber-950 flex items-start gap-3 text-xs sm:text-[13px] leading-relaxed">
          <svg
            className="w-4 h-4 text-amber-700 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <p>
            <strong className="font-bold text-amber-950">Lưu ý phạm vi xác thực:</strong>{" "}
            Digital Product Passport ghi nhận chuỗi lịch sử chuyển nhượng số giữa các sinh viên
            trên UniCycle, không phải chứng thư giám định chất lượng hay bảo hành vật lý. Người
            mua vui lòng kiểm tra trực tiếp tình trạng thực tế của món đồ khi gặp mặt trao tay.
          </p>
        </div>

        {/* 5. Hành trình đồ vật (Đồng bộ component với trang Chi tiết sản phẩm & Đăng tin) */}
        <ItemJourneyTimeline
          title="Hành trình đồ vật"
          subtitle="Ghi nhận các thế hệ sinh viên đã từng sở hữu và bảo quản món đồ"
          headerRight={
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-[#0B6B3A] bg-[#E6F6EE] border border-[#B7E4CB] whitespace-nowrap">
              Tổng cộng {owners.length} đời chủ
            </span>
          }
          steps={journeySteps}
        />

        {/* 6. Xác minh tính toàn vẹn & Chi tiết kỹ thuật (Progressive Disclosure) */}
        <section
          id="passport-verify"
          className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E8EE] shadow-xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3 min-w-0">
              <span
                className="w-10 h-10 rounded-xl bg-[#EEF7FC] border border-[#BAE6FD] text-[#018ABE] flex items-center justify-center shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="font-extrabold text-[#001B48] text-base sm:text-lg">
                  Xác minh tính toàn vẹn
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Lịch sử chuyển giao được lưu dấu bất biến trên mạng Avalanche Fuji để đảm bảo
                  không ai có thể tự ý chỉnh sửa hồ sơ món đồ.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center text-[11px] font-semibold text-[#02457A] bg-[#EEF7FC] px-3 py-1 rounded-full border border-[#BAE6FD] whitespace-nowrap shrink-0">
              Avalanche Fuji
            </span>
          </div>

          {/* Thanh hành động căn hàng gọn */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleVerifyOnChain}
              disabled={isVerifying || isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              {isVerifying ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                  <span>Kiểm tra ngay</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSyncRelayer}
              disabled={isVerifying || isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E3F1F9] hover:bg-[#BAE6FD]/70 text-[#02457A] border border-[#BAE6FD] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              {isSyncing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-[#02457A] shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Đang đồng bộ...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  <span>Đồng bộ lại</span>
                </>
              )}
            </button>

            <a
              href={latestSnowtraceTxUrl || "https://testnet.snowtrace.io"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#02457A] hover:bg-slate-100 transition-colors border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              <span>Mở Snowtrace</span>
              <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                />
              </svg>
            </a>
          </div>

          {/* Thông báo kết quả */}
          {feedback && (
            <div
              role="status"
              className={`p-3.5 rounded-2xl text-xs font-medium border flex items-start gap-2.5 ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : feedback.type === "error"
                  ? "bg-rose-50 text-rose-900 border-rose-200"
                  : "bg-sky-50 text-sky-900 border-sky-200"
              }`}
            >
              {feedback.type === "success" ? (
                <svg
                  className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : feedback.type === "error" ? (
                <svg
                  className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-sky-600 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <div className="flex-1 min-w-0">{feedback.message}</div>
            </div>
          )}

          {/* Checklist kết quả dễ hiểu (khi người dùng bấm Kiểm tra ngay) */}
          {verificationReport && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-[#001B48]">
                    Kết quả đối chiếu độc lập
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
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
                    {verificationReport.status === "PENDING_SYNC" && "Đang chờ đồng bộ"}
                    {verificationReport.status === "SIMULATED_MODE" && "Chế độ mô phỏng"}
                    {verificationReport.status === "NOT_ANCHORED_YET" && "Chưa neo on-chain"}
                    {verificationReport.status === "MISMATCH_DETECTED" && "Phát hiện sai lệch"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Kiểm tra lúc:{" "}
                  {new Date(verificationReport.verifiedAt).toLocaleTimeString("vi-VN")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <VerificationCheckItem
                  label="Hồ sơ tồn tại trên chuỗi"
                  passed={verificationReport.checks.exists.passed}
                />
                <VerificationCheckItem
                  label="Thông tin món đồ nguyên vẹn"
                  passed={verificationReport.checks.commitMatch.passed}
                />
                <VerificationCheckItem
                  label="Chủ sở hữu hiện tại khớp"
                  passed={verificationReport.checks.ownerMatch.passed}
                />
                <VerificationCheckItem
                  label="Số lần chuyển giao khớp"
                  passed={verificationReport.checks.transferCountMatch.passed}
                  detail={`${verificationReport.checks.transferCountMatch.offChain} lần`}
                />
                <VerificationCheckItem
                  label="Trạng thái an toàn"
                  passed={verificationReport.checks.flagStatusMatch.passed}
                  detail={
                    verificationReport.checks.flagStatusMatch.offChain
                      ? "Đang bị gắn cờ"
                      : "Bình thường"
                  }
                />
              </div>
            </div>
          )}

          {/* Mục thu gọn: Chi tiết kỹ thuật & lịch sử giao dịch (Mặc định ĐÓNG) */}
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              aria-expanded={showTechDetails}
              aria-controls="passport-tech-details"
              onClick={() => setShowTechDetails((prev) => !prev)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 text-left text-xs font-bold text-[#001B48] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <svg
                  className="w-4 h-4 text-[#018ABE] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                  />
                </svg>
                <span>Chi tiết kỹ thuật &amp; lịch sử giao dịch ({activeChainTxs.length})</span>
              </span>
              <svg
                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                  showTechDetails ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTechDetails && (
              <div id="passport-tech-details" className="mt-4 space-y-4">
                {/* 1. Mã định danh đầy đủ & thông số định danh */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#001B48]">Mã định danh Passport đầy đủ</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600">
                        Mức định danh: {passport.identityLevel}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-sky-50 text-[11px] font-bold text-[#018ABE] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE]"
                      >
                        {copied ? "Đã chép" : "Sao chép mã"}
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-slate-800 break-all bg-white p-2.5 rounded-xl border border-slate-200">
                    {passport.passportId}
                  </div>
                  {verificationReport && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
                      <div className="min-w-0">
                        <span className="font-semibold">Hợp đồng UniCyclePassport: </span>
                        <code className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 break-all">
                          {verificationReport.contractAddress}
                        </code>
                      </div>
                      {verificationReport.explorerUrl && (
                        <a
                          href={verificationReport.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-[#018ABE] hover:underline shrink-0"
                        >
                          Xem trên Snowtrace Testnet
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Bảng đối chiếu mã băm kỹ thuật (khi đã bấm kiểm tra) */}
                {verificationReport && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-[#001B48] inline-flex items-center gap-1.5">
                          <svg
                            className="w-4 h-4 text-[#018ABE] shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"
                            />
                          </svg>
                          <span>Dữ liệu hệ thống (Off-chain)</span>
                        </span>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 mb-1">itemCommit:</div>
                        <div className="font-mono text-[11px] text-slate-800 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {verificationReport.checks.commitMatch.offChain || "Chưa khởi tạo"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 mb-1">ownerHash:</div>
                        <div className="font-mono text-[11px] text-slate-800 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {verificationReport.checks.ownerMatch.offChain || "Chưa có"}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-[#02457A] inline-flex items-center gap-1.5">
                          <svg
                            className="w-4 h-4 text-[#018ABE] shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                          <span>Hợp đồng thông minh (Fuji)</span>
                        </span>
                        <span className="text-[10px] font-mono text-sky-800 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          Chain ID: 43113
                        </span>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 mb-1">
                          itemCommit on-chain:
                        </div>
                        <div className="font-mono text-[11px] text-slate-800 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {verificationReport.checks.commitMatch.onChain || "Chưa đồng bộ"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 mb-1">
                          ownerHash on-chain:
                        </div>
                        <div className="font-mono text-[11px] text-slate-800 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {verificationReport.checks.ownerMatch.onChain || "Chưa đồng bộ"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Danh sách giao dịch on-chain */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#001B48]">
                    Lịch sử giao dịch on-chain ({activeChainTxs.length})
                  </div>

                  {activeChainTxs.length > 0 ? (
                    <div className="space-y-2">
                      {activeChainTxs.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-[#001B48]">
                                {formatTxKind(tx.kind)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                  tx.status === "CONFIRMED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : tx.status === "QUEUED"
                                    ? "bg-amber-100 text-amber-800"
                                    : tx.status === "SUBMITTED"
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {formatTxStatus(tx.status)}
                              </span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {tx.txHash
                                ? `Mã giao dịch: ${formatShortHash(tx.txHash, 10, 8)}`
                                : "Đang chờ gửi lên Avalanche Fuji"}
                            </div>
                          </div>

                          {tx.txHash && (
                            <a
                              href={`https://testnet.snowtrace.io/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-[#018ABE] hover:bg-sky-50 transition-colors shadow-2xs shrink-0 self-start sm:self-center"
                            >
                              <span>Xem trên Snowtrace</span>
                              <svg
                                className="w-3 h-3 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                                />
                              </svg>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-sky-900">
                      Bản ghi đã được bảo toàn toàn vẹn trên hệ thống và đang sẵn sàng đồng bộ lên
                      chuỗi.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal Phóng To Ảnh (Chuẩn A11y) */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh món đồ phóng to"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={closePhotoModal}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] w-full h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedPhoto.url}
              alt={selectedPhoto.alt}
              fill
              className="object-contain"
            />
            <button
              ref={closePhotoBtnRef}
              type="button"
              onClick={closePhotoModal}
              aria-label="Đóng ảnh phóng to"
              className="absolute -top-11 right-0 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal Báo cáo Passport nghi vấn */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="PASSPORT"
        targetId={passport.itemId || passport.passportId}
        targetLabel={`Báo cáo Passport ${formatShortHash(passport.passportId, 8, 6)}`}
      />
    </div>
  );
}
