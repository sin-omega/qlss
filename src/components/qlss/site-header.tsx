"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, User, LogOut } from "lucide-react";

export function SiteHeader({
  signedIn,
}: {
  signedIn: boolean;
}) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [theme, setTheme]);

  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="w-8 h-8 flex items-center justify-center border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
      {signedIn ? (
        <a
          href="/profile"
          className="w-8 h-8 flex items-center justify-center border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Your profile"
        >
          <User className="h-3.5 w-3.5" />
        </a>
      ) : (
        <a
          href="/auth"
          className="w-8 h-8 flex items-center justify-center border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Sign in"
        >
          <User className="h-3.5 w-3.5" />
        </a>
      )}
      {signedIn && (
        <a
          href="/api/logout"
          className="w-8 h-8 flex items-center justify-center border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </a>
      )}
      <div className="fixed bottom-4 right-4 z-40 flex gap-2">
        <a href="/legal/tos" className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors no-underline">tos</a>
        <a href="/legal/privacy" className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors no-underline">privacy</a>
      </div>
    </div>
  );
}
