import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

<<<<<<< HEAD
=======
/**
 * Signs the user out and bounces them back to the landing page.
 *
 * Server-side logout keeps the cookie mutation authoritative — no risk
 * of stale session tokens lingering in the browser.
 */
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });
}
