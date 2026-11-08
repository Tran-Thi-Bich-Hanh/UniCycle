import { NextResponse } from "next/server";
import db, { Category } from "@/lib/db";

// GET /api/categories - Lấy danh sách danh mục và đếm số sản phẩm đang bán
export async function GET() {
  try {
    const categories = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'ACTIVE') as product_count
      FROM categories c
      ORDER BY c.display_order ASC
    `).all() as Category[];

    return NextResponse.json({ categories });
  } catch (err: any) {
    console.error("Categories GET error:", err);
    return NextResponse.json({ error: "Lỗi tải danh mục sản phẩm" }, { status: 500 });
  }
}

