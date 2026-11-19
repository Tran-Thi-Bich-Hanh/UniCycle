import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/session-token";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const user = verifySessionToken(token);
    if (user?.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/sell", "/verify-student", "/my-items", "/my-products"],
};
