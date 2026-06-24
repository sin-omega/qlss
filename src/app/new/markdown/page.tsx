import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SiteHeader } from "@/components/qlss/site-header";
import { MarkdownForm } from "@/components/qlss/markdown-form";

export const dynamic = "force-dynamic";

export default async function NewMarkdownPage() {
  if (!isSupabaseConfigured()) {
    redirect("/?error=auth_not_configured");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <SiteHeader signedIn={true} />
      <div className="header-accent-line" />

      <section className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-6 sm:pt-10 pb-20">
        <div className="w-full max-w-xl animate-page-enter">
          <p className="text-[11px] text-muted-foreground mb-1 tracking-wide">
            <span className="text-foreground">$</span> qlss --new /markdown
          </p>
          <h1 className="text-base font-bold tracking-tight mb-4">
            publish markdown
          </h1>
          <MarkdownForm signedIn={true} />
        </div>
      </section>
    </main>
  );
}
