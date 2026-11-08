import { NextResponse } from "next/server";
import crypto from "node:crypto";
import db, { Product, ProductImage } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";

// GET /api/products - Tìm kiếm và lọc sản phẩm đa tiêu chí
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const condition = searchParams.get("condition")?.trim() || "";
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "newest";
    const status = searchParams.get("status") || "ACTIVE";
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    // Lọc theo trạng thái
    if (status !== "ALL") {
      conditions.push("p.status = ?");
      params.push(status);
    }

    // Tìm kiếm từ khóa theo tiêu đề, mô tả hoặc nơi nhận hàng
    if (search) {
      conditions.push("(p.title LIKE ? OR p.description LIKE ? OR p.pickup_location LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // Lọc theo danh mục (slug hoặc id)
    if (category) {
      conditions.push("(c.slug = ? OR c.id = ?)");
      params.push(category, category);
    }

    // Lọc theo tình trạng (hỗ trợ nhiều tình trạng ngăn cách bởi dấu phẩy)
    if (condition) {
      const condList = condition.split(",").map((c) => c.trim()).filter(Boolean);
      if (condList.length > 0) {
        const placeholders = condList.map(() => "?").join(",");
        conditions.push(`p.condition IN (${placeholders})`);
        params.push(...condList);
      }
    }

    // Lọc theo khoảng giá (VND)
    if (minPrice && !isNaN(Number(minPrice))) {
      conditions.push("p.price >= ?");
      params.push(Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      conditions.push("p.price <= ?");
      params.push(Number(maxPrice));
    }

    // Sắp xếp
    let orderBy = "p.created_at DESC";
    if (sort === "price_asc") orderBy = "p.price ASC";
    else if (sort === "price_desc") orderBy = "p.price DESC";
    else if (sort === "views") orderBy = "p.view_count DESC";

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Đếm tổng số kết quả
    const countSql = `
      SELECT COUNT(*) as total 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;
    const totalResult = db.prepare(countSql).get(...params) as { total: number };
    const total = totalResult ? totalResult.total : 0;

    // Lấy danh sách sản phẩm
    const querySql = `
      SELECT 
        p.*,
        c.name as cat_name, c.slug as cat_slug, c.icon as cat_icon,
        u.id as s_id, u.full_name as s_name, u.university as s_university, 
        u.campus_location as s_campus, u.avatar_url as s_avatar, u.phone as s_phone
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const rawRows = db.prepare(querySql).all(...params, limit, offset) as any[];

    // Lấy hình ảnh của các sản phẩm trả về
    const productIds = rawRows.map((r) => r.id);
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

    const products: Product[] = rawRows.map((row) => ({
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
        phone: null, // Danh sách công khai không trả SĐT người bán
      },
      images: imagesByProduct[row.id] || [],
    }));

    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("Products GET error:", err);
    return NextResponse.json({ error: "Lỗi tải danh sách sản phẩm" }, { status: 500 });
  }
}

// POST /api/products - Tạo bài đăng bán đồ cũ mới
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để đăng bán đồ cũ" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, price, condition, categoryId, pickupLocation, images, attributes } = body;

    if (!title || !description || price === undefined || !condition || !categoryId || !pickupLocation) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ tiêu đề, mô tả, giá, tình trạng, danh mục và nơi giao dịch." },
        { status: 400 }
      );
    }

    if (Number(price) < 0) {
      return NextResponse.json({ error: "Giá bán không hợp lệ." }, { status: 400 });
    }

    if (!Array.isArray(images) || images.filter((u: unknown) => typeof u === "string" && u).length === 0) {
      return NextResponse.json({ error: "Vui lòng tải lên ít nhất 1 ảnh thực tế của món đồ." }, { status: 400 });
    }

    const productId = `prod_${crypto.randomBytes(8).toString("hex")}`;
    const baseSlug = slugify(title);
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();

    const insertProd = db.prepare(`
      INSERT INTO products (
        id, title, slug, description, price, condition, status, 
        category_id, seller_id, pickup_location, attributes, view_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, 0, ?, ?)
    `);

    insertProd.run(
      productId,
      title.trim(),
      slug,
      description.trim(),
      Number(price),
      condition,
      categoryId,
      user.id,
      pickupLocation.trim(),
      attributes ? JSON.stringify(attributes) : null,
      now,
      now
    );

    // Lưu danh sách hình ảnh
    if (Array.isArray(images) && images.length > 0) {
      const insertImg = db.prepare(`
        INSERT INTO product_images (id, product_id, url, is_cover, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      images.forEach((url: string, index: number) => {
        if (url && typeof url === "string") {
          const imgId = `img_${crypto.randomBytes(6).toString("hex")}`;
          insertImg.run(imgId, productId, url, index === 0 ? 1 : 0, index, now);
        }
      });
    }

    return NextResponse.json({
      success: true,
      productId,
      slug,
      message: "Đăng tin thành công!",
    });
  } catch (err: any) {
    console.error("Create product error:", err);
    return NextResponse.json({ error: "Lỗi đăng sản phẩm" }, { status: 500 });
  }
}

