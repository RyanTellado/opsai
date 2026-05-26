export const COLORS = {
  primary: "#0f172a",
  primarySoft: "#334155",
  accent: "#2563eb",
  accentSoft: "#3b82f6",
  warn: "#dc2626",
  warnSoft: "#fca5a5",
  grid: "#e2e8f0",
  axis: "#64748b",
};

export function formatValue(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Number.isNaN(v) || !Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    if (abs >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (abs >= 10) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(v);
}

export function formatPeriod(raw: string): string {
  // Server emits periods as ISO timestamps like "2026-03-01 00:00:00".
  const trimmed = raw.split(" ")[0] ?? raw;
  return trimmed;
}

export function truncate(s: string, max = 32): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
