"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { LANGS, LANG_LABELS, type Lang } from "@/lib/i18n";

/**
 * Compact language switcher. Renders a native <select> for accessibility and
 * mobile-friendliness, styled to match the CLI aesthetic.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, changeLanguage, ready } = useLanguage();

  return (
    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors touch-target">
      <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
      {!compact && <span className="hidden sm:inline">{""}</span>}
      <select
        value={ready ? lang : "en"}
        onChange={(e) => changeLanguage(e.target.value as Lang)}
        aria-label="Language"
        className="bg-transparent border-none outline-none cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors appearance-none pr-1 focus:ring-0"
        style={{ fontFamily: "inherit" }}
      >
        {LANGS.map((l) => (
          <option key={l} value={l} className="bg-background text-foreground">
            {LANG_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
