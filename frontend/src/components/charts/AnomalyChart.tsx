import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatResult } from "../../types";
import { COLORS, formatPeriod, formatValue } from "./chartUtils";

interface FlaggedPoint {
  period?: string;
  value?: number | null;
  zscore?: number;
  rolling_mean?: number;
  rolling_std?: number;
}

interface ParentPoint {
  period?: string;
  value?: number | null;
}

interface Props {
  anomalyStat: StatResult;
  parentTimeSeries?: StatResult;
  height?: number;
}

export function AnomalyChart({ anomalyStat, parentTimeSeries, height = 200 }: Props) {
  const flagged = (anomalyStat.series as FlaggedPoint[] | null) ?? [];
  const parentSeries = (parentTimeSeries?.series as ParentPoint[] | null) ?? [];

  // Merge: parent line + flagged points overlaid by period
  const flaggedByPeriod = new Map<string, FlaggedPoint>();
  for (const f of flagged) {
    if (f.period) flaggedByPeriod.set(formatPeriod(f.period), f);
  }

  const data = parentSeries.length
    ? parentSeries.map((p) => {
        const k = formatPeriod(p.period ?? "");
        const f = flaggedByPeriod.get(k);
        return {
          period: k,
          value: p.value ?? null,
          flagged: f ? (f.value ?? null) : null,
          zscore: f?.zscore,
        };
      })
    : flagged.map((f) => ({
        period: formatPeriod(f.period ?? ""),
        value: null,
        flagged: f.value ?? null,
        zscore: f.zscore,
      }));

  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No anomalies detected (or insufficient data).
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
        <XAxis dataKey="period" tick={{ fill: COLORS.axis, fontSize: 11 }} minTickGap={20} />
        <YAxis
          tick={{ fill: COLORS.axis, fontSize: 11 }}
          tickFormatter={(v) => formatValue(v)}
          width={56}
        />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(v: number, name: string) => {
            if (name === "flagged") return [`${formatValue(v)} (flagged)`, "value"];
            return [formatValue(v), name];
          }}
        />
        {parentSeries.length > 0 && (
          <Line
            type="monotone"
            dataKey="value"
            stroke={COLORS.accent}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        )}
        <Scatter dataKey="flagged" fill={COLORS.warn} shape="circle" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
