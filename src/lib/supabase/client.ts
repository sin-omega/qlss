import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

<<<<<<< HEAD
=======
/**
 * Browser-side Supabase client.
 *
 * Used inside Client Components for things like the auth UI, where the user
 * is actively interacting with their own session.
 *
 * Reads publishable (anon) credentials from the environment — these are safe
 * to ship to the browser.
 */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
<<<<<<< HEAD
    return new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
=======
    // Return a stub that throws on use so callers get a friendly error
    // instead of a silent failure when env vars aren't configured yet.
    return new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.",
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        );
      },
    });
  }

  return createBrowserClient(url, key);
}
