"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Link, Undo2, Layers, Lock } from "lucide-react";
import { ShortenerForm } from "@/components/qlss/shortener-form";
import { BulkForm } from "@/components/qlss/bulk-form";
import { LegalDialog } from "@/components/qlss/legal-dialog";

type Tab = "shorten" | "unshorten" | "bulk";
type LegalPage = "privacy" | "tos" | "abuse" | null;

export function HomeContent({ signedIn }: { signedIn: boolean }) {
  const [tab, setTab] = useState<Tab>("shorten");
  const [legalPage, setLegalPage] = useState<LegalPage>(null);

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const shortenBtnRef = useRef<HTMLButtonElement>(null);
  const bulkBtnRef = useRef<HTMLButtonElement>(null);
  const unshortenBtnRef = useRef<HTMLButtonElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const activeBtnRef = tab === "shorten" ? shortenBtnRef : tab === "bulk" ? bulkBtnRef : unshortenBtnRef;

  const updateIndicator = useCallback(() => {
    const btn = activeBtnRef.current;
    const container = tabContainerRef.current;
    const indicator = indicatorRef.current;
    if (!btn || !container || !indicator) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    indicator.style.width = `${btnRect.width}px`;
    indicator.style.transform = `translateX(${btnRect.left - containerRect.left}px)`;
  }, [tab, activeBtnRef]);

  useEffect(() => {
    updateIndicator();
  }, [tab, updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        const tabs: Tab[] = signedIn
          ? ["shorten", "bulk", "unshorten"]
          : ["shorten", "unshorten"];
        const idx = tabs.indexOf(tab);
        const next = e.key === "ArrowRight" ? Math.min(idx + 1, tabs.length - 1) : Math.max(idx - 1, 0);
        setTab(tabs[next]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab, signedIn]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; disabled?: boolean; ref: React.RefObject<HTMLButtonElement | null> }[] = [
    { key: "shorten", label: "shorten", icon: <Link className="h-3.5 w-3.5" />, ref: shortenBtnRef },
    ...(signedIn
      ? [{ key: "bulk" as Tab, label: "bulk", icon: <Layers className="h-3.5 w-3.5" />, ref: bulkBtnRef }]
      : []),
    { key: "unshorten", label: "unshorten (soon)", icon: <Undo2 className="h-3.5 w-3.5" />, disabled: true, ref: unshortenBtnRef },
  ];

  return (
    <>
      <HeroTagline />

      <div
        ref={tabContainerRef}
        className="relative flex border border-border bg-card mb-4"
        role="tablist"
        aria-label="Choose action"
      >
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={t.ref}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => !t.disabled && setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs transition-colors touch-target btn-press ${
              i > 0 ? "border-l border-border" : ""
            } ${
              t.disabled
                ? "text-muted-foreground/40 cursor-not-allowed"
                : tab === t.key
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        <div
          ref={indicatorRef}
          className="tab-indicator absolute bottom-0 left-0 h-[2px] bg-foreground"
        />
      </div>

      <div key={tab} className="tab-content-enter">
        {tab === "shorten" ? (
          <ShortenerForm signedIn={signedIn} />
        ) : tab === "bulk" && signedIn ? (
          <BulkForm />
        ) : (
          <div className="border border-border bg-card py-12 px-6 text-center">
            <Lock className="h-6 w-6 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">
              unshorten is coming soon.
            </p>
          </div>
        )}
      </div>

      <LegalDialog page={legalPage} onClose={() => setLegalPage(null)} />
    </>
  );
}

function HeroTagline() {
  return (
    <p className="text-[11px] text-muted-foreground mb-4 tracking-wide text-gradient">
      Shorten. Claim. Track. Free forever.
    </p>
  );
}
