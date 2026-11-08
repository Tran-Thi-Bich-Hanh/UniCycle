import { NextResponse } from "next/server";
import crypto from "node:crypto";
import db from "@/lib/db";
import { hashPassword, createToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, phone, university, campusLocation } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ email, mật khẩu và họ tên." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Kiểm tra trùng email
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
    if (existing) {
      return NextResponse.json(
        { error: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác." },
        { status: 400 }
      );
    }

    const userId = `usr_${crypto.randomBytes(8).toString("hex")}`;
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;

    const insert = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, university, campus_location, avatar_url, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'USER', ?, ?)
    `);

    insert.run(
      userId,
      normalizedEmail,
      passwordHash,
      fullName.trim(),
      phone || null,
      university || null,
      campusLocation || null,
      avatarUrl,
      now,
      now
    );

    const token = createToken({
      userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      role: "USER",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        fullName: fullName.trim(),
        phone: phone || null,
        university: university || null,
        campusLocation: campusLocation || null,
        avatarUrl,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Đã có lỗi xảy ra khi tạo tài khoản." }, { status: 500 });
  }
}

