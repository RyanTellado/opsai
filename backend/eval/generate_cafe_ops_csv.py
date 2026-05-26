"""Generate the café-ops sample CSVs.

Daily-grain rows for a small café: each row is one dish on one day. Captures
revenue, ingredient cost, allocated labor + rent, wait time, and daily
customer count, so the briefing + chat can reason across cost / revenue /
service dimensions in the same dataset.

Two outputs from one run (both deterministic, seed=42):
  samples/cafe_ops_small.csv  — 15 days × 10 dishes = 150 rows  (eval/iteration)
  samples/cafe_ops.csv        — 60 days × 10 dishes = 600 rows  (live demo)

Planted patterns (positions scaled proportionally so both files exhibit them):
  - Coffee bean COGS jumps ~32% at ~70% through the period (Latte / Cappuccino / Espresso).
  - Saturday + Sunday morning waits ~2.3× weekday for Coffee/Pastry items.
  - Caesar Salad: high volume, thin margin (loss-leader candidate).
  - One week of labor-cost overtime (~55% above baseline) without matching revenue.

Run:  cd backend && python -m eval.generate_cafe_ops_csv
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

OUT_BIG = Path(__file__).resolve().parents[2] / "samples" / "cafe_ops.csv"
OUT_SMALL = Path(__file__).resolve().parents[2] / "samples" / "cafe_ops_small.csv"

SEED = 42
START_DATE = pd.Timestamp("2026-03-01")
N_DAYS_BIG = 60
N_DAYS_SMALL = 15

# (dish_name, category, unit_price, base_unit_cogs, base_daily_units)
DISHES: list[tuple[str, str, float, float, int]] = [
    ("Latte", "Coffee", 5.00, 1.10, 40),
    ("Cappuccino", "Coffee", 5.00, 1.05, 30),
    ("Espresso", "Coffee", 3.50, 0.80, 25),
    ("Croissant", "Pastry", 4.00, 1.20, 35),
    ("Muffin", "Pastry", 3.50, 0.95, 25),
    ("Avocado Toast", "Sandwich", 9.00, 3.10, 18),
    ("Turkey Club", "Sandwich", 11.00, 4.20, 14),
    ("Veggie Wrap", "Sandwich", 8.50, 2.80, 12),
    ("Caesar Salad", "Salad", 10.00, 4.50, 22),  # loss-leader: high vol, thin margin
    ("Garden Salad", "Salad", 9.00, 2.50, 10),
]

COGS_SPIKE_FRACTION = 0.70  # of the period
COGS_SPIKE_MULT = 1.32
COGS_SPIKE_CATEGORIES = {"Coffee"}

OVERTIME_FRACTION = (0.35, 0.45)
OVERTIME_LABOR_MULT = 1.55

BASELINE_LABOR = 420.0
DAILY_RENT = 200.0

WEEKDAY_DEMAND = {0: 1.00, 1: 0.95, 2: 0.95, 3: 1.00, 4: 1.15, 5: 1.40, 6: 1.10}


def _wait_minutes(rng: np.random.Generator, date: pd.Timestamp, category: str) -> float:
    base = 2.5 if category in {"Coffee", "Pastry"} else 4.0
    if category in {"Coffee", "Pastry"} and date.dayofweek in (5, 6):
        base *= 2.3
    base += rng.normal(0, 0.5)
    return max(0.5, round(base, 1))


def _build(n_days: int, out_path: Path) -> pd.DataFrame:
    rng = np.random.default_rng(SEED)
    days = pd.date_range(START_DATE, periods=n_days, freq="D")
    cogs_spike_day = int(n_days * COGS_SPIKE_FRACTION)
    overtime_start = int(n_days * OVERTIME_FRACTION[0])
    overtime_end = int(n_days * OVERTIME_FRACTION[1])

    rows: list[dict] = []
    for day_idx, date in enumerate(days):
        wf = WEEKDAY_DEMAND[date.dayofweek]
        labor_mult = OVERTIME_LABOR_MULT if overtime_start <= day_idx <= overtime_end else 1.0
        daily_labor = round(BASELINE_LABOR * labor_mult * (1 + rng.normal(0, 0.03)), 2)

        for name, cat, price, base_cogs, base_units in DISHES:
            units = max(0, int(rng.poisson(base_units * wf)))
            spike_active = day_idx >= cogs_spike_day and cat in COGS_SPIKE_CATEGORIES
            cogs_mult = COGS_SPIKE_MULT if spike_active else 1.0
            unit_cogs = round(base_cogs * cogs_mult * (1 + rng.normal(0, 0.02)), 3)
            wait = _wait_minutes(rng, date, cat)
            rows.append(
                {
                    "date": date.date().isoformat(),
                    "dish_name": name,
                    "category": cat,
                    "units_sold": units,
                    "unit_price": price,
                    "unit_cogs": unit_cogs,
                    "daily_labor_cost": daily_labor,
                    "daily_rent_share": DAILY_RENT,
                    "avg_wait_minutes": wait,
                    "customer_count": 0,
                }
            )

    df = pd.DataFrame(rows)
    daily_units = df.groupby("date")["units_sold"].sum()
    df["customer_count"] = df["date"].map(lambda d: int(daily_units[d] / 1.5))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    return df


def main() -> None:
    big = _build(N_DAYS_BIG, OUT_BIG)
    small = _build(N_DAYS_SMALL, OUT_SMALL)
    print(f"Wrote {len(big):,} rows to {OUT_BIG.name}")
    print(f"Wrote {len(small):,} rows to {OUT_SMALL.name}")
    big_cogs_day = int(N_DAYS_BIG * COGS_SPIKE_FRACTION)
    small_cogs_day = int(N_DAYS_SMALL * COGS_SPIKE_FRACTION)
    print(
        f"  Bean COGS spike: day {big_cogs_day} (big) / day {small_cogs_day} (small)"
    )


if __name__ == "__main__":
    main()
