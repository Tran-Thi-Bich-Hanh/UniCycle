import React, { Suspense } from "react";
import { ProductsExplorer } from "@/components/products/ProductsExplorer";
import { getMarketplaceData } from "@/lib/data/marketplace";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    campus?: string;
    verified?: string;
    multiOwner?: string;
  }>;
}

async function ProductsListContent({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";
  const category = resolvedParams.category || "all";
  const campus = resolvedParams.campus || "all";
  const initialVerifiedOnly = resolvedParams.verified === "true";
  const initialMultiOwner = resolvedParams.multiOwner === "true";

  const { products, categories, schools } = await getMarketplaceData({
    limit: 50,
  });

  return (
    <ProductsExplorer
      initialProducts={products}
      categories={categories}
      schools={schools}
      initialQuery={q}
      initialCategory={category}
      initialCampus={campus}
      initialVerifiedOnly={initialVerifiedOnly}
      initialMultiOwner={initialMultiOwner}
    />
  );
}

export default function ProductsPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm font-semibold text-[#02457A]">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#D6E8EE] animate-pulse" />
          Đang tải danh sách đồ dùng sinh viên...
        </div>
      }
    >
      <ProductsListContent searchParams={searchParams} />
    </Suspense>
  );
}

