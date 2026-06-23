import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { apiSupabaseGuard } from "@/lib/supabase/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
  const { data: profile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  let body: { action: string };
  try {
    body = (await request.json()) as { action: string };
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with `action`." },
      { status: 400 },
    );
  }

  if (body.action === "review") {
    const { error } = await service
      .from("abuse_reports")
      .update({
        reviewed: true,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", id);

    if (error) {
      console.warn("[admin] review failed:", error.message);
      return NextResponse.json(
        { error: "Failed to mark as reviewed." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'review'." },
    { status: 400 },
  );
}
