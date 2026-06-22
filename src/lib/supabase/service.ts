import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

<<<<<<< HEAD
=======
/**
 * Service-role Supabase client.
 *
 * Bypasses RLS. Reserved for system-level inserts that need to happen
 * even when no user session is present — specifically logging a click
 * on a short link from an anonymous visitor.
 *
 * MUST stay on the server. Never import this from a Client Component
 * and never expose the service role key to the browser.
 */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
<<<<<<< HEAD
          "Supabase service role is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
=======
          "Supabase service role is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.",
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        );
      },
    });
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

<<<<<<< HEAD
=======
/**
 * Lightweight inline server client used by middleware.
 *
 * Middleware runs on every request, so we avoid the async `cookies()` call
 * here and pass the cookie helpers directly from the request/response.
 */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
export function createMiddlewareClient(
  cookieStore: {
    getAll: () => { name: string; value: string }[];
    setAll: (
      cookies: { name: string; value: string; options?: Record<string, unknown> }[],
    ) => void;
  },
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookieStore.setAll(cookiesToSet);
        } catch {
<<<<<<< HEAD
          // ignore
=======
          // ignore — middleware context handles its own cookie writes
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        }
      },
    },
  });
}
