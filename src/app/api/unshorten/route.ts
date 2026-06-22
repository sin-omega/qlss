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

  const encodedUrl = encodeURIComponent(parsedUrl.toString());
  const apiUrl = `https://unshorten.me/api/${encodedUrl}`;

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

    const json = await res.json();
    return NextResponse.json(json);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out." }, { status: 504 });
    }
    console.warn("[unshorten] fetch error:", err);
    return NextResponse.json({ error: "Failed to resolve URL. Try again." }, { status: 502 });
  }
}