import { NextResponse } from "next/server";
import db, { ProductImage } from "@/lib/db";
import { generatePassportHash, verifyPassport } from "@/lib/passport";

// GET /api/passport/verify?id=prod_...&hash=0x...
// API Xác thực Độc lập: Kiểm tra tính toàn vẹn của Hộ chiếu số UniCycle Passport
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() || "";
    const queryHash = searchParams.get("hash")?.trim() || "";

    if (!id && !queryHash) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp mã sản phẩm (id) hoặc mã băm (hash) để xác thực." },
        { status: 400 }
      );
    }

    // Truy vấn sản phẩm theo id hoặc passport_hash
    const querySql = `
      SELECT 
        p.*,
        c.name as cat_name, c.slug as cat_slug, c.icon as cat_icon,
        u.id as s_id, u.full_name as s_name, u.university as s_university, 
        u.campus_location as s_campus, u.avatar_url as s_avatar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE ${id ? "p.id = ? OR p.slug = ?" : "p.passport_hash = ?"}
    `;

    const row = (id
      ? db.prepare(querySql).get(id, id)
      : db.prepare(querySql).get(queryHash)) as any;

    if (!row) {
      return NextResponse.json(
        {
          isValid: false,
          error: "Không tìm thấy Hộ chiếu số tương ứng trong hệ thống UniCycle.",
        },
        { status: 404 }
      );
    }

    const images = db
      .prepare(
        "SELECT url FROM product_images WHERE product_id = ? ORDER BY is_cover DESC, display_order ASC"
      )
      .all(row.id) as { url: string }[];
    const imageUrls = images.map((i) => i.url);

    let parsedAttributes = {};
    if (row.attributes) {
      try {
        parsedAttributes = typeof row.attributes === "string" ? JSON.parse(row.attributes) : row.attributes;
      } catch {
        parsedAttributes = {};
      }
    }

    // Tính toán lại mã băm độc lập từ dữ liệu gốc
    const computedHash = generatePassportHash({
      productId: row.id,
      title: (row.title || "").trim(),
      categoryId: row.category_id,
      sellerId: row.seller_id,
      condition: row.condition,
      price: Number(row.price),
      pickupLocation: (row.pickup_location || "").trim(),
      description: (row.description || "").trim(),
      images: imageUrls,
      attributes: parsedAttributes,
      createdAt: row.created_at,
    });

    const storedHash = row.passport_hash || "";
    const isIntegrityValid =
      computedHash.toLowerCase().trim() === storedHash.toLowerCase().trim();

    // Nếu người dùng có gửi queryHash để đối chiếu
    const isQueryHashMatch = queryHash
      ? queryHash.toLowerCase().trim() === storedHash.toLowerCase().trim()
      : true;

    const isValid = isIntegrityValid && isQueryHashMatch;

    return NextResponse.json({
      isValid,
      productId: row.id,
      title: row.title,
      price: row.price,
      condition: row.condition,
      category: {
        id: row.category_id,
        name: row.cat_name,
        slug: row.cat_slug,
        icon: row.cat_icon,
      },
      seller: {
        id: row.s_id,
        name: row.s_name,
        university: row.s_university,
        campus: row.s_campus,
        avatar: row.s_avatar,
      },
      pickupLocation: row.pickup_location,
      attributes: parsedAttributes,
      coverImage: imageUrls[0] || null,
      imagesCount: imageUrls.length,
      computedHash,
      storedHash,
      isIntegrityValid,
      isQueryHashMatch,
      createdAt: row.created_at,
      verifiedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Passport verify error:", err);
    return NextResponse.json(
      { isValid: false, error: "Lỗi hệ thống khi đối soát Hộ chiếu số." },
      { status: 500 }
    );
  }
}

