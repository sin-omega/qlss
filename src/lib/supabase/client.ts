import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client.
 *
 * Used inside Client Components for things like the auth UI, where the user
 * is actively interacting with their own session.
 *
 * Reads publishable (anon) credentials from the environment — these are safe
 * to ship to the browser.
 */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a stub that throws on use so callers get a friendly error
    // instead of a silent failure when env vars aren't configured yet.
    return new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.",
        );
      },
    });
  }

  return createBrowserClient(url, key);
}
