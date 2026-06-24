import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SiteHeader } from "@/components/qlss/site-header";
import { HomeContent } from "@/components/qlss/home-content";

export default async function HomePage() {
  let signedIn = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  }

  return (
    <main className="cli-grid relative h-screen w-full flex flex-col overflow-hidden">
      <div className="hero-mesh pointer-events-none absolute inset-x-0 top-0 h-[30vh] overflow-hidden opacity-50" aria-hidden="true" />
      <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto pb-16">
        <div className="text-center mb-5 sm:mb-6">
          <span className="text-sm sm:text-base font-bold tracking-tight">QLSS.eu</span>
        </div>
        <div className="w-full max-w-xl">
          <HomeContent signedIn={signedIn} />
        </div>
      </div>
      <SiteHeader signedIn={signedIn} />
    </main>
  );
}
