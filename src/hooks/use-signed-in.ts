"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tiny hook that subscribes to the Supabase auth state.
 * Returns `signedIn` (boolean | null) — null while the initial
 * session check is in flight, then a definite true/false.
 *
 * Used by the shortener forms to decide whether to show the
 * "custom alias" field (registered-user feature).
 */
export function useSignedIn() {
  const supabase = createClient();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSignedIn(Boolean(data.session));
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return signedIn;
}
