import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import prisma from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME, SessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const returnTo = searchParams.get("returnTo") || "/";

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Không nhận được mã xác thực từ Google")}`, req.url));
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      console.error("Supabase code exchange error:", error);
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Xác thực Google thất bại.")}`, req.url));
    }

    const sbUser = data.user;
    const email = sbUser.email || "";
    const displayName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email.split("@")[0] || "Sinh viên UniCycle";
    const avatarUrl = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null;
    const isEduEmail = email.endsWith(".edu.vn");

    // Upsert user vào Database
    let dbUser = await prisma.user.findUnique({
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

    const sessionUser: SessionUser = {
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

    const token = createSessionToken(sessionUser);
    const destination = returnTo.startsWith("/") ? returnTo : "/";
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
    return NextResponse.redirect(new URL("/login?error=Lỗi xử lý phiên đăng nhập", req.url));
  }
}

