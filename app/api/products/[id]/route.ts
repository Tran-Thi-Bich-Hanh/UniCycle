import { NextResponse } from "next/server";
import crypto from "node:crypto";
import db, {
  Product,
  ProductImage,
  OwnershipRecord,
  ProductRevision,
  recordProductRevision,
} from "@/lib/db";
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
    const owner = db
      .prepare("SELECT seller_id FROM products WHERE id = ? OR slug = ?")
      .get(id, id) as { seller_id: string } | undefined;
    if (owner && owner.seller_id !== viewer?.id) {
      db.prepare(
        "UPDATE products SET view_count = view_count + 1 WHERE id = ? OR slug = ?"
      ).run(id, id);
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
      return NextResponse.json(
        { error: "Không tìm thấy sản phẩm" },
        { status: 404 }
      );
    }

    const images = db
      .prepare(
        `SELECT * FROM product_images 
         WHERE product_id = ? 
         ORDER BY is_cover DESC, display_order ASC`
      )
      .all(row.id) as ProductImage[];

    const ownershipHistory = db
      .prepare(
        `SELECT * FROM ownership_history
         WHERE product_id = ?
         ORDER BY order_index ASC, created_at ASC`
      )
      .all(row.id) as OwnershipRecord[];

    const revisions = db
      .prepare(
        `SELECT r.*, u.full_name as editor_name
         FROM product_revisions r
         LEFT JOIN users u ON r.editor_id = u.id
         WHERE r.product_id = ?
         ORDER BY r.revision_number DESC`
      )
      .all(row.id) as ProductRevision[];

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
      ownership_history: ownershipHistory,
      revisions,
    };

    return NextResponse.json({ product, requiresLogin: !viewer });
  } catch (err: any) {
    console.error("Product GET by id error:", err);
    return NextResponse.json({ error: "Lỗi xem sản phẩm" }, { status: 500 });
  }
}

