# OpsAI — Architecture

> Read `CLAUDE.md` first for the build list and the do-not-build list. This document covers *how* the build list is implemented.

## 1.1 Stack

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| Backend | **FastAPI (Python)** | Stats live in Python; one language end-to-end on the backend. |
| Query engine | **DuckDB over parquet** | SQL-on-files, zero setup, fast. No server, no schema migrations. |
| LLM | **Anthropic Python SDK, single model (Claude Sonnet 4.6)** | One model, ship. |
| Frontend | **Vite + React + TypeScript + Tailwind + shadcn/ui** (single SPA) | Pre-built components save Phase 3 styling time. |
| Deploy | **Localhost only** | No remote hosting in the 3-week budget. Revisit only if Phase 5 has slack. |
| Package mgr | **uv** for backend, **pnpm or npm** for frontend | uv is fast and handles venvs. |

> **Endpoint:** a URL on the backend that does one thing when a request hits it.

## 1.2 File structure

```
opsai/
  backend/
    app/
      main.py                  # FastAPI app: app = FastAPI(); include_router(...)
      routes/
        datasets.py            # upload, get metadata
        briefings.py           # generate brief, fetch brief
        chat.py                # STUB only until Phase 4
      agent/                   # LLM-touching code lives here
        prompts.py             # single module — all prompt strings live here
        profile.py             # build domain profile via LLM
        briefing.py            # orchestrate stats + LLM → briefing.json
        llm.py                 # Anthropic client wrapper
      services/
        ingest.py              # CSV → parquet + schema.json (no LLM)
        stats.py               # the stat template registry (DuckDB queries, no LLM)
      tools/                   # designed now, BUILT in Phase 4 only
        schema.py              # JSONSchema for each of the 4 tools
        registry.py            # name → handler map (handlers raise NotImplementedError until P4)
      storage/
        paths.py               # canonical filesystem path helpers
      models.py                # Pydantic request/response models
    eval/
      run.py                   # `python -m eval.run` → pass/fail table
      generate_restaurant_csv.py  # synthetic restaurant data (fixed seed)
      fixtures/
        ngo.json
        restaurant.json
    pyproject.toml
  frontend/
    src/
      pages/
        Upload.tsx
        Brief.tsx              # the one-page briefing view
      components/
        BriefingCard.tsx
        StatBadge.tsx          # renders a number + label inline w/ a claim
      lib/api.ts
      types.ts                 # hand-written, mirrors backend Pydantic models
    package.json
    vite.config.ts
  data/                        # gitignored; created at runtime
    datasets/
      {dataset_id}/
        data.parquet
        schema.json
        profile.json
        meta.json              # original filename, upload time, user description
    briefings/
      {dataset_id}/
        {briefing_id}.json
  samples/
    ngo.csv
    restaurant.csv             # generated synthetically; committed
  docs/
    ARCHITECTURE.md
    PROMPTS.md
  CLAUDE.md
  README.md
```

## 1.3 API endpoints

All endpoints are **synchronous**. No job queue, no polling, no websockets. If a request takes 30 seconds, the frontend shows a loader.

| Method + Path | What it does |
|---|---|
| `POST /datasets` | Accepts CSV + one-sentence description. Writes `data.parquet`, `schema.json`, `meta.json`, then synchronously generates `profile.json` (LLM call). Returns `{dataset_id, schema, profile}`. |
| `GET /datasets/{id}` | Returns schema + profile + meta. |
| `POST /datasets/{id}/briefings` | Computes stat templates, calls LLM with stats + profile, validates JSON, writes `briefing.json`. Returns the briefing. |
| `GET /briefings/{briefing_id}` | Returns the briefing JSON. |
| `POST /datasets/{id}/chat` *(Phase 4 stub)* | Defined now; returns 501 Not Implemented until Phase 4. |

## 1.4 Data storage layout

No SQLite. No tables. Only parquet + JSON files on disk. IDs are short ULIDs (sortable, URL-safe).

```
data/
  datasets/
    01HXY.../
      data.parquet      # CSV converted (typed columns, ~10x smaller, fast to query)
      schema.json       # { columns: [{name, dtype, nullable, sample_values, null_pct}], row_count }
      profile.json      # LLM-generated domain profile (see 1.5)
      meta.json         # { original_filename, uploaded_at, user_description }
  briefings/
    01HXY.../
      01HXZ....json     # the briefing artifact (see 1.7)
```

**Why separate JSON files:** schema is cheap+deterministic, profile and briefing are expensive (LLM). Separate files = each can be regenerated independently when prompts get tweaked, without re-uploading.

## 1.5 The "domain profile" — what's in it, when, how

Generated **once per dataset**, immediately after upload, by a single LLM call. Inputs: column names + dtypes + ~10 sample rows + the user's one-sentence description. Output (strict JSON schema):

```json
{
  "domain": "small NGO fundraising operations",
  "entity_grain": "one row per donation",
  "key_columns": {
    "amount": "donation_usd",
    "date": "donated_at",
    "actor": "donor_id",
    "category": "campaign_name"
  },
  "metrics_of_interest": [
    {"name": "monthly_revenue", "definition": "sum(donation_usd) grouped by month"},
    {"name": "active_donors_per_month", "definition": "count(distinct donor_id) per month"}
  ],
  "expected_seasonality": "year-end giving spike in December",
  "anomaly_hints": ["sudden zero-amount runs", "unusually large single gifts"],
  "glossary": {"campaign_name": "the named fundraising drive a donation belongs to"}
}
```

