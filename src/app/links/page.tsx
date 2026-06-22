import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import { LinkList } from "@/components/qlss/link-list";
import { SiteHeader } from "@/components/qlss/site-header";
import { SiteFooter } from "@/components/qlss/site-footer";
import Link from "next/link";
import { LinkIcon, BarChart3 } from "lucide-react";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const signedIn = !!user;

  if (!isSupabaseConfigured()) {
    return (
      <main className="cli-grid relative min-h-screen w-full flex flex-col">
        <SiteHeader signedIn={signedIn} isAdmin={false} backHref="/" backLabel="home" />
        <div className="header-accent-line" />
        <section className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-16">
          <div className="text-center max-w-md">
            <h1 className="text-lg font-bold tracking-tight">Almost ready.</h1>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Add Supabase env vars to manage your links.
            </p>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (!user) redirect("/auth");

  // Check admin status
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.is_admin ?? false;

  // Fetch user's links
  const { data: links, error } = await supabase
    .from("links")
    .select("id, slug, destination_url, created_at, title, description")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="cli-grid relative min-h-screen w-full flex flex-col">
        <SiteHeader signedIn={true} isAdmin={false} backHref="/" backLabel="home" />
        <div className="header-accent-line" />
        <section className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-16">
          <div className="text-center max-w-md">
            <h1 className="text-lg font-bold tracking-tight">Error</h1>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Could not load links: {error.message}
            </p>
          </div>
        </section>
        <SiteFooter />
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
      <SiteHeader signedIn={true} isAdmin={isAdmin} backHref="/" backLabel="home" />
      <div className="header-accent-line" />

      <section className="pt-10 pb-4 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl animate-page-enter">
          <h1 className="text-lg font-bold tracking-tight">my links</h1>
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
            <EmptyLinks />
          ) : (
            <LinkList
              links={allLinks}
              counts={countsByLink}
              origin={siteOrigin()}
            />
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function EmptyLinks() {
  return (
    <div className="border border-border bg-card py-12 px-6 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
        no links yet
      </p>
      <p className="text-sm text-foreground mb-1 font-medium">
        Your shortened links will appear here.
      </p>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
        Paste any long URL on the home page and hit shorten to create your first link.
      </p>
      <Link
        href="/"
        className="text-xs text-foreground border border-border hover:bg-accent px-4 py-2 inline-flex items-center gap-1.5 transition-colors"
      >
        create your first link
      </Link>
    </div>
  );
}
