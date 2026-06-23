import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { apiSupabaseGuard } from "@/lib/supabase/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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

  // Fetch all links
  const { data: links } = await service
    .from("links")
    .select("id, slug, destination_url, created_at, title, description, user_id")
    .order("created_at", { ascending: false })
    .limit(500);

  // Fetch click counts
  const allLinks = links ?? [];
  const linkIds = allLinks.map((l) => l.id);
  let countsByLink: Record<string, number> = {};

  if (linkIds.length > 0) {
    const { data: counts } = await service
      .from("analytics")
      .select("link_id")
      .in("link_id", linkIds);

    countsByLink = (counts ?? []).reduce<Record<string, number>>(
      (acc, row) => {
        const r = row as { link_id: string };
        acc[r.link_id] = (acc[r.link_id] ?? 0) + 1;
        return acc;
      },
      {},
    );
  }

  // Build email map from profiles' user_id for display
  const ownerIds = [...new Set(allLinks.map((l) => l.user_id).filter(Boolean))];
  const emailMap = new Map<string, string>();
  if (ownerIds.length > 0) {
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
      // ignore
    }
  }

  const enriched = allLinks.map((l) => ({
    ...l,
    clicks: countsByLink[l.id] ?? 0,
    owner_email: l.user_id ? emailMap.get(l.user_id) ?? "" : "",
  }));

  return NextResponse.json({ links: enriched });
}
