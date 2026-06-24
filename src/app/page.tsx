import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { SiteHeader } from "@/components/qlss/site-header";
import { HomeContent } from "@/components/qlss/home-content";
import { SiteFooter } from "@/components/qlss/site-footer";
import { Banner } from "@/components/qlss/banner";
import { StatsCounter } from "@/components/qlss/stats-counter";
import { ErrorBanner } from "@/components/qlss/error-banner";

export default async function HomePage() {
  let signedIn = false;
  let bannerText = "";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;

    const service = createServiceClient();

    const { data: bannerRow } = await service
      .from("site_config")
      .select("value")
      .eq("key", "banner_text")
      .maybeSingle();
    bannerText = bannerRow?.value ?? "";
  }

  const configured = isSupabaseConfigured();

  return (
    <main className="cli-grid relative h-screen w-full flex flex-col overflow-hidden">
      <div className="hero-mesh pointer-events-none absolute inset-x-0 top-0 h-[30vh] overflow-hidden opacity-50" aria-hidden="true" />
      <Banner text={bannerText} />
      <SiteHeader signedIn={signedIn} />
      <div className="header-accent-line" />

      <section className="relative flex-1 flex items-start justify-center px-4 sm:px-6 pt-6 sm:pt-10 pb-6 sm:pb-8 overflow-y-auto">
        <div className="w-full max-w-xl animate-page-enter">
          <ErrorBanner />
          <div className="mb-4 sm:mb-5 text-center">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-foreground font-mono">
              <span className="text-emerald-600 dark:text-emerald-400">$</span>{" "}
              <span className="text-muted-foreground">qlss</span>{" "}
              <span className="text-foreground">--</span>{" "}
              <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent">
                shorten · claim · track
              </span>
            </h1>
            <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              minimal, privacy-first link shortener with markdown pages, og preview, ssl check, and no tracking.
            </p>
          </div>
          <div className="mb-3 sm:mb-4">
            <StatsCounter />
          </div>
          <HomeContent signedIn={signedIn} configured={configured} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
