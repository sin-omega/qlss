import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SignOutButton } from "@/components/qlss/sign-out-button";

/**
 * Top-of-page header for QLSS.
 *
 * Left: the QLSS wordmark.
 * Right:
 *   - If signed in: dashboard link + username + sign out.
 *   - If not signed in: sign in link.
 *   - If Supabase isn't configured: nothing (preview mode).
 *
 * Server Component — fetches the username from the profiles table.
 */
export async function SiteHeader() {
  let signedIn = false;
  let username: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      signedIn = true;
      // Try to fetch the username. If the profiles table doesn't exist
      // yet (user hasn't run the schema update), this just returns null
      // and we fall back to showing the email's local part.
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      username = profile?.username ?? null;
    }
  }

  return (
    <header className="absolute top-0 left-0 right-0 z-10 px-6 py-5 flex items-center justify-between text-xs">
      <Link
        href="/"
        className="font-bold tracking-tight hover:opacity-70 transition-opacity"
      >
        QLSS
      </Link>
      <nav className="flex items-center gap-5 text-muted-foreground">
        {signedIn ? (
          <>
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              dashboard
            </Link>
            {username && (
              <span className="hidden sm:inline truncate max-w-40">
                @{username}
              </span>
            )}
            <SignOutButton />
          </>
        ) : (
          <Link
            href="/auth"
            className="hover:text-foreground transition-colors"
          >
            sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
