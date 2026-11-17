import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SessionUser,
} from "@/lib/auth";
import { FALLBACK_SCHOOLS } from "@/lib/data/mock-fallback";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const displayName = (body.displayName || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const schoolId = body.schoolId || "ktx-b";
    const dorm = (body.dorm || "").trim() || "KTX Khu B - ĐHQG TP.HCM";

    if (!displayName || !email || !password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ họ tên, email và mật khẩu." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu cần có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    // Tự động xác minh sinh viên nếu đăng ký bằng email đuôi .edu.vn
    const isEduEmail = email.endsWith(".edu.vn");
    const passwordHash = await bcrypt.hash(password, 10);

    let sessionUser: SessionUser | null = null;

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email này đã được đăng ký. Vui lòng chuyển sang Đăng nhập." },
          { status: 409 }
        );
      }

      // Tìm trường học trong DB theo id hoặc shortName
      const dbSchool = await prisma.school.findFirst({
        where: {
          OR: [
            { id: schoolId },
            { shortName: { contains: schoolId, mode: "insensitive" } },
          ],
        },
      });

      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          authProvider: "email",
          isStudentVerified: isEduEmail,
          studentVerifiedAt: isEduEmail ? new Date() : null,
          schoolId: dbSchool?.id || null,
          dorm,
          reputationScore: 5.0,
          avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`,
        },
        include: {
          school: true,
        },
      });

      sessionUser = {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        avatarUrl: newUser.avatarUrl,
        role: newUser.role,
        isStudentVerified: newUser.isStudentVerified,
        reputationScore: newUser.reputationScore,
        schoolId: newUser.schoolId,
        schoolShortName: newUser.school?.shortName || "KTX ĐHQG",
        dorm: newUser.dorm,
      };
    } catch (dbErr) {
      console.warn("⚠️ Lỗi kết nối DB khi đăng ký, tạo phiên local:", dbErr);
      const matchedSchool = FALLBACK_SCHOOLS.find((s) => s.id === schoolId);
      sessionUser = {
        id: `local-${Date.now()}`,
        email,
        displayName,
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        role: "USER",
        isStudentVerified: isEduEmail,
        reputationScore: 5.0,
        schoolId,
        schoolShortName: matchedSchool?.shortName || "KTX Khu B",
        dorm,
      };
    }

    const token = createSessionToken(sessionUser);
    const response = NextResponse.json({
      user: sessionUser,
      message: isEduEmail
        ? "Đăng ký thành công! Email .edu.vn của bạn đã được cấp Huy hiệu Sinh viên xác minh ngay lập tức."
        : "Đăng ký tài khoản thành công!",
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tạo tài khoản." },
      { status: 500 }
    );
  }
}

