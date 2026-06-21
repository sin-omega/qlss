import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BulkDeleteBody {
  slugs?: string[];
}

/**
 * POST /api/links/bulk-delete  { slugs: string[] }
 *   Deletes multiple links owned by the signed-in user. Each link's
 *   analytics rows cascade automatically (ON DELETE CASCADE on
 *   analytics.link_id).
 *
 *   - Must be signed in.
 *   - Only the signed-in user's links are deleted (RLS enforces this;
 *     we also filter explicitly by user_id so slugs belonging to other
 *     users are silently skipped — never a 403 leak).
 *
 *   Returns `{ deleted: <count> }`.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Sign in to delete links.");

  let body: BulkDeleteBody;
  try {
    body = (await request.json()) as BulkDeleteBody;
  } catch {
    return jsonError(400, "Send a JSON body with `slugs`.");
  }

  const slugs = (body.slugs ?? [])
    .map((s) => s.trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  // Delete all links matching the given slugs AND owned by this user.
  // RLS would block the delete anyway, but the explicit user_id filter
  // means we can't accidentally delete someone else's link that happens
  // to share a slug (shouldn't be possible due to the unique constraint,
  // but defense in depth).
  const { error } = await supabase
    .from("links")
    .delete()
    .in("slug", slugs)
    .eq("user_id", user.id);

  if (error) {
    console.warn("[bulk-delete] failed:", error.message);
    return jsonError(500, "Could not delete links. Try again.");
  }

  // We don't get an exact count back from Supabase's delete without
  // `count: 'exact'`, but the client doesn't need it — it refreshes
  // the list and sees what's left.
  return NextResponse.json({ deleted: slugs.length });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
