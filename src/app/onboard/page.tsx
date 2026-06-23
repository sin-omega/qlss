import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { SiteFooter } from "@/components/qlss/site-footer";
import { OnboardForm } from "@/components/qlss/onboard-form";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function OnboardPage() {
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

  // Already onboarded? Send home.
  const service = createServiceClient();
  try {
    const { data: profile } = await service
      .from("profiles")
      .select("username, tos_accepted")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.username && profile.username.trim().length > 0 && profile.tos_accepted) {
      redirect("/");
    }
  } catch (err) {
    console.warn("[onboard] profile lookup failed:", err);
  }

  const email = user.email ?? "";

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-xs">
        <span className="font-bold tracking-tight">QLSS</span>
        <span className="text-muted-foreground">/onboard</span>
      </div>
      <div className="header-accent-line" />

      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-8 pb-24">
        <div className="w-full max-w-md animate-page-enter">
          <p className="text-[11px] text-muted-foreground mb-1 tracking-wide">
            <span className="text-foreground">$</span> qlss --onboard
          </p>
          <h1 className="text-xl font-bold tracking-tight mb-1">
            {t("onboard.title")}
          </h1>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            {t("onboard.subtitle")}
          </p>

          <OnboardForm email={email} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
