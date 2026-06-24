import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured, siteOrigin } from "@/lib/env";
import { ProfileLinks } from "@/components/qlss/profile-links";

export const dynamic = "force-dynamic";

interface LinkRow {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  link_type: string;
  title: string | null;
  description: string | null;
}

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.username) {
    redirect("/onboard");
  }

  const { data: links, error } = await supabase
    .from("links")
    .select("id, slug, destination_url, created_at, link_type, title, description")
    .eq("user_id", user.id)
    .eq("deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="cli-grid relative min-h-screen w-full flex flex-col">
        <section className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-muted-foreground">Could not load your links.</p>
        </section>
      </main>
    );
  }

  const allLinks = (links ?? []) as LinkRow[];
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

  const redirectLinks = allLinks.filter((l) => l.link_type !== "markdown");
  const markdownLinks = allLinks.filter((l) => l.link_type === "markdown");

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between text-xs border-b border-border">
        <span className="text-muted-foreground">@{profile.username}</span>
        <div className="flex items-center gap-3">
          <a href="/account" className="text-muted-foreground hover:text-foreground transition-colors">
            account
          </a>
          <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            home
          </a>
        </div>
      </div>

      <section className="flex-1 px-4 sm:px-6 pt-6 pb-16">
        <div className="mx-auto max-w-2xl animate-page-enter">
          <div className="border border-border bg-card px-4 py-3 mb-6 flex items-center gap-6">
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{allLinks.length}</span> link{allLinks.length !== 1 ? "s" : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{totalClicks}</span> click{totalClicks !== 1 ? "s" : ""}
            </div>
          </div>

          <ProfileLinks
            links={allLinks}
            counts={countsByLink}
            origin={siteOrigin()}
          />
        </div>
      </section>

    </main>
  );
}
