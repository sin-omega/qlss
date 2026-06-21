import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-verification callback.
 *
 * Supabase redirects here with a `code` query param. We exchange it for
 * a real session using @supabase/ssr, which sets the auth cookies on the
 * response, and then send the user into their dashboard.
 *
 * If the exchange fails we send them back to the sign-in page with a
 * small error hint in the URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.warn("[auth/callback] code exchange failed:", error.message);
    } catch (err) {
      console.warn("[auth/callback] unexpected error:", err);
    }
  }

  // Either no code was present, or the exchange failed — bounce home.
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
