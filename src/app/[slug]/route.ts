import { NextResponse, type NextRequest } from "next/server";
import { UAParser } from "ua-parser-js";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeSlug, isReservedSlug } from "@/lib/slug";

import { runWithLang, parseLangCookie, t, getLanguage, type Lang } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read the qlss-lang cookie from the request and resolve a Lang. */
function getReqLang(request: NextRequest): Lang {
  const raw = request.cookies.get("qlss-lang")?.value;
  return parseLangCookie(raw);
}

interface LinkRow {
  id: string;
  destination_url: string;
  pincode: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  link_type: string;
  markdown_content: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  title: string | null;
  description: string | null;
  deleted: boolean;
  allow_comments: boolean;
  comments_registered_only: boolean;
}

interface OgMeta {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  slug: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  const url = new URL(request.url);
  const lang = getReqLang(request);

  if (isReservedSlug(slug)) {
    return runWithLang(lang, () => notFoundResponse(url.origin));
  }

  const link = await resolveLink(slug);
  if (!link) {
    return runWithLang(lang, () => notFoundResponse(url.origin));
  }

  // ── Deleted check ─────────────────────────────────────────────────────
  if (link.deleted) {
    return runWithLang(lang, () => deletedResponse(url.origin, slug));
  }

  // ── Expiry check ──────────────────────────────────────────────────────
  if (link.expires_at) {
    const expiresAt = new Date(link.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      return runWithLang(lang, () => expiredResponse(url.origin, slug));
    }
  }

  // ── Max-uses check ────────────────────────────────────────────────────
  if (link.max_uses !== null && link.max_uses !== undefined) {
    if (link.use_count >= link.max_uses) {
      return runWithLang(lang, () => expiredResponse(url.origin, slug, "uses"));
    }
  }

  const og: OgMeta = {
    title: link.og_title,
    description: link.og_description,
    image: link.og_image,
    slug,
  };

  // ── Pincode protection ────────────────────────────────────────────────
  if (link.pincode) {
    const providedPin = url.searchParams.get("pin");
    if (!providedPin || providedPin !== link.pincode) {
      return runWithLang(lang, () => pincodeRequiredResponse(url.origin, slug, og));
    }
  }

  // ── Markdown page (removed) → redirect home ──────────────────────────
  if (link.link_type === "markdown") {
    return NextResponse.redirect(url.origin);
  }

  // ── Redirect ──────────────────────────────────────────────────────────
  const destination = safeDestination(link.destination_url);
  if (!destination) {
    return runWithLang(lang, () => notFoundResponse(url.origin, t("home.expired_sub")));
  }

  void incrementUseCount(link.id).catch((err) => {
    console.warn("[slug] use_count increment failed:", err);
  });

  const explicitRef = url.searchParams.get("ref");
  const payload = buildAnalyticsPayload(request, link.id, explicitRef);
  void logClick(payload).catch((err) => {
    console.warn("[slug] telemetry insert failed:", err);
  });

  return NextResponse.redirect(destination, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
  });
}

async function resolveLink(slug: string): Promise<LinkRow | null> {
  if (!isSupabaseConfigured()) return null;

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("links")
    .select(
      "id, destination_url, pincode, expires_at, max_uses, use_count, link_type, markdown_content, og_title, og_description, og_image, title, description, deleted, allow_comments, comments_registered_only",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.warn("[slug] link lookup failed:", error.message);
    return null;
  }
  return data as LinkRow | null;
}

async function incrementUseCount(linkId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.rpc("increment_use_count", {
    link_id: linkId,
  }).catch(() => ({ error: new Error("rpc unavailable") }));
  if (error) {
    // Fallback: read-modify-write (best-effort, may race)
    try {
      const { data: row } = await serviceClient
        .from("links")
        .select("use_count")
        .eq("id", linkId)
        .maybeSingle();
      const next = (row?.use_count ?? 0) + 1;
      await serviceClient.from("links").update({ use_count: next }).eq("id", linkId);
    } catch {
      // ignore
    }
  }
}

