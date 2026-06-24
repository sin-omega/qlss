"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Link as LinkIcon, Search, Plus } from "lucide-react";
import { ShortenerForm } from "@/components/qlss/shortener-form";
import { InspectUnifiedForm } from "@/components/qlss/inspect-unified-form";

type Tab = "shorten" | "inspect";

export function HomeContent({ signedIn }: { signedIn: boolean }) {
  const [tab, setTab] = useState<Tab>("shorten");

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const shortenBtnRef = useRef<HTMLButtonElement>(null);
  const inspectBtnRef = useRef<HTMLButtonElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const activeBtnRef =
    tab === "shorten" ? shortenBtnRef : inspectBtnRef;

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

  useEffect(() => { updateIndicator(); }, [tab, updateIndicator]);
  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("tab");
      if (q === "shorten" || q === "inspect") setTab(q);
    }
    function handler(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "shorten" || detail === "inspect") setTab(detail);
    }
    window.addEventListener("qlss:switch-tab", handler);
    return () => window.removeEventListener("qlss:switch-tab", handler);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const tabs: Tab[] = ["shorten", "inspect"];
        const idx = tabs.indexOf(tab);
        const next = e.key === "ArrowRight" ? Math.min(idx + 1, tabs.length - 1) : Math.max(idx - 1, 0);
        setTab(tabs[next]);
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === "s") { e.preventDefault(); setTab("shorten"); }
        else if (key === "i") { e.preventDefault(); setTab("inspect"); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; ref: React.RefObject<HTMLButtonElement | null> }[] = [
    { key: "shorten", label: "shorten", icon: <LinkIcon className="h-3.5 w-3.5" />, ref: shortenBtnRef },
    { key: "inspect", label: "inspect", icon: <Search className="h-3.5 w-3.5" />, ref: inspectBtnRef },
  ];

  return (
    <>
      <div ref={tabContainerRef} className="relative flex border border-border bg-card mb-4 tabs-container" role="tablist" aria-label="Choose action">
        {tabs.map((tb, i) => (
          <button
            key={tb.key} ref={tb.ref} type="button" role="tab"
            aria-selected={tab === tb.key} aria-label={tb.label}
            tabIndex={tab === tb.key ? 0 : -1}
            onClick={() => setTab(tb.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2.5 text-xs transition-colors touch-target btn-press ${
              i > 0 ? "border-l border-border" : ""
            } ${
              tab === tb.key ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {tb.icon}
            <span className="tab-label hidden sm:inline">{tb.label}</span>
          </button>
        ))}
        <div ref={indicatorRef} className="tab-indicator absolute bottom-0 left-0 h-[2px] bg-foreground" />
      </div>

      <div key={tab} className="tab-content-enter mb-3 sm:mb-4">
        {tab === "shorten" ? <ShortenerForm signedIn={signedIn} /> : <InspectUnifiedForm />}
      </div>
    </>
  );
}
