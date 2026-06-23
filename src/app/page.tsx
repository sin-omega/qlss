import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { t } from "@/lib/i18n";
import { SiteHeader } from "@/components/qlss/site-header";
import { HomeContent } from "@/components/qlss/home-content";
import { SiteFooter } from "@/components/qlss/site-footer";
import { Banner } from "@/components/qlss/banner";
import { KeyboardHelpOverlay } from "@/components/qlss/keyboard-help";
import { StatsCounter } from "@/components/qlss/stats-counter";
import { ErrorBanner } from "@/components/qlss/error-banner";
import { ScrollToTop } from "@/components/qlss/scroll-to-top";

/**
 * Home page — minimal. Only the input, the mode selector, and a real stats
 * strip. FAQ, full statistics, features grid, trending, and recently-shortened
 * live on /info.
 */
export default async function HomePage() {
  let signedIn = false;
  let isAdmin = false;
  let bannerText = "";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;

    const service = createServiceClient();

    if (user) {
      const { data: profile } = await service
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      isAdmin = profile?.is_admin ?? false;
    }

    const { data: bannerRow } = await service
      .from("site_config")
      .select("value")
      .eq("key", "banner_text")
      .maybeSingle();
    bannerText = bannerRow?.value ?? "";
  }

  const configured = isSupabaseConfigured();

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      {/* Subtle decorative gradient mesh (top) — kept very faint for minimalism */}
      <div className="hero-mesh pointer-events-none absolute inset-x-0 top-0 h-[30vh] overflow-hidden opacity-50" aria-hidden="true" />
      <Banner text={bannerText} />
      <SiteHeader signedIn={signedIn} isAdmin={isAdmin} />
      <div className="header-accent-line" />

      <section className="relative flex-1 flex items-start justify-center px-4 sm:px-6 pt-8 sm:pt-12 pb-8">
        <div className="w-full max-w-xl animate-page-enter">
          <ErrorBanner />
          {/* Hero tagline — minimal, terminal-style. */}
          <div className="mb-5 sm:mb-6 text-center">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-foreground font-mono">
              <span className="text-emerald-600 dark:text-emerald-400">$</span>{" "}
              <span className="text-muted-foreground">qlss</span>{" "}
              <span className="text-foreground">--</span>{" "}
              <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent">
                {t("hero.tagline")}
              </span>
            </h1>
            <p className="mt-1.5 text-[10px] sm:text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              {t("hero.subtitle")}
            </p>
          </div>
          <div className="mb-4">
            <StatsCounter />
          </div>
          <HomeContent signedIn={signedIn} configured={configured} />
        </div>
      </section>

      <SiteFooter />
      <KeyboardHelpOverlay />
      <ScrollToTop />
    </main>
  );
}
