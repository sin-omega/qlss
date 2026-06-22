import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReportBody {
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

  const slug = (body.slug ?? "").trim() || null;
  const ip = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? null;

  const service = createServiceClient();

  const { error } = await service
    .from("abuse_reports")
    .insert({
      message,
      link_slug: slug,
      ip_address: ip,
    });

  if (error) {
    console.warn("[abuse] insert failed:", error.message);
    return NextResponse.json({ error: "Failed to submit report. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}