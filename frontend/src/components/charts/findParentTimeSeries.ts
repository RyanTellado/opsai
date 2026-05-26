import type { StatResult } from "../../types";

/**
 * Resolve the parent `time_series.*` for an `anomaly_zscore.*_anomalies` key.
 *
 * Convention from `backend/app/services/stats_selector.py`: anomaly aliases
 * are `<metric>_anomalies` and the time series they were computed on has
 * alias `<period>_<metric>`. We try the obvious lookup and fall back to
 * any time_series in the payload with matching base alias.
 */
export function findParentTimeSeries(
  anomalyKey: string,
  payload: Record<string, StatResult>,
): StatResult | undefined {
  if (!anomalyKey.startsWith("anomaly_zscore.")) return undefined;
  const alias = anomalyKey.slice("anomaly_zscore.".length);
  const base = alias.endsWith("_anomalies") ? alias.slice(0, -"_anomalies".length) : alias;

  const direct = payload[`time_series.${base}`];
  if (direct) return direct;

  for (const [key, stat] of Object.entries(payload)) {
    if (!key.startsWith("time_series.")) continue;
    const tsAlias = key.slice("time_series.".length);
    if (tsAlias.endsWith(`_${base}`) || tsAlias === base) return stat;
  }
  return undefined;
}
