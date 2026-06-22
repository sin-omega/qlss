import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Send a JSON body with `url`." }, { status: 400 });
  }

  const rawUrl = (body.url ?? "").trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    const withProto = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;
    parsedUrl = new URL(withProto);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Only http(s) URLs are supported." }, { status: 400 });
  }

  const targetUrl = parsedUrl.toString();
  const apiUrl = `https://unshorten.me/api/v2/unshorten?url=${encodeURIComponent(targetUrl)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream service returned ${res.status}.` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as Record<string, unknown>;

    // v2 returns { resolved_url, url, success }
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
    return NextResponse.json({ error: "Failed to resolve URL. Try again." }, { status: 502 });
  }
}