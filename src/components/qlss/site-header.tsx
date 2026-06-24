"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { SignOutButton } from "@/components/qlss/sign-out-button";

export function SiteHeader({
  signedIn,
}: {
  signedIn: boolean;
}) {
  const { theme, setTheme } = useTheme();

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
    <header className="sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-xs bg-background/70 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center gap-2.5">
        <span className="inline-block w-1.5 h-1.5 bg-foreground rounded-full animate-pulse-soft" aria-hidden="true" />
        <span className="font-bold tracking-tight">QLSS</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hover:bg-accent/40 p-1.5 touch-target rounded-sm transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
        {signedIn ? <SignOutButton /> : <span className="text-muted-foreground">guest</span>}
      </div>
    </header>
  );
}
