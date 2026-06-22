import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
<<<<<<< HEAD
=======
    /*
     * Match every request except for:
     * - _next/static, _next/image, favicon, public assets
     * - the dynamic short-link redirect path itself ([slug]) so it stays
     *   fast and unauthenticated.
     *
     * NOTE: the redirect route still works fine when middleware runs on it
     * — we just don't strictly need to refresh the session there. Keeping
     * it out keeps redirects instant.
     */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\..*)(?!api/shorten).*)",
  ],
};
