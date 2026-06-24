import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeSlug, isReservedSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  if (isReservedSlug(slug)) {
    return jsonError(404, "Link not found.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Sign in to delete a link.");

  const { data: link } = await supabase
    .from("links")
    .select("id, user_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) return jsonError(404, "Link not found.");
  if (link.user_id !== user.id) return jsonError(403, "Not your link.");

  const { error } = await supabase.from("links").update({ deleted: true }).eq("id", link.id);
  if (error) {
    console.warn("[links] soft-delete failed:", error.message);
    return jsonError(500, "Could not delete the link. Try again.");
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  if (isReservedSlug(slug)) {
    return jsonError(404, "Link not found.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Sign in to update a link.");

  let body: {
    title?: string | null;
    description?: string | null;
    markdown_content?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    og_image?: string | null;
    pincode?: string | null;
    expires_at?: string | null;
    max_uses?: number | null;
    allow_comments?: boolean;
    comments_registered_only?: boolean;
  };
  try {
    body = (await request.json()) as {
      title?: string | null;
      description?: string | null;
      markdown_content?: string | null;
      og_title?: string | null;
      og_description?: string | null;
      og_image?: string | null;
      pincode?: string | null;
      expires_at?: string | null;
      max_uses?: number | null;
      allow_comments?: boolean;
      comments_registered_only?: boolean;
    };
  } catch {
    return jsonError(400, "Send a JSON body.");
  }

  const { data: link } = await supabase
    .from("links")
    .select("id, user_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) return jsonError(404, "Link not found.");
  if (link.user_id !== user.id) return jsonError(403, "Not your link.");

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = (body.title ?? "").trim();
    if (title.length > 140) return jsonError(400, "Title must be 140 chars or fewer.");
    update.title = title || null;
  }
  if (body.description !== undefined) {
    const description = (body.description ?? "").trim();
    if (description.length > 500) return jsonError(400, "Description must be 500 chars or fewer.");
    update.description = description || null;
  }
  if (body.markdown_content !== undefined) {
    const md = (body.markdown_content ?? "");
    if (md.length > 100_000) return jsonError(400, "markdown_content too long.");
    update.markdown_content = md;
  }
  if (body.og_title !== undefined) update.og_title = (body.og_title ?? "").trim().slice(0, 140) || null;
  if (body.og_description !== undefined) update.og_description = (body.og_description ?? "").trim().slice(0, 500) || null;
  if (body.og_image !== undefined) update.og_image = (body.og_image ?? "").trim().slice(0, 2000) || null;
  if (body.pincode !== undefined) update.pincode = (body.pincode ?? "").trim().slice(0, 32) || null;
  if (body.expires_at !== undefined) {
    const ea = body.expires_at;
    if (ea === null || ea === "") update.expires_at = null;
    else {
      const d = new Date(ea);
      if (Number.isNaN(d.getTime())) return jsonError(400, "Invalid expires_at.");
      update.expires_at = d.toISOString();
    }
  }
  if (body.max_uses !== undefined) {
    const mu = body.max_uses;
    if (mu === null) update.max_uses = null;
    else if (typeof mu === "number" && Number.isInteger(mu) && mu > 0) update.max_uses = mu;
    else return jsonError(400, "max_uses must be a positive integer or null.");
  }
  if (body.allow_comments !== undefined) {
    update.allow_comments = body.allow_comments === true;
  }
  if (body.comments_registered_only !== undefined) {
    update.comments_registered_only = body.comments_registered_only === true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("links")
    .update(update)
    .eq("id", link.id);

  if (error) {
    console.warn("[links] update failed:", error.message);
    return jsonError(500, "Could not update the link. Try again.");
  }

  return NextResponse.json({ ok: true });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
