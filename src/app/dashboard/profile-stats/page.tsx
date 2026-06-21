import { createClient } from "@/lib/supabase/server";
import { CollapsibleSection } from "@/components/qlss/collapsible-section";
import { ProfileStatsCharts } from "@/components/qlss/profile-stats-charts";
import { ProfileStatsFeed } from "@/components/qlss/profile-stats-feed";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ProfileViewRow {
  id: string;
  profile_id: string;
  ip_address: string | null;
  asn: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  user_agent: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_type: string | null;
  is_bot: boolean;
  referer: string | null;
  language: string | null;
  viewed_at: string;
}

export default async function DashboardProfileStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  // Fetch profile views (up to 500)
  const { data: viewsData } = await supabase
    .from("profile_views")
    .select("*")
    .eq("profile_id", profile.id)
    .order("viewed_at", { ascending: false })
    .limit(500);

  const rows = (viewsData ?? []) as ProfileViewRow[];
  const logRows = rows.slice(0, 200);

  const totalViews = rows.length;
  const realVisitors = rows.filter((r) => !r.is_bot).length;
  const bots = rows.filter((r) => r.is_bot).length;

  // Unique IPs
  const uniqueIps = new Set(rows.map((r) => r.ip_address).filter(Boolean)).size;

  // Calculate average daily views (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentViews = rows.filter(
    (r) => new Date(r.viewed_at) >= thirtyDaysAgo
  );
  const avgDailyViews = recentViews.length > 0
    ? (recentViews.length / 30).toFixed(1)
    : "0";

  // Top referrers
  const referrerCounts = new Map<string, number>();
  for (const r of rows) {
    const ref = r.referer || "direct";
    const display = ref === "direct" ? "direct" : (() => {
      try { return new URL(ref).host; } catch { return ref; }
    })();
    referrerCounts.set(display, (referrerCounts.get(display) ?? 0) + 1);
  }
  const topReferrers = Array.from(referrerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Unique countries
  const uniqueCountries = new Set(rows.map((r) => r.country).filter(Boolean)).size;

  // Peak hour
  const hourCounts = new Array(24).fill(0) as number[];
  for (const r of rows) {
    const hour = new Date(r.viewed_at).getHours();
    hourCounts[hour]++;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  return (
    <section className="px-6 py-10 md:py-12">
      <div className="mx-auto max-w-2xl space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/profile"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3 w-3" />
            back
          </Link>
          <a
            href={`/@${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-3">
          <h1 className="text-lg font-bold tracking-tight">
            /@{profile.username}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            profile page analytics
          </p>
        </div>

        {/* Summary grid */}
        <CollapsibleSection
          title="summary"
          accentColor="#0c0c0a"
          summary={`${totalViews} views`}
        >
          <div className="grid grid-cols-3 gap-4 pt-3">
            <Stat label="total views" value={totalViews} />
            <Stat label="real visitors" value={realVisitors} />
            <Stat label="bots" value={bots} />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <Stat label="unique IPs" value={uniqueIps} />
            <Stat label="avg / day (30d)" value={avgDailyViews} />
            <Stat label="peak hour" value={`${peakHour}:00`} />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Stat label="countries" value={uniqueCountries} />
            <Stat label="total referrers" value={topReferrers.length} />
          </div>
        </CollapsibleSection>

        {/* Charts */}
        {rows.length > 0 && (
          <CollapsibleSection
            title="charts"
            accentColor="#b08a3e"
            summary="14 days"
          >
            <div className="pt-3">
              <ProfileStatsCharts rows={rows} />
            </div>
          </CollapsibleSection>
        )}

        {/* Top referrers */}
        {topReferrers.length > 0 && (
          <CollapsibleSection
            title="top referrers"
            accentColor="#8c4040"
            summary={`top ${topReferrers.length}`}
          >
            <div className="pt-3">
              <div className="border border-border bg-card">
                {topReferrers.map(([source, count], i) => (
                  <div key={source}>
                    <div className="px-4 py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground tabular-nums w-5 text-right shrink-0">
                          {i + 1}.
                        </span>
                        <span className="truncate">{source}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums ml-2 shrink-0">
                        {count}
                      </span>
                    </div>
                    {i < topReferrers.length - 1 && <hr className="hr-dashed border-0" />}
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Recent visitors log */}
        <CollapsibleSection
          title="recent visitors"
          accentColor="#2c6e49"
          summary={`latest ${logRows.length}`}
        >
          <div className="pt-3">
            {logRows.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">
                no views yet — share your profile to start seeing visitors
              </p>
            ) : (
              <ProfileStatsFeed rows={logRows} />
            )}
          </div>
        </CollapsibleSection>

        {rows.length === 0 && (
          <div className="border border-border bg-card py-12 text-center">
            <p className="text-sm text-muted-foreground">No profile views yet.</p>
            <a
              href={`/@${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-foreground underline hover:opacity-70 mt-2 inline-block"
            >
              visit your profile
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
