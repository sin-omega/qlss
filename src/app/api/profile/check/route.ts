import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeUsername,
  isValidUsername,
  isReservedUsername,
} from "@/lib/username";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/profile/check?username=foo
 *   Returns `{ available: boolean, reason?: string }`.
 *
 * Used by the profile setup page to give real-time feedback as the
 * user types their desired username.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const { searchParams } = new URL(request.url);
  const rawUsername = searchParams.get("username") ?? "";
  const username = normalizeUsername(rawUsername);

  if (!username) {
    return NextResponse.json({ available: false, reason: "empty" });
  }
  if (!isValidUsername(username)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }
  if (isReservedUsername(username)) {
    return NextResponse.json({ available: false, reason: "reserved" });
  }

  // Check if the username is taken by anyone OTHER than the current user
  // (so the current user can "re-pick" their own username).
  const serviceClient = createServiceClient();
  let currentUserId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  } catch {
    // Not signed in — fine, just check globally.
  }

  const { data: existing } = await serviceClient
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  const takenBySomeoneElse = existing && existing.id !== currentUserId;
  return NextResponse.json({
    available: !takenBySomeoneElse,
    reason: takenBySomeoneElse ? "taken" : null,
  });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
