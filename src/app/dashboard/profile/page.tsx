import { createClient } from "@/lib/supabase/server";
import { ProfileCustomizer } from "@/components/qlss/profile-customizer";

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

  return (
    <section className="px-6 py-10 md:py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Profile Page</h1>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            customize how your public profile looks at{" "}
            <span className="text-foreground">@{profile?.username ?? "..."}</span>
          </p>
        </div>

        <ProfileCustomizer initialSettings={settings} />
      </div>
    </section>
  );
}
