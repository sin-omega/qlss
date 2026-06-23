"use client";

import { useEffect } from "react";

/**
 * Registers the QLSS service worker (`/sw.js`).
 *
 * Production-only — in development, Next.js HMR serves ever-changing bundles
 * from /_next/* and caching/intercepting them would break hot reload. The SW
 * itself also guards against caching /_next/* paths, but we double-gate here
 * so the SW is never even registered in dev.
 *
 * Renders nothing — this is a side-effect-only component.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.info("[qlss] service worker registered", {
          scope: reg.scope,
        });
      } catch (err) {
        console.warn("[qlss] service worker registration failed", err);
      }
    };

    // Defer registration until after first paint to avoid competing with
    // critical resource loading on first visit.
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }
  }, []);

  return null;
}
