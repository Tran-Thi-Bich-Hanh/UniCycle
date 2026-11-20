export type UnifiedListingStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN" | "EXPIRED";

export type UnifiedItemStatus = UnifiedListingStatus | "OWNED";

export interface UnifiedCategory {
  id: string;
  name: string;
  slug: string;
}

export interface UnifiedSchool {
  id: string;
  name: string;
  shortName: string;
}

export interface EditableListingFields {
  id: string;
  title: string;
  price: number;
  isFree: boolean;
  condition: string;
  description: string;
  zaloPhone: string;
  hidePhone: boolean;
}

export interface UnifiedOwnedItem {
  id: string;
  passportEnabled: boolean;
  passportId: string | null;
  passportStatus: string;
  identityLevel: string;
  totalOwners: number;
  myOwnerSeq: number;
  showNameOnPassport: boolean;
  ownedSince: string;
  passportUrl: string | null;
  qrUrl: string | null;
  chainTx: {
    id: string;
    status: string;
    txHash?: string | null;
  } | null;
}

export interface UnifiedListingData extends EditableListingFields {
  itemId: string | null;
  status: UnifiedListingStatus;
  expiresAt: string;
  daysRemaining: string;
  createdAt: string;
  school: UnifiedSchool | null;
  pendingOrdersCount: number;
  hasActiveOrder: boolean;
  activeOrderId: string | null;
  passportEnabled: boolean;
  passportId: string | null;
  ownershipTransferred: boolean;
}

export interface UnifiedMyItem {
  key: string;
  unifiedStatus: UnifiedItemStatus;
  title: string;
  thumbnail: string;
  category: UnifiedCategory;
  updatedAt: string;
  ownedItem: UnifiedOwnedItem | null;
  listing: UnifiedListingData | null;
}

export interface RawOwnedItemInput {
  id: string;
  passportEnabled: boolean;
  passportId: string | null;
  passportStatus: string;
  identityLevel: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  category: UnifiedCategory | null;
  owners: Array<{
    seq: number;
    userId: string | null;
    showName: boolean;
    since: Date | string;
  }>;
  listings: Array<{
    id: string;
    title: string;
    images: Array<{ url: string }>;
  }>;
  chainTxs: Array<{
    id: string;
    status: string;
    txHash: string | null;
  }>;
}

export interface RawUserListingInput {
  id: string;
  itemId: string | null;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  condition: string;
  status: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  zaloPhone: string;
  hidePhone: boolean;
  category: UnifiedCategory | null;
  school: UnifiedSchool | null;
  images: Array<{ url: string }>;
  item: {
    id: string;
    currentOwnerId: string | null;
    passportEnabled: boolean;
    passportId: string | null;
  } | null;
  orders: Array<{
    id?: string;
    status: string;
  }>;
}

export const DEFAULT_MY_ITEM_CATEGORY: UnifiedCategory = {
  id: "cat-general",
  name: "Đồ Dùng Sinh Viên",
  slug: "do-dung-sinh-vien",
};

export const DEFAULT_OWNED_ITEM_THUMBNAIL =
  "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400";

export const DEFAULT_LISTING_THUMBNAIL =
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400";

const VALID_LISTING_STATUSES: ReadonlySet<string> = new Set([
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "HIDDEN",
  "EXPIRED",
]);

const LISTING_STATUS_PRIORITY: Record<UnifiedListingStatus, number> = {
  RESERVED: 5,
  AVAILABLE: 4,
  HIDDEN: 3,
  EXPIRED: 2,
  SOLD: 1,
};

function toEpochMs(value: Date | string): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
}

export function normalizeListingStatus(status: string): UnifiedListingStatus {
  return VALID_LISTING_STATUSES.has(status) ? (status as UnifiedListingStatus) : "HIDDEN";
}

export function computeDaysRemaining(expiresAt: Date | string, nowMs: number): string {
  const diffMs = toEpochMs(expiresAt) - nowMs;
  const days = Math.ceil(diffMs / 86_400_000);
  return days <= 0 ? "Hết hạn" : `Còn ${days} ngày`;
}

function mapRawListingToUnified(
  raw: RawUserListingInput,
  resolvedUserId: string,
  nowMs: number
): UnifiedListingData {
  const normalizedStatus = normalizeListingStatus(raw.status);
  const ownershipTransferred = Boolean(
    raw.item && raw.item.currentOwnerId !== resolvedUserId
  );

  const activeOrder =
    raw.orders.find(
      (o) =>
        o.status === "ACCEPTED" ||
        o.status === "WAITING_CONFIRMATION" ||
        o.status === "DISPUTED"
    ) || null;

  return {
    id: raw.id,
    itemId: raw.itemId,
    title: raw.title,
    description: raw.description,
    price: raw.price,
    isFree: raw.isFree,
    condition: raw.condition,
    status: normalizedStatus,
    expiresAt: toIsoString(raw.expiresAt),
    daysRemaining: computeDaysRemaining(raw.expiresAt, nowMs),
    createdAt: toIsoString(raw.createdAt),
    zaloPhone: raw.zaloPhone,
    hidePhone: raw.hidePhone,
    school: raw.school,
    pendingOrdersCount: raw.orders.filter((o) => o.status === "PENDING").length,
    hasActiveOrder: Boolean(activeOrder),
    activeOrderId: activeOrder?.id ?? null,
    passportEnabled: Boolean(raw.item?.passportEnabled),
    passportId: raw.item?.passportId ?? null,
    ownershipTransferred,
  };
}

