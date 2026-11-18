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
      where: { OR: [{ id: user.id }, { email: user.email }] },
      select: { id: true },
    });
    const resolvedUserId = dbUser?.id || user.id;

    const [itemsCount, productsCount, activeOrdersCount, totalOrdersCount] = await Promise.all([
      prisma.item.count({
        where: { currentOwnerId: resolvedUserId },
      }),
      prisma.listing.count({
        where: { sellerId: resolvedUserId },
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

    return NextResponse.json({
      itemsCount: productsCount,
      productsCount,
      ordersCount: totalOrdersCount,
      activeOrdersCount,
      totalOrdersCount,
    });
  } catch (err) {
    console.error("Lỗi khi lấy user counts:", err);
    return NextResponse.json(
      { itemsCount: 0, ordersCount: 0, activeOrdersCount: 0, totalOrdersCount: 0 },
      { status: 500 }
    );
  }
}
