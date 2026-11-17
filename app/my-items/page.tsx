import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MyItemsClient, MyItemData } from "@/components/my-items/MyItemsClient";

export const metadata: Metadata = {
  title: "Đồ Của Tôi & Digital Product Passport | UniCycle Sinh Viên",
  description:
    "Quản lý các món đồ đang sở hữu, hiển thị mã QR số khi gặp mặt tại KTX và đăng bán lại 1-chạm kế thừa lịch sử Digital Passport.",
};

export default async function MyItemsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/my-items");
  }

  const items = await prisma.item.findMany({
    where: {
      currentOwnerId: user.id,
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
  });

  const formattedItems: MyItemData[] = items.map((item) => {
    const currentOwnerRecord = item.owners.find((o) => o.userId === user.id);
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
      category: item.category,
      title: latestListing?.title || "Món đồ sinh viên đã kích hoạt Passport",
      thumbnail:
        latestListing?.images[0]?.url ||
        "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400",
      totalOwners: item.owners.length,
      myOwnerSeq: currentOwnerRecord?.seq || item.owners.length,
      showNameOnPassport: currentOwnerRecord?.showName ?? false,
      ownedSince: currentOwnerRecord?.since.toISOString() || item.createdAt.toISOString(),
      isCurrentlyListed,
      latestListingId: latestListing?.id || null,
      latestListingStatus: latestListing?.status || null,
      passportUrl,
      qrUrl,
      chainTx: item.chainTxs[0] || null,
    };
  });

  return <MyItemsClient initialItems={formattedItems} />;
}

