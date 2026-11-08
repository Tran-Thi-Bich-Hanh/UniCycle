import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import {
  CategoryIcon,
  IconArrowRight,
  IconShieldCheck,
  IconSearch,
  IconSparkles,
} from "@/components/icons";
import db, { Category, Product, ProductImage } from "@/lib/db";

export default async function HomePage() {
  // Lấy danh sách danh mục và đếm số sản phẩm đang bán
  const categories = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'ACTIVE') as product_count
    FROM categories c
    ORDER BY c.display_order ASC
  `).all() as Category[];

  // Lấy các sản phẩm mới đăng nhất đang ở trạng thái ACTIVE
  const rawProducts = db.prepare(`
    SELECT 
      p.*,
      c.name as cat_name, c.slug as cat_slug, c.icon as cat_icon,
      u.id as s_id, u.full_name as s_name, u.university as s_university, 
      u.campus_location as s_campus, u.avatar_url as s_avatar, u.phone as s_phone
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.seller_id = u.id
    WHERE p.status = 'ACTIVE'
    ORDER BY p.created_at DESC
    LIMIT 8
  `).all() as any[];

  const productIds = rawProducts.map((p) => p.id);
  let imagesByProduct: Record<string, ProductImage[]> = {};

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    const images = db.prepare(`
      SELECT * FROM product_images 
      WHERE product_id IN (${placeholders}) 
      ORDER BY is_cover DESC, display_order ASC
    `).all(...productIds) as ProductImage[];

    images.forEach((img) => {
      if (!imagesByProduct[img.product_id]) imagesByProduct[img.product_id] = [];
      imagesByProduct[img.product_id].push(img);
    });
  }

  const products: Product[] = rawProducts.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    price: row.price,
    condition: row.condition,
    status: row.status,
    category_id: row.category_id,
    seller_id: row.seller_id,
    pickup_location: row.pickup_location,
    attributes: row.attributes,
    passport_hash: row.passport_hash,
    view_count: row.view_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category: {
      id: row.category_id,
      name: row.cat_name,
      slug: row.cat_slug,
      icon: row.cat_icon,
      description: null,
      display_order: 0,
      created_at: row.created_at,
    },
    seller: {
      id: row.s_id,
      full_name: row.s_name,
      university: row.s_university,
      campus_location: row.s_campus,
      avatar_url: row.s_avatar,
      phone: row.s_phone,
    },
    images: imagesByProduct[row.id] || [],
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section theo Theme Trust Blue */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>

          <div className="relative max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-sky-300 text-xs font-bold backdrop-blur-md">
              <IconSparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Chợ đồ cũ sinh viên ĐHQG & TP. Hồ Chí Minh</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Mua bán đồ cũ dễ dàng, <br />
              <span className="bg-gradient-to-r from-sky-400 via-blue-300 to-indigo-200 bg-clip-text text-transparent">
                tái sử dụng thông minh
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-xs sm:text-base text-slate-300 font-normal leading-relaxed">
              Từ giáo trình ôn thi, bàn học gấp, ghế xoay cho đến quạt điện, nệm KTX... Tìm món đồ bạn cần với chi phí tiết kiệm từ các bạn sinh viên cùng trường.
            </p>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-bold text-slate-950 bg-sky-300 hover:bg-sky-200 shadow-lg shadow-sky-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <IconSearch className="w-4 h-4 text-blue-950" />
                <span>Khám phá đồ đang bán</span>
              </Link>
              <Link
                href="/products/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-bold text-white bg-blue-900/60 hover:bg-blue-800 border border-blue-400/30 transition-all cursor-pointer"
              >
                <span>Đăng thanh lý ngay</span>
                <IconArrowRight className="w-4 h-4 text-sky-300" />
              </Link>
            </div>

            {/* Trust highlights */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-sky-400 font-bold text-base">✓</span>
                <span>Giá sinh viên siêu rẻ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sky-400 font-bold text-base">✓</span>
                <span>Giao dịch trực tiếp tại KTX/Trường</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sky-400 font-bold text-base">✓</span>
                <span>Tình trạng minh bạch rõ ràng</span>
              </div>
            </div>
          </div>
        </section>

        {/* Danh mục sản phẩm (Categories Section) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-950/5 border border-slate-200/90">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Danh mục đồ cũ sinh viên
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đa dạng mặt hàng phục vụ đời sống học tập và sinh hoạt
                </p>
              </div>
              <Link
                href="/products"
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 group"
              >
                <span>Xem tất cả</span>
                <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className="group flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50/70 hover:bg-blue-50/80 border border-slate-200/70 hover:border-blue-300 transition-all hover:-translate-y-1 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                    <CategoryIcon name={cat.icon} className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-800 transition-colors">
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    {cat.product_count || 0} món đồ
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Danh sách đồ mới đăng (Recent Listings) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Đồ mới đăng thanh lý
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Các món đồ vừa được sinh viên đăng bán quanh các trường và ký túc xá
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200/80"
            >
              <span>Xem thêm</span>
              <IconArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
              <p className="text-slate-500 text-sm">Chưa có sản phẩm nào được đăng.</p>
              <Link
                href="/products/new"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-500"
              >
                Hãy là người đầu tiên đăng tin
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* Hướng dẫn quy trình 3 bước an toàn */}
        <section className="bg-blue-50/50 border-y border-blue-100/80 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-2 mb-12">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Quy trình mua bán đồ cũ 3 bước an toàn
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
                Đơn giản, minh bạch và tiện lợi giữa những người bạn sinh viên
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-2xs flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white font-extrabold text-base flex items-center justify-center mb-4 shadow-md shadow-blue-700/20">
                  1
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2">Đăng đồ & Mô tả thực tế</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Người bán chụp hình các góc độ, ghi rõ tình trạng (vết xước, độ mới) và địa điểm giao dịch như phòng KTX hoặc cổng trường.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-2xs flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-700 text-white font-extrabold text-base flex items-center justify-center mb-4 shadow-md shadow-indigo-700/20">
                  2
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2">Tìm kiếm & Hẹn xem đồ</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Người mua dễ dàng lọc món đồ gần mình, liên hệ qua số điện thoại/Zalo để thống nhất thời gian xem và nhận hàng.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-2xs flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-sky-700 text-white font-extrabold text-base flex items-center justify-center mb-4 shadow-md shadow-sky-700/20">
                  3
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2">Kiểm tra & Nhận hàng</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Kiểm tra tận mắt tình trạng thực tế của món đồ trước khi giao dịch. Tiết kiệm tối đa chi phí cho kỳ học mới!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Banner kêu gọi đăng bán */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-8 sm:p-12 shadow-xl shadow-blue-950/10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-bold backdrop-blur-xs text-sky-200 border border-white/10">
                Chuyển phòng trọ • Dọn KTX • Tốt nghiệp
              </span>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                Bạn có đồ dùng sinh hoạt hoặc giáo trình không còn dùng tới?
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Đừng vội bỏ đi! Hãy thanh lý lại cho các bạn sinh viên khóa dưới. Vừa giúp bạn có thêm chi phí, vừa lan tỏa thói quen sống xanh và tiết kiệm.
              </p>
            </div>

            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-xs sm:text-sm font-bold text-blue-950 bg-white hover:bg-blue-50 shadow-lg transition-all transform hover:scale-105 shrink-0 cursor-pointer"
            >
              <span>Đăng bán đồ cũ ngay</span>
              <IconArrowRight className="w-4 h-4 text-blue-700" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
