import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/health-check
 *
 * Tests whether a URL is "alive": follows up to 5 redirects manually,
 * performs a final GET with a 6s timeout, and returns status, response
 * time, redirect chain, content-type, server header, and an SSL flag
 * (best-effort — true SSL inspection isn't available in Node fetch, so
 * `ssl.valid` is derived from whether the request itself succeeded).
 *
 * The whole operation is capped at a 10s overall timeout. Results are
 * cached in a module-level Map for 30 seconds keyed by URL.
 */

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_REDIRECTS = 5;
const FINAL_TIMEOUT_MS = 6_000;
const OVERALL_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 30_000;

interface RedirectHop {
  status: number;
  location: string;
}

interface HealthCheckResponse {
  ok: boolean;
  url: string;
  final_url: string;
  status: number;
  status_text: string;
  response_time_ms: number;
  redirects: RedirectHop[];
  content_type: string | null;
  server: string | null;
  ssl: { valid: boolean; days_remaining: number | null; issuer: string | null } | null;
  https: boolean;
  error?: string;
}

// ── Module-level 30s cache keyed by URL ────────────────────────────────────
const cache = new Map<string, { at: number; body: HealthCheckResponse }>();

function jsonResponse(body: HealthCheckResponse, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/** Returns true if an error message looks like an SSL/TLS certificate error. */
function looksLikeCertError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("certificate") ||
    lower.includes("cert") ||
    lower.includes("ssl") ||
    lower.includes("tls") ||
    lower.includes("unable to verify the first certificate") ||
    lower.includes("self-signed") ||
    lower.includes("unable to verify leaf signature")
  );
}

