import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULTS = {
  theme_color: null,
  display_name: null,
  bio: null,
  layout: "list",
  show_clicks: false,
  social_links: [],
};

/**
 * GET /api/profile/settings
 *   Returns the current user's profile settings.
 *
 * PATCH /api/profile/settings  { theme_color?, display_name?, bio?, layout?, show_clicks?, social_links? }
 *   Updates the current user's profile page settings.
 *   social_links is an array of { platform, url } objects.
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

  const serviceClient = createServiceClient();

  try {
    const { data, error } = await serviceClient
      .from("profile_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.message.includes("does not exist")) {
      return NextResponse.json({ settings: DEFAULTS });
    }

    const settings = data ?? DEFAULTS;
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ settings: DEFAULTS });
  }
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

  let body: {
    theme_color?: string | null;
    display_name?: string | null;
    bio?: string | null;
    layout?: string | null;
    show_clicks?: boolean | null;
    social_links?: Array<{ platform: string; url: string }> | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError(400, "Send a JSON body.");
  }

  const update: Record<string, unknown> = {};

  if (body.theme_color !== undefined) {
    const color = (body.theme_color ?? "").trim();
    if (color && !/^#[0-9a-fA-F]{3,8}$/.test(color)) {
      return jsonError(400, "Theme color must be a valid hex color (e.g. #ff6600).");
    }
    update.theme_color = color || null;
  }

  if (body.display_name !== undefined) {
    const name = (body.display_name ?? "").trim();
    if (name.length > 50) {
      return jsonError(400, "Display name must be 50 chars or fewer.");
    }
    update.display_name = name || null;
  }

  if (body.bio !== undefined) {
    const bio = (body.bio ?? "").trim();
    if (bio.length > 300) {
      return jsonError(400, "Bio must be 300 chars or fewer.");
    }
    update.bio = bio || null;
  }

  if (body.layout !== undefined) {
    const layout = (body.layout ?? "").trim();
    if (!["list", "grid", "compact"].includes(layout)) {
      return jsonError(400, 'Layout must be "list", "grid", or "compact".');
    }
    update.layout = layout;
  }

  if (body.show_clicks !== undefined) {
    update.show_clicks = Boolean(body.show_clicks);
  }

  if (body.social_links !== undefined) {
    // Validate social_links array
    const links = body.social_links ?? [];
    if (!Array.isArray(links)) {
      return jsonError(400, "social_links must be an array.");
    }
    if (links.length > 10) {
      return jsonError(400, "Maximum 10 social links allowed.");
    }
    for (const link of links) {
      if (!link.platform || !link.url) {
        return jsonError(400, "Each social link needs a platform and url.");
      }
      if (link.platform.length > 30) {
        return jsonError(400, "Platform name must be 30 chars or fewer.");
      }
      try {
        new URL(link.url);
      } catch {
        return jsonError(400, `Invalid URL for ${link.platform}.`);
      }
    }
    update.social_links = links.map((l) => ({
      platform: l.platform.trim(),
      url: l.url.trim(),
    }));
  }

  if (Object.keys(update).length === 0) {
    return jsonError(400, "Nothing to update.");
  }

  const serviceClient = createServiceClient();

  try {
    const { data, error } = await serviceClient
      .from("profile_settings")
      .upsert(
        { user_id: user.id, ...update },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (error) {
      if (error.message.includes("does not exist")) {
        return jsonError(
          400,
          "Profile settings table not found. Run the SQL migration first.",
        );
      }
      console.warn("[profile-settings] upsert failed:", error.message);
      return jsonError(500, "Could not save settings. Try again.");
    }

    return NextResponse.json({ settings: data });
  } catch {
    return jsonError(500, "Could not save settings. Try again.");
  }
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
