"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Link, Undo2, FileText, Search } from "lucide-react";
import { ShortenerForm } from "@/components/qlss/shortener-form";
import { UnshortenerForm } from "@/components/qlss/unshortener-form";
import { MarkdownForm } from "@/components/qlss/markdown-form";
import { InspectUnifiedForm } from "@/components/qlss/inspect-unified-form";
import { LegalDialog } from "@/components/qlss/legal-dialog";
import { HomeNotConfigured } from "@/components/qlss/home-not-configured";
import { t } from "@/lib/i18n";

type Tab = "shorten" | "unshorten" | "markdown" | "inspect";
type LegalPage = "privacy" | "tos" | "abuse" | null;

/**
 * Tabs that genuinely require Supabase to function (link creation / markdown
 * publishing). The unshorten / inspect tabs are public utilities that work
 * without any backend.
 */
const TABS_NEEDING_SUPABASE: ReadonlySet<Tab> = new Set([
  "shorten",
  "markdown",
]);

export function HomeContent({ signedIn, configured = true }: { signedIn: boolean; configured?: boolean }) {
  const [tab, setTab] = useState<Tab>("shorten");
  const [legalPage, setLegalPage] = useState<LegalPage>(null);

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const shortenBtnRef = useRef<HTMLButtonElement>(null);
  const unshortenBtnRef = useRef<HTMLButtonElement>(null);
  const markdownBtnRef = useRef<HTMLButtonElement>(null);
  const inspectBtnRef = useRef<HTMLButtonElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const activeBtnRef =
    tab === "shorten"
      ? shortenBtnRef
      : tab === "unshorten"
        ? unshortenBtnRef
        : tab === "markdown"
          ? markdownBtnRef
          : inspectBtnRef;

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

  // Read `?tab=` from URL on mount and listen for `qlss:switch-tab` CustomEvents.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("tab");
      if (
        q === "shorten" ||
        q === "unshorten" ||
        q === "markdown" ||
        q === "inspect"
      ) {
        setTab(q);
      }
    }

    function handler(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (
        detail === "shorten" ||
        detail === "unshorten" ||
        detail === "markdown" ||
        detail === "inspect"
      ) {
        setTab(detail);
      }
    }
    window.addEventListener("qlss:switch-tab", handler);
    return () => window.removeEventListener("qlss:switch-tab", handler);
  }, []);

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
        const tabs: Tab[] = ["shorten", "unshorten", "markdown", "inspect"];
        const idx = tabs.indexOf(tab);
        const next = e.key === "ArrowRight" ? Math.min(idx + 1, tabs.length - 1) : Math.max(idx - 1, 0);
        setTab(tabs[next]);
        return;
      }

      // Direct tab shortcuts: s=shorten, u=unshorten, m=markdown, i=inspect
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === "s") {
          e.preventDefault();
          setTab("shorten");
        } else if (key === "u") {
          e.preventDefault();
          setTab("unshorten");
        } else if (key === "m") {
          e.preventDefault();
          setTab("markdown");
        } else if (key === "i") {
          e.preventDefault();
          setTab("inspect");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab]);

  const tabs: {
    key: Tab;
    label: string;
    icon: React.ReactNode;
    ref: React.RefObject<HTMLButtonElement | null>;
  }[] = [
    { key: "shorten", label: t("home.shorten_tab"), icon: <Link className="h-3.5 w-3.5" />, ref: shortenBtnRef },
    { key: "unshorten", label: t("home.unshorten_tab"), icon: <Undo2 className="h-3.5 w-3.5" />, ref: unshortenBtnRef },
    { key: "markdown", label: t("home.markdown_tab"), icon: <FileText className="h-3.5 w-3.5" />, ref: markdownBtnRef },
    { key: "inspect", label: t("inspector.tab"), icon: <Search className="h-3.5 w-3.5" />, ref: inspectBtnRef },
  ];

  return (
    <>
      <div
        ref={tabContainerRef}
        className="relative flex border border-border bg-card mb-4 tabs-container card-hover"
        role="tablist"
        aria-label="Choose action"
      >
        {tabs.map((tb, i) => (
          <button
            key={tb.key}
            ref={tb.ref}
            type="button"
            role="tab"
            aria-selected={tab === tb.key}
            aria-label={tb.label}
            tabIndex={tab === tb.key ? 0 : -1}
            onClick={() => setTab(tb.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2.5 text-xs transition-colors touch-target btn-press ${
              i > 0 ? "border-l border-border" : ""
            } ${
              tab === tb.key
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {tb.icon}
            <span className="tab-label hidden sm:inline">{tb.label}</span>
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
        ) : tab === "unshorten" ? (
          <UnshortenerForm />
        ) : tab === "markdown" ? (
          <MarkdownForm signedIn={signedIn} />
        ) : (
          <InspectUnifiedForm />
        )}
      </div>

      {/* "Almost ready" warning — only on tabs that genuinely need Supabase. */}
      {!configured && TABS_NEEDING_SUPABASE.has(tab) && <HomeNotConfigured />}

      <LegalDialog page={legalPage} onClose={() => setLegalPage(null)} />
    </>
  );
}
