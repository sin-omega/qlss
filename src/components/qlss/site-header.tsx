"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sun, Moon, Globe } from "lucide-react";
import { SignOutButton } from "@/components/qlss/sign-out-button";
import { useLocale } from "@/components/qlss/providers";
import { t } from "@/lib/i18n";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

/**
 * Shared top header for all pages.
 *
 * Left: QLSS wordmark.
 * Center (optional): back navigation.
 * Right (authed): "my links" · theme toggle · sign out.
 * Right (unauthed): theme toggle · "sign in".
 */
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
  const router = useRouter();
  const { locale, setLocale } = useLocale();

  const cycleLocale = () => {
    const idx = SUPPORTED_LOCALES.indexOf(locale);
    const next = SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length];
    setLocale(next as Locale);
    router.refresh();
  };

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
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden sm:inline">{backLabel ?? t(locale, "header.back")}</span>
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
                  {t(locale, "header.admin")}
                </Link>
                <span className="text-muted-foreground/30 select-none">·</span>
              </>
            )}
            <Link
              href="/links"
              className="footer-link hover:text-foreground transition-colors"
            >
              {t(locale, "header.my_links")}
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
        <button
          type="button"
          onClick={cycleLocale}
          className="hover:bg-accent/40 p-1.5 touch-target rounded-sm transition-colors inline-flex items-center gap-1"
          aria-label="Switch language"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>{locale.toUpperCase()}</span>
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
              {t(locale, "header.sign_in")}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
