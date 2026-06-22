import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const origin = siteOrigin();

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Ensure next doesn't start with double slash
        const safeNext = next.startsWith("/") ? next : `/${next}`;
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
      console.warn("[auth/callback] code exchange failed:", error.message);
    } catch (err) {
      console.warn("[auth/callback] unexpected error:", err);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
