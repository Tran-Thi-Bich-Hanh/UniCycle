import React, { Suspense } from "react";
import { ProductsExplorer } from "@/components/products/ProductsExplorer";
import { getMarketplaceData } from "@/lib/data/marketplace";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

async function SearchContent({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";

  const { products, categories, schools } = await getMarketplaceData({
    limit: 50,
  });

  return (
    <ProductsExplorer
      initialProducts={products}
      categories={categories}
      schools={schools}
      initialQuery={q}
    />
  );
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm font-semibold text-[#02457A]">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#D6E8EE] animate-pulse" />
          Đang tìm kiếm đồ dùng sinh viên...
        </div>
      }
    >
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}

