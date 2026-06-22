import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set([
  "theme_color",
  "bg_color",
  "layout",
  "show_descriptions",
  "show_destination",
  "display_name",
  "bio",
  "banner_url",
  "social_links",
  "link_style",
  "font_style",
]);

/**
 * GET /api/profile/settings
 *   Returns the current user's profile settings (JSON object).
 *
 * PATCH /api/profile/settings  { settings: { ... } }
 *   Merges allowed keys into the user's profile settings.
 *   Rejects any keys not in the whitelist.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Not signed in.");

  const { data } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    settings: (data?.settings as Record<string, unknown>) ?? {},
  });
}

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Not signed in.");

  let body: { settings?: Record<string, unknown> };
  try {
    body = (await request.json()) as { settings?: Record<string, unknown> };
  } catch {
    return jsonError(400, "Send a JSON body with { settings: {...} }.");
  }

  const incoming = body.settings ?? {};
  const merged: Record<string, unknown> = {};

  // Whitelist: only allow known keys.
  for (const [key, value] of Object.entries(incoming)) {
    if (ALLOWED_KEYS.has(key)) {
      merged[key] = value;
    }
  }

  if (Object.keys(merged).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ settings: merged })
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("settings")) {
      // Column might not exist yet — try graceful fallback.
      console.warn("[profile/settings] column missing:", error.message);
      return jsonError(503, "Run the profile settings migration first.");
    }
    console.warn("[profile/settings] update failed:", error.message);
    return jsonError(500, "Could not save settings.");
  }

  return NextResponse.json({ ok: true });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
