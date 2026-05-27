import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatResult } from "../../types";
import { COLORS, truncate } from "./chartUtils";

const PIE_COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#db2777", "#d97706", "#16a34a"];

interface SeriesPoint {
  category?: string;
  count?: number;
  pct?: number;
}

interface Props {
  stat: StatResult;
  height?: number;
}

export function CategoryDistributionChart({ stat, height }: Props) {
  const series = (stat.series as SeriesPoint[] | null) ?? [];
  if (series.length === 0) {
    return <p className="text-sm text-slate-500 italic">No category data.</p>;
  }
  const data = series.slice(0, 10).map((p) => ({
    category: truncate(String(p.category ?? ""), 28),
    pct: p.pct ?? 0,
    count: p.count ?? 0,
  }));

  if (data.length <= 6) {
    return (
      <ResponsiveContainer width="100%" height={height ?? 200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="pct"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={70}
            label={({ pct }: { pct: number }) => `${pct}%`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string, payload: { payload?: { count?: number } }) => [
              `${v}% (${payload?.payload?.count ?? "—"} rows)`,
              name,
            ]}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend
            iconSize={10}
            formatter={(value) => (
              <span style={{ fontSize: 11, color: COLORS.axis }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const resolvedHeight = height ?? Math.max(140, data.length * 28 + 40);
  return (
    <ResponsiveContainer width="100%" height={resolvedHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: COLORS.axis, fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
          domain={[0, "dataMax"]}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fill: COLORS.axis, fontSize: 11 }}
          width={120}
        />
        <Tooltip
          formatter={(v: number, _: unknown, payload: { payload?: { count?: number } }) => [
            `${v}% (${payload?.payload?.count ?? "—"} rows)`,
            "share",
          ]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="pct" fill={COLORS.accent} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="pct"
            position="right"
            formatter={(v: number) => `${v}%`}
            style={{ fill: COLORS.primarySoft, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
