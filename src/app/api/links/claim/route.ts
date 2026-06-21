import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeSlug, isReservedSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ClaimBody {
  slugs?: string[];
}

/**
 * POST /api/links/claim  { slugs: string[] }
 *
 * Called by the dashboard layout when a newly-signed-in user has
 * anonymous link slugs stored in localStorage (from creating links
 * while signed out). Claims each one by setting `user_id` to the
 * current user's ID — but ONLY if the link is currently unclaimed
 * (user_id IS NULL), so we can't steal another user's link.
 *
 * Returns `{ claimed: <count> }`.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Not signed in.");

  let body: ClaimBody;
  try {
    body = (await request.json()) as ClaimBody;
  } catch {
    return jsonError(400, "Send a JSON body with `slugs`.");
  }

  const slugs = (body.slugs ?? [])
    .map((s) => normalizeSlug(s))
    .filter((s) => s && !isReservedSlug(s));

  if (slugs.length === 0) {
    return NextResponse.json({ claimed: 0 });
  }

  // Use the service role client to bypass RLS — anonymous links have
  // user_id = NULL, so the regular client (which filters by auth.uid())
  // can't see them.
  const serviceClient = createServiceClient();

  // Find all the requested slugs that are currently unclaimed.
  const { data: unclaimed, error: findError } = await serviceClient
    .from("links")
    .select("id, slug")
    .in("slug", slugs)
    .is("user_id", null);

  if (findError) {
    console.warn("[claim] find failed:", findError.message);
    return jsonError(500, "Could not claim links. Try again.");
  }

  if (!unclaimed || unclaimed.length === 0) {
    return NextResponse.json({ claimed: 0 });
  }

  // Claim each one by setting user_id.
  const ids = unclaimed.map((r) => r.id);
  const { error: updateError } = await serviceClient
    .from("links")
    .update({ user_id: user.id })
    .in("id", ids)
    .is("user_id", null); // extra safety: only update if still unclaimed

  if (updateError) {
    console.warn("[claim] update failed:", updateError.message);
    return jsonError(500, "Could not claim links. Try again.");
  }

  return NextResponse.json({ claimed: ids.length });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
