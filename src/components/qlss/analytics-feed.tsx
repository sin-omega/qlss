import { formatLocation } from "@/lib/geo";

interface AnalyticsRow {
  id: string;
  ip_address: string | null;
  asn: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  user_agent: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_type: string | null;
  is_bot: boolean;
  referer: string | null;
  language: string | null;
  clicked_at: string;
}

/**
 * CLI-styled flat list of recent visitors. Each entry is a compact,
 * monospaced record — feels like tailing a log.
 *
 * Layout per row:
 *   [time] [IP] · [estimated location]              [ASN] [bot]
 *     [browser] · [os] · [device] · [referer]
 */
export function AnalyticsFeed({ rows }: { rows: AnalyticsRow[] }) {
  return (
    <div className="border border-border bg-card">
      <ul>
        {rows.map((row, i) => (
          <li key={row.id}>
            <VisitorRow row={row} />
            {i < rows.length - 1 && <hr className="hr-dashed border-0" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function VisitorRow({ row }: { row: AnalyticsRow }) {
  // Use the geo helper to convert ISO codes to lowercase "region, country"
  // e.g. "mazowieckie, poland". Falls back to null if both are missing.
  const location = formatLocation(row.country, row.region);
  const when = formatWhen(row.clicked_at, row.timezone);
  const browser = formatBrowser(row);
  const os = row.os_name
    ? `${row.os_name}${row.os_version ? ` ${row.os_version}` : ""}`
    : "—";
  const referer = formatReferer(row.referer);

  return (
    <div className="px-4 py-2.5 text-xs leading-relaxed">
      {/* Line 1: time · IP · estimated location · ASN · bot badge */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
          <span className="text-muted-foreground tabular-nums shrink-0">
            {when}
          </span>
          <span className="text-foreground font-medium shrink-0">
            {row.ip_address ?? "—"}
          </span>
          {location && (
            <span className="text-muted-foreground shrink-0">
              · {location}
            </span>
          )}
          {row.is_bot && (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5 shrink-0">
              bot
            </span>
          )}
        </div>
        <span className="text-muted-foreground shrink-0 text-[11px]">
          {row.asn ?? "—"}
        </span>
      </div>

      {/* Line 2: browser · os · device · referer */}
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-muted-foreground text-[11px]">
        <span>
          <span className="text-muted-foreground/70">brw</span>{" "}
          <span className="text-foreground/90">{browser ?? "—"}</span>
        </span>
        <span>
          <span className="text-muted-foreground/70">os</span>{" "}
          <span className="text-foreground/90">{os}</span>
        </span>
        <span>
          <span className="text-muted-foreground/70">dev</span>{" "}
          <span className="text-foreground/90">{row.device_type ?? "—"}</span>
        </span>
        <span>
          <span className="text-muted-foreground/70">ref</span>{" "}
          <span className="text-foreground/90">{referer ?? "direct"}</span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatBrowser(row: AnalyticsRow): string | null {
  if (!row.browser_name) return null;
  return `${row.browser_name}${
    row.browser_version ? ` ${row.browser_version}` : ""
  }`;
}

function formatWhen(iso: string, timezone: string | null): string {
  try {
    const date = new Date(iso);
    const fmt = new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone ?? undefined,
    });
    return fmt.format(date);
  } catch {
    return iso;
  }
}

function formatReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    return url.host;
  } catch {
    return referer;
  }
}
