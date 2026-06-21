import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Signs the user out and bounces them back to the landing page.
 *
 * Server-side logout keeps the cookie mutation authoritative — no risk
 * of stale session tokens lingering in the browser.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });
}
