import prisma from "@/lib/prisma";
import { FALLBACK_PRODUCTS } from "@/lib/data/mock-fallback";
import {
  DEFAULT_MY_ITEM_CATEGORY,
  DEFAULT_OWNED_ITEM_THUMBNAIL,
  UnifiedMyItem,
  UnifiedOwnedItem,
  mergeOwnedItemsAndListings,
} from "./types";

const FALLBACK_OWNED_DATES = [
  "2026-10-15T08:00:00.000Z",
  "2026-09-12T08:00:00.000Z",
  "2026-08-05T08:00:00.000Z",
];

const FALLBACK_LISTING_CREATED_DATES = [
  "2026-11-10T08:00:00.000Z",
  "2026-11-08T08:00:00.000Z",
  "2026-08-05T08:00:00.000Z",
];

const FALLBACK_LISTING_EXPIRES_AT = "2026-12-15T08:00:00.000Z";

function buildFallbackUnifiedItems(): UnifiedMyItem[] {
  return FALLBACK_PRODUCTS.slice(0, 3).map((product, idx) => {
    const itemId = product.item?.id || `demo-item-${idx + 1}`;
    const passportId =
      product.item?.passportId || `0x${(idx + 1).toString(16).padStart(64, "0")}`;
    const passportUrl = `/passport/${passportId}`;
    const qrUrl = null;
    const ownedSince = FALLBACK_OWNED_DATES[idx] || "2026-10-01T08:00:00.000Z";
    const createdAt = FALLBACK_LISTING_CREATED_DATES[idx] || ownedSince;

    const totalOwners = idx === 1 ? 1 : 2;
    const myOwnerSeq = totalOwners;

    const ownedItem: UnifiedOwnedItem = {
      id: itemId,
      passportEnabled: true,
      passportId,
      passportStatus: "ACTIVE",
      identityLevel: "LIGHT",
      totalOwners,
      myOwnerSeq,
      showNameOnPassport: idx !== 2,
      ownedSince,
      passportUrl,
      qrUrl,
      chainTx: {
        id: `demo-tx-${idx + 1}`,
        status: "CONFIRMED",
        txHash: `0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd${idx + 1}`,
      },
    };

    const isOwnedOnly = idx === 2;
    const listingStatus = idx === 1 ? "RESERVED" : "AVAILABLE";

    return {
      key: `item:${itemId}`,
      unifiedStatus: isOwnedOnly ? "OWNED" : listingStatus,
      title: product.title,
      thumbnail: product.images[0]?.url || DEFAULT_OWNED_ITEM_THUMBNAIL,
      category: product.category || DEFAULT_MY_ITEM_CATEGORY,
      updatedAt: createdAt,
      ownedItem,
      listing: isOwnedOnly
        ? null
        : {
            id: product.id,
            itemId,
            title: product.title,
            description:
              "Món đồ sinh viên bảo quản kỹ, hoạt động tốt. Giao dịch trực tiếp tại KTX.",
            price: product.price,
            isFree: Boolean(product.isFree),
            condition: product.condition,
            status: listingStatus,
            expiresAt: FALLBACK_LISTING_EXPIRES_AT,
            daysRemaining: "Còn 26 ngày",
            createdAt,
            zaloPhone: product.zaloPhone || "0909123456",
            hidePhone: true,
            school: product.school
              ? {
                  id: product.school.id,
                  name: product.school.name,
                  shortName: product.school.shortName,
                }
              : null,
            pendingOrdersCount: idx === 1 ? 1 : 0,
            hasActiveOrder: idx === 1,
            activeOrderId: idx === 1 ? "demo-order-1" : null,
            passportEnabled: true,
            passportId,
            ownershipTransferred: false,
          },
    };
  });
}

export async function loadUnifiedMyItems(resolvedUserId: string): Promise<UnifiedMyItem[]> {
  try {
    const [ownedItems, userListings] = await Promise.all([
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
              seq: true,
              userId: true,
              showName: true,
              since: true,
            },
          },
          listings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              title: true,
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
      prisma.listing.findMany({
        where: {
          sellerId: resolvedUserId,
          status: { not: "REMOVED" },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          school: {
            select: {
              id: true,
              name: true,
              shortName: true,
            },
          },
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: { url: true },
          },
          item: {
            select: {
              id: true,
              currentOwnerId: true,
              passportEnabled: true,
              passportId: true,
            },
          },
          orders: {
            select: {
              id: true,
              status: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return mergeOwnedItemsAndListings(ownedItems, userListings, resolvedUserId, Date.now());
  } catch (err) {
    console.warn("⚠️ Lỗi truy vấn Prisma /my-items, dùng mock fallback:", err);
    return buildFallbackUnifiedItems();
  }
}
