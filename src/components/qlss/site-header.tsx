"use client";

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
        {backHref && (
          <>
            <Link
              href={backHref}
              className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
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
          className="hover:bg-accent/40 p-1.5 touch-target rounded-sm transition-colors"
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
              className="footer-link hover:text-foreground transition-colors"
            >
              {t("header.sign_in")}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
