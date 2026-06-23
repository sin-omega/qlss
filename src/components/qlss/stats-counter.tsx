"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Activity, Link2, FileText, Users } from "lucide-react";
import { t } from "@/lib/i18n";

type CounterKey = "links" | "clicks" | "markdown" | "accounts";

interface Counter {
  key: CounterKey;
  icon: React.ReactNode;
  value: number;
}

interface StatsResponse {
  ok: boolean;
  links: number;
  clicks: number;
  markdownPages: number;
  accounts: number;
  cached: boolean;
}

/**
 * Compact stats strip for the home page. Shows REAL numbers from /api/stats
 * (60s server cache). No fake incrementing — just the actual database counts.
 *
 * Layout: a single horizontal row that never wraps. Uses short single-word
 * labels (LINKS / CLICKS / MARKDOWN / ACCOUNTS) so they never overlap on
 * narrow screens. Each cell is `min-w-0` + `whitespace-nowrap` to guarantee
 * no overflow even at 320px.
 */
export function StatsCounter() {
  const [counters, setCounters] = useState<Counter[]>([
    { key: "links", icon: <Link2 className="h-3 w-3" />, value: 0 },
    { key: "clicks", icon: <Activity className="h-3 w-3" />, value: 0 },
    { key: "markdown", icon: <FileText className="h-3 w-3" />, value: 0 },
    { key: "accounts", icon: <Users className="h-3 w-3" />, value: 0 },
  ]);
  const [isCached, setIsCached] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // Per-stat accent color (matches the /info grid: emerald / amber / rose / neutral)
  const accentClass: Record<CounterKey, string> = {
    links: "text-emerald-600 dark:text-emerald-400",
    clicks: "text-amber-600 dark:text-amber-400",
    markdown: "text-rose-600 dark:text-rose-400",
    accounts: "text-foreground",
  };

  // Animated count-up for a smooth reveal from 0 → target.
  const animateTo = useCallback((targets: number[]) => {
    const start = performance.now();
    const duration = 800;
    const startVals = counters.map((c) => c.value);

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounters((prev) =>
        prev.map((c, i) => ({
          ...c,
          value: Math.round(startVals[i] + (targets[i] - startVals[i]) * eased),
        })),
      );
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    }
    animRef.current = requestAnimationFrame(step);
  }, [counters]);

  // Fetch real stats on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const data: StatsResponse = await res.json();
        if (cancelled) return;
        setIsCached(!!data.cached);
        setLoaded(true);
        animateTo([
          data.links,
          data.clicks,
          data.markdownPages,
          data.accounts,
        ]);
      } catch {
        // keep zeros
      }
    })();
    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatNumber = useCallback((n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 10_000) return (n / 1_000).toFixed(0) + "k";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
    return n.toLocaleString();
  }, []);

  return (
    <div
      role="region"
      aria-label={t("stats_counter.live_now")}
      className="stats-counter border border-border bg-card overflow-hidden"
    >
      {/* Single row, never wraps, equal columns. min-w-0 + whitespace-nowrap
          guarantees no overlap even at 320px. Short single-word labels. */}
      <div className="grid grid-cols-4 divide-x divide-border">
        {counters.map((counter) => (
          <div
            key={counter.key}
            className="min-w-0 px-1.5 py-2 sm:px-3 sm:py-2.5 flex flex-col items-center justify-center text-center gap-1 transition-colors hover:bg-accent/30"
          >
            <div className={`flex items-center gap-1 min-w-0 ${accentClass[counter.key]}`}>
              <span className="shrink-0 opacity-80">{counter.icon}</span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap opacity-70">
                {t(`stats_counter.label_${counter.key}`)}
              </span>
            </div>
            <div className={`text-sm sm:text-base font-bold tabular-nums font-mono leading-none ${accentClass[counter.key]}`}>
              {loaded ? formatNumber(counter.value) : "—"}
            </div>
          </div>
        ))}
      </div>
      {/* Live indicator strip */}
      <div className="px-3 py-1 border-t border-border bg-background/40 flex items-center justify-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          {isCached ? (
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
          ) : (
            <>
              <span className="live-dot-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="live-dot-core relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </>
          )}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          {isCached ? t("stats_counter.cached") : t("stats_counter.live_now")}
        </span>
      </div>
    </div>
  );
}
