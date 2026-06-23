"use client";

import { useEffect, useState } from "react";
import { Cookie, X, ShieldCheck } from "lucide-react";
import { t } from "@/lib/i18n";

const STORAGE_KEY = "qlss-cookie-consent";
// Re-prompt after 180 days if accepted, or immediately if declined.
const RE_PROMPT_MS = 1000 * 60 * 60 * 24 * 180;

type ConsentValue = "accepted" | "declined";

interface StoredConsent {
  value: ConsentValue;
  timestamp: number;
}

function readConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed?.value === "accepted" || parsed?.value === "declined") {
      if (typeof parsed.timestamp !== "number") return null;
      // If accepted, honour for RE_PROMPT_MS then re-prompt.
      // If declined, re-prompt on next visit (after session) so we don't
      // nag — but we still suppress within the same session.
      if (parsed.value === "accepted" && Date.now() - parsed.timestamp > RE_PROMPT_MS) {
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, timestamp: Date.now() }));
  } catch {
    // ignore
  }
}

/**
 * Dismissible cookie consent banner shown at the bottom of the page on first
 * visit. Stores the user's choice in localStorage. Re-prompts after 180 days
 * if accepted, or on the next session if declined.
 *
 * Note: QLSS only uses functional cookies (language + theme). No tracking or
 * advertising cookies. This banner is for transparency / GDPR friendliness.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer to next tick to avoid hydration mismatch.
    const id = window.setTimeout(() => {
      const existing = readConsent();
      // If declined, we re-prompt on every fresh page load (annoying but
      // GDPR-correct: the user can always say no again). If accepted, we
      // stay silent for RE_PROMPT_MS.
      if (!existing || existing.value === "declined") {
        setVisible(true);
      }
    }, 800);
    return () => window.clearTimeout(id);
  }, []);

  // When the banner is visible, add bottom padding to <body> so the fixed
  // banner doesn't overlap page content (footer, FABs, etc.).
  useEffect(() => {
    if (!visible) return;
    const banner = document.querySelector("[data-cookie-banner]");
    if (!banner) return;
    const height = banner.getBoundingClientRect().height;
    document.body.style.paddingBottom = `${Math.ceil(height + 8)}px`;
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [visible]);

  function accept() {
    writeConsent("accepted");
    setVisible(false);
  }
  function decline() {
    writeConsent("declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      data-cookie-banner
      role="dialog"
      aria-label={t("cookie_consent.title")}
      aria-live="polite"
      className="cookie-consent fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4 animate-slide-up"
      style={{
        // Respect iOS safe area
        paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
      }}
    >
      <div className="mx-auto max-w-2xl border border-border bg-card/95 backdrop-blur-md shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <div className="shrink-0 mt-0.5">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <Cookie className="h-4 w-4 text-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              {t("cookie_consent.title")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              {t("cookie_consent.description")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={accept}
                className="btn-press bg-foreground text-background hover:bg-foreground/90 px-4 py-2 text-[11px] uppercase tracking-widest transition-colors min-h-[36px]"
              >
                {t("cookie_consent.accept")}
              </button>
              <button
                type="button"
                onClick={decline}
                className="btn-press border border-border hover:bg-accent px-4 py-2 text-[11px] uppercase tracking-widest transition-colors text-muted-foreground hover:text-foreground min-h-[36px]"
              >
                {t("cookie_consent.decline")}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={decline}
            aria-label={t("common.close")}
            className="btn-press shrink-0 p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
