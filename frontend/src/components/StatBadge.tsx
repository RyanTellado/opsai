import type { StatResult } from "../types";

interface Props {
  statRef: string;
  stat: StatResult | undefined;
}

function formatValue(value: number | string | null): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

export function StatBadge({ statRef, stat }: Props) {
  if (!stat) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-xs font-mono text-red-700">
        unknown stat: {statRef}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono text-slate-800"
      title={stat.description}
    >
      <span className="text-slate-500">{statRef}</span>
      <span className="text-slate-300">·</span>
      <span className="font-semibold text-slate-900">{formatValue(stat.value)}</span>
    </span>
  );
}
