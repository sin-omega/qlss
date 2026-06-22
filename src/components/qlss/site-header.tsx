<<<<<<< HEAD
"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { SignOutButton } from "@/components/qlss/sign-out-button";
import { Sun, Moon } from "lucide-react";

/**
 * Top header — client component.
 *
 * Left: QLSS wordmark with glow + status dot.
 * Right (authed): "my links" · theme toggle · sign out.
 * Right (unauthed): theme toggle · "sign in".
 */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2.5">
        <Link
          href="/"
          className="font-bold tracking-tight wordmark-glow inline-flex items-center gap-2"
        >
          <span className="text-base">Q</span><span>LSS</span>
          <span className="status-dot-online" />
        </Link>
      </div>
      <nav className="flex items-center gap-3 text-muted-foreground">
        {signedIn && (
          <>
            <Link
              href="/links"
              className="footer-link hover:text-foreground transition-colors"
            >
              my links
            </Link>
            <span className="text-muted-foreground/30 select-none">·</span>
          </>
        )}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hover:bg-accent/40 p-1.5 touch-target rounded-sm transition-colors"
          aria-label="Toggle theme"
          title="Toggle dark mode (Ctrl+Shift+D)"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
        {signedIn ? (
          <SignOutButton />
        ) : (
          <>
            <span className="text-muted-foreground/30 select-none">·</span>
            <Link
              href="/auth"
              className="footer-link hover:text-foreground transition-colors"
            >
              sign in
            </Link>
          </>
=======
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
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        )}
      </nav>
    </header>
  );
}
