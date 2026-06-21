import { NextResponse, type NextRequest } from "next/server";
import { UAParser } from "ua-parser-js";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeSlug, isReservedSlug } from "@/lib/slug";

// Tell Vercel / Next to run this on the Node.js runtime (not the edge) so we
// get full `ua-parser-js` support and a stable `fetch` for the async insert.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LinkRow {
  id: string;
  destination_url: string;
}

/**
 * The redirect + telemetry handler.
 *
 * Flow:
 *  1. Look up the slug → destination URL.
 *  2. If not found, return a calm 404 page (no scary default error UI).
 *  3. Extract telemetry from Vercel headers + standard request headers.
 *  4. Kick off an asynchronous, non-blocking insert into `analytics`
 *     using the service role client (bypasses RLS for system logging).
 *  5. Instantly return a 302 to the destination URL.
 *
 * The telemetry insert is awaited with `waitUntil`-style fire-and-forget
 * — it never blocks the redirect, and a failed insert never breaks a
 * user-facing redirect.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  // Normalize: lowercase + trim. Reserved slugs (api, auth, dashboard,
  // stats, _next, favicon.ico, etc.) are NEVER short links — bail out
  // early so we never accidentally shadow an app route.
  const slug = normalizeSlug(rawSlug);
  const url = new URL(request.url);

  if (isReservedSlug(slug)) {
    return notFoundResponse(url.origin);
  }

  // Resolve the link.
  const link = await resolveLink(slug);
  if (!link) {
    return notFoundResponse(url.origin);
  }

  // Check for explicit ref query param (e.g. ?ref=profile from the profile page).
  // If present, use it as the referer value instead of the HTTP Referer header.
  const explicitRef = url.searchParams.get("ref");

  // Build the analytics payload from request headers.
  const payload = buildAnalyticsPayload(request, link.id, explicitRef);

  // Fire-and-forget telemetry insert. We don't await it for the response.
  // The promise runs in the background and any error is logged, never
  // surfaced to the visitor.
  void logClick(payload).catch((err) => {
    console.warn("[slug] telemetry insert failed:", err);
  });

  // Instant redirect.
  const destination = safeDestination(link.destination_url);
  if (!destination) {
    return notFoundResponse(url.origin, "This link points nowhere.");
  }

  return NextResponse.redirect(destination, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveLink(slug: string): Promise<LinkRow | null> {
  if (!isSupabaseConfigured()) return null;

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("links")
    .select("id, destination_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.warn("[slug] link lookup failed:", error.message);
    return null;
  }
  return data as LinkRow | null;
}

function buildAnalyticsPayload(
  request: NextRequest,
  linkId: string,
  explicitRef?: string | null,
): Record<string, unknown> {
  const headers = request.headers;

  // Vercel injects a rich set of IP / geo headers on every request.
  // See https://vercel.com/docs/edge-network/headers/request-headers
  const forwardedFor = headers.get("x-vercel-forwarded-for") ?? "";
  const ip = firstIp(forwardedFor) ?? null;

  const asn = headers.get("x-vercel-ip-as-number") ?? null;
  const country = headers.get("x-vercel-ip-country") ?? null;
  const region = headers.get("x-vercel-ip-country-region") ?? null;
  const city = headers.get("x-vercel-ip-city") ?? null;
  const latitude = parseOptionalFloat(headers.get("x-vercel-ip-latitude"));
  const longitude = parseOptionalFloat(headers.get("x-vercel-ip-longitude"));
  const timezone = headers.get("x-vercel-ip-timezone") ?? null;

  const userAgent = headers.get("user-agent") ?? null;
  const referer = explicitRef ?? headers.get("referer") ?? null;
  const language = headers.get("accept-language") ?? null;

  // Parse the user-agent server-side.
  const ua = userAgent ? new UAParser(userAgent).getResult() : null;

  const deviceType = inferDeviceType(ua);

  return {
    link_id: linkId,
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
    is_bot: isBot(userAgent),
    referer,
    language,
    clicked_at: new Date().toISOString(),
  };
}

async function logClick(payload: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("analytics").insert(payload);
  if (error) {
    console.warn("[slug] analytics insert error:", error.message);
  }
}

function firstIp(forwardedFor: string): string | null {
  const trimmed = forwardedFor.trim();
  if (!trimmed) return null;
  return trimmed.split(",")[0]?.trim() ?? null;
}

function parseOptionalFloat(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function inferDeviceType(
  ua: ReturnType<typeof UAParser.prototype.getResult> | null,
): string | null {
  if (!ua) return null;
  if (ua.device?.type) return ua.device.type; // mobile, tablet, etc.
  const os = ua.os?.name?.toLowerCase() ?? "";
  if (os.includes("android") || os.includes("ios")) return "mobile";
  if (os.includes("windows") || os.includes("mac") || os.includes("linux")) {
    return "desktop";
  }
  return null;
}

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /bot|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|discordbot|telegrambot|whatsapp|preview/i.test(
    userAgent,
  );
}

function safeDestination(raw: string): URL | null {
  try {
    const url = new URL(raw);
    // Only allow http(s) destinations — no `javascript:`, `file:`, etc.
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function notFoundResponse(origin: string, message?: string): NextResponse {
  const html = renderNotFoundHtml(origin, message);
  return new NextResponse(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderNotFoundHtml(origin: string, message?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QLSS — 404</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    height: 100%;
    overflow: hidden;
  }
  body {
    font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: #fbfbf9;
    color: #0c0c0a;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background-image:
      linear-gradient(to right, rgba(12, 12, 10, 0.035) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(12, 12, 10, 0.035) 1px, transparent 1px);
    background-size: 24px 24px;
    position: relative;
  }
  .wordmark {
    position: absolute;
    top: 1.25rem;
    left: 1.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .wrap { max-width: 24rem; width: 100%; text-align: center; }
  .prompt {
    color: #6a6a64;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }
  .prompt span { color: #0c0c0a; }
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 0.75rem;
  }
  .sub {
    color: #6a6a64;
    font-size: 0.8rem;
    line-height: 1.6;
    margin: 0 0 1.5rem;
  }
  a {
    color: #0c0c0a;
    font-size: 0.75rem;
    text-decoration: none;
    border: 1px solid #d9d8d0;
    padding: 0.5rem 1.25rem;
    background: #ffffff;
    display: inline-block;
    transition: background 0.15s;
  }
  a:hover { background: #ecebe4; }
  .footer {
    position: absolute;
    bottom: 1rem;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 0.65rem;
    color: #6a6a64;
  }
</style>
</head>
<body>
<div class="wordmark">QLSS</div>
<div class="wrap">
  <div class="prompt"><span>$</span> qlss --resolve</div>
  <h1>${escapeHtml(message ?? "link not found")}</h1>
  <p class="sub">This short link doesn't exist. It may have been deleted, or it was never made.</p>
  <a href="${escapeHtml(origin)}">← back to qlss</a>
</div>
<div class="footer">Copyleft (ɔ) QLSS.eu 2026</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
