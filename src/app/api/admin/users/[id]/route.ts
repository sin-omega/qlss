import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  let body: { action: string; reason?: string };
  try {
    body = (await request.json()) as { action: string; reason?: string };
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with `action`." },
      { status: 400 },
    );
  }

  // Don't allow banning yourself
  if (id === user.id) {
    return NextResponse.json(
      { error: "Cannot modify your own account." },
      { status: 400 },
    );
  }

  // Check if target is also an admin
  const { data: targetProfile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", id)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (targetProfile.is_admin) {
    return NextResponse.json(
      { error: "Cannot ban another admin." },
      { status: 400 },
    );
  }

  if (body.action === "ban") {
    const reason = (body.reason ?? "").trim().slice(0, 500) || null;
    const { error } = await service
      .from("profiles")
      .update({
        banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: reason,
      })
      .eq("id", id);

    if (error) {
      console.warn("[admin] ban failed:", error.message);
      return NextResponse.json(
        { error: "Failed to ban user." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "unban") {
    const { error } = await service
      .from("profiles")
      .update({
        banned: false,
        banned_at: null,
        banned_reason: null,
      })
      .eq("id", id);

    if (error) {
      console.warn("[admin] unban failed:", error.message);
      return NextResponse.json(
        { error: "Failed to unban user." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'ban' or 'unban'." },
    { status: 400 },
  );
}