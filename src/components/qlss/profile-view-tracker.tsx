"use client";

import { useEffect } from "react";

/**
 * Client component that fires a POST to /api/profile/views on mount
 * to record a profile page view. Sends detailed telemetry:
 * - Screen resolution and viewport size
 * - Whether it's likely a bot
 * - The page URL and referrer
 */
export function ProfileViewTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    const payload = {
      profile_id: profileId,
      // These will be merged with server-side geo headers in the API route
      sw: window.screen.width,
      sh: window.screen.height,
      vw: window.innerWidth,
      vh: window.innerHeight,
      href: window.location.href,
      ref: document.referrer || null,
    };

    void fetch("/api/profile/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Silent — never block rendering for analytics
    });
  }, [profileId]);

  return null;
}
