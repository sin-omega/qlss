"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Link as LinkIcon,
  FileText,
  Home,
  List,
  Shield,
  LogIn,
  Sun,
  Moon,
  Keyboard,
  Info,
} from "lucide-react";
import { t } from "@/lib/i18n";

type TabKey = "shorten" | "markdown" | "inspect";
type GroupKey = "actions" | "navigate" | "settings" | "help";

interface Command {
  id: string;
  group: GroupKey;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  /** Extra words the fuzzy search will match against (in addition to label). */
  keywords?: string;
  run: () => void;
}

/**
 * Command Palette — a terminal-styled Cmd+K/Ctrl+K (and Cmd/Ctrl+P) launcher
 * that fuzzy-searches a flat list of commands grouped into Actions / Navigate
 * / Settings / Help. Wired into the root layout so it's available on every
 * page.
 *
 * Tab-switching works on every page: if the user is not on `/`, the palette
 * navigates to `/?tab=<key>` and `HomeContent` reads the query param on mount.
 * If the user is already on `/`, we dispatch a `qlss:switch-tab` CustomEvent
 * that `HomeContent` listens for, so the tab change is instant (no full
 * navigation).
 *
 * The palette registers its keydown handler with `{ capture: true }` so it
 * fires *before* the existing Ctrl+K handler in `ShortenerForm` (which focuses
 * the URL input). It calls `stopPropagation()` + `preventDefault()` on the
 * matching key combo, so the shortener-form handler never sees the event. The
 * `/` shortcut for focusing the input is left untouched.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // ── Command execution helpers ──────────────────────────────────────────

  const switchTab = useCallback(
    (tab: TabKey) => {
      const onHome =
        typeof window !== "undefined" && window.location.pathname === "/";
      if (onHome) {
        // Instant in-place switch — HomeContent listens for this event.
        window.dispatchEvent(
          new CustomEvent<TabKey>("qlss:switch-tab", { detail: tab }),
        );
      } else {
        // Navigate home with the desired tab as a query param. HomeContent
        // reads `tab` on mount and sets its initial tab state accordingly.
        router.push(`/?tab=${tab}`);
      }
    },
    [router],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // ── Command registry ───────────────────────────────────────────────────
  //
  // Rebuilt on every render so `t()` always reflects the current language.
  // The labels are what the fuzzy matcher searches against, so changing
  // language updates the searchable text automatically.

  const commands: Command[] = useMemo(() => {
    return [
      // ── Actions ──
      {
        id: "tab:shorten",
        group: "actions",
        label: t("command_palette.cmd_shorten"),
        icon: <LinkIcon className="h-3.5 w-3.5 shrink-0" />,
        shortcut: "S",
        keywords: "shorten url link create new",
        run: () => switchTab("shorten"),
      },
      {
        id: "tab:markdown",
        group: "actions",
        label: t("command_palette.cmd_markdown"),
        icon: <FileText className="h-3.5 w-3.5 shrink-0" />,
        shortcut: "M",
        keywords: "markdown md publish post",
        run: () => switchTab("markdown"),
      },
      {
        id: "tab:inspect",
        group: "actions",
        label: t("command_palette.cmd_inspect"),
        icon: <Search className="h-3.5 w-3.5 shrink-0" />,
        shortcut: "I",
        keywords: "inspect metadata preview headers",
        run: () => switchTab("inspect"),
      },
      // ── Navigate ──
      {
        id: "nav:home",
        group: "navigate",
        label: t("command_palette.cmd_home"),
        icon: <Home className="h-3.5 w-3.5 shrink-0" />,
        keywords: "home root landing index",
        run: () => router.push("/"),
      },
      {
        id: "nav:info",
        group: "navigate",
        label: t("info.page_subtitle"),
        icon: <Info className="h-3.5 w-3.5 shrink-0" />,
        keywords: "info faq statistics stats about help",
        run: () => router.push("/info"),
      },
      {
        id: "nav:links",
        group: "navigate",
        label: t("command_palette.cmd_links"),
        icon: <List className="h-3.5 w-3.5 shrink-0" />,
        keywords: "my links dashboard history manage",
        run: () => router.push("/links"),
      },
      {
        id: "nav:admin",
        group: "navigate",
        label: t("command_palette.cmd_admin"),
        icon: <Shield className="h-3.5 w-3.5 shrink-0" />,
        keywords: "admin panel moderation manage users",
        run: () => router.push("/admin"),
      },
      {
        id: "nav:auth",
        group: "navigate",
        label: t("command_palette.cmd_auth"),
        icon: <LogIn className="h-3.5 w-3.5 shrink-0" />,
        keywords: "auth sign in login session",
        run: () => router.push("/auth"),
      },

      // ── Settings ──
      {
        id: "set:theme",
        group: "settings",
        label: t("command_palette.cmd_theme"),
        icon:
          theme === "dark" ? (
            <Sun className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Moon className="h-3.5 w-3.5 shrink-0" />
          ),
        shortcut: "T",
        keywords: "theme dark light mode toggle appearance",
        run: toggleTheme,
      },

      // ── Help ──
      {
        id: "help:shortcuts",
        group: "help",
        label: t("command_palette.cmd_help"),
        icon: <Keyboard className="h-3.5 w-3.5 shrink-0" />,
        shortcut: "?",
        keywords: "help keyboard shortcuts cheatsheet",
        run: () => {
          // KeyboardHelpOverlay listens for the `?` keydown — dispatch a
          // synthetic event so it opens regardless of focus.
          window.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "?",
              bubbles: true,
              cancelable: true,
            }),
          );
        },
      },
    ] satisfies Command[];
  }, [router, switchTab, toggleTheme, theme]);

  // ── Fuzzy filter ──────────────────────────────────────────────────────
  //
  // Simple case-insensitive substring match. Scoring:
  //   - exact match (label === query)        → 3
  //   - label starts with query              → 2
  //   - label contains query (or keywords)   → 1
  //   - no match                              → excluded
  // Sorted by score desc, then by original order (stable).

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands
      .map((cmd) => {
        const label = cmd.label.toLowerCase();
        const kw = (cmd.keywords ?? "").toLowerCase();
        let score = 0;
        if (label === q) score = 3;
        else if (label.startsWith(q)) score = 2;
        else if (label.includes(q) || kw.includes(q)) score = 1;
        return { cmd, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.cmd);
  }, [commands, query]);

  // Clamp activeIndex into the filtered list range.
  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(0);
  }, [filtered.length, activeIndex]);

  // Scroll the active row into view inside the scroll container.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLElement>(
      `[data-cmd-index="${activeIndex}"]`,
    );
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  // ── Execute a command ─────────────────────────────────────────────────

  const execute = useCallback((cmd: Command | undefined) => {
    if (!cmd) return;
    // Notify any other listeners that a command was run.
    window.dispatchEvent(
      new CustomEvent<string>("qlss:command", { detail: cmd.id }),
    );
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    // Defer the action until after the dialog closes so focus is released
    // and any navigation/state change happens in a clean state.
    setTimeout(() => cmd.run(), 0);
  }, []);

  // ── Global keybinding: open with Cmd/Ctrl+K or Cmd/Ctrl+P ─────────────
  //
  // Registered with `capture: true` so we fire BEFORE the existing Ctrl+K
  // handler in `ShortenerForm` (which focuses the URL input). We call
  // `stopPropagation()` + `preventDefault()` on the match so that handler
  // never sees the event. The `/` shortcut is left alone — it still focuses
  // the input on the home page.

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key === "k" || key === "p") {
        // Cmd/Ctrl+K or Cmd/Ctrl+P → toggle the palette.
        e.preventDefault();
        e.stopPropagation();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, {
        capture: true,
      } as EventListenerOptions);
  }, []);

  // When the dialog opens, focus the input and reset state.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Defer focus to next tick so the input is mounted.
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // ── Keyboard navigation inside the palette ────────────────────────────

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) =>
          filtered.length === 0 ? 0 : (i + 1) % filtered.length,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) =>
          filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        execute(filtered[activeIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [filtered, activeIndex, execute],
  );

  // ── Grouped rendering ─────────────────────────────────────────────────
  //
  // Preserve insertion order: actions → navigate → settings → help. Within
  // each group, keep the filtered/sorted order.

  const groupOrder: GroupKey[] = ["actions", "navigate", "settings", "help"];
  const groupLabel: Record<GroupKey, string> = {
    actions: t("command_palette.group_actions"),
    navigate: t("command_palette.group_navigate"),
    settings: t("command_palette.group_settings"),
    help: t("command_palette.group_help"),
  };

  // Build a stable flat index map for keyboard nav / scroll-into-view.
  const flatIndexById = new Map<string, number>();
  let flatI = 0;
  for (const cmd of filtered) flatIndexById.set(cmd.id, flatI++);

  // Group the filtered list, preserving insertion order.
  const groups = groupOrder
    .map((g) => ({
      group: g,
      items: filtered.filter((cmd) => cmd.group === g),
    }))
    .filter((g) => g.items.length > 0);

  // Selected item accent — emerald (project accent color, never indigo/blue).
  const accentColor = theme === "dark" ? "bg-emerald-500" : "bg-emerald-600";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[10vh] translate-y-0 left-1/2 -translate-x-1/2 p-0 gap-0 sm:max-w-lg max-h-[80vh] overflow-hidden border-border bg-card font-mono shadow-lg rounded-sm"
        onOpenAutoFocus={(e) => {
          // Prevent Radix from stealing focus from our search input.
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          {t("command_palette.placeholder")}
        </DialogDescription>

        {/* Search input row */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Search
            className="h-3.5 w-3.5 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("command_palette.placeholder")}
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
            aria-label={t("command_palette.placeholder")}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="ml-auto text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded shrink-0">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto custom-scroll py-1"
          role="listbox"
          aria-label="Commands"
        >
          {groups.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {t("command_palette.no_results")}
            </div>
          ) : (
            groups.map(({ group, items }) => (
              <div key={group} role="group" aria-label={groupLabel[group]}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 py-1.5 select-none">
                  {groupLabel[group]}
                </div>
                {items.map((cmd) => {
                  const idx = flatIndexById.get(cmd.id) ?? 0;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      data-cmd-index={idx}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => setActiveIndex(idx)}
                      onClick={() => execute(cmd)}
                      className={`relative flex items-center gap-3 w-full px-3 py-2.5 text-sm cursor-pointer transition-colors text-left ${
                        isActive
                          ? "bg-accent text-foreground"
                          : "text-foreground/90 hover:bg-accent/50"
                      }`}
                    >
                      {/* Left accent bar on the active row */}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className={`absolute left-0 top-0 bottom-0 w-0.5 ${accentColor}`}
                        />
                      )}
                      <span
                        className={`shrink-0 ${
                          isActive ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {cmd.icon}
                      </span>
                      <span className="truncate">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="ml-auto text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded shrink-0">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center px-3 py-2 border-t border-border bg-background/40 text-[10px] text-muted-foreground">
          <span>{t("command_palette.footer_hint")}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
