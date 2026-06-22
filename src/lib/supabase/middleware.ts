import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/service";

<<<<<<< HEAD
=======
/**
 * Refreshes the Supabase auth session on every request and ensures
 * the cookies returned to the browser carry the updated session.
 *
 * Place this file at `src/middleware.ts` (Next.js convention) so it
 * runs for every matched route.
 */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createMiddlewareClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    },
  });

  if (!supabase) {
<<<<<<< HEAD
    return response;
  }

=======
    // Supabase env vars not configured yet — short-circuit so the app
    // still renders locally.
    return response;
  }

  // Refreshing the session also validates the token; we don't need to
  // branch on the result here, but we *must* await it so the response
  // cookies get the refreshed values.
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
  await supabase.auth.getUser();

  return response;
}
