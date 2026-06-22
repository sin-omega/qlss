import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

<<<<<<< HEAD
=======
/**
 * Server-side Supabase client.
 *
 * Used inside Server Components, Route Handlers and Server Actions. Reads
 * the user's session from the cookie jar so RLS policies can attribute
 * queries to the authenticated user.
 */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
export async function createClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
<<<<<<< HEAD
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
=======
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.",
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        );
      },
    });
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
<<<<<<< HEAD
          // Server Component — cookies can't be mutated here.
=======
          // The `setAll` method was called from a Server Component where
          // cookies can't be mutated. Safe to ignore — middleware will
          // refresh the session on the next request.
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        }
      },
    },
  });
}
