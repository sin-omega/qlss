import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import { LinkList } from "@/components/qlss/link-list";
import Link from "next/link";
import { ArrowLeft, LinkIcon, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  title: string | null;
  description: string | null;
}

export default async function LinksPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="cli-grid relative min-h-screen w-full flex flex-col">
        <header className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-xs">
          <Link href="/" className="font-bold tracking-tight hover:opacity-70 transition-opacity">
            <span className="text-base">Q</span><span>LSS</span>
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3 w-3" />
            home
          </Link>
        </header>
        <div className="header-accent-line" />
        <section className="flex-1 flex items-center justify-center px-4 sm:px-6">
          <div className="text-center max-w-md">
            <h1 className="text-lg font-bold tracking-tight">Almost ready.</h1>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Add Supabase env vars to manage your links.
            </p>
          </div>
        </section>
        <hr className="footer-separator" />
        <footer className="mt-auto px-4 sm:px-6 py-4 text-center text-[11px] text-muted-foreground">
          QLSS · short links
        </footer>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Fetch user's links
  const { data: links, error } = await supabase
    .from("links")
    .select("id, slug, destination_url, created_at, title, description")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="cli-grid relative min-h-screen w-full flex flex-col">
        <section className="flex-1 flex items-center justify-center px-4 sm:px-6">
          <div className="text-center max-w-md">
            <h1 className="text-lg font-bold tracking-tight">Error</h1>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Could not load links: {error.message}
            </p>
          </div>
        </section>
      </main>
    );
  }

  // Fetch click counts per link
  const allLinks = (links ?? []) as unknown as LinkRow[];
  const linkIds = allLinks.map((l) => l.id);
  let countsByLink: Record<string, number> = {};
  let totalClicks = 0;

  if (linkIds.length > 0) {
    const { data: counts } = await supabase
      .from("analytics")
      .select("link_id")
      .in("link_id", linkIds);

    countsByLink = (counts ?? []).reduce<Record<string, number>>((acc, row) => {
      const r = row as { link_id: string };
      acc[r.link_id] = (acc[r.link_id] ?? 0) + 1;
      totalClicks++;
      return acc;
    }, {});
  }

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <header className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-xs">
        <Link href="/" className="font-bold tracking-tight hover:opacity-70 transition-opacity">
          <span className="text-base">Q</span><span>LSS</span>
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3 w-3" />
          home
        </Link>
      </header>
      <div className="header-accent-line" />

      <section className="pt-10 pb-4 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl animate-page-enter">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3 w-3" />
              back
            </Link>
          </div>

          <h1 className="text-lg font-bold tracking-tight mt-3">
            my links
          </h1>
        </div>
      </section>

      {/* Stats summary bar */}
      {allLinks.length > 0 && (
        <section className="px-4 sm:px-6 pb-3">
          <div className="mx-auto max-w-2xl">
            <div className="border border-border bg-card px-4 py-2.5 flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LinkIcon className="h-3 w-3" />
                <span>
                  <span className="text-foreground font-medium">{allLinks.length}</span> link{allLinks.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                <span>
                  <span className="text-foreground font-medium">{totalClicks}</span> click{totalClicks !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 sm:px-6 pb-16">
        <div className="mx-auto max-w-2xl">
          {allLinks.length === 0 ? (
            <div className="border border-border bg-card py-12 px-6 text-center">
              <pre className="text-[10px] text-muted-foreground leading-relaxed inline-block mb-4 text-left">{`   ┌──────────┐
   │  ◇  ◇  ◇ │
   │  ┌────┐  │
   │  │ ∅  │  │
   │  └────┘  │
   │  ─ ─ ─ ─  │
   └──────────┘`}</pre>
              <p className="text-sm text-foreground mb-1">No links yet.</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                Your shortened links will appear here. Start by creating one — paste any long URL and hit shorten.
              </p>
              <a
                href="/"
                className="text-xs text-foreground underline hover:opacity-70 inline-flex items-center gap-1.5"
              >
                create your first link
                <kbd className="border border-border px-1 text-[9px] ml-1 text-muted-foreground">Enter</kbd>
              </a>
            </div>
          ) : (
            <LinkList
              links={allLinks}
              counts={countsByLink}
              origin={siteOrigin()}
            />
          )}
        </div>
      </section>

      <hr className="footer-separator" />
      <footer className="mt-auto px-4 sm:px-6 py-4 text-center text-[11px] text-muted-foreground">
        QLSS · short links
      </footer>
    </main>
  );
}