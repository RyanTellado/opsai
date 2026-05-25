"""Generate samples/restaurant.csv — 12 months of synthetic line-item orders.

Deterministic (seed=42). Run with:
    cd backend && python -m eval.generate_restaurant_csv

Mild built-in structure for Phase 2 prompt tuning:
  - Weekend lift (Fri/Sat ~1.5x weekday)
  - Linear ~80% growth across the year
  - Holiday spike: Valentine's week (2026-02-09..15) at 1.5x
  - Quiet week: mid-January (2026-01-12..18) at 0.7x

Phase 3 will sharpen demo-grade anomalies once we see what the briefing surfaces.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

OUTPUT = Path(__file__).resolve().parents[2] / "samples" / "restaurant.csv"
SEED = 42

START_DATE = pd.Timestamp("2025-05-01")
END_DATE = pd.Timestamp("2026-04-30")
VAL_START = pd.Timestamp("2026-02-09")
VAL_END = pd.Timestamp("2026-02-15")
QUIET_START = pd.Timestamp("2026-01-12")
QUIET_END = pd.Timestamp("2026-01-18")

MENU: list[tuple[str, str, float]] = [
    ("Appetizer", "Caesar Salad", 9.0),
    ("Appetizer", "Garlic Bread", 6.0),
    ("Appetizer", "Soup of the Day", 7.0),
    ("Main", "Margherita Pizza", 16.0),
    ("Main", "Spaghetti Carbonara", 18.0),
    ("Main", "Grilled Salmon", 24.0),
    ("Main", "Burger", 14.0),
    ("Main", "Veggie Bowl", 13.0),
    ("Dessert", "Tiramisu", 8.0),
    ("Dessert", "Cheesecake", 8.0),
    ("Dessert", "Gelato", 6.0),
    ("Drink", "House Wine", 9.0),
    ("Drink", "Craft Beer", 7.0),
    ("Drink", "Sparkling Water", 4.0),
    ("Drink", "Coffee", 4.0),
]

CATEGORY_WEIGHTS = {"Appetizer": 0.15, "Main": 0.40, "Drink": 0.30, "Dessert": 0.15}
SERVERS = ["Alex", "Jamie", "Pat", "Sam", "Robin", "Casey"]
PAYMENT_TYPES = ["Card", "Mobile", "Cash"]
PAYMENT_WEIGHTS = [0.65, 0.25, 0.10]


def _daily_mean_orders(date: pd.Timestamp, day_idx: int, total_days: int) -> float:
    base = 30.0 + 25.0 * (day_idx / max(1, total_days - 1))  # 30 -> 55
    weekend_lift = 1.5 if date.dayofweek in (4, 5) else 1.0  # Fri, Sat
    special = 1.0
    if VAL_START <= date <= VAL_END:
        special *= 1.5
    if QUIET_START <= date <= QUIET_END:
        special *= 0.7
    return base * weekend_lift * special


def _random_order_time(rng: np.random.Generator, date: pd.Timestamp) -> pd.Timestamp:
    if rng.random() < 0.3:
        hour = int(rng.integers(11, 14))  # lunch 11:00-13:59
    else:
        hour = int(rng.integers(17, 22))  # dinner 17:00-21:59
    minute = int(rng.integers(0, 60))
    return date + pd.Timedelta(hours=hour, minutes=minute)


def main() -> None:
    rng = np.random.default_rng(SEED)
    days = pd.date_range(START_DATE, END_DATE, freq="D")
    total_days = len(days)

    categories = list(CATEGORY_WEIGHTS.keys())
    cat_weights = np.array([CATEGORY_WEIGHTS[c] for c in categories])
    cat_weights = cat_weights / cat_weights.sum()
    items_by_cat: dict[str, list[int]] = {}
    for i, (cat, _, _) in enumerate(MENU):
        items_by_cat.setdefault(cat, []).append(i)

    rows: list[dict] = []
    order_seq = 0
    for day_idx, date in enumerate(days):
        mean = _daily_mean_orders(date, day_idx, total_days)
        n_orders = int(rng.poisson(mean))
        for _ in range(n_orders):
            order_seq += 1
            order_id = f"ORD-{order_seq:06d}"
            ts = _random_order_time(rng, date)
            table_id = int(rng.integers(1, 21))
            server = str(rng.choice(SERVERS))
            payment = str(rng.choice(PAYMENT_TYPES, p=PAYMENT_WEIGHTS))
            n_items = int(np.clip(round(rng.normal(3.0, 1.0)), 1, 5))
            for _ in range(n_items):
                cat = str(rng.choice(categories, p=cat_weights))
                item_idx = int(rng.choice(items_by_cat[cat]))
                _, item_name, price = MENU[item_idx]
                qty = int(rng.choice([1, 2], p=[0.85, 0.15]))
                rows.append(
                    {
                        "order_id": order_id,
                        "order_ts": ts.strftime("%Y-%m-%d %H:%M:%S"),
                        "table_id": table_id,
                        "server_name": server,
                        "menu_category": cat,
                        "item_name": item_name,
                        "quantity": qty,
                        "unit_price": price,
                        "total": round(qty * price, 2),
                        "payment_type": payment,
                    }
                )

    df = pd.DataFrame(
        rows,
        columns=[
            "order_id",
            "order_ts",
            "table_id",
            "server_name",
            "menu_category",
            "item_name",
            "quantity",
            "unit_price",
            "total",
            "payment_type",
        ],
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT, index=False)
    print(
        f"Wrote {len(df):,} line-item rows across {df['order_id'].nunique():,} orders "
        f"to {OUTPUT}"
    )


if __name__ == "__main__":
    main()
