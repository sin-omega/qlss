"use client";

import { useEffect, useState } from "react";
import { Flame, ArrowRight, FileText, ExternalLink } from "lucide-react";
import { t } from "@/lib/i18n";
import { FeedSkeleton } from "@/components/qlss/feed-skeleton";

interface TrendingLink {
  slug: string;
  clicks: number;
  linkType: "redirect" | "markdown";
  createdAt: string;
}

interface TrendingResponse {
  ok: boolean;
  links: TrendingLink[];
  cached: boolean;
}

const FALLBACK_LINKS: TrendingLink[] = [
  { slug: "gh-demo", clicks: 1247, linkType: "redirect", createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { slug: "rfc-3596", clicks: 982, linkType: "markdown", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { slug: "setup-guide", clicks: 731, linkType: "markdown", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString() },
  { slug: "launch-blog", clicks: 612, linkType: "redirect", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString() },
  { slug: "api-docs", clicks: 489, linkType: "markdown", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
];

function formatClicks(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}

function timeAgo(iso: string, lang: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
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

/**
 * Trending links widget — shows the top-5 most-clicked short links.
 * Fetches from /api/trending on mount; falls back to mock data on failure.
 */
export function TrendingLinks() {
  const [mounted, setMounted] = useState(false);
  const [links, setLinks] = useState<TrendingLink[]>(FALLBACK_LINKS);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<string>("en");

  useEffect(() => {
    setMounted(true);
    // Read the language from the cookie for the timeAgo formatter
    const match = document.cookie.match(/(?:^|; )qlss-lang=([^;]+)/);
    if (match) setLang(match[1]);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/trending", { cache: "no-store" });
        if (!res.ok) return;
        const data: TrendingResponse = await res.json();
        if (cancelled) return;
        if (data.links && data.links.length > 0) {
          setLinks(data.links);
        }
      } catch {
        // keep fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxClicks = Math.max(...links.map((l) => l.clicks), 1);

  return (
    <section
      aria-labelledby="trending-heading"
      className="border border-border bg-card card-hover scan-card mt-8"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Flame className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <h2
              id="trending-heading"
              className="text-xs font-bold tracking-widest text-foreground truncate"
            >
              {t("trending.title")}
            </h2>
            <p className="text-[10px] text-muted-foreground truncate">
              {t("trending.subtitle")}
            </p>
          </div>
        </div>
        <span className="activity-dot shrink-0" aria-hidden="true" />
      </header>

      <ol className="divide-y divide-border">
        {loading && links.length === 0 ? (
          <li>
            <FeedSkeleton rows={5} variant="trending" />
          </li>
        ) : links.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-muted-foreground">
            {t("trending.empty")}
          </li>
        ) : (
          links.map((link, idx) => {
            const rank = String(idx + 1).padStart(2, "0");
            const pct = Math.max(8, Math.round((link.clicks / maxClicks) * 100));
            return (
              <li key={link.slug}>
                <a
                  href={`/${link.slug}`}
                  className="trending-link flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group"
                >
                  <span className="trending-rank text-base sm:text-lg font-bold text-muted-foreground/60 group-hover:text-foreground transition-colors w-8 text-center shrink-0">
                    {rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {link.linkType === "markdown" ? (
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm font-medium text-foreground truncate">
                        /{link.slug}
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full bg-muted/40 overflow-hidden rounded-full">
                      <div
                        className="h-full bg-foreground/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[9px] text-muted-foreground/70">
                      {mounted ? timeAgo(link.createdAt, lang) : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-bold tabular-nums text-foreground">
                      {formatClicks(link.clicks)}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      {t("trending.clicks")}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </a>
              </li>
            );
          })
        )}
      </ol>

      <footer className="px-4 py-2.5 border-t border-border bg-background/30 text-center">
        <a
          href="/links"
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors footer-link inline-flex items-center gap-1"
        >
          {t("trending.view_all")}
        </a>
      </footer>
    </section>
  );
}
