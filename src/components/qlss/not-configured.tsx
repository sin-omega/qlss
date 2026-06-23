"use client";

import { AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/qlss/site-header";
import { SiteFooter } from "@/components/qlss/site-footer";
import { t } from "@/lib/i18n";

/**
 * Friendly "Supabase not configured" state shared by /links, /admin, and
 * /stats/[slug]. Renders the standard CLI chrome so the page looks consistent
 * instead of throwing a 500.
 *
 * This is intentionally a client component so that `t()` calls re-evaluate
 * reactively when the user switches language via the footer language switcher
 * (the Providers wrapper remounts its subtree via `key={lang}`).
 */
export function NotConfiguredPage({
  title,
  description,
  signedIn = false,
  isAdmin = false,
  variant = "links",
}: {
  title?: string;
  description?: string;
  signedIn?: boolean;
  isAdmin?: boolean;
  variant?: "links" | "admin" | "stats";
}) {
  const desc =
    description ??
    (variant === "admin"
      ? t("supabase_warning.admin_desc")
      : variant === "stats"
        ? t("supabase_warning.stats_desc")
        : t("supabase_warning.links_desc"));

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <SiteHeader signedIn={signedIn} isAdmin={isAdmin} backHref="/" backLabel={t("common.home")} />
      <div className="header-accent-line" />

      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-24">
        <div className="w-full max-w-md animate-page-enter">
          <div className="border border-border bg-card p-6 flex items-start gap-3 card-hover not-configured-card">
            <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 animate-pulse-slow" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                <span className="text-foreground">$</span> qlss --check-config
              </p>
              <h1 className="text-base font-bold tracking-tight">
                {title ?? t("supabase_warning.title")}
              </h1>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{desc}</p>
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
                <p className="mb-2">{t("supabase_warning.required_env")}:</p>
                <ul className="space-y-1.5 font-mono">
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <code className="text-foreground px-1.5 py-0.5 bg-accent text-[10px]">
                      NEXT_PUBLIC_SUPABASE_URL
                    </code>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <code className="text-foreground px-1.5 py-0.5 bg-accent text-[10px]">
                      NEXT_PUBLIC_SUPABASE_ANON_KEY
                    </code>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <code className="text-foreground px-1.5 py-0.5 bg-accent text-[10px]">
                      SUPABASE_SERVICE_ROLE_KEY
                    </code>
                  </li>
                </ul>
                <p className="mt-3 text-[10px] italic">{t("supabase_warning.hint")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
