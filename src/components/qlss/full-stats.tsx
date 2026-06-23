"use client";

import { useEffect, useState } from "react";
import { Link2, Activity, FileText, Users, Zap } from "lucide-react";
import { t } from "@/lib/i18n";

interface FullStatsProps {
  links: number;
  clicks: number;
  markdownPages: number;
  accounts: number;
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
 * Full statistics panel for the /info page. Renders a responsive 2×2 grid
 * (mobile) / 4×1 row (desktop) of large counters with real numbers fetched
 * from /api/stats. No fake increments — just the real database counts,
 * refreshed every 60s from the server cache.
 */
export function FullStats({ links, clicks, markdownPages, accounts }: FullStatsProps) {
  const [data, setData] = useState({
    links,
    clicks,
    markdownPages,
    accounts,
    cached: false,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const json: StatsResponse = await res.json();
        if (cancelled) return;
        setData({
          links: json.links,
          clicks: json.clicks,
          markdownPages: json.markdownPages,
          accounts: json.accounts,
          cached: !!json.cached,
          loaded: true,
        });
      } catch {
        // keep server-rendered values
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      icon: <Link2 className="h-4 w-4" />,
      label: t("info.total_links"),
      value: data.links,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: <Activity className="h-4 w-4" />,
      label: t("info.total_clicks"),
      value: data.clicks,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: t("info.markdown_published"),
      value: data.markdownPages,
      color: "text-rose-600 dark:text-rose-400",
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: t("info.registered_accounts"),
      value: data.accounts,
      color: "text-foreground",
    },
  ];

  function formatNumber(n: number): string {
    return n.toLocaleString();
  }

  return (
    <div>
      {/* Section header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>{t("info.live_stats")}</span>
          <span className="relative flex h-1.5 w-1.5">
            <span className="live-dot-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="live-dot-core relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
        </div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
          {t("info.stats_title")}
        </h2>
        <div className="mx-auto mt-2 h-[2px] w-16 rounded-full bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("info.stats_subtitle")}
        </p>
      </div>

      {/* Stats grid — 2×2 on mobile, 4×1 on desktop, no overflow */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-card p-4 sm:p-5 flex flex-col items-center text-center min-w-0 card-hover"
          >
            <div className={`mb-2 ${card.color}`}>{card.icon}</div>
            <div
              className={`text-lg sm:text-2xl font-bold tabular-nums font-mono ${card.color} whitespace-nowrap leading-tight`}
            >
              {formatNumber(card.value)}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 leading-tight">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <span
          className={`inline-flex rounded-full h-1.5 w-1.5 ${
            data.cached ? "bg-amber-500" : "bg-emerald-500"
          }`}
        />
        <span>
          {data.cached ? t("info.cached_notice") : t("info.last_updated") + ": just now"}
        </span>
      </div>
    </div>
  );
}
