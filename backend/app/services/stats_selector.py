"""Deterministic stat selection driven by the profile.

The LLM never picks which stats to run. We compute a fixed set based on
which profile.key_columns are populated, and assign each stat a stable
alias. The briefing prompt + validator reference stats by `<name>.<alias>`,
so the LLM can only cite numbers we actually computed.
"""

from __future__ import annotations

import re


def _sanitize(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", s.lower())).strip("_")


def select_stats(profile: dict) -> list[dict]:
    """Return an ordered list of {name, alias, params} stat calls."""
    kc = profile.get("key_columns", {}) or {}
    date_col = kc.get("date")
    amount_col = kc.get("amount")
    actor_col = kc.get("actor")
    category_col = kc.get("category")

    amount_label = _sanitize(amount_col) if amount_col else "count"
    actor_label = _sanitize(actor_col) if actor_col else None
    category_label = _sanitize(category_col) if category_col else None

    calls: list[dict] = []

    summary_params: dict = {}
    if date_col:
        summary_params["date_col"] = date_col
    if amount_col:
        summary_params["amount_col"] = amount_col
    calls.append({"name": "summary", "alias": "overview", "params": summary_params})
    calls.append({"name": "null_rates", "alias": "all_columns", "params": {}})

    if date_col:
        base = {"date_col": date_col}
        if amount_col:
            base["amount_col"] = amount_col
        calls.append(
            {
                "name": "time_series",
                "alias": f"monthly_{amount_label}",
                "params": {**base, "period": "month"},
            }
        )
        calls.append(
            {
                "name": "time_series",
                "alias": f"weekly_{amount_label}",
                "params": {**base, "period": "week"},
            }
        )
        calls.append(
            {
                "name": "period_over_period",
                "alias": f"monthly_{amount_label}_pop",
                "params": {**base, "period": "month"},
            }
        )
        calls.append(
            {
                "name": "anomaly_zscore",
                "alias": f"weekly_{amount_label}_anomalies",
                "params": {
                    **base,
                    "period": "week",
                    "window": 6,
                    "threshold": 2.0,
                },
            }
        )

    if actor_col:
        params: dict = {"group_col": actor_col, "n": 5}
        if amount_col:
            params["amount_col"] = amount_col
        calls.append(
            {
                "name": "topn",
                "alias": f"{actor_label}_by_{amount_label}",
                "params": params,
            }
        )

    if category_col:
        params = {"group_col": category_col, "n": 5}
        if amount_col:
            params["amount_col"] = amount_col
        calls.append(
            {
                "name": "topn",
                "alias": f"{category_label}_by_{amount_label}",
                "params": params,
            }
        )
        calls.append(
            {
                "name": "category_distribution",
                "alias": category_label,
                "params": {"category_col": category_col},
            }
        )

    return calls
