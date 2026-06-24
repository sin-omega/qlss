import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { SiteHeader } from "@/components/qlss/site-header";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
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

  const { count: linkCount } = await service
    .from("links")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("deleted", false);

  const { count: analyticCount } = await service
    .from("analytics")
    .select("id", { count: "exact", head: true })
    .in(
      "link_id",
      (
        await service
          .from("links")
          .select("id")
          .eq("user_id", user.id)
          .eq("deleted", false)
      ).data?.map((l: { id: string }) => l.id) ?? [],
    );

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <SiteHeader signedIn={true} />
      <div className="header-accent-line" />

      <section className="flex-1 px-4 sm:px-6 pt-10 pb-16">
        <div className="mx-auto max-w-2xl animate-page-enter">
          <h1 className="text-lg font-bold tracking-tight mb-1">account</h1>
          <p className="text-xs text-muted-foreground mb-8">@{profile.username}</p>

          <div className="space-y-4">
            <div className="border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">email</p>
              <p className="text-sm font-mono">{user.email}</p>
            </div>

            <div className="border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">user ID</p>
              <p className="text-xs font-mono text-muted-foreground break-all">{user.id}</p>
            </div>

            <div className="border border-border bg-card p-4 flex items-center gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">links</p>
                <p className="text-xl font-bold tabular-nums">{linkCount ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">clicks</p>
                <p className="text-xl font-bold tabular-nums">{analyticCount ?? 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <a href="/profile" className="text-xs text-foreground border border-border hover:bg-accent px-3 py-1.5 transition-colors">
                my links
              </a>
              <a href="/" className="text-xs text-foreground border border-border hover:bg-accent px-3 py-1.5 transition-colors">
                home
              </a>
              <a href="/api/logout" className="text-xs text-muted-foreground border border-border hover:bg-accent hover:text-foreground px-3 py-1.5 transition-colors">
                sign out
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
