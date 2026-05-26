import type { StatResult } from "../../types";
import { StatBadge } from "../StatBadge";
import { AnomalyChart } from "./AnomalyChart";
import { CategoryDistributionChart } from "./CategoryDistributionChart";
import { NullRatesChart } from "./NullRatesChart";
import { PeriodOverPeriodChart } from "./PeriodOverPeriodChart";
import { SummaryTile } from "./SummaryTile";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { TopNChart } from "./TopNChart";
import { findParentTimeSeries } from "./findParentTimeSeries";

interface Props {
  statRef: string;
  stat: StatResult | undefined;
  payload: Record<string, StatResult>;
  primary: string;
  secondary: string;
  secondaryLabel?: string;
  compact?: boolean;
}

export function ChartCard({
  statRef,
  stat,
  payload,
  primary,
  secondary,
  secondaryLabel,
  compact,
}: Props) {
  return (
    <article className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <p className={`text-slate-900 ${compact ? "text-sm" : ""} mb-3`}>{primary}</p>
      <div className="mb-2">{renderChart(statRef, stat, payload, compact)}</div>
      <div className="mt-2">
        <StatBadge statRef={statRef} stat={stat} />
      </div>
      <p className="text-sm text-slate-600 mt-2">
        {secondaryLabel && (
          <span className="font-medium text-slate-700">{secondaryLabel}: </span>
        )}
        {secondary}
      </p>
    </article>
  );
}

export function renderChart(
  statRef: string,
  stat: StatResult | undefined,
  payload: Record<string, StatResult>,
  compact?: boolean,
): React.ReactNode {
  if (!stat) {
    return (
      <p className="text-xs text-red-600 font-mono">unknown stat: {statRef}</p>
    );
  }
  const h = compact ? 130 : 200;
  switch (stat.name) {
    case "time_series":
      return <TimeSeriesChart stat={stat} height={h} />;
    case "topn":
      return <TopNChart stat={stat} />;
    case "anomaly_zscore":
      return (
        <AnomalyChart
          anomalyStat={stat}
          parentTimeSeries={findParentTimeSeries(statRef, payload)}
          height={h}
        />
      );
    case "period_over_period":
      return <PeriodOverPeriodChart stat={stat} height={h} />;
    case "category_distribution":
      return <CategoryDistributionChart stat={stat} />;
    case "null_rates":
      return <NullRatesChart stat={stat} />;
    case "summary":
      return <SummaryTile stat={stat} />;
    default:
      return (
        <p className="text-xs text-slate-500 italic">
          (no chart for stat type: {stat.name})
        </p>
      );
  }
}
