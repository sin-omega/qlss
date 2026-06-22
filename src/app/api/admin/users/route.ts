import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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

  // Fetch all profiles
  const { data: profiles } = await service
    .from("profiles")
    .select("id, is_admin, banned, banned_at, banned_reason, created_at")
    .order("created_at", { ascending: false });

  // Fetch all auth users to get emails using admin API
  const emailMap = new Map<string, string>();
  try {
    const { data: listedUsers } = await service.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listedUsers?.users) {
      for (const u of listedUsers.users) {
        emailMap.set(u.id, u.email ?? "");
      }
    }
  } catch {
    // Admin API may not be available; proceed without emails
  }

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    email: emailMap.get(p.id) ?? "",
    is_admin: p.is_admin ?? false,
    banned: p.banned ?? false,
    banned_at: p.banned_at,
    banned_reason: p.banned_reason,
    created_at: p.created_at,
  }));

  return NextResponse.json({ users });
}