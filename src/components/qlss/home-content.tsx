"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Link, Undo2 } from "lucide-react";
import { ShortenerForm } from "@/components/qlss/shortener-form";
import { UnshortenerForm } from "@/components/qlss/unshortener-form";
import { LegalDialog } from "@/components/qlss/legal-dialog";

type Tab = "shorten" | "unshorten";
type LegalPage = "privacy" | "tos" | "abuse" | null;

export function HomeContent({ signedIn }: { signedIn: boolean }) {
  const [tab, setTab] = useState<Tab>("shorten");
  const [legalPage, setLegalPage] = useState<LegalPage>(null);

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const shortenBtnRef = useRef<HTMLButtonElement>(null);
  const unshortenBtnRef = useRef<HTMLButtonElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const updateIndicator = useCallback(() => {
    const btn =
      tab === "shorten" ? shortenBtnRef.current : unshortenBtnRef.current;
    const container = tabContainerRef.current;
    const indicator = indicatorRef.current;
    if (!btn || !container || !indicator) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    indicator.style.width = `${btnRect.width}px`;
    indicator.style.transform = `translateX(${btnRect.left - containerRect.left}px)`;
  }, [tab]);

  useEffect(() => {
    updateIndicator();
  }, [tab, updateIndicator]);

  // Recalculate on resize
  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  // Keyboard navigation: left/right arrows to switch tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input/textarea is focused
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setTab((prev) =>
          prev === "shorten" ? "unshorten" : "shorten"
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const footerLinks: { label: string; page: LegalPage }[] = [
    { label: "privacy policy", page: "privacy" as LegalPage },
    { label: "terms of service", page: "tos" as LegalPage },
    { label: "report abuse", page: "abuse" as LegalPage },
  ];

  return (
    <>
      {/* Hero tagline */}
      <HeroTagline />

      {/* Tab switch */}
      <div
        ref={tabContainerRef}
        className="relative flex border border-border bg-card mb-4"
        role="tablist"
        aria-label="Choose action"
      >
        <button
          ref={shortenBtnRef}
          type="button"
          role="tab"
          aria-selected={tab === "shorten"}
          tabIndex={tab === "shorten" ? 0 : -1}
          onClick={() => setTab("shorten")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs transition-colors touch-target btn-press ${
            tab === "shorten"
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
          }`}
        >
          <Link className="h-3.5 w-3.5" />
          shorten
        </button>
        <button
          ref={unshortenBtnRef}
          type="button"
          role="tab"
          aria-selected={tab === "unshorten"}
          tabIndex={tab === "unshorten" ? 0 : -1}
          onClick={() => setTab("unshorten")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs transition-colors touch-target btn-press border-l border-border ${
            tab === "unshorten"
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
          }`}
        >
          <Undo2 className="h-3.5 w-3.5" />
          unshorten
        </button>
        {/* Sliding indicator pill */}
        <div
          ref={indicatorRef}
          className="tab-indicator absolute bottom-0 left-0 h-[2px] bg-foreground"
        />
      </div>

      {/* Tab content with crossfade */}
      <div key={tab} className="tab-content-enter">
        {tab === "shorten" ? (
          <ShortenerForm signedIn={signedIn} />
        ) : (
          <UnshortenerForm />
        )}
      </div>

      {/* Footer */}
      <hr className="footer-separator mt-6" />
      <footer className="group animate-fade-in mt-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-[11px] text-muted-foreground" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
        <div className="flex items-center gap-2">
          <span>QLSS · short links</span>
          <span className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="status-dot-online" />
            <span>online</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {footerLinks.map((link, i) => (
            <span key={link.page} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden="true">·</span>}
              <button
                type="button"
                onClick={() => setLegalPage(link.page)}
                className="footer-link hover:text-foreground transition-colors touch-target"
              >
                {link.label}
              </button>
            </span>
          ))}
        </div>
      </footer>

      {/* Legal dialog */}
      <LegalDialog page={legalPage} onClose={() => setLegalPage(null)} />
    </>
  );
}

function HeroTagline() {
  const words = ["shorten.", "share.", "track."];

  return (
    <p className="text-[11px] text-muted-foreground mb-4 tracking-wide text-gradient cli-cursor">
      {words.map((word, i) => (
        <span
          key={word}
          className="tagline-word inline-block mr-2"
          style={{ animationDelay: `${i * 0.25}s` }}
        >
          {word}
        </span>
      ))}
    </p>
  );
}