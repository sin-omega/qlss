import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { apiSupabaseGuard } from "@/lib/supabase/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const _guard = apiSupabaseGuard();
  if (_guard) return _guard;
  const service = createServiceClient();
  const { data } = await service
    .from("site_config")
    .select("value")
    .eq("key", "banner_text")
    .maybeSingle();

  return NextResponse.json({ text: data?.value ?? "" });
}

export async function POST(request: NextRequest) {
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

  let body: { text: string };
  try {
    body = (await request.json()) as { text: string };
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with `text`." },
      { status: 400 },
    );
  }

  const text = (body.text ?? "").trim().slice(0, 500);

  const { error } = await service
    .from("site_config")
    .upsert(
      {
        key: "banner_text",
        value: text,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

  if (error) {
    console.warn("[admin] banner update failed:", error.message);
    return NextResponse.json(
      { error: "Failed to update banner." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
