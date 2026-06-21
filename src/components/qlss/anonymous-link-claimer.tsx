"use client";

import { useEffect } from "react";

/**
 * Reads anonymous link slugs from localStorage on mount and calls
 * /api/links/claim to attach them to the signed-in user's account.
 *
 * Rendered once inside the dashboard layout. Silent — no UI, just
 * side-effect. After a successful claim, clears the localStorage key
 * so we don't try to re-claim on every page load.
 */
export function AnonymousLinkClaimer() {
  useEffect(() => {
    (async () => {
      try {
        const key = "qlss:anonymous_slugs";
        const slugs = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
        if (slugs.length === 0) return;

        const res = await fetch("/api/links/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs }),
        });

        if (res.ok) {
          // Clear the key regardless of how many were actually claimed —
          // we tried them all, no point retrying.
          localStorage.removeItem(key);
        }
      } catch {
        // localStorage might be unavailable, or network failed. Try
        // again next page load.
      }
    })();
  }, []);

  return null;
}
