import React, { Suspense } from "react";
import { ProductsExplorer } from "@/components/products/ProductsExplorer";
import { getMarketplaceData } from "@/lib/data/marketplace";

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function CategoryContent({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const { products, categories, schools } = await getMarketplaceData({
    limit: 50,
  });

  return (
    <ProductsExplorer
      initialProducts={products}
      categories={categories}
      schools={schools}
      initialCategory={slug}
    />
  );
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm font-semibold text-[#02457A]">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#D6E8EE] animate-pulse" />
          Đang tải danh mục sản phẩm...
        </div>
      }
    >
      <CategoryContent params={params} />
    </Suspense>
  );
}

