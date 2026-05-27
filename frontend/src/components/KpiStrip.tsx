import type { StatResult } from "../types";
import { formatValue } from "./charts/chartUtils";

interface SummarySeries {
  row_count?: number;
  date_range?: [string, string] | null;
  total_amount?: number | null;
}

interface Props {
  stat: StatResult | undefined;
}

export function KpiStrip({ stat }: Props) {
  const s = (stat?.series as SummarySeries | null) ?? {};
  const hasAmount = s.total_amount !== null && s.total_amount !== undefined;

  const dateRange = s.date_range
    ? `${s.date_range[0].split(" ")[0]} → ${s.date_range[1].split(" ")[0]}`
    : "—";

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-6 py-4 flex divide-x divide-slate-200 mb-6">
      <Tile
        label="Total rows"
        value={s.row_count !== undefined ? formatValue(s.row_count) : "—"}
      />
      <Tile label="Date range" value={dateRange} compact />
      {hasAmount && (
        <Tile label="Total value" value={`$${formatValue(s.total_amount!)}`} />
      )}
    </div>
  );
}

function Tile({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="flex-1 px-6 first:pl-0 last:pr-0">
      <div className={`font-bold text-slate-900 leading-tight ${compact ? "text-xl" : "text-3xl"}`}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-1">{label}</div>
    </div>
  );
}
