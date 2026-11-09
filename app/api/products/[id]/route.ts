import { NextResponse } from "next/server";
import crypto from "node:crypto";
import db, { Product, ProductImage } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { generatePassportHash } from "@/lib/passport";

// GET /api/products/[id] - Xem chi tiết 1 sản phẩm và tự động tăng view_count
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const viewer = await getSessionUser();

    // Tăng lượt xem (không tính lượt xem của chính chủ tin)
    const owner = db.prepare("SELECT seller_id FROM products WHERE id = ? OR slug = ?").get(id, id) as
      | { seller_id: string }
      | undefined;
    if (owner && owner.seller_id !== viewer?.id) {
      db.prepare("UPDATE products SET view_count = view_count + 1 WHERE id = ? OR slug = ?").run(id, id);
    }

    const querySql = `
      SELECT 
        p.*,
        c.name as cat_name, c.slug as cat_slug, c.icon as cat_icon, c.description as cat_desc,
        u.id as s_id, u.full_name as s_name, u.university as s_university, 
        u.campus_location as s_campus, u.avatar_url as s_avatar, u.phone as s_phone, u.bio as s_bio
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.id = ? OR p.slug = ?
    `;

    const row = db.prepare(querySql).get(id, id) as any;
    if (!row) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
    }

    const images = db.prepare(`
      SELECT * FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_cover DESC, display_order ASC
    `).all(row.id) as ProductImage[];

    const product: Product = {
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
        description: row.cat_desc,
        display_order: 0,
        created_at: row.created_at,
      },
      seller: {
        id: row.s_id,
        full_name: row.s_name,
        university: row.s_university,
        campus_location: row.s_campus,
        avatar_url: row.s_avatar,
        // Chỉ người đã đăng nhập mới thấy SĐT người bán (chống thu thập số hàng loạt)
        phone: viewer ? row.s_phone : null,
      },
      images,
    };

    return NextResponse.json({ product, requiresLogin: !viewer });
  } catch (err: any) {
    console.error("Product GET by id error:", err);
    return NextResponse.json({ error: "Lỗi xem sản phẩm" }, { status: 500 });
  }
}

// PUT /api/products/[id] - Chỉnh sửa thông tin bài đăng hoặc cập nhật trạng thái
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy bài đăng" }, { status: 404 });
    }

    // Chỉ người bán hoặc ADMIN mới có quyền chỉnh sửa
    if (existing.seller_id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bạn không có quyền chỉnh sửa bài đăng này" }, { status: 403 });
    }

    const { title, description, price, condition, categoryId, pickupLocation, status, images, attributes } = body;
    const now = new Date().toISOString();

    // 1. Cập nhật danh sách ảnh nếu có truyền mảng images
    let finalImages: string[] = [];
    if (Array.isArray(images)) {
      finalImages = images.filter((u: unknown) => typeof u === "string" && u);
      db.prepare("DELETE FROM product_images WHERE product_id = ?").run(id);
      const insertImg = db.prepare(`
        INSERT INTO product_images (id, product_id, url, is_cover, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      finalImages.forEach((url: string, index: number) => {
        insertImg.run(`img_${crypto.randomBytes(6).toString("hex")}`, id, url, index === 0 ? 1 : 0, index, now);
      });
    } else {
      const existingImgs = db.prepare("SELECT url FROM product_images WHERE product_id = ? ORDER BY is_cover DESC, display_order ASC").all(id) as { url: string }[];
      finalImages = existingImgs.map((i) => i.url);
    }

    // 2. Chuẩn hóa attributes
    let finalAttributes: Record<string, any> = {};
    if (attributes !== undefined && typeof attributes === "object" && attributes !== null) {
      finalAttributes = attributes;
    } else if (existing.attributes) {
      try {
        finalAttributes = JSON.parse(existing.attributes);
      } catch {
        finalAttributes = {};
      }
    }

    // 3. Tự động tính toán lại mã băm Hộ chiếu số SHA-256 (0x...)
    const newPassportHash = generatePassportHash({
      productId: id,
      title: (title !== undefined ? title : existing.title).trim(),
      categoryId: categoryId !== undefined ? categoryId : existing.category_id,
      sellerId: existing.seller_id,
      condition: condition !== undefined ? condition : existing.condition,
      price: Number(price !== undefined ? price : existing.price),
      pickupLocation: (pickupLocation !== undefined ? pickupLocation : existing.pickup_location).trim(),
      description: (description !== undefined ? description : existing.description).trim(),
      images: finalImages,
      attributes: finalAttributes,
      createdAt: existing.created_at,
    });

    const update = db.prepare(`
      UPDATE products
      SET title = ?, description = ?, price = ?, condition = ?, 
          category_id = ?, pickup_location = ?, status = ?, 
          attributes = ?, passport_hash = ?, updated_at = ?
      WHERE id = ?
    `);

    update.run(
      title !== undefined ? title : existing.title,
      description !== undefined ? description : existing.description,
      price !== undefined ? Number(price) : existing.price,
      condition !== undefined ? condition : existing.condition,
      categoryId !== undefined ? categoryId : existing.category_id,
      pickupLocation !== undefined ? pickupLocation : existing.pickup_location,
      status !== undefined ? status : existing.status,
      JSON.stringify(finalAttributes),
      newPassportHash,
      now,
      id
    );

    return NextResponse.json({ success: true, message: "Cập nhật bài đăng thành công!", passportHash: newPassportHash });
  } catch (err: any) {
    console.error("Update product error:", err);
    return NextResponse.json({ error: "Lỗi cập nhật sản phẩm" }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Ẩn bài đăng (Soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy bài đăng" }, { status: 404 });
    }

    if (existing.seller_id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Bạn không có quyền xóa bài đăng này" }, { status: 403 });
    }

    // Đổi trạng thái sang HIDDEN
    db.prepare("UPDATE products SET status = 'HIDDEN', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      id
    );

    return NextResponse.json({ success: true, message: "Đã ẩn bài đăng thành công." });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi xóa bài đăng" }, { status: 500 });
  }
}

