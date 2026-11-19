import React, { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MyItemsClient, MyItemData } from "@/components/my-items/MyItemsClient";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";

export const metadata: Metadata = {
  title: "Đồ của tôi | UniCycle",
  description:
    "Quản lý đồ dùng đang sở hữu, mã QR đối chiếu khi gặp mặt và đăng bán lại nhanh chóng trên UniCycle.",
};

const FALLBACK_OWNED_DATES = [
  "2026-10-15T08:00:00.000Z",
  "2026-09-12T08:00:00.000Z",
  "2026-08-05T08:00:00.000Z",
];

async function MyItemsContent() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/my-items");
  }

  let formattedItems: MyItemData[] = [];
  let initialListingsCount = 0;

  try {
    const dbUser = await prisma.user.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email }] },
      select: { id: true },
    });
    const resolvedUserId = dbUser?.id || user.id;

    const [items, listingsCount] = await Promise.all([
      prisma.item.findMany({
        where: {
          currentOwnerId: resolvedUserId,
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
            select: {
              id: true,
              seq: true,
              userId: true,
              showName: true,
              since: true,
              ownerHash: true,
            },
          },
          listings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              title: true,
              price: true,
              isFree: true,
              status: true,
              images: {
                orderBy: { position: "asc" },
                take: 1,
                select: { url: true },
              },
            },
          },
          chainTxs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              txHash: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prisma.listing.count({
        where: { sellerId: resolvedUserId },
      }),
    ]);

    initialListingsCount = listingsCount;

    formattedItems = items.map((item) => {
      const currentOwnerRecord = [...item.owners].reverse().find((o) => o.userId === resolvedUserId);
      const latestListing = item.listings[0] || null;
      const isCurrentlyListed = latestListing
        ? ["AVAILABLE", "RESERVED"].includes(latestListing.status)
        : false;

      const passportUrl = item.passportId
        ? `https://unicycle.vn/passport/${item.passportId}`
        : null;

      const qrUrl = passportUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(passportUrl)}`
        : null;

      return {
        id: item.id,
        passportId: item.passportId,
        passportStatus: item.passportStatus,
        identityLevel: item.identityLevel,
        category: item.category || { id: "cat-general", name: "Đồ Dùng Sinh Viên", slug: "do-dung-sinh-vien" },
        title: latestListing?.title || "Món đồ sinh viên đã kích hoạt Passport",
        thumbnail:
          latestListing?.images[0]?.url ||
          "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400",
        totalOwners: item.owners.length,
        myOwnerSeq: currentOwnerRecord?.seq || item.owners.length,
        showNameOnPassport: currentOwnerRecord?.showName ?? false,
        ownedSince: currentOwnerRecord?.since?.toISOString() || item.createdAt.toISOString(),
        isCurrentlyListed,
        latestListingId: latestListing?.id || null,
        latestListingStatus: latestListing?.status || null,
        latestListingPrice: latestListing?.price ?? null,
        latestListingIsFree: latestListing?.isFree ?? false,
        passportUrl,
        qrUrl,
        chainTx: item.chainTxs[0] || null,
      };
    });
  } catch (err) {
    console.warn("⚠️ Lỗi truy vấn Prisma /my-items, dùng mock fallback:", err);
    formattedItems = FALLBACK_PRODUCTS.slice(0, 3).map((p, idx) => ({
      id: p.item?.id || `demo-item-${idx + 1}`,
      passportId: p.item?.passportId || `0x${p.id.padEnd(64, "0")}`,
      passportStatus: "VERIFIED",
      identityLevel: "HIGH",
      category: p.category || { id: "cat-general", name: "Đồ Dùng Sinh Viên", slug: "do-dung-sinh-vien" },
      title: p.title,
      thumbnail: p.images[0]?.url || "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400",
      totalOwners: idx + 1,
      myOwnerSeq: idx + 1,
      showNameOnPassport: true,
      ownedSince: FALLBACK_OWNED_DATES[idx] || "2026-10-01T08:00:00.000Z",
      isCurrentlyListed: idx === 0,
      latestListingId: p.id,
      latestListingStatus: idx === 0 ? "AVAILABLE" : "SOLD",
      latestListingPrice: p.price,
      latestListingIsFree: p.isFree,
      passportUrl: `https://unicycle.vn/passport/${p.item?.passportId || p.id}`,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Funicycle.vn%2Fpassport%2F${p.item?.passportId || p.id}`,
      chainTx: {
        id: `tx-${idx + 1}`,
        status: "SUCCESS",
        txHash: `0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`,
      },
    }));
    initialListingsCount = formattedItems.length;
  }

  return (
    <MyItemsClient
      initialItems={formattedItems}
      initialListingsCount={initialListingsCount}
    />
  );
}

export default function MyItemsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-[#018ABE] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-[#02457A]">
            Đang tải danh sách đồ của bạn...
          </p>
        </div>
      }
    >
      <MyItemsContent />
    </Suspense>
  );
}
