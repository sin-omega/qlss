"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, Link as LinkIcon, Shield, LogIn, Sun, Moon, HelpCircle, ArrowUp } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * Mobile action bar — a floating bottom bar visible only on small screens
 * (< sm) that provides quick navigation. Sits above the site footer.
 * Hidden on /auth and /onboard to avoid interfering with auth flows.
 */
export function MobileActionBar({
  signedIn,
  isAdmin,
}: {
  signedIn: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => setMounted(true), []);

  // Show "back to top" after scrolling 600px down
  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide on auth/onboard pages
  if (pathname === "/auth" || pathname === "/onboard") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* Back-to-top FAB — appears on scroll */}
      {showTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label={mounted ? t("mobile.back_to_top") : "back to top"}
          className="mobile-fab fixed right-4 bottom-20 sm:bottom-6 z-40 w-10 h-10 flex items-center justify-center border border-border bg-card text-foreground shadow-md hover:bg-accent transition-all touch-target btn-press animate-fade-in"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {/* Mobile action bar — hidden on >= sm (footer handles nav there) */}
      <nav
        className="mobile-action-bar sm:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md"
        aria-label={mounted ? t("mobile.quick_actions") : "quick actions"}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 items-stretch">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors touch-target ${
              isActive("/")
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>{mounted ? t("mobile.home") : ""}</span>
          </Link>

          {signedIn ? (
            <Link
              href="/links"
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors touch-target ${
                isActive("/links")
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              <span>{mounted ? t("mobile.links") : ""}</span>
            </Link>
          ) : (
            <Link
              href="/auth"
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors touch-target ${
                isActive("/auth")
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>{mounted ? t("mobile.sign_in") : ""}</span>
            </Link>
          )}

          {signedIn && isAdmin && (
            <Link
              href="/admin"
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors touch-target ${
                isActive("/admin")
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>{mounted ? t("mobile.admin") : ""}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={mounted ? t("mobile.theme") : "theme"}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors touch-target"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{mounted ? t("mobile.theme") : ""}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              // Dispatch the same event the keyboard-help overlay listens for
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
            }}
            aria-label={mounted ? t("mobile.help") : "help"}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors touch-target"
          >
            <HelpCircle className="h-4 w-4" />
            <span>{mounted ? t("mobile.help") : ""}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
