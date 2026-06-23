"use client";

import { AlertTriangle } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * Client-side "Supabase not configured" warning card for the home page.
 *
 * Lives inside the Providers tree so it re-renders reactively when the user
 * switches language (the Providers wrapper remounts its subtree via
 * `key={lang}`).
 */
export function HomeNotConfigured() {
  return (
    <div className="mt-6 border border-border bg-card p-4 flex items-start gap-3 card-hover animate-page-enter">
      <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 animate-pulse-slow" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">
          {t("supabase_warning.title")}
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
          {t("supabase_warning.home_desc")}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <code className="text-[10px] text-foreground bg-accent px-1.5 py-0.5">
            NEXT_PUBLIC_SUPABASE_URL
          </code>
          <code className="text-[10px] text-foreground bg-accent px-1.5 py-0.5">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          <code className="text-[10px] text-foreground bg-accent px-1.5 py-0.5">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
        </div>
        <p className="mt-2 text-[10px] italic text-muted-foreground">
          {t("supabase_warning.hint")}
        </p>
      </div>
    </div>
  );
}
