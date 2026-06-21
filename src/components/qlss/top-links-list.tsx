import Link from "next/link";

interface TopLink {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  clicks: number;
}

/**
 * Top 5 links by clicks, shown on the overview page.
 */
export function TopLinksList({
  links,
  origin,
}: {
  links: TopLink[];
  origin: string;
}) {
  const maxClicks = Math.max(...links.map((l) => l.clicks), 1);

  return (
    <ul className="space-y-1">
      {links.map((link, i) => {
        const shortUrl = `${origin}/${link.slug}`;
        const pct = (link.clicks / maxClicks) * 100;
        return (
          <li key={link.id}>
            <Link
              href={`/stats/${link.slug}`}
              className="block py-2 -mx-2 px-2 hover:bg-accent/40 transition-colors group"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-xs font-medium truncate group-hover:underline">
                    {shortUrl}
                  </span>
                </div>
                <span className="text-xs text-foreground font-medium tabular-nums shrink-0">
                  {link.clicks}
                </span>
              </div>
              {/* Mini bar */}
              <div className="mt-1 h-1 bg-secondary">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
