import { NextResponse, type NextRequest } from "next/server";
import { UAParser } from "ua-parser-js";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/profile/views
 *   Records a profile page view in the `profile_views` table.
 *   Uses the service role client (bypasses RLS).
 *   Captures detailed telemetry: IP, geo, browser, device, bot detection.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { profile_id?: string; href?: string; ref?: string | null };
  try {
    body = (await request.json()) as { profile_id?: string; href?: string; ref?: string | null };
  } catch {
    return NextResponse.json({ error: "Send { profile_id }." }, { status: 400 });
  }

  if (!body.profile_id) {
    return NextResponse.json({ error: "profile_id is required." }, { status: 400 });
  }

  const headers = request.headers;
  const forwardedFor = headers.get("x-vercel-forwarded-for") ?? "";
  const ip = forwardedFor.trim().split(",")[0]?.trim() ?? null;
  const asn = headers.get("x-vercel-ip-as-number") ?? null;
  const country = headers.get("x-vercel-ip-country") ?? null;
  const region = headers.get("x-vercel-ip-country-region") ?? null;
  const city = headers.get("x-vercel-ip-city") ?? null;
  const latitude = parseFloatSafe(headers.get("x-vercel-ip-latitude"));
  const longitude = parseFloatSafe(headers.get("x-vercel-ip-longitude"));
  const timezone = headers.get("x-vercel-ip-timezone") ?? null;
  const userAgent = headers.get("user-agent") ?? null;
  const language = headers.get("accept-language") ?? null;

  // Use client-provided referer if available, fall back to HTTP header
  const referer = body.ref ?? headers.get("referer") ?? null;

  // Parse user agent for browser/device info
  const ua = userAgent ? new UAParser(userAgent).getResult() : null;
  const deviceType = ua
    ? ua.device?.type ?? inferDeviceFromOs(ua.os?.name)
    : null;

  const isBot = userAgent
    ? /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|discordbot|telegrambot|whatsapp|preview/i.test(userAgent)
    : false;

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("profile_views").insert({
    profile_id: body.profile_id,
    ip_address: ip,
    asn,
    country,
    region,
    city,
    latitude,
    longitude,
    timezone,
    user_agent: userAgent,
    browser_name: ua?.browser?.name ?? null,
    browser_version: ua?.browser?.version ?? null,
    os_name: ua?.os?.name ?? null,
    os_version: ua?.os?.version ?? null,
    device_type: deviceType,
    is_bot: isBot,
    language,
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
 *   Returns detailed view data for a profile:
 *   - total count, real visitors, bots
 *   - recent 200 view rows (with browser/device/geo info)
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

  // Fetch total count
  const { count, error: countError } = await serviceClient
    .from("profile_views")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId);

  if (countError) {
    console.warn("[profile/views] count failed:", countError.message);
    return NextResponse.json({ views: 0, rows: [] });
  }

  // Fetch recent views (up to 200) with full detail
  const { data: rows, error: rowsError } = await serviceClient
    .from("profile_views")
    .select("*")
    .eq("profile_id", profileId)
    .order("viewed_at", { ascending: false })
    .limit(200);

  if (rowsError) {
    console.warn("[profile/views] rows failed:", rowsError.message);
    return NextResponse.json({ views: count ?? 0, rows: [] });
  }

  return NextResponse.json({
    views: count ?? 0,
    rows: rows ?? [],
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFloatSafe(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function inferDeviceFromOs(osName: string | undefined): string | null {
  if (!osName) return null;
  const os = osName.toLowerCase();
  if (os.includes("android") || os.includes("ios")) return "mobile";
  if (os.includes("windows") || os.includes("mac") || os.includes("linux")) return "desktop";
  return null;
}
