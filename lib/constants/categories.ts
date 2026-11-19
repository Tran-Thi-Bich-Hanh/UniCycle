export interface HeaderCategoryDefinition {
  slug: string;
  name: string;
  desc: string;
  count: string;
  highlight?: boolean;
}

export interface CategorySyncItem {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  count?: string;
}

export const HEADER_CATEGORIES: HeaderCategoryDefinition[] = [
  {
    slug: "giao-trinh-sach",
    name: "Giáo trình & Sách",
    desc: "Giáo trình đại học, sách chuyên ngành và tài liệu học tập",
    count: "140+ tin",
  },
  {
    slug: "ban-ghe-tu-ktx",
    name: "Bàn ghế & Nội thất",
    desc: "Bàn học, ghế xoay, kệ sách và nội thất phòng trọ",
    count: "85+ tin",
  },
  {
    slug: "do-gia-dung-quat",
    name: "Đồ gia dụng",
    desc: "Quạt điện, ấm siêu tốc, nồi cơm mini và vật dụng sinh hoạt",
    count: "110+ tin",
  },
  {
    slug: "do-dien-tu-phu-kien",
    name: "Đồ điện tử",
    desc: "Máy tính, máy tính cầm tay, chuột, bàn phím và tai nghe",
    count: "95+ tin",
  },
  {
    slug: "xe-dap-phuong-tien",
    name: "Xe đạp & Di chuyển",
    desc: "Xe đạp, mũ bảo hiểm và vật dụng đi lại",
    count: "40+ tin",
  },
  {
    slug: "goc-0d-cho-tang",
    name: "Góc Cho Tặng",
    desc: "Đồ dùng miễn phí được sinh viên khóa trước chia sẻ",
    count: "60+ tin",
    highlight: true,
  },
];

export function syncCategoriesWithHeader<T extends CategorySyncItem>(
  input: T[]
): CategorySyncItem[] {
  const bySlug = new Map<string, T>();
  for (const cat of input) {
    if (!bySlug.has(cat.slug)) {
      bySlug.set(cat.slug, cat);
    }
  }

  const canonicalSlugs = new Set(HEADER_CATEGORIES.map((c) => c.slug));

  const synced: CategorySyncItem[] = HEADER_CATEGORIES.map((headerCat) => {
    const existing = bySlug.get(headerCat.slug);
    return {
      id: existing?.id || headerCat.slug,
      slug: headerCat.slug,
      name: headerCat.name,
      description: existing?.description ?? headerCat.desc,
      icon: existing?.icon ?? null,
      imageUrl: existing?.imageUrl ?? null,
      count: existing?.count ?? headerCat.count,
    };
  });

  for (const extra of input) {
    if (!canonicalSlugs.has(extra.slug)) {
      synced.push(extra);
    }
  }

  return synced;
}
