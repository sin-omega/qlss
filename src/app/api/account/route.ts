import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/account
 *   Permanently deletes the signed-in user's account:
 *     1. Delete all their links (analytics rows cascade automatically).
 *     2. Delete their profile row.
 *     3. Delete the auth user via the admin API (requires service role).
 *
 *   After the response, the client signs out locally and redirects to /.
 */
export async function DELETE(_request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Not signed in.");

  const serviceClient = createServiceClient();

  // 1. Delete the user's links. Analytics rows cascade via ON DELETE CASCADE
  //    on the analytics.link_id foreign key.
  const { error: linksError } = await serviceClient
    .from("links")
    .delete()
    .eq("user_id", user.id);
  if (linksError) {
    console.warn("[account] delete links failed:", linksError.message);
    // Continue anyway — we still want to delete the auth user.
  }

  // 2. Delete the user's profile row.
  const { error: profileError } = await serviceClient
    .from("profiles")
    .delete()
    .eq("id", user.id);
  if (profileError) {
    console.warn("[account] delete profile failed:", profileError.message);
  }

  // 3. Delete the auth user. This is the irreversible step.
  const { error: userError } = await serviceClient.auth.admin.deleteUser(
    user.id,
  );
  if (userError) {
    console.warn("[account] delete auth user failed:", userError.message);
    return jsonError(500, "Could not delete the auth user. Try again.");
  }

  return NextResponse.json({ ok: true });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
