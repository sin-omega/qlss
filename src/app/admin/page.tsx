import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SiteHeader } from "@/components/qlss/site-header";
import { SiteFooter } from "@/components/qlss/site-footer";
import { AdminPanel } from "@/components/qlss/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const service = createServiceClient();

  // Check admin status
  const { data: profile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/");

  // Fetch all users
  const { data: profiles } = await service
    .from("profiles")
    .select("id, is_admin, banned, banned_at, banned_reason, created_at")
    .order("created_at", { ascending: false });

  const emailMap = new Map<string, string>();
  try {
    const { data: listedUsers } = await service.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listedUsers?.users) {
      for (const u of listedUsers.users) {
        emailMap.set(u.id, u.email ?? "");
      }
    }
  } catch {
    // ignore
  }

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    email: emailMap.get(p.id) ?? "",
    is_admin: p.is_admin ?? false,
    banned: p.banned ?? false,
    banned_at: p.banned_at,
    banned_reason: p.banned_reason,
    created_at: p.created_at,
  }));

  // Fetch all links
  const { data: links } = await service
    .from("links")
    .select("id, slug, destination_url, created_at, title, description, user_id")
    .order("created_at", { ascending: false })
    .limit(500);

  const allLinks = links ?? [];
  const linkIds = allLinks.map((l) => l.id);
  let countsByLink: Record<string, number> = {};

  if (linkIds.length > 0) {
    const { data: counts } = await service
      .from("analytics")
      .select("link_id")
      .in("link_id", linkIds);

    countsByLink = (counts ?? []).reduce<Record<string, number>>(
      (acc, row) => {
        const r = row as { link_id: string };
        acc[r.link_id] = (acc[r.link_id] ?? 0) + 1;
        return acc;
      },
      {},
    );
  }

  const enrichedLinks = allLinks.map((l) => ({
    ...l,
    clicks: countsByLink[l.id] ?? 0,
    owner_email: l.user_id ? emailMap.get(l.user_id) ?? "" : "",
  }));

  // Fetch abuse reports
  const { data: reports } = await service
    .from("abuse_reports")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch banner text
  const { data: bannerRow } = await service
    .from("site_config")
    .select("value")
    .eq("key", "banner_text")
    .maybeSingle();

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <SiteHeader signedIn={true} isAdmin={true} backHref="/links" backLabel="my links" />
      <div className="header-accent-line" />

      <section className="pt-10 pb-4 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl animate-page-enter">
          <AdminPanel
            initialUsers={users}
            initialLinks={enrichedLinks}
            initialReports={reports ?? []}
            initialBannerText={bannerRow?.value ?? ""}
          />
        </div>
      </section>

      <section className="pb-16" />

      <hr className="footer-separator mt-auto" />
      <SiteFooter />
    </main>
  );
}