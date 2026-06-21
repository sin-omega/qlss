"use client";

import { useEffect } from "react";

/**
 * Client component that fires a single POST to /api/profile/views on mount
 * to record a profile page view. Used in the public profile page.
 */
export function ProfileViewTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    void fetch("/api/profile/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    }).catch(() => {
      // Silent — never block rendering for analytics
    });
  }, [profileId]);

  return null;
}
