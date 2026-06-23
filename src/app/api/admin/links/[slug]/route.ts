import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { apiSupabaseGuard } from "@/lib/supabase/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const _guard = apiSupabaseGuard();
  if (_guard) return _guard;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: adminProfile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { slug } = await params;

  // Fetch the link ID first
  const { data: link } = await service
    .from("links")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  // Delete analytics for this link
  await service.from("analytics").delete().eq("link_id", link.id);

  // Delete the link
  const { error } = await service.from("links").delete().eq("slug", slug);

  if (error) {
    console.warn("[admin] delete link failed:", error.message);
    return NextResponse.json({ error: "Failed to delete link." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
