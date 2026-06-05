# OpsAI

**Who it's for:** Small organizations — local restaurants, nonprofits, clinics — that collect operational data but don't have a data analyst on staff.

**What it does:** Upload a CSV and a one-sentence description of your business. Get back a one-page briefing — headline finding, trends, anomalies, and recommended actions — in about 45 seconds. Every claim cites the number it came from.

Built as a CS153 project at Stanford.

---

## AI use disclosure

AI tools were used in two distinct ways in this project:

**1. Claude Sonnet 4.6 (Anthropic) — the core engine of the app itself**

The application makes three types of LLM calls at runtime:
- **Domain profiling:** on CSV upload, one call generates a `profile.json` (domain name, entity grain, key columns, metrics of interest, glossary) from the schema and user description. This profile is passed into every downstream prompt.
- **Briefing generation:** one call receives the computed stats payload and writes the headline, trends, anomalies, and recommended actions. The LLM never computes numbers — all figures come from DuckDB queries; the model only writes prose around them.
- **Chat tool-use loop:** the chat panel runs Claude with four read-only tools (`list_columns`, `get_profile`, `compute_stat`, `run_sql`) in a loop of up to 7 iterations per question.

**2. Claude Code — used to build the project**

Claude Code (Anthropic's AI coding assistant) was used as a development tool throughout the project: scaffolding the FastAPI backend, building the React frontend, writing the DuckDB stat templates, designing the Pydantic validation schema, and iterating on the briefing and profile prompts. All code was reviewed and the architecture, design decisions, and product direction were made by me.

---

## The briefing

The system detects a 65% revenue growth trend *and* flags a z-score -6.12 revenue collapse in the same headline:

![Restaurant briefing](docs/screenshots/restaurant_briefing.png)

Each card shows a chart, a stat badge (the exact computed value), and a prose explanation grounded in that number. The LLM writes the prose — DuckDB computes the numbers. They can't be mixed up by construction: every trend and recommendation must cite a `stat_ref` that resolves to an entry in the stats payload, or the briefing fails validation and retries.

---

## Works across any domain

The engine has no hard-coded industries. On upload, one LLM call generates a domain profile (key columns, metrics of interest, entity grain, glossary). Everything downstream — stat selection, briefing generation, chat — reads from that profile.

**Food & Beverage** — 150 rows, 15 days of café sales. The system identifies sandwiches as the dominant revenue category and shows a weekly time-series plateau:
![Café briefing](docs/screenshots/cafe_briefing.png)

**Restaurant & Dining** — 54,103 rows, 12 months. The system identifies a 65% year-long growth trend *and* a z-score -6.12 revenue collapse in the same headline:
![Restaurant briefing](docs/screenshots/restaurant_briefing.png)

Same pipeline, different profiles, completely different charts and language.

---

## Multiple businesses, one account

The sidebar lists all your businesses. Clicking switches the entire view — dashboard, briefings, chat context — to that business. The "+ New business" button opens a modal; hover a sidebar entry to reveal the delete button.

![Home dashboard — Metro Restaurant active, Sunrise Café in sidebar](docs/screenshots/home_restaurant.png)

---

## Onboarding

New users get a three-step wizard — one field per screen, Enter to advance:

![Onboarding](docs/screenshots/onboarding.png)

---

## Loading state

During the ~45s generation, a spinner and cycling step indicator show what's happening:

![Loading state](docs/screenshots/loading.png)

---

## Chat — ask the data

A right-panel chat interface runs a tool-use loop (up to 7 iterations) against the live dataset. Four read-only tools: `list_columns`, `get_profile`, `compute_stat`, `run_sql`. The response includes the tool trace so you can see exactly what was queried.

![Chat](docs/screenshots/chat_restaurant.png)

---

## How it works

### Core rule: the LLM never computes numbers

All statistics come from DuckDB queries in `services/stats.py`. The LLM receives the results and writes prose around them. Every trend and recommendation must include a `stat_ref` key that exists in the computed payload — if it doesn't, the briefing fails Pydantic validation and retries once with the error message appended.

### Pipeline

```
POST /datasets
  CSV → parquet + schema.json (column names, dtypes, null rates, samples)
  One LLM call → profile.json (domain name, key columns, metrics, glossary)

POST /datasets/{id}/briefings
  Stats selector → picks which of 7 templates to run (driven by profile key columns)
  DuckDB queries → stats_payload (no LLM involved)
  One LLM call  → briefing JSON validated against Pydantic schema
  Retry once on validation failure → save to disk

POST /datasets/{id}/chat
  Message + history → tool-use loop (max 7 iterations, 4 read-only tools)
```

### 7 stat templates

| Template | What it computes |
|---|---|
| `summary` | Row count, date range, total and mean for the amount column |
| `time_series` | Amount aggregated by week, month, or day |
| `period_over_period` | % change between the two most recent periods |
| `topn` | Top N entities by total amount |
| `category_distribution` | Count and share per category |
| `anomaly_zscore` | Rows > 2 standard deviations from the rolling mean |
| `null_rates` | Null % per column |

---

## Tech stack

| Layer | Choice |
|---|---|
| Backend | FastAPI, Python, synchronous |
| LLM | Anthropic SDK, Claude Sonnet 4.6, native tool use |
| Analytics | DuckDB (SQL over parquet), pandas |
| Storage | SQLite for user/report index; parquet + JSON on disk |
| Auth | JWT (24h) + bcrypt |
| Frontend | React 19, Vite, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Charts | Recharts (line, bar, pie) |

No LangChain. No vector DB. No Postgres. No Docker. Localhost only.

---

## Running locally

```bash
# Backend (port 8000)
cd backend
python3 -m venv .venv && .venv/bin/pip install -e .
cp .env.example .env        # add ANTHROPIC_API_KEY
.venv/bin/python -m uvicorn app.main:app --port 8000

# Frontend (port 5173)
cd frontend && npm install && npm run dev
```

Sample CSVs are in `samples/`. Start with `cafe_ops_small.csv` (150 rows, briefing in ~45s).

> Always use `.venv/bin/python` — the system Python doesn't have the dependencies.

---

## Evaluation

### Automated eval suite

```bash
cd backend && .venv/bin/python -m eval.run
```

Runs the full pipeline end-to-end over three fixture datasets (café, NGO, restaurant) and verifies four properties of each output:

| Check | What it validates |
|---|---|
| `schema_valid` | The briefing JSON passes Pydantic validation — all required fields present, correct types, no missing keys |
| `min_items` | At least 2 trends and 2 recommended actions — guards against degenerate minimal outputs |
| `all_stat_refs_resolve` | Every `stat_ref` cited in the briefing points to a key that was actually computed by DuckDB — directly tests the grounding mechanism |
| `keyword_any` | A domain-specific word appears in the headline (e.g. "coffee", "clinic", "revenue") — tests that the profile correctly identified the domain |

**Current result: 18/18 checks passing** across all three fixtures (~43–52s per run).

### Planted anomaly test

`restaurant.csv` contains a deliberate revenue dip in one specific week. The anomaly detection pipeline (rolling z-score over weekly revenue) correctly surfaces it in every run — the headline reads: *"a week-of-April-27 revenue collapse (z-score -6.12) demands immediate investigation."* This serves as a regression test for the anomaly detection path.

### Grounding validation

The `all_stat_refs_resolve` check is the most important structural guarantee: if the LLM fabricates a statistic that was never computed, the briefing fails validation and the pipeline retries with the error appended to the prompt. If it fails twice, the request returns a 502. In practice, this failure has occurred during development when prompts were under-specified; the current prompts pass consistently.

---

## Limitations

- **CSV only, max 50 MB.** No Excel, JSON, or Google Sheets. No streaming uploads.
- **Fixed stat templates.** The 7 templates cover common patterns (time series, top-N, anomalies) but can't answer arbitrary analytical questions — that's what the chat tool is for.
- **Profile inference can be wrong.** If column names are ambiguous or non-standard, the LLM may misidentify the date, amount, or grouping columns, producing a valid but misleading briefing. No interactive correction UI exists.
- **No forecasting.** All trends are historical. The system explicitly does not project beyond the last observed period.
- **Synchronous generation (~45s).** The briefing blocks the HTTP request. On slow API responses or large CSVs, this can approach 90s.
- **Localhost only.** No authentication beyond a single instance; not hardened for multi-user production deployment.
