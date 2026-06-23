"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { readLangCookie, setLanguage, type Lang } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    // Sync the active language from the qlss-lang cookie on mount.
    const cookieLang = readLangCookie();
    setLanguage(cookieLang);
    setLang(cookieLang);

    // Re-render the whole subtree when the language changes so that every
    // component calling t() picks up the new dictionary.
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Lang>).detail;
      setLang(detail);
    };
    window.addEventListener("qlss-lang-change", handler);
    return () => window.removeEventListener("qlss-lang-change", handler);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {/* key={lang} forces a remount of the subtree on language change so all
          t() calls re-evaluate against the new dictionary. */}
      <div key={lang} className="contents">
        {children}
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
