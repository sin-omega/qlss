"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Custom 404 — CLI-flavored "command not found".
 *
 * Matches the app's terminal aesthetic: dotted grid backdrop, ASCII prompt
 * with a blinking block cursor, big monospace 404, an error box, and a
 * go-home / go-back pair.
 */
export default function NotFound() {
  return (
    <main className="cli-grid relative h-screen w-full overflow-hidden flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-10 px-6 py-5 flex items-center justify-between text-xs">
        <Link
          href="/"
          className="font-bold tracking-tight hover:opacity-70 transition-opacity"
        >
          QLSS
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3 w-3" />
          home
        </Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Prompt line — terminal-style, with a blinking block cursor */}
          <p className="text-xs text-muted-foreground mb-6 text-center">
            <span className="text-foreground">$</span> resolve requested path
            <span className="cli-cursor" />
          </p>

          {/* The big number — monospace makes it read as terminal output */}
          <h1 className="text-[7rem] sm:text-[8rem] leading-none font-bold tracking-tighter text-center select-none">
            404
          </h1>

          {/* Error box — same card/border treatment used across the app */}
          <div className="mt-8 border border-border bg-card p-4">
            <p className="text-xs leading-relaxed">
              <span className="text-destructive">!</span> not found
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              this page doesn&apos;t exist, or the short link was never created.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-center gap-3 text-xs">
            <Link
              href="/"
              className="bg-foreground text-background hover:bg-foreground/90 px-4 py-2.5 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              go home
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="border border-border bg-card hover:bg-accent px-4 py-2.5 transition-colors"
            >
              go back
            </button>
          </div>
        </div>
      </section>

      <footer className="absolute bottom-0 left-0 right-0 px-6 py-4 text-center text-[11px] text-muted-foreground">
        QLSS · short links
      </footer>
    </main>
  );
}
