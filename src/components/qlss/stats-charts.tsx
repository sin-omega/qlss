"use client";

<<<<<<< HEAD
import { useTheme } from "next-themes";
=======
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
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

interface AnalyticsRowForCharts {
  country: string | null;
  region: string | null;
<<<<<<< HEAD
=======
  city: string | null;
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
  browser_name: string | null;
  device_type: string | null;
  is_bot: boolean;
  clicked_at: string;
}

<<<<<<< HEAD
function useChartColors() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return {
    // Text / axis
    axis: dark ? "#8a8880" : "#6a6a64",
    label: dark ? "#8a8880" : "#6a6a64",
    // Primary stroke / fill
    stroke: dark ? "#e8e6df" : "#0c0c0a",
    gradFrom: dark ? "rgba(232, 230, 223, 0.25)" : "rgba(12, 12, 10, 0.25)",
    gradTo: dark ? "rgba(232, 230, 223, 0)" : "rgba(12, 12, 10, 0)",
    // Tooltip
    tooltipBg: dark ? "#222220" : "#ffffff",
    tooltipBorder: dark ? "#3a3a36" : "#d9d8d0",
    // Pie stroke
    pieStroke: dark ? "#222220" : "#fbfbf9",
    // Bar fill
    barFill: dark ? "#e8e6df" : "#0c0c0a",
    // Bar cursor
    barCursor: dark ? "#333330" : "#ecebe4",
  };
}

export function StatsCharts({ rows }: { rows: AnalyticsRowForCharts[] }) {
  const colors = useChartColors();
  const timeSeries = aggregateTimeSeries(rows);
=======
/**
 * Compact, CLI-styled charts for the per-link stats page.
 *
 * - Clicks over time (last 14 days, area chart)
 * - Top countries (pie chart)
 * - Top regions (pie chart)
 * - Top browsers (horizontal bars)
 * - Top devices (horizontal bars)
 *
 * All monochrome — black ink on paper white, matching the rest of QLSS.
 */
export function StatsCharts({ rows }: { rows: AnalyticsRowForCharts[] }) {
  const timeSeries = aggregateTimeSeries(rows);
  // Convert ISO codes to lowercase human-readable names for the pies.
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
  const topCountries = aggregateTop(
    rows,
    (r) => formatCountryName(r.country),
    5,
  );
  const topRegions = aggregateTop(
    rows,
    (r) => formatRegionName(r.country, r.region),
    5,
  );
  const topBrowsers = aggregateTop(rows, (r) => r.browser_name, 5);
  const topDevices = aggregateTop(rows, (r) => r.device_type, 5);

<<<<<<< HEAD
  const tooltipStyle = {
    background: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 0,
    fontSize: 11,
    fontFamily: "var(--font-mono), monospace",
  };

  return (
    <div className="space-y-3">
=======
  return (
    <div className="space-y-3">
      {/* Clicks over time */}
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
      <ChartCard title="clicks · last 14 days">
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={timeSeries} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
<<<<<<< HEAD
                <stop offset="0%" stopColor={colors.gradFrom} />
                <stop offset="100%" stopColor={colors.gradTo} />
=======
                <stop offset="0%" stopColor="#0c0c0a" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#0c0c0a" stopOpacity={0} />
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
<<<<<<< HEAD
              stroke={colors.axis}
=======
              stroke="#6a6a64"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
              fontSize={9}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
<<<<<<< HEAD
              stroke={colors.axis}
=======
              stroke="#6a6a64"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
              fontSize={9}
              tickLine={false}
              axisLine={false}
              width={24}
              allowDecimals={false}
            />
            <Tooltip
<<<<<<< HEAD
              contentStyle={tooltipStyle}
              labelStyle={{ color: colors.label }}
              cursor={{ stroke: colors.tooltipBorder, strokeWidth: 1 }}
=======
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #d9d8d0",
                borderRadius: 0,
                fontSize: 11,
                fontFamily: "var(--font-mono), monospace",
              }}
              labelStyle={{ color: "#6a6a64" }}
              cursor={{ stroke: "#d9d8d0", strokeWidth: 1 }}
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
            />
            <Area
              type="monotone"
              dataKey="count"
<<<<<<< HEAD
              stroke={colors.stroke}
=======
              stroke="#0c0c0a"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
              strokeWidth={1.5}
              fill="url(#clicksGrad)"
              name="clicks"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

<<<<<<< HEAD
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard title="countries">
          <PieSection data={topCountries} colors={colors} tooltipStyle={tooltipStyle} />
        </ChartCard>
        <ChartCard title="regions">
          <PieSection data={topRegions} colors={colors} tooltipStyle={tooltipStyle} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard title="top browsers">
          <MiniBarChart data={topBrowsers} colors={colors} tooltipStyle={tooltipStyle} />
        </ChartCard>
        <ChartCard title="top devices">
          <MiniBarChart data={topDevices} colors={colors} tooltipStyle={tooltipStyle} />
=======
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
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
        </ChartCard>
      </div>
    </div>
  );
}

