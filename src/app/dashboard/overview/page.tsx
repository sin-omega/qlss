import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/env";
import { CollapsibleSection } from "@/components/qlss/collapsible-section";
import { OverviewCharts } from "@/components/qlss/overview-charts";
import { TopLinksList } from "@/components/qlss/top-links-list";

export const dynamic = "force-dynamic";

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
}

interface AnalyticsRow {
  id: string;
  link_id: string;
  ip_address: string | null;
  country: string | null;
  region: string | null;
  browser_name: string | null;
  device_type: string | null;
  is_bot: boolean;
  referer: string | null;
  clicked_at: string;
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch all the user's links.
  const { data: linksData } = await supabase
    .from("links")
    .select("id, slug, destination_url, created_at")
    .order("created_at", { ascending: false });

  const links = (linksData ?? []) as LinkRow[];
  const linkIds = links.map((l) => l.id);

  // Fetch all analytics rows for those links (capped at 500 to keep it snappy).
  let analytics: AnalyticsRow[] = [];
  if (linkIds.length > 0) {
    const { data: aData } = await supabase
      .from("analytics")
      .select(
        "id, link_id, ip_address, country, region, browser_name, device_type, is_bot, referer, clicked_at",
      )
      .in("link_id", linkIds)
      .order("clicked_at", { ascending: false })
      .limit(500);
    analytics = (aData ?? []) as AnalyticsRow[];
  }

  // Per-link click counts.
  const countsByLink: Record<string, number> = {};
  for (const a of analytics) {
    countsByLink[a.link_id] = (countsByLink[a.link_id] ?? 0) + 1;
  }

  const totalClicks = analytics.length;
  const realVisitors = analytics.filter((a) => !a.is_bot).length;
  const bots = analytics.filter((a) => a.is_bot).length;

  // Top 5 links by clicks.
  const topLinks = links
    .map((l) => ({ ...l, clicks: countsByLink[l.id] ?? 0 }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  return (
    <section className="px-6 py-10 md:py-12">
      <div className="mx-auto max-w-2xl space-y-3">
        <div className="mb-6">
          <h1 className="text-lg font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Aggregate stats across all your {links.length} link
            {links.length === 1 ? "" : "s"}.
          </p>
        </div>

        {/* Summary */}
        <CollapsibleSection
          title="summary"
          accentColor="#0c0c0a"
          summary={`${totalClicks} clicks`}
        >
          <div className="grid grid-cols-3 gap-4 pt-3">
            <Stat label="total clicks" value={totalClicks} />
            <Stat label="real visitors" value={realVisitors} />
            <Stat label="bots" value={bots} />
          </div>
        </CollapsibleSection>

        {/* Charts */}
        {analytics.length > 0 && (
          <CollapsibleSection
            title="charts"
            accentColor="#b08a3e"
            summary="14 days"
          >
            <div className="pt-3">
              <OverviewCharts rows={analytics} />
            </div>
          </CollapsibleSection>
        )}

        {/* Top links */}
        {topLinks.length > 0 && (
          <CollapsibleSection
            title="top links"
            accentColor="#2c6e49"
            summary={`top ${topLinks.length}`}
          >
            <div className="pt-3">
              <TopLinksList links={topLinks} origin={siteOrigin()} />
            </div>
          </CollapsibleSection>
        )}

        {links.length === 0 && (
          <div className="border border-border bg-card py-12 text-center">
            <p className="text-sm text-muted-foreground">No links yet.</p>
            <a
              href="/dashboard/shortener"
              className="text-xs text-foreground underline hover:opacity-70 mt-2 inline-block"
            >
              create your first one
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
