"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, ArrowRight } from "lucide-react";
import { t } from "@/lib/i18n";
import { FeedSkeleton } from "@/components/qlss/feed-skeleton";

interface RecentLink {
  slug: string;
  created_at: string;
  ago: string;
}

interface RecentResponse {
  ok: boolean;
  links: RecentLink[];
  cached: boolean;
}

const POLL_INTERVAL_MS = 15_000;

/**
 * Recently Shortened live feed — shows the 8 most recently created short links.
 * Fetches from /api/recent on mount and polls every 15 seconds.
 * Compact, terminal-like styling matching the QLSS aesthetic.
 */
export function RecentFeed() {
  const [links, setLinks] = useState<RecentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/recent", { cache: "no-store" });
      if (!res.ok) return;
      const data: RecentResponse = await res.json();
      if (data.links && data.links.length >= 0) {
        setLinks(data.links);
      }
    } catch {
      // keep existing data or empty
    } finally {
      setLoading(false);
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <section
      aria-labelledby="recent-heading"
      className={`border border-border bg-card card-hover scan-card mt-6 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <h2
            id="recent-heading"
            className="text-xs font-bold tracking-widest text-foreground truncate"
          >
            {t("recent.title")}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="activity-dot" aria-hidden="true" />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
            {t("recent.live")}
          </span>
        </div>
      </header>

      {loading && links.length === 0 ? (
        <FeedSkeleton rows={6} variant="recent" />
      ) : links.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
          {t("recent.no_links")}
        </div>
      ) : (
        <ol className="divide-y divide-border/50">
          {links.map((link) => (
            <li key={link.slug + link.created_at}>
              <a
                href={`/${link.slug}`}
                className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-muted-foreground/40 group-hover:text-foreground/60 transition-colors text-xs font-mono">
                    /
                  </span>
                  <span className="text-sm font-medium text-foreground truncate group-hover:underline underline-offset-2">
                    {link.slug}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-foreground/50 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground/70 shrink-0">
                  {link.ago}
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
