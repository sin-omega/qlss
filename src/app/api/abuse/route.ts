import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReportBody {
  email?: string;
  message: string;
  slug?: string;
}

export async function POST(request: NextRequest) {
  let body: ReportBody;
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return NextResponse.json({ error: "Send a JSON body with `message`." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message || message.length < 10) {
    return NextResponse.json({ error: "Please describe the issue (at least 10 characters)." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const slug = (body.slug ?? "").trim();

  // Log the abuse report
  console.warn("[abuse] report received:", {
    email: email || "anonymous",
    slug: slug || "none",
    message: message.slice(0, 200),
    timestamp: new Date().toISOString(),
    ip: request.headers.get("x-vercel-forwarded-for") ?? "unknown",
  });

  // In production, you could send this to email or a support system.
  return NextResponse.json({ ok: true });
}
