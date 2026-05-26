import type { StatResult } from "../../types";
import { formatValue } from "./chartUtils";

interface SummarySeries {
  row_count?: number;
  date_range?: [string, string] | null;
  total_amount?: number | null;
}

interface Props {
  stat: StatResult;
}

export function SummaryTile({ stat }: Props) {
  const s = (stat.series as SummarySeries | null) ?? {};
  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <Tile label="Rows" value={s.row_count !== undefined ? formatValue(s.row_count) : "—"} />
      <Tile
        label="Date range"
        value={
          s.date_range
            ? `${s.date_range[0].split(" ")[0]} → ${s.date_range[1].split(" ")[0]}`
            : "—"
        }
        small
      />
      <Tile
        label="Total"
        value={s.total_amount !== null && s.total_amount !== undefined ? formatValue(s.total_amount) : "—"}
      />
    </div>
  );
}

function Tile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`font-mono ${small ? "text-xs" : "text-sm"} text-slate-900`}>{value}</div>
    </div>
  );
}
