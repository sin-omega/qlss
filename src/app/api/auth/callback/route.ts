import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const origin = siteOrigin();

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/?error=auth_not_configured`);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error, data } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.user) {
        // ── Onboarding check ───────────────────────────────────────────
        // First-time users have no username on their profile. Send them to
        // /onboard to pick a username and accept the ToS before proceeding.
        let needsOnboard = true;
        try {
          const service = createServiceClient();
          const { data: profile } = await service
            .from("profiles")
            .select("username, tos_accepted")
            .eq("id", data.user.id)
            .maybeSingle();
          if (profile?.username && profile.username.trim().length > 0 && profile.tos_accepted) {
            needsOnboard = false;
          }
        } catch (err) {
          console.warn("[auth/callback] profile lookup failed:", err);
          // If we can't check, assume onboarding is needed so the user gets
          // a chance to set a username.
        }

        if (needsOnboard) {
          return NextResponse.redirect(`${origin}/onboard`);
        }

        const safeNext = next.startsWith("/") ? next : `/${next}`;
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
      console.warn("[auth/callback] code exchange failed:", error?.message);
    } catch (err) {
      console.warn("[auth/callback] unexpected error:", err);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
