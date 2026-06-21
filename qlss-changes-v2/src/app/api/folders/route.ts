import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/folders
 *   Returns the signed-in user's folders (including profile_page flag).
 *
 * POST /api/folders  { name, profile_page? }
 *   Creates a new folder. If profile_page=true, clears any existing
 *   profile page folder first (only one allowed per user).
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

  // Try selecting profile_page — if the column doesn't exist (migration not run),
  // fall back gracefully.
  let data: Array<Record<string, unknown>> | null = null;
  let error: { message: string } | null = null;

  try {
    const result = await supabase
      .from("folders")
      .select("id, name, created_at, profile_page")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    data = result.data as Array<Record<string, unknown>> | null;
    error = result.error;
  } catch {
    // ignore
  }

  if (error && error.message.includes("profile_page")) {
    // Column doesn't exist yet — select without it
    const fallback = await supabase
      .from("folders")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    data = fallback.data as Array<Record<string, unknown>> | null;
    error = fallback.error;
  }

  if (error) {
    console.warn("[folders] list failed:", error.message);
    return jsonError(500, "Could not load folders.");
  }

  return NextResponse.json({ folders: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Not signed in.");

  let body: { name?: string; profile_page?: boolean };
  try {
    body = (await request.json()) as { name?: string; profile_page?: boolean };
  } catch {
    return jsonError(400, "Send a JSON body with `name`.");
  }

  const name = (body.name ?? "").trim();
  if (!name) return jsonError(400, "Folder name is required.");
  if (name.length > 32) {
    return jsonError(400, "Folder name must be 32 chars or fewer.");
  }

  const isProfilePage = Boolean(body.profile_page);

  // If creating a profile page folder, clear any existing one first
  if (isProfilePage) {
    await serviceClient
      .from("folders")
      .update({ profile_page: false })
      .eq("user_id", user.id)
      .eq("profile_page", true);
  }

  // Try inserting with profile_page column — fall back if it doesn't exist
  let insertData, insertError;
  try {
    const result = await supabase
      .from("folders")
      .insert({ user_id: user.id, name, profile_page: isProfilePage })
      .select("id, name, created_at, profile_page")
      .single();
    insertData = result.data;
    insertError = result.error;
  } catch {
    // Column might not exist — try without it
    const result = await supabase
      .from("folders")
      .insert({ user_id: user.id, name })
      .select("id, name, created_at")
      .single();
    insertData = result.data;
    insertError = result.error;
  }

  if (insertError) {
    // 23505 = unique_violation (user already has a folder with this name)
    if (insertError.code === "23505") {
      return jsonError(409, "You already have a folder with that name.");
    }
    console.warn("[folders] create failed:", insertError.message);
    return jsonError(500, "Could not create folder.");
  }

  return NextResponse.json({ folder: insertData });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
