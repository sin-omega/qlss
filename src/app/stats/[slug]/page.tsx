import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import { normalizeSlug, isReservedSlug } from "@/lib/slug";
import { AnalyticsFeed } from "@/components/qlss/analytics-feed";
import { StatsCharts } from "@/components/qlss/stats-charts";
import { DeleteLinkButton } from "@/components/qlss/delete-link-button";
import { CollapsibleSection } from "@/components/qlss/collapsible-section";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  user_id: string | null;
}

interface AnalyticsRow {
  id: string;
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
  clicked_at: string;
}

export default async function StatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  // Normalize: lowercase + trim. Reserved slugs are never short links.
  const slug = normalizeSlug(rawSlug);
  if (isReservedSlug(slug)) {
    notFound();
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="cli-grid relative min-h-screen w-full flex flex-col">
        <section className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center max-w-md">
            <h1 className="text-lg font-bold tracking-tight">Almost ready.</h1>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Add Supabase env vars to see analytics.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: linkRow } = await supabase
    .from("links")
    .select("id, slug, destination_url, created_at, user_id")
    .eq("slug", slug)
    .maybeSingle();

  const link = linkRow as LinkRow | null;
  if (!link) notFound();
  if (link && link.user_id !== user.id) notFound();

  // Fetch the analytics rows for this link, newest first. We fetch up to
  // 200 so the charts have enough data to be meaningful, while the log
  // below shows the most recent 100.
  const { data: analyticsRows } = await supabase
    .from("analytics")
    .select(
      "id, ip_address, asn, country, region, city, latitude, longitude, timezone, user_agent, browser_name, browser_version, os_name, os_version, device_type, is_bot, referer, language, clicked_at",
    )
    .eq("link_id", link.id)
    .order("clicked_at", { ascending: false })
    .limit(200);

  const rows = (analyticsRows ?? []) as AnalyticsRow[];
  const logRows = rows.slice(0, 100);
  const shortUrl = `${siteOrigin()}/${link.slug}`;

  return (
    // Note: stats page is NOT scrollless. The whole page scrolls
    // naturally so the user can see all the charts and the full
    // analytics log without fighting an inner scroll container.
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <section className="pt-10 pb-4 px-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/links"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3 w-3" />
              back
            </Link>
            <DeleteLinkButton slug={link.slug} />
          </div>

          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2 mt-3">
            /{link.slug}
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground break-all">
            -&gt; {link.destination_url}
          </p>
        </div>
      </section>

      {/* Stats summary — collapsible */}
      <section className="px-6 pb-3">
        <div className="mx-auto max-w-2xl">
          <CollapsibleSection
            title="summary"
            accentColor="#0c0c0a"
            summary={`${rows.length} clicks`}
          >
            <div className="grid grid-cols-3 gap-4 pt-3">
              <Stat label="total" value={rows.length} />
              <Stat label="real" value={rows.filter((r) => !r.is_bot).length} />
              <Stat label="bots" value={rows.filter((r) => r.is_bot).length} />
            </div>
          </CollapsibleSection>
        </div>
      </section>

      {/* Charts — collapsible */}
      {rows.length > 0 && (
        <section className="px-6 pb-3">
          <div className="mx-auto max-w-2xl">
            <CollapsibleSection
              title="charts"
              accentColor="#b08a3e"
              summary="14 days"
            >
              <div className="pt-3">
                <StatsCharts rows={rows} />
              </div>
            </CollapsibleSection>
          </div>
        </section>
      )}

      {/* Analytics log — collapsible */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-2xl">
          <CollapsibleSection
            title="recent visitors"
            accentColor="#2c6e49"
            summary={`latest ${logRows.length}`}
          >
            <div className="pt-3">
              {logRows.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  no clicks yet — share your link to start seeing visitors
                </p>
              ) : (
                <AnalyticsFeed rows={logRows} />
              )}
            </div>
          </CollapsibleSection>
        </div>
      </section>
    </main>
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
