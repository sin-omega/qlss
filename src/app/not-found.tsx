"use client";

import { useState, useSyncExternalStore, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { t, getLanguage, type Lang } from "@/lib/i18n";

function getServerSnapshot() {
  return "";
}

export default function NotFound() {
  // Track the active language so the random message re-rolls when the user
  // switches language (Providers remounts on lang change, but we also listen
  // for the qlss-lang-change event for safety).
  const [lang, setLang] = useState<Lang>(getLanguage());
  useEffect(() => {
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener("qlss-lang-change", handler);
    return () => window.removeEventListener("qlss-lang-change", handler);
  }, []);

  // Pick a random i18n'd message; re-rolls when lang changes.
  const message = useMemo(() => {
    const messages = t("not_found.messages").split("|");
    const idx = Math.floor(Math.random() * messages.length);
    return messages[idx] ?? t("not_found.title");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const time = useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, 1000);
      return () => clearInterval(id);
    },
    () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      return `${h}:${m}:${s}`;
    },
    getServerSnapshot,
  );

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <header className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-xs">
        <Link
          href="/"
          className="font-bold tracking-tight wordmark-glow inline-flex items-center gap-2"
        >
          <span className="text-base">Q</span>
          <span>LSS</span>
          <span className="status-dot-online" />
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 footer-link"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("common.home")}
        </Link>
      </header>
      <div className="header-accent-line" />

      {time && (
        <div className="absolute top-2 right-4 text-[10px] text-muted-foreground/40 font-mono tabular-nums">
          timestamp: {time}
        </div>
      )}

      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-24">
        <div className="w-full max-w-md animate-page-enter">
          <p className="text-xs text-muted-foreground mb-6 text-center">
            <span className="text-foreground">$</span> {t("not_found.resolve_prompt")}
            <span className="cli-cursor" />
          </p>

          <h1 className="text-[7rem] sm:text-[8rem] leading-none font-bold tracking-tighter text-center select-none animate-error-shake">
            404
          </h1>

          <div className="mt-8 border border-border bg-card p-4 card-hover animate-slide-up">
            <p className="text-xs leading-relaxed">
              <span className="text-destructive">!</span> {message}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t("not_found.subtitle")}
            </p>
            <div className="mt-3 pt-2.5 border-t border-border">
              <Link
                href="/"
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
              >
                <Search className="h-3 w-3" />
                {t("not_found.try_unshorten")}
              </Link>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 text-xs">
            <Link
              href="/"
              className="bg-foreground text-background hover:bg-foreground/90 px-4 py-2.5 transition-colors inline-flex items-center gap-1.5 btn-press"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("not_found.go_home")}
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="border border-border bg-card hover:bg-accent px-4 py-2.5 transition-colors btn-press"
            >
              {t("not_found.go_back")}
            </button>
          </div>
        </div>
      </section>

      <footer className="mt-auto px-4 sm:px-6 py-4 text-center text-[11px] text-muted-foreground">
        {t("footer.copyright")}
      </footer>
    </main>
  );
}
