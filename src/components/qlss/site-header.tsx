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
          className="font-bold tracking-tight hover:opacity-70 transition-opacity"
        >
          QLSS
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
        )}
      </nav>
    </header>
  );
}
