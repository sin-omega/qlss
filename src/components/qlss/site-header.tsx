"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { SignOutButton } from "@/components/qlss/sign-out-button";
import { t } from "@/lib/i18n";

export function SiteHeader({
  signedIn,
  backHref,
  backLabel,
  isAdmin,
}: {
  signedIn: boolean;
  backHref?: string;
  backLabel?: string;
  isAdmin?: boolean;
}) {
  const { theme, setTheme } = useTheme();

  // `t` keyboard shortcut to toggle theme
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [theme, setTheme]);

  return (
    <header className="site-header sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-xs bg-background/70 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center gap-2.5">
        <Link
          href="/"
          className="site-logo font-bold tracking-tight transition-opacity flex items-center gap-1.5"
        >
          <span className="inline-block w-1.5 h-1.5 bg-foreground rounded-full animate-pulse-soft" aria-hidden="true" />
          QLSS
        </Link>
      </div>
      <nav className="flex items-center gap-3 text-muted-foreground">
        {backHref && (
          <>
            <Link
              href={backHref}
              className="footer-link hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              {backLabel ?? t("header.back")}
            </Link>
            <span className="text-muted-foreground/30 select-none">·</span>
          </>
        )}
        {signedIn && (
          <>
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className="footer-link hover:text-foreground transition-colors"
                >
                  {t("header.admin")}
                </Link>
                <span className="text-muted-foreground/30 select-none">·</span>
              </>
            )}
            <Link
              href="/links"
              className="footer-link hover:text-foreground transition-colors"
            >
              {t("header.my_links")}
            </Link>
            <span className="text-muted-foreground/30 select-none">·</span>
          </>
        )}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hover:bg-accent/40 p-1.5 touch-target rounded-sm transition-colors hover:rotate-12"
          aria-label="Toggle theme"
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
              className="sign-in-link footer-link transition-all duration-200"
            >
              {t("header.sign_in")}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
