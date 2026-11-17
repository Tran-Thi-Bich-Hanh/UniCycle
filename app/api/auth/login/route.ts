import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  createSessionToken,
  DEMO_USERS,
  SESSION_COOKIE_NAME,
  SessionUser,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ email và mật khẩu." },
        { status: 400 }
      );
    }

    let sessionUser: SessionUser | null = null;

    // 1. Thử xác thực qua CSDL Supabase PostgreSQL
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { school: true },
      });

      if (dbUser && dbUser.passwordHash) {
        const isMatch = await bcrypt.compare(password, dbUser.passwordHash);
        if (isMatch) {
          if (dbUser.status === "SUSPENDED" || dbUser.status === "DELETED") {
            return NextResponse.json(
              { error: "Tài khoản này đã bị khóa hoặc ngừng hoạt động." },
              { status: 403 }
            );
          }

          sessionUser = {
            id: dbUser.id,
            email: dbUser.email,
            displayName: dbUser.displayName,
            avatarUrl: dbUser.avatarUrl,
            role: dbUser.role,
            isStudentVerified: dbUser.isStudentVerified,
            reputationScore: dbUser.reputationScore,
            schoolId: dbUser.schoolId,
            schoolShortName: dbUser.school?.shortName || "KTX ĐHQG",
            dorm: dbUser.dorm,
          };
        }
      }
    } catch (dbErr) {
      console.warn("⚠️ Kết nối DB chậm khi login, kiểm tra tài khoản mẫu:", dbErr);
    }

    // 2. Fallback cho các tài khoản mẫu Seed (phục vụ demo nhanh kể cả khi offline)
    if (!sessionUser && DEMO_USERS[email]) {
      const demo = DEMO_USERS[email];
      if (password === demo.passwordPlain) {
        sessionUser = {
          id: demo.id,
          email: demo.email,
          displayName: demo.displayName,
          avatarUrl: demo.avatarUrl,
          role: demo.role,
          isStudentVerified: demo.isStudentVerified,
          reputationScore: demo.reputationScore,
          schoolId: demo.schoolId,
          schoolShortName: demo.schoolShortName,
          dorm: demo.dorm,
        };
      }
    }

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không chính xác. Bạn có thể chọn tài khoản sinh viên mẫu bên dưới để thử nhanh!" },
        { status: 401 }
      );
    }

    const token = createSessionToken(sessionUser);
    const response = NextResponse.json({
      user: sessionUser,
      message: "Đăng nhập thành công!",
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });

    return response;
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi xử lý đăng nhập." },
      { status: 500 }
    );
  }
}

