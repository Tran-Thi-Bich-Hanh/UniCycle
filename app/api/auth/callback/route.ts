import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import prisma from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME, SessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");
  const rawReturnTo = searchParams.get("returnTo");

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Không nhận được mã xác thực (code) từ Google.")}`, req.url)
    );
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error("Supabase exchangeCodeForSession error:", error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error?.message || "Xác thực phiên Google thất bại.")}`, req.url)
      );
    }

    const sbUser = data.user;
    const email = (sbUser.email || "").toLowerCase();
    const displayName =
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      email.split("@")[0] ||
      "Sinh viên UniCycle";
    const avatarUrl =
      sbUser.user_metadata?.avatar_url ||
      sbUser.user_metadata?.picture ||
      null;
    const isEduEmail = email.endsWith(".edu.vn");

    // Upsert user vào Database
    let dbUser = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { email },
        include: { school: true },
      });

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            email,
            displayName,
            avatarUrl,
            authProvider: "google",
            isStudentVerified: isEduEmail,
            studentVerifiedAt: isEduEmail ? new Date() : null,
            reputationScore: 5.0,
          },
          include: { school: true },
        });
      }
    } catch (dbErr) {
      console.warn("⚠️ Lỗi truy vấn Prisma khi xử lý Google Callback:", dbErr);
    }

    const sessionUser: SessionUser = {
      id: dbUser?.id || sbUser.id,
      email,
      displayName: dbUser?.displayName || displayName,
      avatarUrl: dbUser?.avatarUrl || avatarUrl,
      role: dbUser?.role || "USER",
      isStudentVerified: dbUser?.isStudentVerified ?? isEduEmail,
      reputationScore: dbUser?.reputationScore || 5.0,
      schoolId: dbUser?.schoolId || null,
      schoolShortName: dbUser?.school?.shortName || "KTX ĐHQG",
      dorm: dbUser?.dorm || null,
    };

    const token = createSessionToken(sessionUser);
    const defaultHome = sessionUser.role === "ADMIN" ? "/admin" : "/";
    const destination =
      rawReturnTo &&
      rawReturnTo.startsWith("/") &&
      !rawReturnTo.startsWith("//") &&
      rawReturnTo !== "/"
        ? rawReturnTo
        : defaultHome;
    const response = NextResponse.redirect(new URL(destination, req.url));

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error("Callback auth error:", err);
    return NextResponse.redirect(new URL("/login?error=Lỗi kết nối khi xác thực tài khoản Google", req.url));
  }
}
