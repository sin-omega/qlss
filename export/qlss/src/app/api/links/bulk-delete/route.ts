import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BulkDeleteBody {
  slugs?: string[];
}

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

  const { error } = await supabase
    .from("links")
    .delete()
    .in("slug", slugs)
    .eq("user_id", user.id);

  if (error) {
    console.warn("[bulk-delete] failed:", error.message);
    return jsonError(500, "Could not delete links. Try again.");
  }

  return NextResponse.json({ deleted: slugs.length });
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
