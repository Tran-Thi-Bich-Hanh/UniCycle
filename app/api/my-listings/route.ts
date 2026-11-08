import { NextResponse } from "next/server";
import db, { Product, ProductImage } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// GET /api/my-listings - Lấy danh sách tin đăng của sinh viên đang đăng nhập
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") || "ALL";

    // Đếm số lượng tin theo từng trạng thái
    const countsSql = `
      SELECT 
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'SOLD' THEN 1 END) as sold_count,
        COUNT(CASE WHEN status = 'HIDDEN' THEN 1 END) as hidden_count,
        COUNT(*) as total_count
      FROM products
      WHERE seller_id = ?
    `;
    const countRow = db.prepare(countsSql).get(user.id) as any;

    const counts = {
      active: countRow?.active_count || 0,
      sold: countRow?.sold_count || 0,
      hidden: countRow?.hidden_count || 0,
      total: countRow?.total_count || 0,
    };

    // Lọc theo status nếu cần
    let querySql = `
      SELECT 
        p.*,
        c.name as cat_name, c.slug as cat_slug, c.icon as cat_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.seller_id = ?
    `;
    const queryParams: any[] = [user.id];

    if (statusParam !== "ALL") {
      querySql += " AND p.status = ?";
      queryParams.push(statusParam);
    }

    querySql += " ORDER BY p.created_at DESC";

    const rows = db.prepare(querySql).all(...queryParams) as any[];

    // Lấy hình ảnh
    const productIds = rows.map((r) => r.id);
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

    const products: Product[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      price: r.price,
      condition: r.condition,
      status: r.status,
      category_id: r.category_id,
      seller_id: r.seller_id,
      pickup_location: r.pickup_location,
      attributes: r.attributes,
      passport_hash: r.passport_hash,
      view_count: r.view_count,
      created_at: r.created_at,
      updated_at: r.updated_at,
      category: {
        id: r.category_id,
        name: r.cat_name,
        slug: r.cat_slug,
        icon: r.cat_icon,
        description: null,
        display_order: 0,
        created_at: r.created_at,
      },
      images: imagesByProduct[r.id] || [],
    }));

    return NextResponse.json({
      products,
      counts,
    });
  } catch (err: any) {
    console.error("My listings error:", err);
    return NextResponse.json({ error: "Lỗi tải danh sách tin đăng" }, { status: 500 });
  }
}

