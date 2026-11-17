import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSessionToken,
  DEMO_USERS,
  SESSION_COOKIE_NAME,
  SessionUser,
} from "@/lib/auth";

async function resolveGoogleStudentUser(emailKey?: string): Promise<SessionUser> {
  const targetEmail =
    emailKey && DEMO_USERS[emailKey]
      ? emailKey
      : "hoangnam.bka@gmail.com";

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: { school: true },
    });

    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        role: dbUser.role,
        isStudentVerified: dbUser.isStudentVerified,
        reputationScore: dbUser.reputationScore,
        schoolId: dbUser.schoolId,
        schoolShortName: dbUser.school?.shortName || "ĐH Bách Khoa",
        dorm: dbUser.dorm,
      };
    }
  } catch {
    // Fallback sang DEMO_USERS nếu DB bận
  }

  const fallback = DEMO_USERS[targetEmail] || DEMO_USERS["hoangnam.bka@gmail.com"];
  return {
    id: fallback.id,
    email: fallback.email,
    displayName: fallback.displayName,
    avatarUrl: fallback.avatarUrl,
    role: fallback.role,
    isStudentVerified: fallback.isStudentVerified,
    reputationScore: fallback.reputationScore,
    schoolId: fallback.schoolId,
    schoolShortName: fallback.schoolShortName,
    dorm: fallback.dorm,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get("returnTo") || "/";
  const email = searchParams.get("email") || "hoangnam.bka@gmail.com";

  const user = await resolveGoogleStudentUser(email);
  const token = createSessionToken(user);

  const safeRedirect = returnTo.startsWith("/") ? returnTo : "/";
  const response = NextResponse.redirect(new URL(safeRedirect, req.url));

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = await resolveGoogleStudentUser(body.email);
    const token = createSessionToken(user);

    const response = NextResponse.json({
      user,
      message: `Đã đăng nhập 1-chạm bằng tài khoản Google (${user.displayName})!`,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Không thể đăng nhập bằng Google lúc này." },
      { status: 500 }
    );
  }
}

