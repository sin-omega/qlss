import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/inspect?url=<url>
 *
 * Server-side URL inspector. Fetches the URL with a real desktop User-Agent,
 * follows redirects manually (cap of 10) so we can surface the full redirect
 * chain, and parses the HTML for <title>, meta description, Open Graph and
 * Twitter card tags using a small regex parser (no extra deps).
 *
 * Errors are returned as 200 with `{ ok:false, error }` so the client can
 * distinguish "the server endpoint itself failed" (network/5xx — the client
 * then falls back to its CORS-proxy chain) from "the server reached the URL
 * but the URL itself failed" (timeout, fetch error, etc.). Invalid `url`
 * query parameter is a 400.
 */

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_REDIRECTS = 10;
const TIMEOUT_MS = 10_000;

interface RedirectHop {
  status: number;
  url: string;
}

interface InspectResponse {
  ok: boolean;
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  responseTimeMs: number;
  redirectCount: number;
  redirectChain: RedirectHop[];
  title: string | null;
  description: string | null;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  error?: string;
}

/** Decode the common HTML entities (&amp; &lt; &gt; &quot; &#39; &apos; &#NNN; &#xNN;). */
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

function attrValue(tag: string, attr: string): string | null {
  // Match `attr="..."` or `attr='...'` (case-insensitive on the attr name).
  const re = new RegExp(
    `\\b${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    "i",
  );
  const m = tag.match(re);
  if (!m) return null;
  const v = m[1] ?? m[2] ?? m[3] ?? "";
  return decodeEntities(v).trim();
}

function findMetaTags(html: string): {
  title: string | null;
  description: string | null;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
} {
  // Cut down to <head> ... </head> to avoid parsing the whole body (faster +
  // avoids matching meta tags inside <code> samples in the body). Fall back
  // to whole document if no <head>.
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch ? headMatch[1] : html;

  // Title
  let title: string | null = null;
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = decodeEntities(titleMatch[1].replace(/\s+/g, " ")).trim() || null;
  }

  // All <meta ...> tags
  const metaRegex = /<meta\b[^>]*>/gi;
  const metaTags = head.match(metaRegex) ?? [];

  let description: string | null = null;
  const ogTags: Record<string, string> = {};
  const twitterTags: Record<string, string> = {};

  for (const raw of metaTags) {
    const name = attrValue(raw, "name");
    const property = attrValue(raw, "property");
    const content = attrValue(raw, "content");
    if (content === null) continue;

    if (name && /^description$/i.test(name)) {
      if (description === null) description = content;
      continue;
    }
    if (property && /^og:/i.test(property)) {
      if (!(property.toLowerCase() in ogTags)) {
        ogTags[property.toLowerCase()] = content;
      }
      continue;
    }
    if (name && /^twitter:/i.test(name)) {
      if (!(name.toLowerCase() in twitterTags)) {
        twitterTags[name.toLowerCase()] = content;
      }
      continue;
    }
  }

  return { title, description, ogTags, twitterTags };
}

function jsonResponse(body: InspectResponse, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const rawUrl = reqUrl.searchParams.get("url");

  if (!rawUrl) {
    return jsonResponse(
      {
        ok: false,
        url: "",
        finalUrl: "",
        status: 0,
        statusText: "Bad Request",
        responseTimeMs: 0,
        redirectCount: 0,
        redirectChain: [],
        title: null,
        description: null,
        ogTags: {},
        twitterTags: {},
        error: "missing 'url' query parameter",
      },
      400,
    );
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return jsonResponse(
      {
        ok: false,
        url: rawUrl,
        finalUrl: "",
        status: 0,
        statusText: "Bad Request",
        responseTimeMs: 0,
        redirectCount: 0,
        redirectChain: [],
        title: null,
        description: null,
        ogTags: {},
        twitterTags: {},
        error: "invalid url",
      },
      400,
    );
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return jsonResponse(
      {
        ok: false,
        url: rawUrl,
        finalUrl: "",
        status: 0,
        statusText: "Bad Request",
        responseTimeMs: 0,
        redirectCount: 0,
        redirectChain: [],
        title: null,
        description: null,
        ogTags: {},
        twitterTags: {},
        error: "url must be http(s)",
      },
      400,
    );
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const redirectChain: RedirectHop[] = [];
  let currentUrl = target.toString();
  let finalUrl = currentUrl;
  let status = 0;
  let statusText = "";
  let lastErr: string | null = null;
  let timedOut = false;

  try {
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      let res: Response;
      try {
        res = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
      } catch (err) {
        if (controller.signal.aborted) {
          timedOut = true;
          lastErr = "timeout";
        } else {
          lastErr = err instanceof Error ? err.message : String(err);
        }
        break;
      }

      status = res.status;
      statusText = res.statusText || "";
      finalUrl = currentUrl;

      const locationHeader = res.headers.get("location");
      const isRedirect = status >= 300 && status < 400 && locationHeader;

      if (isRedirect) {
        const locRaw = locationHeader as string;
        let nextUrl: URL;
        try {
          nextUrl = new URL(locRaw, currentUrl);
        } catch {
          lastErr = `invalid redirect location: ${locRaw}`;
          break;
        }
        redirectChain.push({ status, url: currentUrl });
        currentUrl = nextUrl.toString();
        // Drain to allow connection reuse.
        try {
          await res.body?.cancel();
        } catch {
          /* ignore */
        }
        continue;
      }

      // Final response. Record the final hop in the chain too.
      redirectChain.push({ status, url: currentUrl });

      const ok = status >= 200 && status < 400;
      let title: string | null = null;
      let description: string | null = null;
      let ogTags: Record<string, string> = {};
      let twitterTags: Record<string, string> = {};

      if (ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (/text\/html|application\/xhtml/i.test(ct) || ct === "") {
          let html = "";
          try {
            html = await res.text();
          } catch (err) {
            lastErr = err instanceof Error ? err.message : String(err);
          }
          if (html) {
            const parsed = findMetaTags(html);
            title = parsed.title;
            description = parsed.description;
            ogTags = parsed.ogTags;
            twitterTags = parsed.twitterTags;
          }
        }
      }

      const responseTimeMs = Date.now() - started;
      return jsonResponse({
        ok: ok && lastErr === null,
        url: target.toString(),
        finalUrl,
        status,
        statusText,
        responseTimeMs,
        redirectCount: Math.max(0, redirectChain.length - 1),
        redirectChain,
        title,
        description,
        ogTags,
        twitterTags,
        ...(lastErr ? { error: lastErr } : {}),
      });
    }

    // Exited the loop without a final response → too many redirects (or
    // timed out / errored on a redirect hop).
    if (timedOut) {
      lastErr = "timeout";
    } else if (lastErr === null) {
      lastErr = "too many redirects";
    }
  } finally {
    clearTimeout(timer);
  }

  const responseTimeMs = Date.now() - started;
  return jsonResponse({
    ok: false,
    url: target.toString(),
    finalUrl,
    status,
    statusText,
    responseTimeMs,
    redirectCount: Math.max(0, redirectChain.length - 1),
    redirectChain,
    title: null,
    description: null,
    ogTags: {},
    twitterTags: {},
    error: lastErr ?? "unknown error",
  });
}
