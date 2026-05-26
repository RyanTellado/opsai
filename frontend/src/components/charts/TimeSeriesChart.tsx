import {
  CartesianGrid,
  Line,
  LineChart,
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

export function TimeSeriesChart({ stat, height = 180 }: Props) {
  const series = (stat.series as SeriesPoint[] | null) ?? [];
  if (series.length === 0) {
    return <p className="text-sm text-slate-500 italic">No series data.</p>;
  }
  const data = series.map((p) => ({
    period: formatPeriod(p.period ?? ""),
    value: p.value ?? null,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
        <XAxis dataKey="period" tick={{ fill: COLORS.axis, fontSize: 11 }} minTickGap={20} />
        <YAxis
          tick={{ fill: COLORS.axis, fontSize: 11 }}
          tickFormatter={(v) => formatValue(v)}
          width={56}
        />
        <Tooltip
          formatter={(v: number) => formatValue(v)}
          labelStyle={{ color: COLORS.primary }}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={COLORS.accent}
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
