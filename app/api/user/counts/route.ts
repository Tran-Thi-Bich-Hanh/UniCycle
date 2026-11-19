import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({
        itemsCount: 0,
        productsCount: 0,
        ordersCount: 0,
        activeOrdersCount: 0,
        totalOrdersCount: 0,
      });
    }

    const dbUser = await prisma.user.findFirst({
      where: user.email
        ? { OR: [{ id: user.id }, { email: user.email }] }
        : { id: user.id },
      select: { id: true },
    });
    const resolvedUserId = dbUser?.id || user.id;

    const [ownedItems, userListings, activeOrdersCount, totalOrdersCount] =
      await Promise.all([
        prisma.item.findMany({
          where: { currentOwnerId: resolvedUserId },
          select: { id: true },
        }),
        prisma.listing.findMany({
          where: {
            sellerId: resolvedUserId,
            status: { not: "REMOVED" },
          },
          select: { id: true, itemId: true },
        }),
        prisma.order.count({
          where: {
            OR: [{ buyerId: resolvedUserId }, { sellerId: resolvedUserId }],
            status: {
              in: ["PENDING", "ACCEPTED", "WAITING_CONFIRMATION", "DISPUTED"],
            },
          },
        }),
        prisma.order.count({
          where: {
            OR: [{ buyerId: resolvedUserId }, { sellerId: resolvedUserId }],
          },
        }),
      ]);

    const ownedItemIds = new Set(ownedItems.map((item) => item.id));
    const unmatchedListingsCount = userListings.filter(
      (listing) => !listing.itemId || !ownedItemIds.has(listing.itemId)
    ).length;
    const unifiedItemsCount = ownedItems.length + unmatchedListingsCount;

    return NextResponse.json({
      itemsCount: unifiedItemsCount,
      productsCount: unifiedItemsCount,
      ordersCount: totalOrdersCount,
      activeOrdersCount,
      totalOrdersCount,
    });
  } catch (err) {
    console.error("Lỗi khi lấy user counts:", err);
    return NextResponse.json(
      {
        itemsCount: 0,
        productsCount: 0,
        ordersCount: 0,
        activeOrdersCount: 0,
        totalOrdersCount: 0,
      },
      { status: 500 }
    );
  }
}
