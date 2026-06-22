import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Sidebar } from "@/components/qlss/sidebar";
import { AnonymousLinkClaimer } from "@/components/qlss/anonymous-link-claimer";

export const dynamic = "force-dynamic";

/**
 * Layout for all /dashboard/* pages.
 *
 * - Redirects to /auth if not signed in.
 * - Redirects to /profile/setup if signed in but no username yet.
 * - Renders the sidebar + page content in a scrollless shell
 *   (sidebar is fixed, content area scrolls).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-lg font-bold tracking-tight">Almost ready.</h1>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            Add Supabase env vars to enable your dashboard.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Check profile — if no username yet, send to setup.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/profile/setup");

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <AnonymousLinkClaimer />
      <Sidebar username={profile.username} />
      <main className="flex-1 overflow-y-auto cli-grid">{children}</main>
    </div>
  );
}
