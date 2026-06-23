import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LANG_COOKIE, parseLangCookie, runWithLang, t, type Lang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "QLSS — offline",
  description: "You are offline.",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback page served by the service worker when the network fails
 * and no cached navigation response is available.
 *
 * Server component — reads the `qlss-lang` cookie to render the message in
 * the user's preferred language (English by default). The retry button uses
 * a tiny inline script (vanilla DOM) instead of a client component, to keep
 * the offline shell dependency-free.
 */
export default async function OfflinePage() {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get(LANG_COOKIE)?.value;
  const lang: Lang = parseLangCookie(langCookie);

  // Look up translations inside a per-request language scope so server-side
  // `t()` returns the right dictionary instead of the module-level default.
  const strings = runWithLang(lang, () => ({
    title: t("offline", "title"),
    subtitle: t("offline", "subtitle"),
    retry: t("offline", "retry"),
    home: t("offline", "home"),
  }));

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-16 bg-background text-foreground">
      {/* Subtle radial glow to echo the home hero aesthetic */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[40vh] overflow-hidden opacity-60"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, rgba(124,124,124,0.12) 0%, transparent 70%)",
        }}
      />

      <section className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-6">
        {/* Terminal-style prompt header */}
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span
            className="inline-block h-2 w-2 rounded-full bg-amber-500"
            aria-hidden="true"
          />
          <span>qlss://status</span>
        </div>

        {/* Big QLSS logo text */}
        <h1
          className="font-mono font-bold text-5xl sm:text-6xl tracking-tight"
          aria-label="QLSS"
        >
          <span className="text-foreground">Q</span>
          <span className="text-muted-foreground">L</span>
          <span className="text-foreground">S</span>
          <span className="text-muted-foreground">S</span>
        </h1>

        {/* Decorative dashed divider */}
        <hr className="hr-dashed w-24" />

        {/* Status block — terminal card */}
        <div className="w-full border border-border bg-card/60 backdrop-blur-sm p-5 text-left">
          <p className="font-mono text-xs text-muted-foreground mb-1">
            <span className="text-emerald-600 dark:text-emerald-400">$</span>{" "}
            status
          </p>
          <p className="font-mono text-lg sm:text-xl font-medium text-foreground">
            {strings.title}
          </p>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            {strings.subtitle}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Retry button — wired by the inline script below. Server components
              can't attach onClick handlers, so we identify the button with a
              data attribute and bind a click listener via vanilla JS. */}
          <button
            type="button"
            data-qlss-retry
            className="btn-press bg-foreground text-background hover:bg-foreground/90 px-5 py-2.5 text-xs uppercase tracking-widest transition-colors min-h-[44px]"
          >
            {strings.retry}
          </button>
          <a
            href="/"
            className="btn-press border border-border hover:bg-accent px-5 py-2.5 text-xs uppercase tracking-widest transition-colors text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            {strings.home}
          </a>
        </div>
      </section>

      {/* Tiny inline script — wires the retry button to location.reload().
          Runs as early as possible so the button works without React/hydration. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              function init() {
                var btn = document.querySelector('[data-qlss-retry]');
                if (!btn) return;
                btn.addEventListener('click', function () {
                  try { window.location.reload(); } catch (e) {}
                });
              }
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
              } else {
                init();
              }
            })();
          `,
        }}
      />
    </main>
  );
}
