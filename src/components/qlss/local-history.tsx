"use client";

import { useEffect, useState, useCallback } from "react";
import {
  History,
  Copy,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { t, getLanguage } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "qlss:local-history";
const MAX_ITEMS = 10;

export interface LocalHistoryItem {
  slug: string;
  short_url: string;
  destination_url: string;
  created_at: number;
}

// ─── Storage helpers (all wrapped in try/catch for private mode + quota) ──

function isValidItem(it: unknown): it is LocalHistoryItem {
  if (!it || typeof it !== "object") return false;
  const v = it as Record<string, unknown>;
  return (
    typeof v.slug === "string" &&
    typeof v.short_url === "string" &&
    typeof v.destination_url === "string" &&
    typeof v.created_at === "number"
  );
}

export function loadHistory(): LocalHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidItem)
      .slice(0, MAX_ITEMS) as LocalHistoryItem[];
  } catch {
    return [];
  }
}

export function saveHistory(items: LocalHistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    // Dispatch a custom event so the LocalHistory component (same tab) can
    // re-read state. The native `storage` event only fires in *other* tabs.
    window.dispatchEvent(new Event("qlss:local-history-changed"));
  } catch {
    // localStorage unavailable (private mode, quota) — silently ignore
  }
}

export function addToHistory(item: LocalHistoryItem): LocalHistoryItem[] {
  const current = loadHistory();
  // Dedupe by slug (case-sensitive) — prepend, removing any prior entry
  const filtered = current.filter((it) => it.slug !== item.slug);
  const next = [item, ...filtered].slice(0, MAX_ITEMS);
  saveHistory(next);
  return next;
}

export function clearHistory(): void {
  saveHistory([]);
}

// ─── Formatting helpers ───────────────────────────────────────────────────

function timeAgo(ts: number, lang: string): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 0) return lang === "pl" ? "przed chwilą" : "just now";
  if (seconds < 60) return lang === "pl" ? "przed chwilą" : "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    if (lang === "pl") return `${minutes} min temu`;
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (lang === "pl") return `${hours} godz. temu`;
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (lang === "pl") return `${days} dni temu`;
  return `${days}d ago`;
}

function truncateUrl(url: string, max = 48): string {
  if (url.length <= max) return url;
  return url.slice(0, max - 1) + "…";
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Renders the user's recently-shortened links from localStorage.
 *
 * Decoupled from the shortener forms via a custom event:
 *   `qlss:local-history-add` — detail: LocalHistoryItem
 * Both `shortener-form.tsx` and `bulk-form.tsx` dispatch this after a
 * successful shorten. The component listens for it and prepends the new item.
 *
 * Also listens for cross-tab `storage` events and a same-tab
 * `qlss:local-history-changed` event for full bi-directional sync.
 *
 * Returns null when the history is empty so no empty section is shown.
 */
export function LocalHistory() {
  const [items, setItems] = useState<LocalHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<string>("en");

  useEffect(() => {
    setMounted(true);
    setLang(getLanguage());
    setItems(loadHistory());

    // Custom event: shortener-form & bulk-form dispatch this after a
    // successful shorten.
    const handleAdd = (e: Event) => {
      const ce = e as CustomEvent<LocalHistoryItem>;
      const detail = ce?.detail;
      if (detail && isValidItem(detail)) {
        const next = addToHistory(detail);
        setItems(next);
      }
    };
    window.addEventListener(
      "qlss:local-history-add",
      handleAdd as EventListener
    );

    // Cross-tab sync (fires in other tabs when localStorage changes)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setItems(loadHistory());
      }
    };
    window.addEventListener("storage", handleStorage);

    // Same-tab sync — saveHistory() dispatches this when other code paths
    // mutate the storage directly.
    const handleChanged = () => setItems(loadHistory());
    window.addEventListener("qlss:local-history-changed", handleChanged);

    return () => {
      window.removeEventListener(
        "qlss:local-history-add",
        handleAdd as EventListener
      );
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("qlss:local-history-changed", handleChanged);
    };
  }, []);

  const handleCopy = useCallback((url: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast({
          title: t("common.copied"),
          description: url,
          duration: 2000,
        });
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const handleClear = useCallback(() => {
    clearHistory();
    setItems([]);
  }, []);

  // Hydration safety + "don't render an empty section" requirement.
  if (!mounted || items.length === 0) return null;

  return (
    <section
      aria-labelledby="local-history-heading"
      className="border border-border bg-card card-hover mt-6 animate-fade-in"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <History className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <h2
              id="local-history-heading"
              className="text-xs font-bold tracking-widest text-foreground truncate"
            >
              {t("local_history.title")}
            </h2>
            <p className="text-[10px] text-muted-foreground truncate">
              {t("local_history.subtitle")}
            </p>
          </div>
        </div>
        <span
          className="text-[9px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5 shrink-0"
          title={t("local_history.subtitle")}
        >
          {t("local_history.stored_locally")}
        </span>
      </header>

      <ol className="divide-y divide-border/50 max-h-96 overflow-y-auto custom-scroll">
        {items.map((item, i) => (
          <li
            key={item.slug + ":" + item.created_at}
            className={`group stagger-${Math.min(i + 1, 6)}`}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-muted-foreground/40 text-xs font-mono">
                  /
                </span>
                <a
                  href={item.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground truncate font-mono hover:underline underline-offset-2"
                >
                  {item.slug}
                </a>
                <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-foreground/50 transition-all shrink-0" />
                <span
                  className="text-[11px] text-muted-foreground truncate"
                  title={item.destination_url}
                >
                  {truncateUrl(item.destination_url)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] tabular-nums text-muted-foreground/70">
                  {timeAgo(item.created_at, lang)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(item.short_url)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 touch-target"
                  title={t("local_history.copy")}
                  aria-label={t("local_history.copy")}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="px-4 py-2.5 border-t border-border flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors touch-target"
            >
              <Trash2 className="h-3 w-3" />
              {t("local_history.clear")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("local_history.clear_confirm_title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("local_history.clear_confirm_desc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClear}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {t("local_history.clear")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
