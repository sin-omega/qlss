"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Activity, Link2, FileText, Users } from "lucide-react";

type CounterKey = "links" | "clicks" | "markdown" | "accounts";

interface Counter {
  key: CounterKey;
  icon: React.ReactNode;
  value: number;
}

const MOCK_DATA = {
  links: 184213,
  clicks: 1402133,
  markdownPages: 9412,
  accounts: 12847,
};

export function StatsCounter() {
  const [counters, setCounters] = useState<Counter[]>([
    { key: "links", icon: <Link2 className="h-3 w-3" />, value: 0 },
    { key: "clicks", icon: <Activity className="h-3 w-3" />, value: 0 },
    { key: "markdown", icon: <FileText className="h-3 w-3" />, value: 0 },
    { key: "accounts", icon: <Users className="h-3 w-3" />, value: 0 },
  ]);
  const [loaded, setLoaded] = useState(false);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  const accentClass: Record<CounterKey, string> = {
    links: "text-emerald-600 dark:text-emerald-400",
    clicks: "text-amber-600 dark:text-amber-400",
    markdown: "text-rose-600 dark:text-rose-400",
    accounts: "text-foreground",
  };

  const animateTo = useCallback((targets: number[]) => {
    const start = performance.now();
    const duration = 800;
    const startVals = counters.map((c) => c.value);

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) throw new Error("not ok");
        const data = await res.json();
        if (cancelled) return;
        setLoaded(true);
        animateTo([data.links, data.clicks, data.markdownPages, data.accounts]);
      } catch {
        if (cancelled) return;
        setLoaded(true);
        animateTo([MOCK_DATA.links, MOCK_DATA.clicks, MOCK_DATA.markdownPages, MOCK_DATA.accounts]);
      }
    })();
    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 10_000) return (n / 1_000).toFixed(0) + "k";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
    return n.toLocaleString();
  };

  return (
    <div
      role="region"
      aria-label="live stats"
      className="stats-counter border border-border bg-card overflow-hidden"
    >
      <div className="grid grid-cols-4 divide-x divide-border">
        {counters.map((counter) => (
          <div
            key={counter.key}
            className="min-w-0 px-1.5 py-2 sm:px-3 sm:py-2.5 flex flex-col items-center justify-center text-center gap-1"
          >
            <div className={`flex items-center gap-1 min-w-0 ${accentClass[counter.key]}`}>
              <span className="shrink-0 opacity-80">{counter.icon}</span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap opacity-70">
                {counter.key}
              </span>
            </div>
            <div className={`text-sm sm:text-base font-bold tabular-nums font-mono leading-none ${accentClass[counter.key]}`}>
              {loaded ? formatNumber(counter.value) : "—"}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-1 border-t border-border bg-background/40 flex items-center justify-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="live-dot-core relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">live</span>
      </div>
    </div>
  );
}