function buildAnalyticsPayload(
  request: NextRequest,
  linkId: string,
  explicitRef?: string | null,
): Record<string, unknown> {
  const headers = request.headers;

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
  if (ua.device?.type) return ua.device.type;
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
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

// ============================================================================
// OG meta helpers
// ============================================================================
function ogMetaTags(origin: string, og: OgMeta): string {
  const fallbackTitle = `QLSS /${og.slug}`;
  const title = og.title?.trim() || fallbackTitle;
  const description = og.description?.trim() || "";
  const image = og.image?.trim() || "";

  const tags: string[] = [];
  tags.push(`<meta property="og:title" content="${sanitizeOgText(title)}" />`);
  tags.push(`<meta property="og:site_name" content="QLSS" />`);
  tags.push(`<meta property="og:type" content="website" />`);
  tags.push(`<meta property="og:url" content="${sanitizeOgText(`${origin}/${og.slug}`)}" />`);
  if (description) {
    tags.push(`<meta property="og:description" content="${sanitizeOgText(description)}" />`);
    tags.push(`<meta name="description" content="${sanitizeOgText(description)}" />`);
  }
  if (image) {
    tags.push(`<meta property="og:image" content="${sanitizeOgText(image)}" />`);
    tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
    tags.push(`<meta name="twitter:image" content="${sanitizeOgText(image)}" />`);
  } else {
    tags.push(`<meta name="twitter:card" content="summary" />`);
  }
  tags.push(`<meta name="twitter:title" content="${sanitizeOgText(title)}" />`);
  if (description) {
    tags.push(`<meta name="twitter:description" content="${sanitizeOgText(description)}" />`);
  }
  return tags.join("\n  ");
}

// ============================================================================
// Shared CSS for standalone HTML pages (404, pincode, expired, markdown)
// ============================================================================
function sharedPageCSS(): string {
  return `
  :root {
    color-scheme: light dark;
    --bg: #fbfbf9;
    --fg: #0c0c0a;
    --muted: #6a6a64;
    --border: #d9d8d0;
    --card: #ffffff;
    --hover: #ecebe4;
    --grid: rgba(12, 12, 10, 0.035);
    --error: #b44040;
    --safe: #2c6e49;
    --accent: #6a5acd;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0c0c0a;
      --fg: #e8e6df;
      --muted: #8a8880;
      --border: #3a3a36;
      --card: #1a1a18;
      --hover: #2a2a26;
      --grid: rgba(232, 230, 223, 0.04);
      --error: #e06060;
      --safe: #3ebd65;
      --accent: #9b8cff;
    }
  }
  :root[data-theme="dark"] {
    --bg: #0c0c0a;
    --fg: #e8e6df;
    --muted: #8a8880;
    --border: #3a3a36;
    --card: #1a1a18;
    --hover: #2a2a26;
    --grid: rgba(232, 230, 223, 0.04);
    --error: #e06060;
    --safe: #3ebd65;
    --accent: #9b8cff;
  }
  :root[data-theme="light"] {
    --bg: #fbfbf9;
    --fg: #0c0c0a;
    --muted: #6a6a64;
    --border: #d9d8d0;
    --card: #ffffff;
    --hover: #ecebe4;
    --grid: rgba(12, 12, 10, 0.035);
    --error: #b44040;
    --safe: #2c6e49;
    --accent: #6a5acd;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow-x: hidden; }
  body {
    font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: var(--bg);
    color: var(--fg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1.5rem;
    background-image:
      linear-gradient(to right, var(--grid) 1px, transparent 1px),
      linear-gradient(to bottom, var(--grid) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  .wordmark { position: absolute; top: 1.25rem; left: 1.5rem; font-size: 0.75rem; font-weight: 700; letter-spacing: -0.01em; }
  .wrap { max-width: 24rem; width: 100%; text-align: center; }
  .prompt { color: var(--muted); font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.75rem; }
  .prompt span { color: var(--fg); }
  h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
  .sub { color: var(--muted); font-size: 0.8rem; line-height: 1.6; margin-bottom: 1.5rem; }
  .footer { position: absolute; bottom: 1rem; left: 0; right: 0; text-align: center; font-size: 0.65rem; color: var(--muted); }
  .btn-link { color: var(--fg); font-size: 0.75rem; text-decoration: none; border: 1px solid var(--border); padding: 0.5rem 1.25rem; background: var(--card); display: inline-block; transition: background 0.15s; }
  .btn-link:hover { background: var(--hover); }
  @media (max-width: 480px) { body { padding: 1rem; } .wrap { max-width: 100%; } h1 { font-size: 1.1rem; } .prompt { font-size: 0.65rem; } }`;
}

function pincodeRequiredResponse(origin: string, slug: string, og: OgMeta): NextResponse {
  const css = sharedPageCSS() + `
  .pin-form { display: flex; border: 1px solid var(--border); background: var(--card); overflow: hidden; }
  .pin-form input { flex: 1; border: none; outline: none; padding: 0.6rem 1rem; font-family: inherit; font-size: 0.85rem; background: transparent; color: var(--fg); min-width: 0; }
  .pin-form input::placeholder { color: var(--muted); opacity: 0.6; }
  .pin-form button { border: none; border-left: 1px solid var(--border); background: var(--card); padding: 0.6rem 1.25rem; font-family: inherit; font-size: 0.85rem; font-weight: 500; cursor: pointer; color: var(--fg); transition: background 0.15s; white-space: nowrap; }
  .pin-form button:hover { background: var(--hover); }
  .error { color: var(--error); font-size: 0.75rem; margin-top: 0.75rem; display: none; }
  .back { margin-top: 1.5rem; }
  @media (max-width: 480px) { .pin-form input { padding: 0.6rem 0.75rem; font-size: 1rem; } .pin-form button { padding: 0.6rem 1rem; } }`;

  const title = t("pincode.required");
  const subtitle = t("pincode.subtitle");
  const placeholder = t("pincode.placeholder");
  const goBtn = t("pincode.go_btn");
  const wrongPin = t("pincode.wrong_pin");
  const back = t("standalone.back_to_qlss");
  const footer = t("standalone.footer");
  const wordmark = t("standalone.wordmark");

  const html = `<!doctype html>
<html lang="${getLangAttr()}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QLSS — ${escapeHtml(title)}</title>
  ${ogMetaTags(origin, og)}
<style>${css}</style>
</head>
<body>
<div class="wordmark">${escapeHtml(wordmark)}</div>
<div class="wrap">
  <div class="prompt"><span>$</span> qlss --pincode</div>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(subtitle)}</p>
  <form class="pin-form" method="GET" action="/${escapeHtml(slug)}">
    <input type="text" name="pin" placeholder="${escapeHtmlAttr(placeholder)}" autocomplete="off" autofocus />
    <button type="submit">${escapeHtml(goBtn)}</button>
  </form>
  <p class="error" id="err">${escapeHtml(wrongPin)}</p>
  <div class="back"><a class="btn-link" href="${escapeHtml(origin)}">${escapeHtml(back)}</a></div>
</div>
<div class="footer">${escapeHtml(footer)}</div>
<script>
  (function() {
    var params = new URLSearchParams(window.location.search);
    var pin = params.get('pin');
    if (pin !== null && pin !== '') { document.getElementById('err').style.display = 'block'; }
    try {
      function getCookie(name) { var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)')); return match ? match[2] : null; }
      var theme = getCookie('theme') || localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || theme === 'light') { document.documentElement.setAttribute('data-theme', theme); document.documentElement.style.colorScheme = theme; }
  } catch(e) { console.error('[qlss]', e); }
  })();
</script>
</body>
</html>`;
  return new NextResponse(html, {
    status: 403,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function expiredResponse(origin: string, slug: string, reason?: "time" | "uses"): NextResponse {
  const css = sharedPageCSS() + ` h1 { font-size: 1.5rem; } @media (max-width: 480px) { h1 { font-size: 1.25rem; } }`;
  const message = reason === "uses" ? t("home.uses_title") : t("home.expired_title");
  const sub = reason === "uses" ? t("home.uses_sub") : t("home.expired_sub");
  const back = t("standalone.back_to_qlss");
  const footer = t("standalone.footer");
  const wordmark = t("standalone.wordmark");

  const html = `<!doctype html>
<html lang="${getLangAttr()}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>QLSS — ${escapeHtml(message)}</title>
<style>${css}</style>
</head>
<body>
<div class="wordmark">${escapeHtml(wordmark)}</div>
<div class="wrap">
  <div class="prompt"><span>$</span> qlss --resolve /${escapeHtml(slug)}</div>
  <h1>${escapeHtml(message)}</h1>
  <p class="sub">${escapeHtml(sub)}</p>
  <a class="btn-link" href="${escapeHtml(origin)}">${escapeHtml(back)}</a>
</div>
<div class="footer">${escapeHtml(footer)}</div>
<script>
  try {
    function getCookie(name) { var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)')); return match ? match[2] : null; }
    var theme = getCookie('theme') || localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || theme === 'light') { document.documentElement.setAttribute('data-theme', theme); }
  } catch(e) {}
</script>
</body>
</html>`;
  return new NextResponse(html, {
    status: 410,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function deletedResponse(origin: string, slug: string): NextResponse {
  const css = sharedPageCSS() + ` h1 { font-size: 1.5rem; } @media (max-width: 480px) { h1 { font-size: 1.25rem; } }`;
  const back = t("standalone.back_to_qlss");
  const footer = t("standalone.footer");
  const wordmark = t("standalone.wordmark");

  const html = `<!doctype html>
<html lang="${getLangAttr()}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>QLSS — link was deleted</title>
<style>${css}</style>
</head>
<body>
<div class="wordmark">${escapeHtml(wordmark)}</div>
<div class="wrap">
  <div class="prompt"><span>$</span> qlss --resolve /${escapeHtml(slug)}</div>
  <h1>this link was removed</h1>
  <p class="sub">The creator deleted this link. It is no longer accessible.</p>
  <a class="btn-link" href="${escapeHtml(origin)}">${escapeHtml(back)}</a>
</div>
<div class="footer">${escapeHtml(footer)}</div>
<script>
  try {
    function getCookie(name) { var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)')); return match ? match[2] : null; }
    var theme = getCookie('theme') || localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || theme === 'light') { document.documentElement.setAttribute('data-theme', theme); }
  } catch(e) {}
</script>
</body>
</html>`;
  return new NextResponse(html, {
    status: 410,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function notFoundResponse(origin: string, message?: string): NextResponse {
  const css = sharedPageCSS() + `
  h1 { font-size: 1.5rem; }
  @media (max-width: 480px) { h1 { font-size: 1.25rem; } }`;

  const title = message ?? t("not_found.title");
  const subtitle = t("not_found.subtitle");
  const back = t("standalone.back_to_qlss");
  const footer = t("standalone.footer");
  const wordmark = t("standalone.wordmark");

  const html = `<!doctype html>
<html lang="${getLangAttr()}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QLSS — 404</title>
<style>${css}</style>
</head>
<body>
<div class="wordmark">${escapeHtml(wordmark)}</div>
<div class="wrap">
  <div class="prompt"><span>$</span> qlss --resolve</div>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(subtitle)}</p>
  <a class="btn-link" href="${escapeHtml(origin)}">${escapeHtml(back)}</a>
</div>
<div class="footer">${escapeHtml(footer)}</div>
<script>
  try {
    function getCookie(name) { var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)')); return match ? match[2] : null; }
    var theme = getCookie('theme') || localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || theme === 'light') { document.documentElement.setAttribute('data-theme', theme); }
  } catch(e) {}
</script>
</body>
</html>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a string for safe use inside an HTML attribute value. */
function escapeHtmlAttr(s: string): string {
  return escapeHtml(s);
}

function sanitizeOgText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 300);
}

/** Get the current language code for the <html lang="..."> attribute. */
function getLangAttr(): string {
  return getLanguage();
}
