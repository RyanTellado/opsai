import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatResult } from "../../types";
import { COLORS, formatPeriod, formatValue } from "./chartUtils";

interface SeriesPoint {
  period?: string;
  value?: number | null;
}

interface Props {
  stat: StatResult;
  height?: number;
}

export function PeriodOverPeriodChart({ stat, height = 180 }: Props) {
  const series = (stat.series as SeriesPoint[] | null) ?? [];
  if (series.length < 2) {
    return <p className="text-sm text-slate-500 italic">Not enough periods.</p>;
  }
  const data = series.map((p, i) => ({
    period: formatPeriod(p.period ?? ""),
    value: p.value ?? 0,
    role: i === series.length - 1 ? "current" : "prior",
  }));
  const pct = typeof stat.value === "number" ? stat.value : null;
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <YAxis
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            tickFormatter={(v) => formatValue(v)}
            width={56}
          />
          <Tooltip
            formatter={(v: number) => formatValue(v)}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: number) => formatValue(v)}
              style={{ fill: COLORS.primarySoft, fontSize: 11 }}
            />
            {data.map((d, i) => (
              <Cell key={i} fill={d.role === "current" ? COLORS.accent : COLORS.accentSoft} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {pct !== null && (
        <p className={`text-xs mt-1 ${pct >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}% vs prior period
        </p>
      )}
    </div>
  );
}
