import { createClient } from "@/lib/supabase/server";
import { ProfileCustomizer } from "@/components/qlss/profile-customizer";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, description, settings")
    .eq("id", user.id)
    .maybeSingle();

  const settings = (profile?.settings ?? {}) as Record<string, unknown>;
  const username = profile?.username ?? "...";

  // Check if the user has a profile page folder
  const { data: profileFolder } = await supabase
    .from("folders")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("profile_page", true)
    .maybeSingle();

  const hasProfileFolder = !!profileFolder;

  return (
    <section className="px-6 py-10 md:py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Profile Page</h1>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              customize your public profile at{" "}
              <span className="text-foreground">@{username}</span>
            </p>
          </div>
          {hasProfileFolder && (
            <Link
              href="/dashboard/profile-stats"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 hover:bg-accent"
            >
              <BarChart3 className="h-3 w-3" />
              view stats
            </Link>
          )}
        </div>

        <ProfileCustomizer initialSettings={settings} />
    </section>
  );
}