<<<<<<< HEAD
=======
// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
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

<<<<<<< HEAD
interface ChartColors {
  label: string;
  pieStroke: string;
  barFill: string;
  barCursor: string;
}

function PieSection({
  data,
  colors,
  tooltipStyle,
}: {
  data: { name: string; count: number }[];
  colors: ChartColors & { tooltipBorder: string; tooltipBg: string };
  tooltipStyle: React.CSSProperties;
}) {
=======
function PieSection({ data }: { data: { name: string; count: number }[] }) {
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
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
<<<<<<< HEAD
            stroke={colors.pieStroke}
=======
            stroke="#fbfbf9"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
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
<<<<<<< HEAD
            contentStyle={tooltipStyle}
            labelStyle={{ color: colors.label }}
=======
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #d9d8d0",
              borderRadius: 0,
              fontSize: 11,
              fontFamily: "var(--font-mono), monospace",
            }}
            labelStyle={{ color: "#6a6a64" }}
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
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

<<<<<<< HEAD
function MiniBarChart({
  data,
  colors,
  tooltipStyle,
}: {
  data: { name: string; count: number }[];
  colors: ChartColors & { axis: string; tooltipBorder: string; tooltipBg: string };
  tooltipStyle: React.CSSProperties;
}) {
=======
function MiniBarChart({ data }: { data: { name: string; count: number }[] }) {
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
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
<<<<<<< HEAD
          stroke={colors.axis}
=======
          stroke="#6a6a64"
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
          fontSize={9}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip
<<<<<<< HEAD
          contentStyle={tooltipStyle}
          labelStyle={{ color: colors.label }}
          cursor={{ fill: colors.barCursor }}
        />
        <Bar dataKey="count" fill={colors.barFill} name="clicks" />
=======
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
        <Bar dataKey="count" fill="#0c0c0a" name="clicks" />
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
      </BarChart>
    </ResponsiveContainer>
  );
}

<<<<<<< HEAD
const PIE_COLORS = [
  "#0c0c0a",
  "#6a6a64",
  "#b08a3e",
  "#2c6e49",
  "#8c4040",
  "#b4b3aa",
=======
// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

// Monochrome-with-a-hint-of-warmth palette. Pies need distinct slices,
// so we cycle through a few shades of ink + warm grays.
const PIE_COLORS = [
  "#0c0c0a", // ink
  "#6a6a64", // mid gray
  "#b08a3e", // warm gold
  "#2c6e49", // deep green
  "#8c4040", // muted red
  "#b4b3aa", // light gray
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
];

function aggregateTimeSeries(
  rows: AnalyticsRowForCharts[],
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
  rows: AnalyticsRowForCharts[],
  selector: (r: AnalyticsRowForCharts) => string | null,
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
<<<<<<< HEAD
}
=======
}
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
