export type AdminSection = "overview" | "listings" | "users" | "moderation";

export interface AdminOverviewStats {
  totalUsers: number;
  verifiedUsersCount: number;
  suspendedUsersCount: number;
  activeListings: number;
  totalListings: number;
  passportListingsCount: number;
  multiOwnerItemsCount: number;
  completedOrdersCount: number;
  activeOrdersCount: number;
  disputedOrdersCount: number;
  pendingReportsCount: number;
  pendingStudentCardsCount: number;
  flaggedPassportsCount: number;
  pendingChainTxsCount: number;
}

export interface AdminDistributionItem {
  label: string;
  count: number;
  percentage?: number;
}

export interface AdminRecentActivity {
  id: string;
  type: "listing" | "order" | "report";
  title: string;
  subtitle: string;
  time: string;
  status: string;
  statusBadgeColor?: "green" | "blue" | "amber" | "rose" | "slate";
}

export interface AdminListingRecord {
  id: string;
  title: string;
  price: number;
  isFree: boolean;
  status: string;
  condition: string;
  createdAt: string;
  expiresAt: string;
  category: { id: string; name: string; slug: string } | null;
  school: { id: string; name: string; shortName: string } | null;
  seller: {
    id: string;
    displayName: string;
    email: string;
    isStudentVerified: boolean;
    dorm: string | null;
    school: { name: string; shortName: string } | null;
  };
  item: {
    id: string;
    passportId: string | null;
    passportStatus: string;
    passportEnabled: boolean;
    currentOwnerSeq?: number;
  } | null;
  images: Array<{ url: string; position?: number }>;
  ordersCount: number;
  reportsCount: number;
}

export interface AdminUserRecord {
  id: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  isStudentVerified: boolean;
  studentVerifiedAt: string | null;
  studentCardUrl: string | null;
  reputationScore: number;
  dorm: string | null;
  createdAt: string;
  school: { id: string; name: string; shortName: string } | null;
  _count: {
    listings: number;
    buyingOrders: number;
    sellingOrders: number;
  };
}

export interface DisputedOrderItem {
  id: string;
  proposedPrice: number;
  meetPlace: string;
  disputeReason: string | null;
  disputedAt: string | null;
  listing: {
    id: string;
    title: string;
    price: number;
    status: string;
    itemId?: string | null;
    images?: Array<{ url: string }>;
    item?: { id: string; passportId: string | null; passportStatus: string } | null;
  };
  buyer: { id: string; displayName: string; email: string; reputationScore: number };
  seller: { id: string; displayName: string; email: string; reputationScore: number };
}

export interface AdminPassportItem {
  id: string;
  passportId: string | null;
  passportStatus: string;
  flagReason: string | null;
  flaggedAt: string | null;
  category: { name: string } | null;
  currentOwner: { id: string; displayName: string; email: string } | null;
  listings: Array<{ id: string; title: string; status: string }>;
  _count: { owners: number };
  chainTxs: Array<{ id: string; status: string; kind: string; txHash: string | null }>;
}

export interface AdminReportItem {
  id: string;
  targetType: "LISTING" | "USER" | "PASSPORT";
  targetId: string;
  reason: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter: { id: string; displayName: string; email: string };
}

export interface PendingStudentItem {
  id: string;
  displayName: string;
  email: string;
  studentCardUrl: string | null;
  dorm: string | null;
  createdAt: string;
  school: { id: string; name: string; shortName: string } | null;
}

export interface AdminChainTxItem {
  id: string;
  itemId: string;
  kind: string;
  status: string;
  txHash: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  item: { id: string; passportId: string | null; passportStatus: string };
}

export interface AdminDashboardPayload {
  serverNow: string;
  stats: AdminOverviewStats;
  distribution: {
    bySchool: AdminDistributionItem[];
    byCategory: AdminDistributionItem[];
  };
  recentActivities: AdminRecentActivity[];
  listings: AdminListingRecord[];
  users: AdminUserRecord[];
  disputedOrders: DisputedOrderItem[];
  passports: AdminPassportItem[];
  reports: AdminReportItem[];
  pendingStudents: PendingStudentItem[];
  chainTxs: AdminChainTxItem[];
}
