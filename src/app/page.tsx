import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { SiteHeader } from "@/components/qlss/site-header";
import { HomeContent } from "@/components/qlss/home-content";
import { SiteFooter } from "@/components/qlss/site-footer";
import { Banner } from "@/components/qlss/banner";
import { AlertTriangle } from "lucide-react";

/**
 * Home page — same view for both authed and unauthed users.
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

    // Fetch banner text (public — use service client)
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
      <Banner text={bannerText} />
      <SiteHeader signedIn={signedIn} isAdmin={isAdmin} />
      <div className="header-accent-line" />

      <section className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="w-full max-w-xl animate-page-enter">
          <HomeContent signedIn={signedIn} />

          {!configured && (
            <div className="mt-6 border border-border bg-card p-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">Supabase not configured</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  Add <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                  <code className="text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> environment
                  variables to enable link shortening.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <hr className="footer-separator mt-auto" />
      <SiteFooter />
    </main>
  );
}