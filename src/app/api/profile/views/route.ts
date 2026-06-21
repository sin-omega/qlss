import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/profile/views
 *   Records a profile page view in the `profile_views` table.
 *   Uses the service role client (bypasses RLS).
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { profile_id?: string };
  try {
    body = (await request.json()) as { profile_id?: string };
  } catch {
    return NextResponse.json({ error: "Send { profile_id }." }, { status: 400 });
  }

  if (!body.profile_id) {
    return NextResponse.json({ error: "profile_id is required." }, { status: 400 });
  }

  const headers = request.headers;
  const forwardedFor = headers.get("x-vercel-forwarded-for") ?? "";
  const ip = forwardedFor.trim().split(",")[0]?.trim() ?? null;
  const country = headers.get("x-vercel-ip-country") ?? null;
  const region = headers.get("x-vercel-ip-country-region") ?? null;
  const city = headers.get("x-vercel-ip-city") ?? null;
  const userAgent = headers.get("user-agent") ?? null;
  const referer = headers.get("referer") ?? null;

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("profile_views").insert({
    profile_id: body.profile_id,
    ip_address: ip,
    country,
    region,
    city,
    user_agent: userAgent,
    referer,
  });

  if (error) {
    console.warn("[profile/views] insert failed:", error.message);
    // Don't fail the request — analytics should be fire-and-forget
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/profile/views?profile_id=xxx
 *   Returns view count for a profile.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id");

  if (!profileId) {
    return NextResponse.json({ error: "profile_id query param required." }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { count, error } = await serviceClient
    .from("profile_views")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId);

  if (error) {
    console.warn("[profile/views] count failed:", error.message);
    return NextResponse.json({ views: 0 });
  }

  return NextResponse.json({ views: count ?? 0 });
}
