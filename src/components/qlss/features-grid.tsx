"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Share2,
  Timer,
  KeyRound,
  BarChart3,
  Layers,
  QrCode,
  Languages,
  UserX,
  Keyboard,
} from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * Color mapping for each feature key.
 * Each entry provides the icon-container bg, text, and hover left-border color.
 */
const featureColors: Record<
  string,
  { container: string; hoverBorder: string }
> = {
  markdown: {
    container: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    hoverBorder: "hover:border-l-violet-500",
  },
  og: {
    container: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    hoverBorder: "hover:border-l-sky-500",
  },
  expiry: {
    container: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-l-amber-500",
  },
  pincode: {
    container: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    hoverBorder: "hover:border-l-rose-500",
  },
  analytics: {
    container: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-l-emerald-500",
  },
  bulk: {
    container: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    hoverBorder: "hover:border-l-orange-500",
  },
  qr: {
    container: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    hoverBorder: "hover:border-l-cyan-500",
  },
  i18n: {
    container: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    hoverBorder: "hover:border-l-indigo-500",
  },
  no_signup: {
    container: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    hoverBorder: "hover:border-l-teal-500",
  },
  keyboard: {
    container: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    hoverBorder: "hover:border-l-pink-500",
  },
};

/**
 * Features grid — a responsive grid of feature cards shown below the
 * shortener form on the home page. Each card has a colored icon, title,
 * and short description. Purely informational.
 */
export function FeaturesGrid() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const features = [
    { key: "markdown", icon: FileText, title: t("features.markdown_title"), desc: t("features.markdown_desc") },
    { key: "og", icon: Share2, title: t("features.og_title"), desc: t("features.og_desc") },
    { key: "expiry", icon: Timer, title: t("features.expiry_title"), desc: t("features.expiry_desc") },
    { key: "pincode", icon: KeyRound, title: t("features.pincode_title"), desc: t("features.pincode_desc") },
    { key: "analytics", icon: BarChart3, title: t("features.analytics_title"), desc: t("features.analytics_desc") },
    { key: "bulk", icon: Layers, title: t("features.bulk_title"), desc: t("features.bulk_desc") },
    { key: "qr", icon: QrCode, title: t("features.qr_title"), desc: t("features.qr_desc") },
    { key: "i18n", icon: Languages, title: t("features.i18n_title"), desc: t("features.i18n_desc") },
    { key: "no_signup", icon: UserX, title: t("features.no_signup_title"), desc: t("features.no_signup_desc") },
    { key: "keyboard", icon: Keyboard, title: t("features.keyboard_title"), desc: t("features.keyboard_desc") },
  ];

  return (
    <section className="mt-12 sm:mt-16" aria-labelledby="features-heading">
      {/* Section header with decorative gradient divider */}
      <div className="text-center mb-8">
        <h2
          id="features-heading"
          className="text-xs uppercase tracking-widest text-foreground font-medium"
        >
          {mounted ? t("features.section_title") : ""}
        </h2>
        <p className="text-[11px] text-muted-foreground mt-1">
          {mounted ? t("features.section_subtitle") : ""}
        </p>
        {/* Decorative gradient line */}
        <div className="mx-auto mt-3 h-px w-24 feature-divider" />
      </div>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {features.map((f, index) => {
          const Icon = f.icon;
          const colors = featureColors[f.key];
          const staggerClass = `stagger-${index + 1}`;

          return (
            <article
              key={f.key}
              className={`feature-card group border border-border bg-card p-5 flex items-start gap-4 transition-all border-l-2 border-l-transparent ${colors.hoverBorder} card-hover ${staggerClass}`}
            >
              {/* Icon container — 9×9, rounded-lg, colored background */}
              <span
                className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${colors.container} feature-icon-container`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-medium text-foreground mb-0.5">
                  {mounted ? f.title : ""}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {mounted ? f.desc : ""}
                </p>
                {/* Subtle dotted separator at bottom */}
                <div className="mt-2 border-b border-dotted border-border/50" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
