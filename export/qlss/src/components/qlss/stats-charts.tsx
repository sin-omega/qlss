"use client";

import { useTheme } from "next-themes";
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
import { formatCountryName, formatRegionName } from "@/lib/geo";

interface AnalyticsRowForCharts {
  country: string | null;
  region: string | null;
  browser_name: string | null;
  device_type: string | null;
  is_bot: boolean;
  clicked_at: string;
}

function useChartColors() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return {
    axis: dark ? "#8a8880" : "#6a6a64",
    label: dark ? "#8a8880" : "#6a6a64",
    stroke: dark ? "#e8e6df" : "#0c0c0a",
    gradFrom: dark ? "rgba(232, 230, 223, 0.25)" : "rgba(12, 12, 10, 0.25)",
    gradTo: dark ? "rgba(232, 230, 223, 0)" : "rgba(12, 12, 10, 0)",
    tooltipBg: dark ? "#222220" : "#ffffff",
    tooltipBorder: dark ? "#3a3a36" : "#d9d8d0",
    pieStroke: dark ? "#222220" : "#fbfbf9",
  };
}

export function StatsCharts({ rows }: { rows: AnalyticsRowForCharts[] }) {
  const colors = useChartColors();
  const dark = colors.pieStroke === "#222220";
  const pieColors = dark ? PIE_COLORS_DARK : PIE_COLORS_LIGHT;
  const timeSeries = aggregateTimeSeries(rows);
  const topCountries = aggregateTop(rows, (r) => formatCountryName(r.country), 5);
  const topRegions = aggregateTop(rows, (r) => formatRegionName(r.country, r.region), 5);
  const topBrowsers = aggregateTop(rows, (r) => r.browser_name, 5);
  const topDevices = aggregateTop(rows, (r) => r.device_type, 5);

  const tooltipStyle = {
    background: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 0,
    fontSize: 11,
    fontFamily: "var(--font-mono), monospace",
  };

  return (
    <div className="space-y-3">
      <ChartCard title="clicks · last 14 days">
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={timeSeries} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.gradFrom} />
                <stop offset="100%" stopColor={colors.gradTo} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              stroke={colors.axis}
              fontSize={9}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke={colors.axis}
              fontSize={9}
              tickLine={false}
              axisLine={false}
              width={24}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: colors.label }}
              cursor={{ stroke: colors.tooltipBorder, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={colors.stroke}
              strokeWidth={1.5}
              fill="url(#clicksGrad)"
              name="clicks"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard title="countries">
          <PieSection data={topCountries} colors={colors} pieColors={pieColors} tooltipStyle={tooltipStyle} />
        </ChartCard>
        <ChartCard title="regions">
          <PieSection data={topRegions} colors={colors} pieColors={pieColors} tooltipStyle={tooltipStyle} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard title="top browsers">
          <PieSection data={topBrowsers} colors={colors} pieColors={pieColors} tooltipStyle={tooltipStyle} />
        </ChartCard>
        <ChartCard title="top devices">
          <PieSection data={topDevices} colors={colors} pieColors={pieColors} tooltipStyle={tooltipStyle} />
        </ChartCard>
      </div>
    </div>
  );
}

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

interface ChartColors {
  label: string;
  pieStroke: string;
}

function PieSection({
  data,
  colors,
  pieColors,
  tooltipStyle,
}: {
  data: { name: string; count: number }[];
  colors: ChartColors & { tooltipBorder: string; tooltipBg: string };
  pieColors: string[];
  tooltipStyle: React.CSSProperties;
}) {
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
            stroke={colors.pieStroke}
            strokeWidth={1}
          >
            {data.map((_entry, i) => (
              <Cell key={`cell-${i}`} fill={pieColors[i % pieColors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: colors.label }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-1 text-[11px]">
        {data.map((entry, i) => (
          <li key={entry.name} className="flex items-baseline gap-1.5">
            <span
              className="inline-block w-2 h-2 shrink-0"
              style={{ background: pieColors[i % pieColors.length] }}
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

const PIE_COLORS_LIGHT = [
  "#0c0c0a",
  "#6a6a64",
  "#b08a3e",
  "#2c6e49",
  "#8c4040",
  "#b4b3aa",
];

const PIE_COLORS_DARK = [
  "#e8e6df",
  "#b08a3e",
  "#3ebd65",
  "#e06060",
  "#7cb3d4",
  "#c8a8e0",
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
}
