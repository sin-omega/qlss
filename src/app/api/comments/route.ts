import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug param." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: link } = await service
    .from("links")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ comments: [] });
  }

  const { data: comments, error } = await service
    .from("comments")
    .select("id, parent_id, author_name, content, created_at")
    .eq("link_id", link.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[comments] fetch failed:", error.message);
    return NextResponse.json({ comments: [] });
  }

  return NextResponse.json({ comments: comments ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: { slug?: string; parent_id?: string; author_name?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  if (!body.slug || typeof body.slug !== "string") {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }
  if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }
  if (body.content.length > 5000) {
    return NextResponse.json({ error: "Content too long (max 5000 chars)." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: link } = await service
    .from("links")
    .select("id, allow_comments, comments_registered_only")
    .eq("slug", body.slug)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  if (!link.allow_comments) {
    return NextResponse.json({ error: "Comments are disabled for this page." }, { status: 403 });
  }

  let author: string;
  if (link.comments_registered_only) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "You must be signed in to comment." }, { status: 401 });
    }
    const local = (user.email ?? "anonymous").split("@")[0].slice(0, 58);
    author = "@" + local;
  } else {
    author = (body.author_name ?? "").trim().slice(0, 60) || "anonymous";
  }

  if (body.parent_id) {
    const { data: parent } = await service
      .from("comments")
      .select("id")
      .eq("id", body.parent_id)
      .maybeSingle();
    if (!parent) {
      return NextResponse.json({ error: "Parent comment not found." }, { status: 404 });
    }
  }

  const { data: inserted, error } = await service
    .from("comments")
    .insert({
      link_id: link.id,
      parent_id: body.parent_id || null,
      author_name: author,
      content: body.content.trim(),
    })
    .select("id, parent_id, author_name, content, created_at")
    .single();

  if (error) {
    console.warn("[comments] insert failed:", error.message);
    return NextResponse.json({ error: "Could not post comment." }, { status: 500 });
  }

  return NextResponse.json({ comment: inserted }, { status: 201 });
}
