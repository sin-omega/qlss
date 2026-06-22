"use client";

<<<<<<< HEAD
import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

const ERROR_MESSAGES = [
  "not found",
  "no such link",
  "404 — link deleted or never existed",
  "path does not resolve",
  "dead link",
];

function getServerSnapshot() { return ""; }

export default function NotFound() {
  const [message] = useState(() => {
    const idx = Math.floor(Math.random() * ERROR_MESSAGES.length);
    return ERROR_MESSAGES[idx];
  });

  const time = useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, 1000);
      return () => clearInterval(id);
    },
    () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      return `${h}:${m}:${s}`;
    },
    getServerSnapshot
  );

  return (
    <main className="cli-grid relative min-h-screen w-full flex flex-col">
      <header className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-xs">
        <Link
          href="/"
          className="font-bold tracking-tight wordmark-glow inline-flex items-center gap-2"
        >
          <span className="text-base">Q</span><span>LSS</span>
          <span className="status-dot-online" />
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 footer-link"
=======
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
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        >
          <ArrowLeft className="h-3 w-3" />
          home
        </Link>
      </header>
<<<<<<< HEAD
      <div className="header-accent-line" />

      {/* Timestamp */}
      {time && (
        <div className="absolute top-2 right-4 text-[10px] text-muted-foreground/40 font-mono tabular-nums">
          timestamp: {time}
        </div>
      )}

      <section className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md animate-page-enter">
=======

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Prompt line — terminal-style, with a blinking block cursor */}
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
          <p className="text-xs text-muted-foreground mb-6 text-center">
            <span className="text-foreground">$</span> resolve requested path
            <span className="cli-cursor" />
          </p>

<<<<<<< HEAD
          <h1 className="text-[7rem] sm:text-[8rem] leading-none font-bold tracking-tighter text-center select-none animate-error-shake">
            404
          </h1>

          <div className="mt-8 border border-border bg-card p-4 card-hover animate-slide-up">
            <p className="text-xs leading-relaxed">
              <span className="text-destructive">!</span> {message}
=======
          {/* The big number — monospace makes it read as terminal output */}
          <h1 className="text-[7rem] sm:text-[8rem] leading-none font-bold tracking-tighter text-center select-none">
            404
          </h1>

          {/* Error box — same card/border treatment used across the app */}
          <div className="mt-8 border border-border bg-card p-4">
            <p className="text-xs leading-relaxed">
              <span className="text-destructive">!</span> not found
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              this page doesn&apos;t exist, or the short link was never created.
            </p>
<<<<<<< HEAD
            <div className="mt-3 pt-2.5 border-t border-border">
              <Link
                href="/"
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
              >
                <Search className="h-3 w-3" />
                try unshortening the original url →
              </Link>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 text-xs">
            <Link
              href="/"
              className="bg-foreground text-background hover:bg-foreground/90 px-4 py-2.5 transition-colors inline-flex items-center gap-1.5 btn-press"
=======
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-center gap-3 text-xs">
            <Link
              href="/"
              className="bg-foreground text-background hover:bg-foreground/90 px-4 py-2.5 transition-colors inline-flex items-center gap-1.5"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              go home
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
<<<<<<< HEAD
              className="border border-border bg-card hover:bg-accent px-4 py-2.5 transition-colors btn-press"
=======
              className="border border-border bg-card hover:bg-accent px-4 py-2.5 transition-colors"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
            >
              go back
            </button>
          </div>
        </div>
      </section>

<<<<<<< HEAD
      <hr className="footer-separator" />
      <footer className="mt-auto px-4 sm:px-6 py-4 text-center text-[11px] text-muted-foreground">
=======
      <footer className="absolute bottom-0 left-0 right-0 px-6 py-4 text-center text-[11px] text-muted-foreground">
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        QLSS · short links
      </footer>
    </main>
  );
}
