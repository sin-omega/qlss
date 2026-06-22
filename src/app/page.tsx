import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SiteHeader } from "@/components/qlss/site-header";
import { HomeContent } from "@/components/qlss/home-content";
import { AlertTriangle } from "lucide-react";

/**
 * Home page — same view for both authed and unauthed users.
 * Authed users see: shortener + custom alias (unlocked) + "my links" in header.
 * Unauthed users see: shortener + custom alias (locked) + "sign in" in header.
 */
export default async function HomePage() {
  let signedIn = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  }

  const configured = isSupabaseConfigured();

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <SiteHeader signedIn={signedIn} />
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
    </main>
  );
}
