"""Stat templates — deterministic numbers, computed in Python via DuckDB.

The load-bearing rule: the LLM never computes numbers. Briefing + Phase 4
chat both call into this registry; the LLM only writes prose around the
results.

Each function takes (dataset_id, params) and returns:
    {"name": str, "params": dict, "value": float|int|None,
     "series": list|None, "description": str}

Column names are user-supplied (whatever they uploaded), so they are always
passed through `_ident()` which quotes them with SQL double-quotes. Numeric
and enum-like params are validated against fixed allowlists.
"""

from __future__ import annotations

import duckdb
import pandas as pd

from app.storage import paths


def _parquet_ref(dataset_id: str) -> str:
    return f"read_parquet('{paths.dataset_dir(dataset_id) / 'data.parquet'}')"


def _ident(col: str) -> str:
    return '"' + col.replace('"', '""') + '"'


def _query(sql: str) -> pd.DataFrame:
    return duckdb.sql(sql).df()


def _coerce_float(x) -> float | None:
    if x is None or pd.isna(x):
        return None
    return float(x)


_PERIODS = {"day", "week", "month"}
_AGGS = {"sum", "count", "avg"}


def summary(dataset_id: str, params: dict) -> dict:
    """Row count + (optionally) date range + total of an amount column.

    params: {date_col?: str, amount_col?: str}
    """
    date_col = params.get("date_col")
    amount_col = params.get("amount_col")
    parquet = _parquet_ref(dataset_id)

    select_parts = ["COUNT(*) AS row_count"]
    if date_col:
        select_parts.append(f"MIN({_ident(date_col)}) AS min_date")
        select_parts.append(f"MAX({_ident(date_col)}) AS max_date")
    if amount_col:
        select_parts.append(f"SUM({_ident(amount_col)}) AS total_amount")
    df = _query(f"SELECT {', '.join(select_parts)} FROM {parquet}")
    row = df.iloc[0]

    row_count = int(row["row_count"])
    date_range = None
    if date_col:
        date_range = [str(row["min_date"]), str(row["max_date"])]
    total_amount = _coerce_float(row["total_amount"]) if amount_col else None

    desc = f"{row_count:,} rows"
    if date_range:
        desc += f"; date range {date_range[0]} → {date_range[1]}"
    if total_amount is not None:
        desc += f"; total {amount_col} = {total_amount:,.2f}"

    return {
        "name": "summary",
        "params": params,
        "value": row_count,
        "series": {
            "row_count": row_count,
            "date_range": date_range,
            "total_amount": total_amount,
        },
        "description": desc,
    }


def null_rates(dataset_id: str, params: dict) -> dict:
    """% null per column. params: {} (uses all columns)."""
    parquet = _parquet_ref(dataset_id)
    cols = _query(f"SELECT * FROM {parquet} LIMIT 0").columns.tolist()
    parts = [
        f"AVG(CASE WHEN {_ident(c)} IS NULL THEN 1.0 ELSE 0.0 END) * 100 "
        f"AS {_ident('null_pct__' + c)}"
        for c in cols
    ]
    df = _query(f"SELECT {', '.join(parts)} FROM {parquet}")
    series = [
        {"column": c, "null_pct": round(_coerce_float(df.iloc[0][f"null_pct__{c}"]) or 0.0, 2)}
        for c in cols
    ]
    return {
        "name": "null_rates",
        "params": params,
        "value": None,
        "series": series,
        "description": f"Null percentage per column ({len(cols)} columns).",
    }


def time_series(dataset_id: str, params: dict) -> dict:
    """Metric grouped by period.

    params: {date_col: str, amount_col?: str,
             period: 'day'|'week'|'month' = 'month',
             agg: 'sum'|'count'|'avg' = 'sum' if amount_col else 'count'}
    """
    date_col = params["date_col"]
    amount_col = params.get("amount_col")
    period = params.get("period", "month")
    agg = params.get("agg", "sum" if amount_col else "count")
    if period not in _PERIODS:
        raise ValueError(f"period must be one of {_PERIODS}, got {period!r}")
    if agg not in _AGGS:
        raise ValueError(f"agg must be one of {_AGGS}, got {agg!r}")
    if agg != "count" and not amount_col:
        raise ValueError(f"agg={agg!r} requires amount_col")

    value_expr = "COUNT(*)" if agg == "count" else f"{agg.upper()}({_ident(amount_col)})"
    parquet = _parquet_ref(dataset_id)
    df = _query(
        f"SELECT date_trunc('{period}', CAST({_ident(date_col)} AS TIMESTAMP)) AS period, "
        f"{value_expr} AS value "
        f"FROM {parquet} "
        f"WHERE {_ident(date_col)} IS NOT NULL "
        f"GROUP BY 1 ORDER BY 1"
    )
    series = [
        {"period": str(row["period"]), "value": _coerce_float(row["value"])}
        for _, row in df.iterrows()
    ]
    total_value = _coerce_float(df["value"].sum()) if not df.empty else None
    label = amount_col if amount_col else "rows"
    return {
        "name": "time_series",
        "params": params,
        "value": total_value,
        "series": series,
        "description": f"{agg.title()} of {label} per {period} ({len(series)} buckets).",
    }


