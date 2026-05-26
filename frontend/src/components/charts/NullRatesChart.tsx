import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatResult } from "../../types";
import { COLORS, truncate } from "./chartUtils";

interface SeriesPoint {
  column?: string;
  null_pct?: number;
}

interface Props {
  stat: StatResult;
  height?: number;
}

export function NullRatesChart({ stat, height }: Props) {
  const series = (stat.series as SeriesPoint[] | null) ?? [];
  if (series.length === 0) {
    return <p className="text-sm text-slate-500 italic">No null-rate data.</p>;
  }
  const data = [...series]
    .sort((a, b) => (b.null_pct ?? 0) - (a.null_pct ?? 0))
    .slice(0, 10)
    .map((p) => ({
      column: truncate(String(p.column ?? ""), 28),
      null_pct: p.null_pct ?? 0,
    }));
  const resolvedHeight = height ?? Math.max(140, data.length * 28 + 40);
  return (
    <ResponsiveContainer width="100%" height={resolvedHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: COLORS.axis, fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
        />
        <YAxis
          type="category"
          dataKey="column"
          tick={{ fill: COLORS.axis, fontSize: 11 }}
          width={120}
        />
        <Tooltip
          formatter={(v: number) => [`${v}%`, "null"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="null_pct" fill={COLORS.warnSoft} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="null_pct"
            position="right"
            formatter={(v: number) => `${v}%`}
            style={{ fill: COLORS.warn, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