**Flow:**
1. Briefing generation reads `profile.json` to know which column is the date, which is the amount, etc. — drives which stat templates run with which params.
2. Briefing prompt receives the profile so the LLM knows what "interesting" means for this domain.
3. Phase 4 chat tools also read it — `get_profile` is a tool.

## 1.6 The stats engine (load-bearing)

**The LLM never computes numbers. It only writes prose around numbers Python computed.**

Registry of stat templates in `backend/app/services/stats.py`:

| Template name | What it computes (DuckDB query against `data.parquet`) |
|---|---|
| `time_series` | metric grouped by week or month (historical only — no forecast) |
| `period_over_period` | last period vs prior period (% change + absolute) |
| `topn` | top N entities by metric |
| `category_distribution` | counts/percent per category column (Pareto check) |
| `anomaly_zscore` | rolling-mean ± 2σ on the time series; flag points outside band |
| `null_rates` | % null per column (data quality flags) |
| `summary` | row count, date range, total volume |

Each returns a small typed dict: `{name, params, value (number), series (optional), description (str)}`. The briefing pipeline runs the relevant subset (driven by the profile), packages results into a "stats payload," hands it to the LLM.

## 1.7 Briefing artifact schema

```json
{
  "dataset_id": "01HXY...",
  "briefing_id": "01HXZ...",
  "headline": "December donations surged 40% above the trailing 6-month average.",
  "trends": [
    {
      "claim": "Monthly revenue grew steadily from Jul–Nov before spiking in Dec.",
      "stat_ref": "time_series.monthly_revenue",
      "rationale": "Average month grew $X to $Y."
    }
  ],
  "anomalies": [
    {
      "claim": "Dec 2024 is 2.7σ above the 6-month rolling mean.",
      "stat_ref": "anomaly_zscore.monthly_revenue",
      "rationale": "..."
    }
  ],
  "actions": [
    {
      "action": "Repeat the December campaign structure in Q4 2025.",
      "evidence_stat_ref": "period_over_period.monthly_revenue",
      "expected_impact": "Replicates the +40% lift."
    }
  ]
}
```

**Grounding is enforced by the schema:** every claim has a `stat_ref` pointing into the stats payload. The frontend renders the actual number alongside the claim using `<StatBadge>`. If the LLM returns a `stat_ref` that doesn't exist, validation fails and we retry once. If it still fails, surface the error — do not silently render an unfounded claim.

## 1.8 Chat tool interface (designed now, built in Phase 4 only if gated in)

Four read-only tools. Schemas defined now in `backend/app/tools/schema.py`; handlers in `registry.py` raise `NotImplementedError` until Phase 4. Agent loop iteration cap: **5**.

```
list_columns
  input:  {}
  output: {"columns": [{"name": str, "dtype": str, "nullable": bool, "sample_values": [str]}]}

get_profile
  input:  {}
  output: <profile.json shape>

compute_stat
  input:  {"name": "time_series" | "period_over_period" | "topn" | "anomaly_zscore" | ...,
           "params": { ... template-specific ... }}
  output: {"name": str, "params": object, "value": number|null,
           "series": [...]|null, "description": str}

run_sql
  input:  {"sql": "SELECT ..."}                  # validated: SELECT only, single statement, ≤ 5000 rows
  output: {"columns": [str], "rows": [[...]], "row_count": int, "truncated": bool}
```

**Critical:** `compute_stat` wraps the same `services/stats.py` registry the briefing path uses. Phase 4 = wire up a tool dispatcher and a streaming chat UI, not build new analytics.

Tools that are deliberately **not** in the interface: no `forecast`, no `what_if`, no write/mutation tool of any kind.

## 1.9 Prompt inventory

See `docs/PROMPTS.md`.

## 1.10 Eval setup

`backend/eval/fixtures/{ngo,restaurant}.json` — 3 to 5 golden checks per dataset:

```json
{
  "dataset_csv": "samples/ngo.csv",
  "user_description": "Small NGO tracking individual donations across campaigns.",
  "checks": [
    {"type": "schema_valid"},
    {"type": "min_items", "field": "trends", "n": 2},
    {"type": "min_items", "field": "actions", "n": 2},
    {"type": "all_actions_have_stat_ref"},
    {"type": "keyword_any", "field": "headline", "options": ["donation", "revenue", "giving"]}
  ]
}
```

One command: `python -m eval.run` → loads each fixture, runs the full pipeline, prints a pass/fail table. **No LLM-as-judge.** Keyword + schema checks only.

## 1.11 Restaurant CSV (synthetic)

Generated by `backend/eval/generate_restaurant_csv.py` with a fixed numpy random seed for reproducibility. Output committed at `samples/restaurant.csv`. Re-run only to regenerate intentionally.

Columns: `order_id`, `ordered_at` (12–18 months), `item_name` (~30 distinct), `category` (appetizer/entree/dessert/drink), `quantity`, `unit_price`, `revenue` (qty × unit_price), `server_id` (~8–12 servers), `day_of_week`, `meal_period` (lunch/dinner/brunch).

Planted anomalies for the demo:
- A 3-week revenue dip in some month (so `anomaly_zscore` has something to fire on).
- One menu item that ramps from ~5% to ~25% of orders mid-period (so `category_distribution` shifts).
- One server with anomalously low avg ticket size (so `topn` on `avg_revenue_per_server` is interesting).

Target row count: 5,000–10,000.