function pickHighestPriorityListing(candidates: RawUserListingInput[]): RawUserListingInput | null {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((a, b) => {
    const priorityDiff =
      LISTING_STATUS_PRIORITY[normalizeListingStatus(b.status)] -
      LISTING_STATUS_PRIORITY[normalizeListingStatus(a.status)];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return toEpochMs(b.createdAt) - toEpochMs(a.createdAt);
  })[0];
}

export function mergeOwnedItemsAndListings(
  ownedItems: RawOwnedItemInput[],
  userListings: RawUserListingInput[],
  resolvedUserId: string,
  nowMs: number
): UnifiedMyItem[] {
  const validUserListings = userListings.filter((listing) => listing.status !== "REMOVED");

  const listingsByItemId = new Map<string, RawUserListingInput[]>();
  for (const listing of validUserListings) {
    if (!listing.itemId) continue;
    const bucket = listingsByItemId.get(listing.itemId);
    if (bucket) {
      bucket.push(listing);
    } else {
      listingsByItemId.set(listing.itemId, [listing]);
    }
  }

  const consumedListingIds = new Set<string>();
  const results: UnifiedMyItem[] = [];

  for (const item of ownedItems) {
    const candidates = listingsByItemId.get(item.id) || [];
    for (const candidate of candidates) {
      consumedListingIds.add(candidate.id);
    }

    const matchedRawListing = pickHighestPriorityListing(candidates);
    const listing = matchedRawListing
      ? mapRawListingToUnified(matchedRawListing, resolvedUserId, nowMs)
      : null;

    const currentOwnerRecord = [...item.owners]
      .reverse()
      .find((owner) => owner.userId === resolvedUserId);

    const totalOwners = Math.max(item.owners.length, 1);
    const myOwnerSeq = currentOwnerRecord?.seq || totalOwners;

    const passportUrl =
      item.passportEnabled && item.passportId
        ? `/passport/${item.passportId}`
        : null;
    const qrUrl = null;

    const latestPreviewListing = item.listings[0] || null;

    const ownedItem: UnifiedOwnedItem = {
      id: item.id,
      passportEnabled: item.passportEnabled,
      passportId: item.passportId,
      passportStatus: item.passportStatus,
      identityLevel: item.identityLevel,
      totalOwners,
      myOwnerSeq,
      showNameOnPassport: currentOwnerRecord?.showName ?? false,
      ownedSince: currentOwnerRecord?.since
        ? toIsoString(currentOwnerRecord.since)
        : toIsoString(item.createdAt),
      passportUrl,
      qrUrl,
      chainTx: item.chainTxs[0] || null,
    };

    const itemUpdatedMs = toEpochMs(item.updatedAt);
    const listingUpdatedMs = matchedRawListing ? toEpochMs(matchedRawListing.updatedAt) : 0;
    const updatedAt =
      listingUpdatedMs > itemUpdatedMs && matchedRawListing
        ? toIsoString(matchedRawListing.updatedAt)
        : toIsoString(item.updatedAt);

    results.push({
      key: `item:${item.id}`,
      unifiedStatus: listing ? listing.status : "OWNED",
      title:
        matchedRawListing?.title ||
        latestPreviewListing?.title ||
        "Món đồ sinh viên đã kích hoạt Passport",
      thumbnail:
        matchedRawListing?.images[0]?.url ||
        latestPreviewListing?.images[0]?.url ||
        DEFAULT_OWNED_ITEM_THUMBNAIL,
      category: item.category || matchedRawListing?.category || DEFAULT_MY_ITEM_CATEGORY,
      updatedAt,
      ownedItem,
      listing,
    });
  }

  for (const rawListing of validUserListings) {
    if (consumedListingIds.has(rawListing.id)) {
      continue;
    }

    const listing = mapRawListingToUnified(rawListing, resolvedUserId, nowMs);

    results.push({
      key: `listing:${rawListing.id}`,
      unifiedStatus: listing.status,
      title: rawListing.title,
      thumbnail: rawListing.images[0]?.url || DEFAULT_LISTING_THUMBNAIL,
      category: rawListing.category || DEFAULT_MY_ITEM_CATEGORY,
      updatedAt: toIsoString(rawListing.updatedAt),
      ownedItem: null,
      listing,
    });
  }

  results.sort((a, b) => toEpochMs(b.updatedAt) - toEpochMs(a.updatedAt));
  return results;
}
