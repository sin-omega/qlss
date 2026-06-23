"use client";

import { t } from "@/lib/i18n";

/**
 * Client-side page title for /info — re-renders on language switch.
 */
export function InfoPageHeader() {
  return (
    <div className="mb-8 text-center">
      <div className="inline-flex items-center gap-2 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="text-foreground">&gt;</span>
        <span>qlss --info</span>
      </div>
      <h1 className="text-base font-bold uppercase tracking-widest text-foreground">
        {t("info.page_subtitle")}
      </h1>
    </div>
  );
}