export async function POST(req: Request) {
  let parsedBody: { url?: unknown } = {};
  try {
    parsedBody = (await req.json()) as { url?: unknown };
  } catch {
    return jsonResponse(
      {
        ok: false,
        url: "",
        final_url: "",
        status: 0,
        status_text: "Bad Request",
        response_time_ms: 0,
        redirects: [],
        content_type: null,
        server: null,
        ssl: null,
        https: false,
        error: "invalid json body",
      },
      400,
    );
  }

  const rawUrl = typeof parsedBody.url === "string" ? parsedBody.url.trim() : "";

  if (!rawUrl) {
    return jsonResponse(
      {
        ok: false,
        url: "",
        final_url: "",
        status: 0,
        status_text: "Bad Request",
        response_time_ms: 0,
        redirects: [],
        content_type: null,
        server: null,
        ssl: null,
        https: false,
        error: "missing 'url' field",
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
        final_url: "",
        status: 0,
        status_text: "Bad Request",
        response_time_ms: 0,
        redirects: [],
        content_type: null,
        server: null,
        ssl: null,
        https: false,
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
        final_url: "",
        status: 0,
        status_text: "Bad Request",
        response_time_ms: 0,
        redirects: [],
        content_type: null,
        server: null,
        ssl: null,
        https: false,
        error: "url must be http(s)",
      },
      400,
    );
  }

  // ── Cache hit? ────────────────────────────────────────────────────────
  const cached = cache.get(target.toString());
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return jsonResponse(cached.body);
  }

  const isHttps = target.protocol === "https:";
  const started = Date.now();

  // Overall 10s timeout — aborts everything if exceeded.
  const overallController = new AbortController();
  const overallTimer = setTimeout(
    () => overallController.abort(),
    OVERALL_TIMEOUT_MS,
  );

  const redirects: RedirectHop[] = [];
  let currentUrl = target.toString();
  let finalUrl = currentUrl;
  let status = 0;
  let statusText = "";
  let contentType: string | null = null;
  let server: string | null = null;
  let lastErr: string | null = null;
  let timedOut = false;
  let certError = false;
  // True if we received ANY HTTP response from the final hop (i.e. the TLS
  // handshake completed and the server replied — even if the reply was a
  // 4xx/5xx). Used to decide `ssl.valid`.
  let gotHttpResponse = false;

  try {
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      // Per-hop controller: links the overall abort to this hop's signal.
      const hopController = new AbortController();
      const onOverallAbort = () => hopController.abort();
      overallController.signal.addEventListener("abort", onOverallAbort);

      // Arm the 6s timer for every hop — final hops should never exceed 6s,
      // and redirect hops are typically tiny HEAD-like GETs that finish in
      // <1s. This keeps us from waiting 10s on a hanging server.
      const hopTimer = setTimeout(() => hopController.abort(), FINAL_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: hopController.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
      } catch (err) {
        if (overallController.signal.aborted) {
          timedOut = true;
          lastErr = "timeout";
        } else if (hopController.signal.aborted) {
          timedOut = true;
          lastErr = "timeout";
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          if (isHttps && looksLikeCertError(msg)) {
            certError = true;
          }
          lastErr = msg;
        }
        break;
      } finally {
        clearTimeout(hopTimer);
        overallController.signal.removeEventListener("abort", onOverallAbort);
      }

      status = res.status;
      statusText = res.statusText || "";
      finalUrl = currentUrl;
      contentType = res.headers.get("content-type");
      server = res.headers.get("server");
      gotHttpResponse = true;

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
        redirects.push({ status, location: nextUrl.toString() });
        // Drain to allow connection reuse.
        try {
          await res.body?.cancel();
        } catch {
          /* ignore */
        }
        currentUrl = nextUrl.toString();
        continue;
      }

      // Final response.
      // Drain the body so the connection can be reused, but we don't need
      // the content for anything.
      try {
        await res.body?.cancel();
      } catch {
        /* ignore */
      }

      const responseTimeMs = Date.now() - started;
      const ok = status >= 200 && status < 400;

      const body: HealthCheckResponse = {
        ok,
        url: target.toString(),
        final_url: finalUrl,
        status,
        status_text: statusText,
        response_time_ms: responseTimeMs,
        redirects,
        content_type: contentType,
        server,
        ssl: isHttps
          ? {
              // `ssl.valid` reflects whether the TLS handshake completed
              // and we received an HTTP response — NOT whether the upstream
              // returned a 2xx. True SSL cert inspection isn't possible in
              // Node fetch, so we infer validity from "did the request reach
              // the server without a cert error".
              valid: gotHttpResponse && !certError,
              days_remaining: null,
              issuer: null,
            }
          : null,
        https: isHttps,
        ...(lastErr ? { error: lastErr } : {}),
      };

      cache.set(target.toString(), { at: Date.now(), body });
      return jsonResponse(body);
    }

    // Exited the loop without a final response → too many redirects (or
    // timed out / errored on a redirect hop).
    if (timedOut) {
      lastErr = "timeout";
    } else if (lastErr === null) {
      lastErr = "too many redirects";
    }
  } catch (err) {
    lastErr = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(overallTimer);
  }

  const responseTimeMs = Date.now() - started;
  const body: HealthCheckResponse = {
    ok: false,
    url: target.toString(),
    final_url: finalUrl,
    status,
    status_text: statusText,
    response_time_ms: responseTimeMs,
    redirects,
    content_type: contentType,
    server,
    ssl: isHttps
      ? { valid: gotHttpResponse && !certError, days_remaining: null, issuer: null }
      : null,
    https: isHttps,
    ...(lastErr ? { error: lastErr } : {}),
  };

  cache.set(target.toString(), { at: Date.now(), body });
  return jsonResponse(body);
}

// Also support GET for convenience / health-of-the-endpoint-itself.
export async function GET() {
  return jsonResponse(
    {
      ok: false,
      url: "",
      final_url: "",
      status: 0,
      status_text: "Method Not Allowed",
      response_time_ms: 0,
      redirects: [],
      content_type: null,
      server: null,
      ssl: null,
      https: false,
      error: "POST a { url } body to use the health-check endpoint",
    },
    405,
  );
}
