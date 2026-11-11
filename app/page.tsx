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
  IconMapPin,
} from "@/components/icons";
import db, { Category, Product, ProductImage } from "@/lib/db";

const QUICK_SEARCH_CHIPS = [
  { label: "Giáo trình & Sách", href: "/products?category=giao-trinh-sach" },
  { label: "Đồ điện tử", href: "/products?category=do-dien-tu" },
  { label: "Nội thất KTX", href: "/products?category=noi-that-ktx" },
  { label: "Gia dụng phòng trọ", href: "/products?category=do-gia-dung" },
  { label: "KTX Khu A", href: "/products?search=Khu+A" },
  { label: "KTX Khu B", href: "/products?search=Khu+B" },
];

export default async function HomePage() {
  // Lấy danh sách danh mục và đếm số sản phẩm đang mở bán
  const categories = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'ACTIVE') as product_count
    FROM categories c
    ORDER BY c.display_order ASC
  `).all() as Category[];

  // Lấy các sản phẩm mới đăng nhất (ưu tiên ACTIVE trước, sau đó RESERVED)
  const rawProducts = db.prepare(`
    SELECT 
      p.*,
      c.name as cat_name, c.slug as cat_slug, c.icon as cat_icon,
      u.id as s_id, u.full_name as s_name, u.university as s_university, 
      u.campus_location as s_campus, u.avatar_url as s_avatar, u.phone as s_phone
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.seller_id = u.id
    WHERE p.status IN ('ACTIVE', 'RESERVED')
    ORDER BY CASE WHEN p.status = 'ACTIVE' THEN 0 ELSE 1 END ASC, p.created_at DESC
    LIMIT 8
  `).all() as any[];

  const productIds = rawProducts.map((p) => p.id);
  const imagesByProduct: Record<string, ProductImage[]> = {};

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
    passport_tx: row.passport_tx,
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
    <div className="min-h-screen flex flex-col bg-white selection:bg-[#018ABE] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section tinh gọn với Thanh tìm kiếm trực tiếp & Chip lọc nhanh */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#001B48] via-[#02457A] to-[#018ABE] text-white pt-10 pb-16 sm:pt-14 sm:pb-20 px-4 sm:px-6 lg:px-8">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#018ABE]/30 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-24 w-96 h-96 rounded-full bg-[#97CADB]/25 blur-3xl pointer-events-none" />

          <div className="relative max-w-4xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-[#D6E8EE] text-xs font-bold backdrop-blur-md">
              <IconSparkles className="w-3.5 h-3.5 text-[#97CADB]" />
              <span>Chợ đồ cũ sinh viên ĐHQG & TP.HCM • Bảo vệ bằng Hợp đồng Escrow</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Trao đổi đồ cũ sinh viên{" "}
              <span className="bg-gradient-to-r from-white via-[#D6E8EE] to-[#97CADB] bg-clip-text text-transparent">
                minh bạch & giữ chỗ an toàn
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[#D6E8EE] font-medium">
              Tìm nhanh giáo trình, bàn ghế, đồ điện tử quanh KTX. Tiền đặt cọc được giữ trong hợp đồng thông minh 48h cho tới khi bạn gặp mặt kiểm tra đúng mô tả trên{" "}
              <span className="text-white font-bold">UniCycle Passport</span>.
            </p>

            {/* Thanh tìm kiếm nhanh ngay tại Hero */}
            <form
              action="/products"
              method="GET"
              className="max-w-2xl mx-auto pt-1"
            >
              <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-xl shadow-[#001B48]/25 border border-[#97CADB]">
                <div className="pl-3 pr-2 text-[#02457A]">
                  <IconSearch className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="search"
                  placeholder="Tìm giáo trình, bàn học gấp, tai nghe, KTX Khu A..."
                  aria-label="Tìm kiếm món đồ sinh viên"
                  className="flex-1 py-2.5 px-2 text-xs sm:text-sm text-[#001B48] placeholder-[#02457A]/60 font-medium focus:outline-hidden bg-transparent"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#001B48] hover:bg-[#02457A] text-white text-xs sm:text-sm font-extrabold transition-colors shrink-0 cursor-pointer"
                >
                  Tìm ngay
                </button>
              </div>
            </form>

            {/* Chip lọc nhanh theo danh mục & khu vực KTX */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-[#D6E8EE]/80">Phổ biến:</span>
              {QUICK_SEARCH_CHIPS.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-white/12 hover:bg-white hover:text-[#001B48] text-white border border-white/20 transition-all"
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Thanh 3 bước Mua bán an toàn (Horizontal Scannable Strip) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-[#001B48]/5 border border-[#97CADB] grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-2 rounded-xl bg-[#D6E8EE]/25">
              <div className="w-8 h-8 rounded-xl bg-[#001B48] text-white font-black text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-[#001B48]">
                  Giữ chỗ 48h qua Escrow
                </h2>
                <p className="text-[11px] text-[#02457A] mt-0.5 leading-relaxed">
                  Tiền UNIP tạm khóa vào hợp đồng thông minh (0% phí), người bán yên tâm giữ đồ cho bạn.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 rounded-xl bg-[#D6E8EE]/25">
              <div className="w-8 h-8 rounded-xl bg-[#02457A] text-white font-black text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-[#001B48]">
                  Hẹn gặp & Kiểm tra Passport
                </h2>
                <p className="text-[11px] text-[#02457A] mt-0.5 leading-relaxed">
                  Gặp trực tiếp tại KTX/Trường, đối chiếu món đồ với bảng thông số cam kết trên UniCycle Passport.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 rounded-xl bg-[#D6E8EE]/25">
              <div className="w-8 h-8 rounded-xl bg-[#018ABE] text-white font-black text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-[#001B48]">
                  Xác nhận Nhận hàng / Hoàn tiền
                </h2>
                <p className="text-[11px] text-[#02457A] mt-0.5 leading-relaxed">
                  Tích đủ 3 mục kiểm tra để giải ngân ngay cho người bán, hoặc yêu cầu hủy/hoàn tiền minh bạch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Danh mục sản phẩm (Categories Section) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#001B48]">
                Khám phá theo danh mục
              </h2>
              <p className="text-xs text-[#02457A] mt-0.5">
                Chọn nhanh nhóm đồ dùng bạn đang tìm kiếm cho học kỳ mới
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs font-bold text-[#018ABE] hover:text-[#02457A] flex items-center gap-1 group"
            >
              <span>Tất cả danh mục</span>
              <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group flex items-center gap-3 p-3.5 rounded-2xl bg-white hover:bg-[#D6E8EE]/40 border border-[#D6E8EE] hover:border-[#018ABE] transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
              >
                <div className="w-11 h-11 rounded-xl bg-[#D6E8EE]/70 text-[#02457A] flex items-center justify-center shrink-0 group-hover:bg-[#018ABE] group-hover:text-white transition-all">
                  <CategoryIcon name={cat.icon} className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs sm:text-sm font-extrabold text-[#001B48] group-hover:text-[#018ABE] truncate transition-colors">
                    {cat.name}
                  </span>
                  <span className="block text-[11px] text-[#02457A] font-medium mt-0.5">
                    {cat.product_count || 0} món đang bán
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Danh sách đồ mới đăng (Recent Listings) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#018ABE] animate-pulse" />
                <h2 className="text-xl sm:text-2xl font-black text-[#001B48]">
                  Đồ mới đăng quanh KTX & Trường
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#02457A] mt-0.5">
                Mỗi sản phẩm đều gắn kèm Hồ sơ Chứng thực UniCycle Passport và địa điểm hẹn gặp rõ ràng
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/products/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#001B48] hover:bg-[#02457A] transition-colors"
              >
                <span>+ Đăng bán đồ</span>
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-[#001B48] bg-[#D6E8EE] hover:bg-[#97CADB] transition-colors border border-[#97CADB]"
              >
                <span>Xem tất cả</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#97CADB] p-8">
              <p className="text-[#02457A] text-sm font-semibold">Chưa có sản phẩm nào được đăng.</p>
              <Link
                href="/products/new"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#018ABE] hover:bg-[#02457A]"
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

        {/* Banner kêu gọi đăng bán */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 pt-4">
          <div className="rounded-3xl bg-gradient-to-r from-[#001B48] via-[#02457A] to-[#018ABE] text-white p-6 sm:p-10 shadow-xl shadow-[#001B48]/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-[#D6E8EE] border border-white/20">
                <IconShieldCheck className="w-3.5 h-3.5 text-[#97CADB]" />
                Chuyển phòng trọ • Dọn KTX • Ra trường
              </span>
              <h2 className="text-xl sm:text-2xl font-black leading-tight">
                Có giáo trình hoặc đồ dùng KTX không còn sử dụng?
              </h2>
              <p className="text-[#D6E8EE] text-xs sm:text-sm leading-relaxed">
                Đăng tin trong 3 bước gọn gàng để khởi tạo Hồ sơ UniCycle Passport và nhận thanh toán 100% giá trị qua ví Escrow.
              </p>
            </div>

            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-xs sm:text-sm font-extrabold text-[#001B48] bg-white hover:bg-[#D6E8EE] shadow-lg transition-all shrink-0 cursor-pointer"
            >
              <span>Đăng bán đồ cũ ngay</span>
              <IconArrowRight className="w-4 h-4 text-[#02457A]" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
