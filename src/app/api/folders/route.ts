import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/folders
 *   Returns the signed-in user's folders.
 *
 * POST /api/folders  { name, profile_page?: boolean }
 *   Creates a new folder for the signed-in user.
 *   If profile_page is true, clears any existing profile_page folder first.
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

  const { data, error } = await supabase
    .from("folders")
    .select("id, name, created_at, profile_page")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    // If profile_page column doesn't exist yet, fall back gracefully.
    if (error.message.includes("profile_page")) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("folders")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (fallbackError) {
        console.warn("[folders] list failed:", fallbackError.message);
        return jsonError(500, "Could not load folders.");
      }

      return NextResponse.json({
        folders: (fallbackData ?? []).map((f) => ({ ...f, profile_page: false })),
      });
    }

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

  const wantProfilePage = body.profile_page === true;

  // If creating a profile_page folder, clear any existing one first.
  if (wantProfilePage) {
    const serviceClient = createServiceClient();
    await serviceClient
      .from("folders")
      .update({ profile_page: false })
      .eq("user_id", user.id)
      .eq("profile_page", true);
  }

  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: user.id, name, profile_page: wantProfilePage })
    .select("id, name, created_at, profile_page")
    .single();

  if (error) {
    // If profile_page column doesn't exist, retry without it.
    if (error.message.includes("profile_page")) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("folders")
        .insert({ user_id: user.id, name })
        .select("id, name, created_at")
        .single();

      if (fallbackError) {
        if (fallbackError.code === "23505") {
          return jsonError(409, "You already have a folder with that name.");
        }
        console.warn("[folders] create failed:", fallbackError.message);
        return jsonError(500, "Could not create folder.");
      }

      return NextResponse.json({
        folder: { ...fallbackData, profile_page: false },
      });
    }

    // 23505 = unique_violation (user already has a folder with this name)
    if (error.code === "23505") {
      return jsonError(409, "You already have a folder with that name.");
    }
    console.warn("[folders] create failed:", error.message);
    return jsonError(500, "Could not create folder.");
  }

  return NextResponse.json({ folder: data });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
