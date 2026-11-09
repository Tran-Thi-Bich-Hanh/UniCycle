import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generatePassportHash, verifyPassport, PassportData } from "@/lib/passport";

// Tiêu đề CORS cho phép ứng dụng di động, ví Web3 hoặc hệ thống ngoài tra cứu độc lập
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/passport/verify
 * 1. Tra cứu theo ID: ?id=prod_... [&hash=0x...]
 * 2. Tra cứu ngược từ mã băm (Reverse Lookup): ?hash=0x... (phục vụ Web3 / Smart Contract Scanner)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() || "";
    const queryHash = searchParams.get("hash")?.trim() || "";

    if (!id && !queryHash) {
      return NextResponse.json(
        {
          success: false,
          isValid: false,
          error: "Vui lòng cung cấp mã sản phẩm (?id=...) hoặc mã băm (?hash=0x...) để xác thực.",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Nếu queryHash được cung cấp, kiểm tra sơ bộ định dạng hex bytes32 (0x + 64 ký tự hex)
    if (queryHash && !/^0x[0-9a-fA-F]{64}$/.test(queryHash)) {
      return NextResponse.json(
        {
          success: false,
          isValid: false,
          error: "Mã băm không đúng định dạng chuẩn bytes32 (Cần bắt đầu bằng 0x kèm 64 ký tự hex).",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Truy vấn sản phẩm theo id (hoặc slug) hoặc theo passport_hash
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
          success: false,
          isValid: false,
          verificationStatus: "NOT_FOUND",
          error: "Không tìm thấy Hộ chiếu số tương ứng trong hệ sinh thái UniCycle.",
        },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Lấy danh sách ảnh sản phẩm
    const images = db
      .prepare(
        "SELECT url FROM product_images WHERE product_id = ? ORDER BY is_cover DESC, display_order ASC"
      )
      .all(row.id) as { url: string }[];
    const imageUrls = images.map((i) => i.url);

    // Giải mã attributes
    let parsedAttributes = {};
    if (row.attributes) {
      try {
        parsedAttributes = typeof row.attributes === "string" ? JSON.parse(row.attributes) : row.attributes;
      } catch {
        parsedAttributes = {};
      }
    }

    // Tái tạo lại mã băm độc lập từ dữ liệu cơ sở dữ liệu
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

    // Nếu người dùng có gửi queryHash kèm id để đối soát
    const isQueryHashMatch = queryHash
      ? queryHash.toLowerCase().trim() === storedHash.toLowerCase().trim()
      : true;

    const isValid = isIntegrityValid && isQueryHashMatch;

    // Lấy cây lịch sử tuần hoàn sở hữu
    const ownershipHistory = db
      .prepare(
        "SELECT id, owner_name, university, cohort, period, notes, order_index, created_at FROM ownership_history WHERE product_id = ? ORDER BY order_index ASC, created_at ASC"
      )
      .all(row.id);

    return NextResponse.json(
      {
        success: true,
        isValid,
        verificationStatus: isValid
          ? "VERIFIED_AUTHENTIC"
          : !isIntegrityValid
          ? "TAMPER_DETECTED"
          : "HASH_MISMATCH",
        productId: row.id,
        slug: row.slug,
        title: row.title,
        price: row.price,
        condition: row.condition,
        status: row.status,
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
        coverImage: imageUrls[0] || null,
        imagesCount: imageUrls.length,
        computedHash,
        storedHash,
        passport: {
          hash: storedHash,
          computedHash,
          isIntegrityValid,
          isQueryHashMatch,
          algorithm: "SHA-256",
          web3Compatibility: "Solidity bytes32 (Avalanche C-Chain)",
          attributes: parsedAttributes,
          certifiedAt: row.created_at,
        },
        ownershipHistory,
        verifiedAt: new Date().toISOString(),
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error("Passport GET verify error:", err);
    return NextResponse.json(
      {
        success: false,
        isValid: false,
        error: "Lỗi hệ thống khi đối soát Hộ chiếu số.",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * POST /api/passport/verify
 * Xác thực off-chain trực tiếp payload không cần truy vấn DB:
 * Body: { payload: PassportData, expectedHash: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { payload, expectedHash } = body;

    if (!payload || !expectedHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng cung cấp 'payload' và 'expectedHash' để đối soát off-chain.",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const result = verifyPassport(payload as PassportData, expectedHash);

    return NextResponse.json(
      {
        success: true,
        isValid: result.isValid,
        computedHash: result.computedHash,
        expectedHash: result.expectedHash,
        verifiedAt: new Date().toISOString(),
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error("Passport POST verify error:", err);
    return NextResponse.json(
      { success: false, error: "Dữ liệu payload không hợp lệ hoặc lỗi phân tích JSON." },
      { status: 400, headers: CORS_HEADERS }
    );
  }
}
