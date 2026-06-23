import { NextResponse, type NextRequest } from "next/server";
import { unshortenTokens } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/unshorten?url=<short-url>
 *
 * Resolves a shortened URL to its final destination via the unshorten.me API.
 * Requires an Authorization header:
 *   Authorization: Token <UNSHORTEN_API_TOKEN>
 *   Authorization: Bearer <UNSHORTEN_API_TOKEN>
 *
 * The server accepts either the server-side UNSHORTEN_API_TOKEN or the public
 * NEXT_PUBLIC_UNSHORTEN_API_TOKEN (so the built-in browser tab works when both
 * are set to the same value).
 */
export async function GET(request: NextRequest) {
  // ── Token auth ─────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization") ?? "";
  const providedToken = extractToken(authHeader);

  const validTokens = unshortenTokens();
  if (validTokens.length === 0) {
    return NextResponse.json(
      { error: "Unshorten API is not configured (missing UNSHORTEN_API_TOKEN)." },
      { status: 503 },
    );
  }
  if (!providedToken || !validTokens.includes(providedToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Authorization: Token <token> header." },
      { status: 401 },
    );
  }

  // ── URL validation ────────────────────────────────────────────────────
  const rawUrl = (request.nextUrl.searchParams.get("url") ?? "").trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "url query parameter is required." }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    const withProto =
      rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
        ? rawUrl
        : `https://${rawUrl}`;
    parsedUrl = new URL(withProto);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only http(s) URLs are supported." },
      { status: 400 },
    );
  }

  const targetUrl = parsedUrl.toString();
  const apiUrl = `https://unshorten.me/api/v2/unshorten?url=${encodeURIComponent(targetUrl)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream service returned ${res.status}.` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as Record<string, unknown>;
    const resolved = json.resolved_url ?? json.url ?? targetUrl;
    return NextResponse.json({
      url: targetUrl,
      resolved_url: typeof resolved === "string" ? resolved : targetUrl,
      success: true,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out." }, { status: 504 });
    }
    console.warn("[unshorten] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to resolve URL. Try again." },
      { status: 502 },
    );
  }
}

function extractToken(header: string): string | null {
  const trimmed = header.trim();
  if (!trimmed) return null;
  // "Token xxx" or "Bearer xxx"
  const match = trimmed.match(/^(?:Token|Bearer)\s+(\S+)$/i);
  if (match) return match[1];
  // Bare token
  if (/^\S+$/.test(trimmed)) return trimmed;
  return null;
}
