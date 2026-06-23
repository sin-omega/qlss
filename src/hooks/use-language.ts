"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getLanguage,
  setLanguage,
  readLangCookie,
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  type Lang,
  LANGS,
  LANG_LABELS,
} from "@/lib/i18n";

/**
 * React hook for reading/switching the active language.
 *
 * On mount it syncs the module-level language from the qlss-lang cookie. When
 * the user changes language, it persists the choice in the cookie and updates
 * the module so every t() call re-renders with the new language.
 */
export function useLanguage() {
  const [lang, setLang] = useState<Lang>(getLanguage());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cookieLang = readLangCookie();
    setLanguage(cookieLang);
    setLang(cookieLang);
    setReady(true);
  }, []);

  const changeLanguage = useCallback((next: Lang) => {
    setLanguage(next);
    setLang(next);
    if (typeof document !== "undefined") {
      const secure =
        typeof window !== "undefined" && window.location.protocol === "https:"
          ? "; Secure"
          : "";
      document.cookie = `${LANG_COOKIE}=${next}; Max-Age=${LANG_COOKIE_MAX_AGE}; Path=/${secure}; SameSite=Lax`;
    }
    // Notify the rest of the app (components using t() directly) to re-render.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("qlss-lang-change", { detail: next }));
    }
  }, []);

  return { lang, changeLanguage, ready, langs: LANGS, labels: LANG_LABELS };
}
