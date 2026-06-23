"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { t } from "@/lib/i18n";

const FAQ_KEYS = [
  "q1", "q2", "q3", "q4", "q5",
  "q6", "q7", "q8", "q9", "q10",
] as const;

/**
 * FAQ accordion section — rendered below the features grid on the home page.
 * Pure client component so the questions/answers re-render reactively on
 * language switch (via the Providers `key={lang}` remount mechanism).
 */
export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      aria-labelledby="faq-heading"
      className="mt-12 sm:mt-16 scroll-mt-20"
    >
      {/* ── Section header ── */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <HelpCircle className="h-3 w-3" />
          <span>?</span>
        </div>
        <h2
          id="faq-heading"
          className="text-sm font-bold uppercase tracking-widest text-foreground"
        >
          {t("faq.section_title")}
        </h2>
        {/* Decorative gradient divider */}
        <div className="mx-auto mt-2 h-[2px] w-16 rounded-full bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("faq.section_subtitle")}
        </p>
      </div>

      {/* ── FAQ items ── */}
      <div className="space-y-1.5">
        {FAQ_KEYS.map((key, idx) => {
          const isOpen = open === idx;
          const question = t(`faq.${key}`);
          const answer = t(`faq.a${key.slice(1)}`);
          return (
            <div
              key={key}
              className={`border border-border bg-card overflow-hidden transition-all duration-300 ${
                isOpen
                  ? "border-l-2 border-l-foreground"
                  : "border-l-2 border-l-transparent"
              } ${!isOpen ? "border-b border-b-border/60" : ""}`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : idx)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${idx}`}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/50 active:bg-accent/70 transition-colors min-h-[44px] sm:min-h-0"
              >
                <span className="flex items-center gap-2.5 text-xs sm:text-[13px] leading-snug">
                  {/* Numbered badge */}
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-foreground/5 text-foreground text-[10px] font-semibold tabular-nums shrink-0">
                    {idx + 1}
                  </span>
                  {/* Question text — highlighted when open */}
                  <span
                    className={`transition-all duration-200 ${
                      isOpen
                        ? "text-foreground font-semibold"
                        : "font-medium text-foreground/80"
                    }`}
                  >
                    {question}
                  </span>
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                id={`faq-panel-${idx}`}
                role="region"
                className={`grid transition-all duration-300 ease-out ${
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="mx-4 mb-4 mt-0 bg-background/50 rounded-md px-4 py-3">
                    <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                      {answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
