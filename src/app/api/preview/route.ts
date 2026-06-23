import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/preview?url=<url>
 *
 * Lightweight URL metadata preview endpoint. Fetches the target page HTML and
 * extracts title, description, and favicon. Intended for inline preview in the
 * shortener form. Results are cached in-memory for 60 seconds.
 */

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 60_000;

interface PreviewData {
  ok: boolean;
  title: string;
  description: string;
  favicon: string;
  domain: string;
  error?: string;
}

interface CacheEntry {
  data: PreviewData;
  ts: number;
}

// Module-level in-memory cache
const cache = new Map<string, CacheEntry>();

/** Decode common HTML entities. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:0+)?39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const n = parseInt(h, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = parseInt(d, 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    });
}

/** Extract an attribute value from an HTML tag string. */
function attrValue(tag: string, attr: string): string | null {
  const re = new RegExp(
    `\\b${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    "i",
  );
  const m = tag.match(re);
  if (!m) return null;
  const v = m[1] ?? m[2] ?? m[3] ?? "";
  return decodeEntities(v).trim();
}

/** Parse <head> HTML for title, description, and favicon. */
function parseHead(html: string, origin: string): {
  title: string;
  description: string;
  favicon: string;
} {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch ? headMatch[1] : html;

  // Title
  let title = "";
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = decodeEntities(titleMatch[1].replace(/\s+/g, " ")).trim();
  }

  // Meta tags
  const metaRegex = /<meta\b[^>]*>/gi;
  const metaTags = head.match(metaRegex) ?? [];

  let description = "";
  let favicon = "";

  for (const raw of metaTags) {
    const name = attrValue(raw, "name");
    const property = attrValue(raw, "property");
    const content = attrValue(raw, "content");
    if (content === null) continue;

    if (name && /^description$/i.test(name) && !description) {
      description = content;
    }
    // og:title as fallback
    if (property && property.toLowerCase() === "og:title" && !title) {
      title = content;
    }
    // og:description as fallback
    if (property && property.toLowerCase() === "og:description" && !description) {
      description = content;
    }
  }

  // Favicon from <link rel="icon" ...> or <link rel="shortcut icon" ...>
  const linkRegex = /<link\b[^>]*>/gi;
  const linkTags = head.match(linkRegex) ?? [];
  for (const raw of linkTags) {
    const rel = attrValue(raw, "rel");
    if (rel && /\bicon\b/i.test(rel)) {
      const href = attrValue(raw, "href");
      if (href) {
        // Resolve relative URLs
        try {
          favicon = new URL(href, origin).toString();
        } catch {
          favicon = href;
        }
        break;
      }
    }
  }

  // Default favicon
  if (!favicon) {
    favicon = `${origin}/favicon.ico`;
  }

  return { title, description, favicon };
}

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const rawUrl = reqUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json(
      { ok: false, title: "", description: "", favicon: "", domain: "", error: "missing 'url' query parameter" },
      { status: 400 },
    );
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { ok: false, title: "", description: "", favicon: "", domain: "", error: "invalid url" },
      { status: 400 },
    );
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json(
      { ok: false, title: "", description: "", favicon: "", domain: "", error: "url must be http(s)" },
      { status: 400 },
    );
  }

  // Check cache
  const cacheKey = target.toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Fetch with timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const domain = target.hostname;
    const origin = target.origin;

    if (!res.ok) {
      const data: PreviewData = {
        ok: false,
        title: "",
        description: "",
        favicon: `${origin}/favicon.ico`,
        domain,
        error: `HTTP ${res.status}`,
      };
      cache.set(cacheKey, { data, ts: Date.now() });
      return NextResponse.json(data);
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(ct) && ct !== "") {
      // Not HTML — return minimal info
      const data: PreviewData = {
        ok: true,
        title: domain,
        description: "",
        favicon: `${origin}/favicon.ico`,
        domain,
      };
      cache.set(cacheKey, { data, ts: Date.now() });
      return NextResponse.json(data);
    }

    let html = "";
    try {
      html = await res.text();
    } catch (err) {
      const data: PreviewData = {
        ok: false,
        title: "",
        description: "",
        favicon: `${origin}/favicon.ico`,
        domain,
        error: err instanceof Error ? err.message : "failed to read response",
      };
      cache.set(cacheKey, { data, ts: Date.now() });
      return NextResponse.json(data);
    }

    const parsed = parseHead(html, origin);
    const data: PreviewData = {
      ok: true,
      title: parsed.title,
      description: parsed.description,
      favicon: parsed.favicon,
      domain,
    };
    cache.set(cacheKey, { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch (err) {
    const domain = target.hostname;
    const errorMsg =
      controller.signal.aborted
        ? "timeout"
        : err instanceof Error
          ? err.message
          : String(err);

    const data: PreviewData = {
      ok: false,
      title: "",
      description: "",
      favicon: "",
      domain,
      error: errorMsg,
    };
    cache.set(cacheKey, { data, ts: Date.now() });
    return NextResponse.json(data);
  } finally {
    clearTimeout(timer);
  }
}
