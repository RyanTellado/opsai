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
import { COLORS, formatValue, truncate } from "./chartUtils";

interface SeriesPoint {
  entity?: string;
  value?: number | null;
}

interface Props {
  stat: StatResult;
  height?: number;
}

export function TopNChart({ stat, height }: Props) {
  const series = (stat.series as SeriesPoint[] | null) ?? [];
  if (series.length === 0) {
    return <p className="text-sm text-slate-500 italic">No top-N data.</p>;
  }
  const data = series.map((p) => ({
    entity: truncate(String(p.entity ?? ""), 28),
    value: p.value ?? 0,
  }));
  const resolvedHeight = height ?? Math.max(140, data.length * 32 + 40);
  return (
    <ResponsiveContainer width="100%" height={resolvedHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: COLORS.axis, fontSize: 11 }}
          tickFormatter={(v) => formatValue(v)}
        />
        <YAxis
          type="category"
          dataKey="entity"
          tick={{ fill: COLORS.axis, fontSize: 11 }}
          width={120}
        />
        <Tooltip
          formatter={(v: number) => formatValue(v)}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="value" fill={COLORS.accent} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: number) => formatValue(v)}
            style={{ fill: COLORS.primarySoft, fontSize: 11 }}
          />
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? COLORS.accent : COLORS.accentSoft} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
