"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCountryName, formatRegionName } from "@/lib/geo";

interface ViewRow {
  country: string | null;
  region: string | null;
  city: string | null;
  browser_name: string | null;
  device_type: string | null;
  os_name: string | null;
  is_bot: boolean;
  viewed_at: string;
  referer: string | null;
}

/**
 * Detailed charts for profile page stats — mirrors the link stats charts
 * but operates on profile_views data.
 */
export function ProfileStatsCharts({ rows }: { rows: ViewRow[] }) {
  const realRows = rows.filter((r) => !r.is_bot);
  const timeSeries = aggregateTimeSeries(realRows);
  const topCountries = aggregateTop(
    realRows,
    (r) => formatCountryName(r.country),
    5,
  );
  const topRegions = aggregateTop(
    realRows,
    (r) => formatRegionName(r.country, r.region),
    5,
  );
  const topBrowsers = aggregateTop(realRows, (r) => r.browser_name, 5);
  const topDevices = aggregateTop(realRows, (r) => r.device_type, 5);
  const topOs = aggregateTop(realRows, (r) => r.os_name, 5);

  return (
    <div className="space-y-3">
      {/* Views over time */}
      <ChartCard title="views · last 14 days">
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={timeSeries} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="profileViewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0c0c0a" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#0c0c0a" stopOpacity={0} />
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
              stroke="#0c0c0a"
              strokeWidth={1.5}
              fill="url(#profileViewsGrad)"
              name="views"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Pies: countries + regions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard title="countries">
          <PieSection data={topCountries} />
        </ChartCard>
        <ChartCard title="regions">
          <PieSection data={topRegions} />
        </ChartCard>
      </div>

      {/* Bars: browsers + devices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard title="top browsers">
          <MiniBarChart data={topBrowsers} />
        </ChartCard>
        <ChartCard title="top devices">
          <MiniBarChart data={topDevices} />
        </ChartCard>
      </div>

      {/* OS */}
      <ChartCard title="top operating systems">
        <MiniBarChart data={topOs} />
      </ChartCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card">
      <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function PieSection({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[140px] flex items-center justify-center text-[11px] text-muted-foreground">
        no data
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <ResponsiveContainer width="50%" height={140}>
        <PieChart>
          <Pie
            data={data}
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
            {data.map((entry, i) => (
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
            labelStyle={{ color: "#6a6a64" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-1 text-[11px]">
        {data.map((entry, i) => (
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
  );
}

function MiniBarChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[100px] flex items-center justify-center text-[11px] text-muted-foreground">
        no data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#6a6a64"
          fontSize={9}
          tickLine={false}
          axisLine={false}
          width={70}
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
          cursor={{ fill: "#ecebe4" }}
        />
        <Bar dataKey="count" fill="#0c0c0a" name="views" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

const PIE_COLORS = [
  "#0c0c0a",
  "#6a6a64",
  "#b08a3e",
  "#2c6e49",
  "#8c4040",
  "#b4b3aa",
];

function aggregateTimeSeries(
  rows: ViewRow[],
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
    const key = row.viewed_at.slice(0, 10);
    const day = byDate.get(key);
    if (day) day.count++;
  }

  return days;
}

function aggregateTop(
  rows: ViewRow[],
  selector: (r: ViewRow) => string | null,
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