def period_over_period(dataset_id: str, params: dict) -> dict:
    """Last period vs prior period: % change + absolute delta.

    params: shared with time_series; period defaults to 'month'.
    """
    period = params.get("period", "month")
    ts = time_series(dataset_id, {**params, "period": period})
    series = ts["series"]
    if len(series) < 2:
        return {
            "name": "period_over_period",
            "params": params,
            "value": None,
            "series": series,
            "description": "Not enough periods for comparison.",
        }
    last, prior = series[-1], series[-2]
    last_v, prior_v = last["value"], prior["value"]
    if last_v is None or prior_v in (None, 0):
        pct = None
        delta = None if last_v is None or prior_v is None else last_v - prior_v
    else:
        delta = last_v - prior_v
        pct = (delta / prior_v) * 100

    if pct is not None:
        desc = (
            f"Last {period}: {last_v:,.2f}; prior {period}: {prior_v:,.2f}; "
            f"delta {delta:+,.2f} ({pct:+.2f}%)"
        )
    else:
        desc = f"Last {period}: {last_v}; prior {period}: {prior_v}"

    return {
        "name": "period_over_period",
        "params": params,
        "value": round(pct, 2) if pct is not None else None,
        "series": [prior, last],
        "description": desc,
    }


def topn(dataset_id: str, params: dict) -> dict:
    """Top N entities by metric.

    params: {group_col: str, amount_col?: str, n: int = 5,
             agg: 'sum'|'count'|'avg' = 'sum' if amount_col else 'count'}
    """
    group_col = params["group_col"]
    amount_col = params.get("amount_col")
    n = int(params.get("n", 5))
    if n < 1 or n > 100:
        raise ValueError(f"n must be 1..100, got {n}")
    agg = params.get("agg", "sum" if amount_col else "count")
    if agg not in _AGGS:
        raise ValueError(f"agg must be one of {_AGGS}, got {agg!r}")
    if agg != "count" and not amount_col:
        raise ValueError(f"agg={agg!r} requires amount_col")

    value_expr = "COUNT(*)" if agg == "count" else f"{agg.upper()}({_ident(amount_col)})"
    parquet = _parquet_ref(dataset_id)
    df = _query(
        f"SELECT {_ident(group_col)} AS entity, {value_expr} AS value "
        f"FROM {parquet} "
        f"WHERE {_ident(group_col)} IS NOT NULL "
        f"GROUP BY 1 ORDER BY value DESC NULLS LAST LIMIT {n}"
    )
    series = [
        {"entity": str(row["entity"]), "value": _coerce_float(row["value"])}
        for _, row in df.iterrows()
    ]
    label = amount_col if amount_col else "rows"
    return {
        "name": "topn",
        "params": params,
        "value": series[0]["value"] if series else None,
        "series": series,
        "description": f"Top {n} {group_col} by {agg} of {label}.",
    }


def category_distribution(dataset_id: str, params: dict) -> dict:
    """Counts and % per category (Pareto check).

    params: {category_col: str}
    """
    cat_col = params["category_col"]
    parquet = _parquet_ref(dataset_id)
    df = _query(
        f"SELECT {_ident(cat_col)} AS category, COUNT(*) AS n "
        f"FROM {parquet} "
        f"WHERE {_ident(cat_col)} IS NOT NULL "
        f"GROUP BY 1 ORDER BY n DESC"
    )
    total = int(df["n"].sum()) if not df.empty else 0
    series = [
        {
            "category": str(row["category"]),
            "count": int(row["n"]),
            "pct": round(float(row["n"]) / total * 100, 2) if total else 0.0,
        }
        for _, row in df.iterrows()
    ]
    return {
        "name": "category_distribution",
        "params": params,
        "value": len(series),
        "series": series,
        "description": (
            f"Distribution of {cat_col} across {len(series)} categories "
            f"over {total:,} rows."
        ),
    }


def anomaly_zscore(dataset_id: str, params: dict) -> dict:
    """Rolling-mean ± threshold·σ on a time series; flag points outside band.

    params: shared with time_series, plus:
        window: int = 6      (number of prior periods used for the rolling stats)
        threshold: float = 2 (|z| ≥ threshold flagged)
    """
    window = int(params.get("window", 6))
    threshold = float(params.get("threshold", 2.0))
    if window < 2:
        raise ValueError(f"window must be >= 2, got {window}")
    if threshold <= 0:
        raise ValueError(f"threshold must be > 0, got {threshold}")

    ts = time_series(dataset_id, params)
    series = ts["series"]
    if len(series) < window + 1:
        return {
            "name": "anomaly_zscore",
            "params": params,
            "value": 0,
            "series": [],
            "description": f"Not enough points (need > {window}, got {len(series)}).",
        }

    flagged = []
    for i in range(window, len(series)):
        window_vals = [
            v for v in (s["value"] for s in series[i - window : i]) if v is not None
        ]
        if len(window_vals) < window:
            continue
        cur = series[i]["value"]
        if cur is None:
            continue
        mean = sum(window_vals) / len(window_vals)
        var = sum((v - mean) ** 2 for v in window_vals) / len(window_vals)
        std = var**0.5
        if std == 0:
            continue
        z = (cur - mean) / std
        if abs(z) >= threshold:
            flagged.append(
                {
                    "period": series[i]["period"],
                    "value": cur,
                    "zscore": round(z, 2),
                    "rolling_mean": round(mean, 2),
                    "rolling_std": round(std, 2),
                }
            )

    return {
        "name": "anomaly_zscore",
        "params": params,
        "value": len(flagged),
        "series": flagged,
        "description": (
            f"{len(flagged)} period(s) outside ±{threshold}σ of trailing "
            f"{window}-period mean."
        ),
    }


REGISTRY = {
    "summary": summary,
    "null_rates": null_rates,
    "time_series": time_series,
    "period_over_period": period_over_period,
    "topn": topn,
    "category_distribution": category_distribution,
    "anomaly_zscore": anomaly_zscore,
}
