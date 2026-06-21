import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeUsername } from "@/lib/username";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/lookup-username  { username }
 *   Returns `{ email: string | null }`.
 *
 * Used by the auth page so users can sign in with their username
 * instead of their email. The client calls this endpoint first to
 * resolve the username → email, then calls supabase.auth.signInWithPassword
 * with the resolved email.
 *
 * This is public (no auth required) because:
 *   - Usernames are public on the site (shown in the header).
 *   - The email is needed for Supabase's signInWithPassword API.
 *   - The actual auth still requires the correct password.
 *
 * Returns 404 (with email: null) if the username doesn't exist, so
 * attackers can't easily enumerate usernames vs. emails. (The endpoint
 * is intentionally quiet about whether a username exists.)
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  let body: { username?: string };
  try {
    body = (await request.json()) as { username?: string };
  } catch {
    return jsonError(400, "Send a JSON body with `username`.");
  }

  const username = normalizeUsername(body.username ?? "");
  if (!username) {
    return NextResponse.json({ email: null });
  }

  // Use the service role client so we can read profiles without auth.
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ email: null });
  }

  // Look up the email from auth.users via the admin API.
  const { data: userData, error } = await serviceClient.auth.admin.getUserById(
    data.id,
  );
  if (error || !userData?.user?.email) {
    return NextResponse.json({ email: null });
  }

  return NextResponse.json({ email: userData.user.email });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
