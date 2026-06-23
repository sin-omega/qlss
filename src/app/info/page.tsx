import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { SiteHeader } from "@/components/qlss/site-header";
import { SiteFooter } from "@/components/qlss/site-footer";
import { FaqSection } from "@/components/qlss/faq-section";
import { FullStats } from "@/components/qlss/full-stats";
import { ScrollToTop } from "@/components/qlss/scroll-to-top";
import { InfoPageHeader } from "@/components/qlss/info-page-header";

export const dynamic = "force-dynamic";

/**
 * /info — FAQ + full statistics page. Keeps the home page minimal.
 */
export default async function InfoPage() {
  let stats: { links: number; clicks: number; markdownPages: number; accounts: number } = {
    links: 0,
    clicks: 0,
    markdownPages: 0,
    accounts: 0,
  };

  if (isSupabaseConfigured()) {
    try {
      const service = createServiceClient();
      const [linksRes, linksForClicksRes, mdRes, accountsRes] = await Promise.allSettled([
        service.from("links").select("*", { count: "exact", head: true }),
        service.from("links").select("use_count"),
        service
          .from("links")
          .select("*", { count: "exact", head: true })
          .eq("link_type", "markdown"),
        service.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      stats = {
        links:
          linksRes.status === "fulfilled" ? (linksRes.value.count ?? 0) : 0,
        clicks:
          linksForClicksRes.status === "fulfilled"
            ? (linksForClicksRes.value.data ?? []).reduce(
                (sum, r: { use_count: number | null }) =>
                  sum + (r.use_count ?? 0),
                0,
              )
            : 0,
        markdownPages:
          mdRes.status === "fulfilled" ? (mdRes.value.count ?? 0) : 0,
        accounts:
          accountsRes.status === "fulfilled" ? (accountsRes.value.count ?? 0) : 0,
      };
    } catch {
      // keep zeros
    }
  }

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <div className="hero-mesh pointer-events-none absolute inset-x-0 top-0 h-[20vh] overflow-hidden opacity-40" aria-hidden="true" />
      <SiteHeader signedIn={false} backHref="/" backLabel="home" />
      <div className="header-accent-line" />

      <section className="relative flex-1 px-4 sm:px-6 pt-8 sm:pt-12 pb-12">
        <div className="w-full max-w-2xl mx-auto animate-page-enter">
          {/* Page title */}
          <InfoPageHeader />

          {/* Full statistics */}
          <FullStats
            links={stats.links}
            clicks={stats.clicks}
            markdownPages={stats.markdownPages}
            accounts={stats.accounts}
          />

          {/* FAQ */}
          <div className="mt-12 sm:mt-16">
            <FaqSection />
          </div>
        </div>
      </section>

      <SiteFooter />
      <ScrollToTop />
    </main>
  );
}
