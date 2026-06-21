import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SiteHeader } from "@/components/qlss/site-header";
import { ShortenerForm } from "@/components/qlss/shortener-form";

/**
 * Public home page.
 *
 * - If signed in → redirect to /dashboard (the app proper).
 * - If not signed in → show the public shortener (anonymous use OK).
 */
export default async function HomePage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  const configured = isSupabaseConfigured();

  return (
    <main className="cli-grid relative h-screen w-full overflow-hidden flex flex-col">
      <SiteHeader />

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xl text-center">
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            Shorten links. Analyze traffic. Free forever.
          </p>
          <ShortenerForm />

          {!configured && (
            <p className="mt-6 text-xs text-muted-foreground leading-relaxed border border-dashed border-border p-3 bg-card">
              <span className="text-foreground">!</span> Supabase env vars not
              set. Add them to enable shortening.
            </p>
          )}
        </div>
      </section>

      <footer className="absolute bottom-0 left-0 right-0 px-6 py-4 text-center text-[11px] text-muted-foreground">
        Copyleft (ɔ) QLSS.eu 2026
      </footer>
    </main>
  );
}
