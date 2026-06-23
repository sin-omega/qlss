"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/**
 * Shape of the `beforeinstallprompt` event. Browsers that support PWA
 * installation fire this event (and prevent the default browser prompt)
 * so the page can show its own install UI.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "qlss-install-dismissed";

/**
 * Dismissible install banner shown at the bottom of the screen when the
 * browser fires `beforeinstallprompt`.
 *
 * - Captures the deferred prompt and stores it in state.
 * - Shows a small banner above the scroll-to-top button.
 * - "Install" triggers the native prompt; "Not now" dismisses it.
 * - After either outcome the banner is hidden and the deferred event cleared.
 * - Persists dismissal in localStorage so we don't nag the user on every visit.
 */
export function InstallPrompt() {
  // `undefined` = not yet known; `null` = nothing captured / dismissed.
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Honour a previous dismissal so we don't pester the user.
    let alreadyDismissed = false;
    try {
      alreadyDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // localStorage may be blocked — proceed as if not dismissed.
    }

    function onBeforeInstallPrompt(e: Event) {
      // Prevent the browser's default mini-infobar.
      e.preventDefault();
      if (alreadyDismissed) return;
      setDeferred(e as BeforeInstallPromptEvent);
      // Defer showing until next tick to avoid hydration timing issues.
      window.setTimeout(() => setVisible(true), 600);
    }

    function onAppInstalled() {
      // The app was installed — hide banner, clear deferred event.
      setVisible(false);
      setDeferred(null);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        // ignore
      }
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        try {
          localStorage.setItem(DISMISS_KEY, "1");
        } catch {
          // ignore
        }
      }
    } catch {
      // Swallow — the user will see nothing changed, which is fine.
    } finally {
      // The deferred event can only be used once; clear it.
      setDeferred(null);
      setVisible(false);
    }
  }

  function handleDismiss() {
    setVisible(false);
    setDeferred(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!visible || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-label={t("pwa", "install_title")}
      aria-live="polite"
      className="fixed bottom-20 right-4 z-40 w-[calc(100vw-2rem)] max-w-xs sm:w-80 animate-slide-up"
      style={{
        // Respect iOS safe area at the bottom.
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="border border-border bg-card/95 backdrop-blur-md shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <div className="shrink-0 mt-0.5">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <Download className="h-4 w-4 text-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">
              {t("pwa", "install_title")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleInstall}
                size="sm"
                className="btn-press bg-foreground text-background hover:bg-foreground/90 px-4 py-2 h-9 text-[11px] uppercase tracking-widest"
              >
                {t("pwa", "install_btn")}
              </Button>
              <Button
                type="button"
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="btn-press text-muted-foreground hover:text-foreground px-3 py-2 h-9 text-[11px] uppercase tracking-widest"
              >
                {t("pwa", "dismiss")}
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="close"
            className="btn-press shrink-0 p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
