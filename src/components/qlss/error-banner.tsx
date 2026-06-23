"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X, ShieldAlert, LogIn, UserCircle, AlertTriangle } from "lucide-react";
import { t, getLanguage, type Lang } from "@/lib/i18n";

type ErrorCode =
  | "auth_not_configured"
  | "auth_required"
  | "onboard_required"
  | "banned"
  | "generic";

interface ErrorInfo {
  titleKey: string;
  descKey: string;
  icon: typeof AlertCircle;
  variant: "error" | "warning" | "info";
}

const ERROR_MAP: Record<ErrorCode, ErrorInfo> = {
  auth_not_configured: {
    titleKey: "home_errors.auth_not_configured_title",
    descKey: "home_errors.auth_not_configured",
    icon: AlertTriangle,
    variant: "warning",
  },
  auth_required: {
    titleKey: "home_errors.auth_required_title",
    descKey: "home_errors.auth_required",
    icon: LogIn,
    variant: "info",
  },
  onboard_required: {
    titleKey: "home_errors.onboard_required_title",
    descKey: "home_errors.onboard_required",
    icon: UserCircle,
    variant: "info",
  },
  banned: {
    titleKey: "home_errors.banned_title",
    descKey: "home_errors.banned",
    icon: ShieldAlert,
    variant: "error",
  },
  generic: {
    titleKey: "home_errors.generic_title",
    descKey: "home_errors.generic",
    icon: AlertCircle,
    variant: "error",
  },
};

const VARIANT_STYLES: Record<ErrorInfo["variant"], string> = {
  error: "border-destructive/40 bg-destructive/5 text-destructive",
  warning: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  info: "border-foreground/30 bg-accent/30 text-foreground",
};

const ICON_STYLES: Record<ErrorInfo["variant"], string> = {
  error: "text-destructive",
  warning: "text-amber-500",
  info: "text-foreground",
};

// Module-level cache: read the error from the URL ONCE on first mount across
// the whole session. This survives the Providers `key={lang}` remount that
// happens when the language is synced from the cookie on mount.
let cachedError: ErrorCode | null | undefined = undefined; // undefined = not yet read

/**
 * Reads ?error=CODE from the URL and shows a dismissible banner.
 * Cleans up the URL after reading so the banner doesn't reappear on refresh.
 */
export function ErrorBanner() {
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(() => {
    if (cachedError !== undefined) return cachedError;
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("error");
    cachedError = raw
      ? (ERROR_MAP[raw as ErrorCode] ? (raw as ErrorCode) : "generic")
      : null;
    return cachedError;
  });
  const [dismissed, setDismissed] = useState(false);
  // Track the active language so the banner re-renders with new translations
  // when the user switches language.
  const [, setLang] = useState<Lang>(getLanguage());

  // Clean the URL once on mount (after we've captured the error code).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (errorCode === null) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("error")) return;
    params.delete("error");
    const remaining = params.toString();
    const newUrl =
      window.location.pathname +
      (remaining ? `?${remaining}` : "") +
      window.location.hash;
    window.history.replaceState({}, "", newUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear the module-level cache on actual unmount (e.g. navigating to a
  // different page). The Providers `key={lang}` remount also unmounts us, but
  // the cache is needed for that case — so we only clear it after a short
  // delay, by which point the remount has already re-read the cache.
  useEffect(() => {
    const id = setTimeout(() => {
      // If we still have an error code, keep it cached (user hasn't dismissed).
      // If not, clear so a future /?error=... works.
      if (errorCode === null) cachedError = undefined;
    }, 500);
    return () => clearTimeout(id);
  }, [errorCode]);

  // Listen for language changes so the banner re-renders with new translations.
  useEffect(() => {
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener("qlss-lang-change", handler);
    return () => window.removeEventListener("qlss-lang-change", handler);
  }, []);

  if (!errorCode || dismissed) return null;

  const info = ERROR_MAP[errorCode];
  const Icon = info.icon;
  const title = t(info.titleKey);
  const desc = t(info.descKey);
  const dismissLabel = t("home_errors.dismiss");

  function handleDismiss() {
    // Clear the cache so a future navigation to /?error=... works.
    cachedError = undefined;
    setDismissed(true);
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`home-error-banner relative mb-4 border ${VARIANT_STYLES[info.variant]} animate-slide-up`}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className={`shrink-0 mt-0.5 ${ICON_STYLES[info.variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold tracking-tight mb-0.5">{title}</p>
          <p className="text-[11px] leading-relaxed opacity-90">{desc}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={dismissLabel}
          className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity touch-target"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="home-error-banner-accent" aria-hidden="true" />
    </div>
  );
}
