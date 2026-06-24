"use client";

import { useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { t } from "@/lib/i18n";

interface Shortcut {
  keys: string;
  label: string;
}

/**
 * A `?`-toggleable overlay listing all keyboard shortcuts. Press `?` (or
 * Shift+/) anywhere on the home page to open, `Esc` to close.
 */
export function KeyboardHelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (typing) return;

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const shortcuts: Shortcut[] = [
    { keys: "/", label: t("shortcuts.focus_input") },
    { keys: "Ctrl+K", label: t("shortcuts.focus_input") },
    { keys: "Esc", label: t("shortcuts.clear_input") },
    { keys: "←", label: t("shortcuts.prev_tab") },
    { keys: "→", label: t("shortcuts.next_tab") },
    { keys: "s", label: t("shortcuts.tab_shorten") },
    { keys: "m", label: t("shortcuts.tab_markdown") },
    { keys: "i", label: t("shortcuts.tab_inspect") },
    { keys: "t", label: t("shortcuts.toggle_theme") },
    { keys: "?", label: t("shortcuts.toggle_help") },
  ];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-12 right-4 z-30 text-muted-foreground/40 hover:text-foreground transition-colors touch-target p-1.5"
        aria-label={t("shortcuts.toggle_help")}
        title={t("shortcuts.toggle_help")}
      >
        <Keyboard className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 dialog-backdrop"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative border border-border bg-card max-w-sm w-full mx-4 p-5 animate-scale-in shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors p-1 touch-target"
          aria-label={t("common.close")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          <span className="text-foreground">$</span> qlss --help
        </div>
        <h2 className="text-sm font-bold tracking-tight mb-4">
          {t("shortcuts.title")}
        </h2>
        <ul className="space-y-2">
          {shortcuts.map((s, i) => (
            <li key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="border border-border bg-background px-2 py-0.5 text-[10px] font-mono">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
