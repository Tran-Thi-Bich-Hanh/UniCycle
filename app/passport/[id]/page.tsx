import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { PassportClient, PassportPayload } from "@/components/passport/PassportClient";
import prisma from "@/lib/prisma";
import { processItemChainQueue } from "@/lib/blockchain/relayer";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Digital Product Passport #${resolvedParams.id.slice(0, 8)} | UniCycle Sinh Viên`,
    description:
      "Kiểm tra lịch sử chuỗi đời chủ, đối chiếu ảnh sản phẩm qua các thế hệ sinh viên và xác minh tính bất biến trên Avalanche Fuji.",
  };
}

export default async function PassportPage({ params }: PageProps) {
  const resolvedParams = await params;
  const identifier = resolvedParams.id;

  // Lấy dữ liệu Passport từ DB
  const item = await prisma.item.findFirst({
    where: {
      OR: [
        { passportId: identifier },
        { id: identifier },
      ],
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      owners: {
        orderBy: { seq: "asc" },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              school: {
                select: {
                  name: true,
                  shortName: true,
                  area: true,
                },
              },
            },
          },
        },
      },
      events: {
        orderBy: { seq: "asc" },
      },
      chainTxs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      listings: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          price: true,
          isFree: true,
          condition: true,
          status: true,
          createdAt: true,
          school: {
            select: {
              name: true,
              shortName: true,
            },
          },
          images: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              url: true,
              sha256: true,
            },
          },
        },
      },
    },
  });

  if (!item || !item.passportId) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
          <div
            className="w-14 h-14 mx-auto rounded-2xl bg-[#EEF7FC] border border-[#BAE6FD] text-[#018ABE] flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-black text-[#001B48]">
            Không tìm thấy Passport
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Mã định danh Passport <strong className="break-all">{identifier}</strong> không tồn tại trên hệ thống hoặc món đồ chưa được kích hoạt Digital Product Passport.
          </p>
          <div className="pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#018ABE] hover:bg-[#02457A] text-white text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#018ABE] focus-visible:ring-offset-2"
            >
              <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span>Quay lại sàn trao đổi</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Tự động đồng bộ giao dịch QUEUED/FAILED hoặc chưa khởi tạo lên Fuji khi mở trang Passport
  let latestChainTxs = item.chainTxs;
  if (
    item.passportId &&
    (latestChainTxs.length === 0 ||
      latestChainTxs.some((tx) => tx.status === "QUEUED" || tx.status === "FAILED"))
  ) {
    try {
      await processItemChainQueue(item.id, { repairMissingOnChain: true });
      latestChainTxs = await prisma.chainTx.findMany({
        where: { itemId: item.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    } catch (syncErr) {
      console.warn("Lỗi tự đồng bộ ChainTx khi mở PassportPage:", syncErr);
    }
  }

  // Chuẩn bị payload cho PassportClient
  const sanitizedOwners = item.owners.map((owner) => {
    const showRealName = Boolean(owner.showName && owner.user);
    const schoolName = owner.user?.school?.shortName || owner.user?.school?.name || "ĐHQG TP.HCM";
    return {
      id: owner.id,
      seq: owner.seq,
      since: owner.since.toISOString(),
      showName: owner.showName,
      displayName: showRealName
        ? owner.user?.displayName || "Sinh viên"
        : `Sinh viên ẩn danh (${schoolName})`,
      schoolName,
      area: owner.user?.school?.area || null,
      ownerHashMasked: `${owner.ownerHash.slice(0, 10)}...${owner.ownerHash.slice(-8)}`,
    };
  });

  const listingsTimeline = item.listings.map((l, index) => ({
    seq: index + 1,
    listingId: l.id,
    title: l.title,
    price: l.price,
    isFree: l.isFree,
    condition: l.condition,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
    schoolName: l.school?.shortName || l.school?.name,
    images: l.images.map((img) => ({
      id: img.id,
      url: img.url,
      sha256: img.sha256,
    })),
  }));

  const passportUrl = `https://unicycle.vn/passport/${item.passportId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(passportUrl)}`;

  const payload: PassportPayload = {
    passport: {
      passportId: item.passportId,
      itemId: item.id,
      passportStatus: item.passportStatus,
      flagReason: item.flagReason,
      flaggedAt: item.flaggedAt ? item.flaggedAt.toISOString() : null,
      identityLevel: item.identityLevel,
      itemCommit: item.itemCommit,
      createdAt: item.createdAt.toISOString(),
      category: item.category,
      currentOwnerSeq: item.owners.length,
      isFlagged: item.passportStatus === "FLAGGED",
      qrUrl,
      passportUrl,
    },
    owners: sanitizedOwners,
    events: item.events.map((e) => ({
      id: e.id,
      seq: e.seq,
      eventType: e.eventType,
      confirmationLevel: e.confirmationLevel as "BOTH" | "ONE_SIDE",
      transferKind: e.transferKind,
      occurredAt: e.occurredAt.toISOString(),
    })),
    listingsTimeline,
    chainTxs: latestChainTxs.map((tx) => ({
      id: tx.id,
      kind: tx.kind,
      status: tx.status,
      txHash: tx.txHash,
      submittedAt: tx.submittedAt ? tx.submittedAt.toISOString() : null,
      confirmedAt: tx.confirmedAt ? tx.confirmedAt.toISOString() : null,
    })),
  };

  return <PassportClient initialData={payload} />;
}
