import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get("returnTo") || "/";

  // Tạo URL callback
  const origin = req.nextUrl.origin;
  const redirectTo = `${origin}/api/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error?.message || "Không thể khởi tạo luồng Google")}`, req.url)
    );
  }

  return NextResponse.redirect(data.url);
}