// PUT /api/products/[id] - Chỉnh sửa thông tin bài đăng & lưu lịch sử phiên bản UniCycle Passport
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
      return NextResponse.json(
        { error: "Không tìm thấy bài đăng" },
        { status: 404 }
      );
    }

    // Chỉ người bán sở hữu bài đăng mới có quyền chỉnh sửa
    if (existing.seller_id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn không có quyền chỉnh sửa bài đăng này" },
        { status: 403 }
      );
    }

    // Chặn chỉnh sửa thông tin khi món đồ đang có người giữ chỗ (RESERVED) hoặc đã bán (SOLD)
    if (existing.status === "RESERVED") {
      return NextResponse.json(
        {
          error:
            "Món đồ đang trong trạng thái giữ chỗ (Escrow). Không thể chỉnh sửa thông số hay giá bán để bảo toàn tính toàn vẹn của UniCycle Passport.",
        },
        { status: 409 }
      );
    }

    if (existing.status === "SOLD") {
      return NextResponse.json(
        {
          error:
            "Món đồ này đã hoàn tất giao dịch nên hồ sơ UniCycle Passport đã được niêm phong vĩnh viễn.",
        },
        { status: 409 }
      );
    }

    const {
      title,
      description,
      price,
      condition,
      categoryId,
      pickupLocation,
      status,
      images,
      attributes,
      changeSummary,
    } = body;
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
        insertImg.run(
          `img_${crypto.randomBytes(6).toString("hex")}`,
          id,
          url,
          index === 0 ? 1 : 0,
          index,
          now
        );
      });
    } else {
      const existingImgs = db
        .prepare(
          "SELECT url FROM product_images WHERE product_id = ? ORDER BY is_cover DESC, display_order ASC"
        )
        .all(id) as { url: string }[];
      finalImages = existingImgs.map((i) => i.url);
    }

    // 2. Chuẩn hóa attributes
    let finalAttributes: Record<string, any> = {};
    if (
      attributes !== undefined &&
      typeof attributes === "object" &&
      attributes !== null
    ) {
      finalAttributes = attributes;
    } else if (existing.attributes) {
      try {
        finalAttributes = JSON.parse(existing.attributes);
      } catch {
        finalAttributes = {};
      }
    }

    const nextTitle = (title !== undefined ? String(title) : existing.title).trim();
    const nextDescription = (
      description !== undefined ? String(description) : existing.description
    ).trim();
    const nextPrice = Number(price !== undefined ? price : existing.price);
    const nextCondition = condition !== undefined ? condition : existing.condition;
    const nextCategoryId = categoryId !== undefined ? categoryId : existing.category_id;
    const nextPickupLocation = (
      pickupLocation !== undefined ? String(pickupLocation) : existing.pickup_location
    ).trim();
    const nextStatus = status !== undefined ? status : existing.status;
    const nextSpecsJson = JSON.stringify(finalAttributes);

    // 3. Tự động tính toán lại mã băm UniCycle Passport SHA-256 (0x...)
    const newPassportHash = generatePassportHash({
      productId: id,
      title: nextTitle,
      categoryId: nextCategoryId,
      sellerId: existing.seller_id,
      condition: nextCondition,
      price: nextPrice,
      pickupLocation: nextPickupLocation,
      description: nextDescription,
      images: finalImages,
      attributes: finalAttributes,
      createdAt: existing.created_at,
    });

    // 4. Tổng hợp tóm tắt thay đổi để hiển thị minh bạch trên trang UniCycle Passport
    const changedFields: string[] = [];
    if (nextTitle !== existing.title) changedFields.push("tiêu đề");
    if (nextPrice !== Number(existing.price)) {
      changedFields.push(
        `giá bán (${Number(existing.price).toLocaleString("vi-VN")}đ → ${nextPrice.toLocaleString("vi-VN")}đ)`
      );
    }
    if (nextCondition !== existing.condition) changedFields.push("tình trạng");
    if (nextPickupLocation !== existing.pickup_location)
      changedFields.push("điểm giao dịch");
    if (nextDescription !== existing.description) changedFields.push("mô tả");
    if (nextSpecsJson !== (existing.attributes || "{}"))
      changedFields.push("thông số kỹ thuật");

    const computedSummary =
      typeof changeSummary === "string" && changeSummary.trim()
        ? changeSummary.trim()
        : changedFields.length > 0
        ? `Cập nhật ${changedFields.join(", ")}`
        : "Cập nhật thông tin bài đăng";

    const update = db.prepare(`
      UPDATE products
      SET title = ?, description = ?, price = ?, condition = ?, 
          category_id = ?, pickup_location = ?, status = ?, 
          attributes = ?, passport_hash = ?, updated_at = ?
      WHERE id = ?
    `);

    update.run(
      nextTitle,
      nextDescription,
      nextPrice,
      nextCondition,
      nextCategoryId,
      nextPickupLocation,
      nextStatus,
      nextSpecsJson,
      newPassportHash,
      now,
      id
    );

    const newRevision = recordProductRevision({
      productId: id,
      editorId: user.id,
      title: nextTitle,
      price: nextPrice,
      condition: nextCondition,
      pickupLocation: nextPickupLocation,
      description: nextDescription,
      specsJson: nextSpecsJson,
      dataHash: newPassportHash,
      changeSummary: computedSummary,
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật bài đăng và ghi nhận phiên bản mới trên UniCycle Passport thành công!",
      passportHash: newPassportHash,
      revision: newRevision,
    });
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
      return NextResponse.json(
        { error: "Không tìm thấy bài đăng" },
        { status: 404 }
      );
    }

    if (existing.seller_id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa bài đăng này" },
        { status: 403 }
      );
    }

    if (existing.status === "RESERVED") {
      return NextResponse.json(
        {
          error:
            "Không thể gỡ bài đăng khi món đồ đang được giữ chỗ trong Escrow. Hãy hoàn trả điểm giữ chỗ trước khi gỡ bài.",
        },
        { status: 409 }
      );
    }

    // Đổi trạng thái sang HIDDEN
    db.prepare("UPDATE products SET status = 'HIDDEN', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      id
    );

    return NextResponse.json({
      success: true,
      message: "Đã ẩn bài đăng thành công.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi xóa bài đăng" }, { status: 500 });
  }
}
