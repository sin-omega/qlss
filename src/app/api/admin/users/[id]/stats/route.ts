import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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

  // Fetch all links for the user with click counts
  const { data: links } = await service
    .from("links")
    .select("id, slug, destination_url, created_at, title, description")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  const allLinks = links ?? [];
  const linkIds = allLinks.map((l) => l.id);

  // Build click counts per link
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

  const enriched = allLinks.map((l) => ({
    ...l,
    clicks: countsByLink[l.id] ?? 0,
  }));

  // Fetch analytics rows for those links
  let analytics: Record<string, unknown>[] = [];
  if (linkIds.length > 0) {
    const { data: analyticsRows } = await service
      .from("analytics")
      .select("link_id, country, region, browser_name, device_type, clicked_at, is_bot")
      .in("link_id", linkIds)
      .order("clicked_at", { ascending: false })
      .limit(5000);

    analytics = (analyticsRows ?? []).map((row) => row as Record<string, unknown>);
  }

  return NextResponse.json({ links: enriched, analytics });
}