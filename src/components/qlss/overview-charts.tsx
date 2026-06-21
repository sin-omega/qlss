"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCountryName } from "@/lib/geo";

interface OverviewRow {
  country: string | null;
  is_bot: boolean;
  clicked_at: string;
}

/**
 * Aggregate charts for the overview page (across all the user's links).
 * Same monochrome-with-warmth palette as the per-link charts.
 */
export function OverviewCharts({ rows }: { rows: OverviewRow[] }) {
  const timeSeries = aggregateTimeSeries(rows);
  const topCountries = aggregateTop(rows, (r) => formatCountryName(r.country), 5);

  return (
    <div className="space-y-3">
      {/* Clicks over time */}
      <div className="border border-border bg-background">
        <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
          clicks · last 14 days
        </div>
        <div className="p-3">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={timeSeries} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b08a3e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#b08a3e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                stroke="#6a6a64"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#6a6a64"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                width={24}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #d9d8d0",
                  borderRadius: 0,
                  fontSize: 11,
                  fontFamily: "var(--font-mono), monospace",
                }}
                labelStyle={{ color: "#6a6a64" }}
                cursor={{ stroke: "#d9d8d0", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#b08a3e"
                strokeWidth={1.5}
                fill="url(#overviewGrad)"
                name="clicks"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Countries pie */}
      <div className="border border-border bg-background">
        <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
          countries
        </div>
        <div className="p-3">
          {topCountries.length === 0 ? (
            <div className="h-[140px] flex items-center justify-center text-[11px] text-muted-foreground">
              no data
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie
                    data={topCountries}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={56}
                    paddingAngle={1}
                    stroke="#fbfbf9"
                    strokeWidth={1}
                  >
                    {topCountries.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #d9d8d0",
                      borderRadius: 0,
                      fontSize: 11,
                      fontFamily: "var(--font-mono), monospace",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-1 text-[11px]">
                {topCountries.map((entry, i) => (
                  <li key={entry.name} className="flex items-baseline gap-1.5">
                    <span
                      className="inline-block w-2 h-2 shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="truncate flex-1">{entry.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {entry.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PIE_COLORS = [
  "#0c0c0a",
  "#6a6a64",
  "#b08a3e",
  "#2c6e49",
  "#8c4040",
  "#b4b3aa",
];

function aggregateTimeSeries(
  rows: OverviewRow[],
): { date: string; label: string; count: number }[] {
  const days: { date: string; label: string; count: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    });
    days.push({ date: key, label, count: 0 });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const row of rows) {
    const key = row.clicked_at.slice(0, 10);
    const day = byDate.get(key);
    if (day) day.count++;
  }
  return days;
}

function aggregateTop(
  rows: OverviewRow[],
  selector: (r: OverviewRow) => string | null,
  limit: number,
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = selector(row);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
