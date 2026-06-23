"use client";

import { useEffect, useState } from "react";
import { UserX, FileText, Share2, Timer, BarChart3, Languages } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * Hero badge row — a strip of small badges highlighting key product features.
 * Renders above the tagline on the home page. Purely decorative + informative.
 */
export function HeroBadges() {
  // Mount gate so we render the correct language after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const badges = [
    { key: "badge_no_signup", icon: UserX, label: t("hero.badge_no_signup"), stagger: 1 },
    { key: "badge_markdown", icon: FileText, label: t("hero.badge_markdown"), stagger: 2 },
    { key: "badge_og", icon: Share2, label: t("hero.badge_og"), stagger: 3 },
    { key: "badge_expiry", icon: Timer, label: t("hero.badge_expiry"), stagger: 4 },
    { key: "badge_analytics", icon: BarChart3, label: t("hero.badge_analytics"), stagger: 5 },
    { key: "badge_i18n", icon: Languages, label: t("hero.badge_i18n"), stagger: 6 },
  ];

  return (
    <div className="text-center mb-4 animate-fade-in">
      <p className="text-[11px] mb-3 tracking-wide text-gradient-pulse">
        {mounted ? t("app.tagline") : ""}
      </p>
      <div
        className="hero-badges flex flex-wrap items-center justify-center gap-1.5"
        aria-label="features"
      >
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <span
              key={b.key}
              className={`hero-badge stagger-${b.stagger} inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground border border-border/80 bg-card/80 backdrop-blur-sm hover:scale-105`}
            >
              <Icon className="h-2.5 w-2.5" aria-hidden="true" />
              <span>{mounted ? b.label : ""}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
