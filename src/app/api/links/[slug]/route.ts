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

  const { error } = await supabase.from("links").delete().eq("id", link.id);
  if (error) {
    console.warn("[links] delete failed:", error.message);
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
  };
  try {
    body = (await request.json()) as {
      title?: string | null;
      description?: string | null;
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
    if (title.length > 140) {
      return jsonError(400, "Title must be 140 chars or fewer.");
    }
    update.title = title || null;
  }
  if (body.description !== undefined) {
    const description = (body.description ?? "").trim();
    if (description.length > 500) {
      return jsonError(400, "Description must be 500 chars or fewer.");
    }
    update.description = description || null;
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
