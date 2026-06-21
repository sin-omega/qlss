import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/folders/[id]  { name }
 *   Renames a folder.
 *
 * DELETE /api/folders/[id]
 *   Deletes a folder. Links in the folder get folder_id set to NULL
 *   (ON DELETE SET NULL on the foreign key).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Not signed in.");

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return jsonError(400, "Send a JSON body with `name`.");
  }

  const name = (body.name ?? "").trim();
  if (!name) return jsonError(400, "Folder name is required.");
  if (name.length > 32) {
    return jsonError(400, "Folder name must be 32 chars or fewer.");
  }

  const { data, error } = await supabase
    .from("folders")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, created_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return jsonError(409, "You already have a folder with that name.");
    }
    console.warn("[folders] rename failed:", error.message);
    return jsonError(500, "Could not rename folder.");
  }

  if (!data) return jsonError(404, "Folder not found.");
  return NextResponse.json({ folder: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return jsonError(503, "Supabase is not configured.");
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "Not signed in.");

  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.warn("[folders] delete failed:", error.message);
    return jsonError(500, "Could not delete folder.");
  }

  return NextResponse.json({ ok: true });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
