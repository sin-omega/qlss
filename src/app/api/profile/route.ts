import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import {
  normalizeUsername,
  isValidUsername,
  isReservedUsername,
} from "@/lib/username";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/profile
 *   Returns the current user's profile, or `{ profile: null }` if they
 *   haven't picked a username yet.
 *
 * POST /api/profile  { username }
 *   Creates (or replaces) the current user's profile with the given
 *   username. Validates format + uniqueness, then inserts via the
 *   service role client so the unique constraint violation returns a
 *   clean 409 instead of an opaque RLS error.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Not signed in.");

  const { data } = await supabase
    .from("profiles")
    .select("id, username, description, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ profile: data });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Not signed in.");

  // Parse + validate body.
  let body: { username?: string; description?: string };
  try {
    body = (await request.json()) as { username?: string; description?: string };
  } catch {
    return jsonError(400, "Send a JSON body.");
  }

  const update: Record<string, unknown> = {};

  // Optional: username update.
  if (body.username !== undefined) {
    const username = normalizeUsername(body.username);
    if (!username) {
      return jsonError(400, "Username is required.");
    }
    if (!isValidUsername(username)) {
      return jsonError(
        400,
        "Username must be 3–20 chars, start with a letter, and only contain lowercase letters, numbers, underscores, or hyphens.",
      );
    }
    if (isReservedUsername(username)) {
      return jsonError(400, "That username is reserved. Try another.");
    }
    update.username = username;
  }

  // Optional: description update (bio).
  if (body.description !== undefined) {
    const description = (body.description ?? "").trim();
    if (description.length > 500) {
      return jsonError(400, "Description must be 500 chars or fewer.");
    }
    update.description = description || null;
  }

  if (Object.keys(update).length === 0) {
    return jsonError(400, "Nothing to update.");
  }

  // Use the service role client for the insert so the unique constraint
  // violation returns a clean 409 (RLS error messages are opaque).
  const serviceClient = createServiceClient();

  // If updating username, check uniqueness up front.
  if (update.username !== undefined) {
    const { data: existing } = await serviceClient
      .from("profiles")
      .select("id")
      .ilike("username", update.username as string)
      .maybeSingle();
    if (existing && existing.id !== user.id) {
      return jsonError(409, "That username is already taken. Try another.");
    }
  }

  // Upsert the profile (insert or update if it already exists for this user).
  const { data, error } = await serviceClient
    .from("profiles")
    .upsert(
      { id: user.id, ...update },
      { onConflict: "id" },
    )
    .select("id, username, description, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(409, "That username is already taken. Try another.");
    }
    console.warn("[profile] upsert failed:", error.message);
    return jsonError(500, "Could not save profile. Try again.");
  }

  return NextResponse.json({ profile: data });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
