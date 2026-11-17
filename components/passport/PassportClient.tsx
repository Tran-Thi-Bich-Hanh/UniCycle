"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

interface PassportClientProps {
  initialData: PassportPayload;
}

export function PassportClient({ initialData }: PassportClientProps) {
  const { passport, owners, events, listingsTimeline, chainTxs } = initialData;
  const [copied, setCopied] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const handleCopyId = () => {
    if (passport.passportId) {
      navigator.clipboard.writeText(passport.passportId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Thanh điều hướng breadcrumb */}
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

        {/* 2. Banner Tuyên Bố Giới Hạn Bắt Buộc (BR30) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 text-xs sm:text-sm space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-black text-amber-900 uppercase tracking-wider text-xs">
            <span className="text-base">⚠️</span>
            <span>Tuyên Bố Giới Hạn Trách Nhiệm Bắt Buộc (Quy tắc BR30)</span>
          </div>
          <p className="text-amber-900/90 leading-relaxed text-xs sm:text-[13px]">
            Digital Product Passport ghi nhận chuỗi lịch sử chuyển nhượng số giữa các bạn sinh viên trên nền tảng UniCycle. <strong>Passport KHÔNG PHẢI là chứng thư giám định chất lượng, không đảm bảo tính chính hãng hay bảo hành vật lý của món đồ</strong>. Người mua có trách nhiệm kiểm tra trực tiếp tình trạng thực tế của món đồ khi gặp mặt trao tay.
          </p>
        </div>

        {/* Cảnh báo nếu Passport bị gắn cờ vi phạm (BR39) */}
        {passport.isFlagged && (
          <div className="p-4 rounded-2xl bg-rose-600 text-white text-xs sm:text-sm shadow-md flex items-start gap-3 animate-in fade-in">
            <span className="text-2xl">🚨</span>
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
                          <span>📍 {owner.area}</span>
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
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E8EE] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[#001B48] text-base sm:text-lg flex items-center gap-2">
              <span>❄️</span>
              <span>Bảo Chứng Bất Biến (Avalanche Fuji C-Chain)</span>
            </h3>
            <span className="text-[11px] font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Fuji Testnet
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Mỗi sự kiện chuyển giao sở hữu được hệ thống neo bằng hash bất biến. Người mua có thể đối chiếu các bản ghi on-chain với dữ liệu hiển thị để đảm bảo lịch sử không bị can thiệp.
          </p>

          {chainTxs.length > 0 ? (
            <div className="space-y-2">
              {chainTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#001B48]">
                      Giao dịch: {tx.kind}
                    </span>
                    <div className="font-mono text-[11px] text-slate-500 truncate max-w-sm">
                      Tx: {tx.txHash || "Đang xếp hàng gửi lên Avalanche Fuji (QUEUED)..."}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        tx.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-800"
                          : tx.status === "QUEUED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {tx.status}
                    </span>
                    {tx.txHash && (
                      <a
                        href={`https://testnet.snowtrace.io/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-[#018ABE] hover:underline"
                      >
                        Snowtrace ↗
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
    </div>
  );
}
