# Handoff — last updated 2026-05-29

## What is built and working

OpsAI is a fully functional AI operations analyst web app. Every major feature is complete and tested end-to-end. Here is what works today:

**Auth**
- Sign up / log in with email + password (JWT, 24h expiry, bcrypt hashing)
- Token + name/email stored in `localStorage`; `getUser()` reads them

**Business layer**
- Apple-style onboarding wizard for new users (3 steps, one field per screen, Enter to advance, fade animation)
- Dark sidebar (like Claude's chat list) lists all your businesses, auto-selects most recent
- "+ New business" button opens a modal for returning users adding a second business
- Delete business: hover sidebar entry → ✕ appears → inline confirm overlay → red Delete button cascades reports too

**Upload + briefing pipeline**
- Upload a CSV file for the active business → generates domain profile (LLM, one call) → computes stats via DuckDB → generates briefing JSON (LLM, one call)
- Briefing: headline, trends, anomalies, recommended actions — each grounded in a `stat_ref`
- Multiple briefings per business; dropdown to switch between them

**Home screen** (landing after login with existing briefing)
- "Welcome back, [first name]." greeting
- Business card (name · industry · description · briefing count · last briefing date)
- KPI strip: date range / total value / avg per record (from `summary.overview` stat)
- Key findings: top 2 trend bullets
- Top recommended action with expected impact
- CTAs: "+ New briefing" (opens drawer) and "View full briefing →"

**Full briefing page**
- "← Overview" returns to home screen
- KPI strip (total rows / date range / total value)
- 2-column grid of ChartCards for Trends / Anomalies / Recommended actions
- Each card has a stat badge, chart (bar/line/pie depending on stat type), and prose
- Pie charts for category distributions with ≤6 categories

**Chat ("Ask the data →")**
- Opens a right sidebar panel
- Tool-use loop: up to 5 iterations, 4 tools: `list_columns`, `get_profile`, `compute_stat`, `run_sql`
- Inline chart rendered in chat if response includes chart data
- Text responses with markdown formatting

---

## How to start the servers

Both must be running for the app to work. Dev servers die when the shell closes — restart every session.

**Backend** (port 8000):
```bash
cd /Users/ryantellado/opsai/backend
.venv/bin/python -m uvicorn app.main:app --port 8000
```

**Frontend** (lands on 5173, 5174, or 5175 — whichever is free):
```bash
cd /Users/ryantellado/opsai/frontend
npm run dev
```

Health check: `curl http://127.0.0.1:8000/health` → `{"ok":true}`

**CORS note:** `backend/app/main.py` allows origins on ports 5173, 5174, 5175. If Vite lands on a different port, add it to the `allow_origins` list there and restart the backend.

**API key:** `ANTHROPIC_API_KEY` must be in `backend/.env`. It is gitignored. If missing, briefing generation and chat will fail with a 500 error.

---

## Test accounts in the local DB

| Email | Password | Businesses | Reports |
|---|---|---|---|
| ryantellado@gmail.com | (unknown) | Poop Jobs | 2 |
| ryan+home...@test.com | (unknown) | Sunrise Café | 1 |

Use the signup flow to create a fresh test account — it's fast (the onboarding takes ~10 seconds).

**Sample CSVs** (in `samples/`):
- `cafe_ops_small.csv` — 150 rows, 15 days of café sales (fastest for testing, ~45s to brief)
- `cafe_ops.csv` — full dataset

---

## File map

### Backend

| File | Role |
|---|---|
| `app/main.py` | FastAPI app, CORS, router registration |
| `app/db.py` | SQLite init (`users`, `businesses`, `reports` tables) |
| `app/auth.py` | JWT encode/decode, `get_current_user` dependency |
| `app/models.py` | Pydantic models for briefing JSON schema |
| `app/routes/auth.py` | `POST /auth/signup`, `POST /auth/login` |
| `app/routes/businesses.py` | `POST/GET /businesses`, `DELETE /businesses/{id}`, `GET /businesses/{id}/reports` |
| `app/routes/datasets.py` | `POST /datasets` (upload → parquet + profile) |
| `app/routes/briefings.py` | `POST /datasets/{id}/briefings`, `GET /briefings/{id}` |
| `app/routes/chat.py` | `POST /datasets/{id}/chat` (tool-use loop) |
| `app/agent/prompts.py` | All LLM prompts (single source of truth) |
| `app/agent/profile.py` | Domain profile generation (one LLM call per upload) |
| `app/services/stats.py` | ~10 stat templates computed via DuckDB |
| `app/services/stats_selector.py` | LLM picks which stats to compute for the briefing |
| `app/services/briefing.py` | Full briefing pipeline orchestration |
| `app/services/chat.py` | Chat tool-use loop (max 5 iterations) |
| `app/services/ingest.py` | CSV → parquet, schema inference |
| `app/services/llm.py` | Thin wrapper around Anthropic SDK |
| `app/tools/registry.py` | Tool handlers: `list_columns`, `get_profile`, `compute_stat`, `run_sql` |
| `app/storage/paths.py` | Disk layout: `data/datasets/{id}/`, `data/briefings/{id}.json` |

### Frontend

| File | Role |
|---|---|
| `src/App.tsx` | Root: `"auth" | "app"` stage, loads businesses, wires callbacks |
| `src/pages/Login.tsx` | Sign in / Create account form (mode toggle) |
| `src/pages/AppShell.tsx` | Persistent shell: NavBar + sidebar + main content; `mainView: "home"|"briefing"` |
| `src/pages/OnboardingScreen.tsx` | 3-step onboarding wizard for new users |
| `src/pages/HomeScreen.tsx` | Welcome back dashboard (business card, KPI strip, findings, top action) |
| `src/components/BusinessSidebar.tsx` | Dark sidebar list with hover-delete |
| `src/components/CreateBusinessModal.tsx` | Modal for adding a second business |
| `src/components/NavBar.tsx` | Top bar with breadcrumb, greeting, sign out |
| `src/components/KpiStrip.tsx` | 3-tile KPI strip (used in full briefing) |
| `src/components/ChatPanel.tsx` | Chat sidebar panel with history and inline charts |
| `src/components/charts/ChartCard.tsx` | Card wrapper for a stat + chart + prose |
| `src/components/charts/CategoryDistributionChart.tsx` | Pie (≤6 categories) or horizontal bar |
| `src/components/charts/TopNChart.tsx` | Horizontal bar for top-N rankings |
| `src/components/charts/TimeSeriesChart.tsx` | Line chart for time series |
| `src/components/charts/chartUtils.ts` | `formatValue` and shared chart helpers |
| `src/lib/api.ts` | All API calls (auth, businesses, datasets, briefings, chat) |
| `src/lib/auth.ts` | `getToken`, `setToken`, `getUser`, `setUser`, `isLoggedIn`, `logout` |
| `src/types.ts` | TypeScript types: `Business`, `BusinessWithMeta`, `BriefingBundle`, `ReportSummary`, etc. |

### Storage layout (gitignored)

```
data/
  opsai.db                    ← SQLite: users + businesses + reports index
  datasets/{ulid}/
    data.parquet              ← uploaded CSV converted to parquet
    schema.json               ← column names, dtypes, sample values, row count
    profile.json              ← domain profile from LLM
  briefings/{ulid}.json       ← full briefing JSON (briefing + stats_payload)
```

---

## Data flow

```
POST /datasets
  CSV → parquet (ingest.py)
  LLM call → profile.json (profile.py)

POST /datasets/{id}/briefings
  profile.json + schema.json → stats_selector (LLM picks which stats to run)
  stats.py → stats_payload (DuckDB, no LLM)
  stats_payload + profile + BRIEFING_PROMPT → briefing JSON (LLM)
  briefing JSON validated against Pydantic schema; retry once if invalid
  saved as data/briefings/{ulid}.json
  row inserted into reports table

POST /datasets/{id}/chat
  message + history → tool-use loop (max 5 iterations)
  tools: list_columns, get_profile, compute_stat, run_sql (all read-only)
  final text response returned to frontend
```

---

## Key design rules (from CLAUDE.md)

1. **LLM never computes numbers.** All stats come from DuckDB via `stats.py`. LLM writes prose around them.
2. **No streaming.** All endpoints are synchronous. Frontend shows a spinner.
3. **No Postgres / ORM.** SQLite for users/reports index; parquet + JSON on disk for data.
4. **No LangChain.** Direct Anthropic SDK calls only.
5. **Model:** Claude Sonnet 4.6 (`claude-sonnet-4-6`) for all LLM calls.
6. **Chat history** is in-memory per session only. Not persisted.

---

## What's left for the demo (CS153 deadline)

The core product is complete. One remaining polish item:

1. **Multiple businesses demo** — pre-seeding a second business in a different industry (just sign up a fresh account and upload a CSV) would make the product feel more general during the demo. This is a setup task, not a code change.

**Completed polish (2026-05-29):**
- **Eval runner** — confirmed ALL GREEN: 18/18 checks across café, NGO, and restaurant fixtures. ~43–52s per fixture.
- **Error UX** — `handleResponse` in `api.ts` now extracts the `detail` field from JSON error bodies. 5xx errors show a generic "Something went wrong. Please try again." All error displays are styled as a `bg-red-50` box instead of raw red text.
- **Loading state** — briefing generation now shows a spinner in the button + a step indicator below ("Analyzing your data…" → "Computing statistics…" → "Writing briefing…") that cycles every 14s.

**Do not build** (per CLAUDE.md): forecasting, what-if, PDF export, dark mode, mobile layout, email delivery, Postgres, Docker, CI/CD.

---

## Gotchas

- **`data/` is gitignored.** Uploaded datasets, profiles, and briefings live there. Not in git. The DB is also there. Start fresh by deleting `data/opsai.db`.
- **Dev servers die on shell close.** Restart both every session.
- **Frontend hardcodes `http://127.0.0.1:8000`** in `frontend/src/lib/api.ts`. Change there if backend port changes.
- **Vite port rotation:** Vite picks 5173, then 5174, then 5175 depending on what's running. If it exceeds 5175, add the new port to CORS in `backend/app/main.py`.
- **Python environment:** Always use `backend/.venv/bin/python`, not `python` or `python3`. The system Python doesn't have the dependencies.
- **bcrypt pinned** to `<5` in requirements. Don't upgrade; it breaks passlib's API.
- **`init_db()` runs on startup** via `main.py`. Adding a new table to `init_db()` auto-creates it on next backend start (uses `CREATE TABLE IF NOT EXISTS`).
- **Briefing retry:** On JSON validation failure, the briefing pipeline retries once with the validation error appended to the prompt. If it fails twice, raises a 500.

---

## How to run the E2E test

```bash
NODE_PATH=/Users/ryantellado/.npm/_npx/e41f203b7505f1fb/node_modules \
  node /tmp/test_opsai2.cjs
```

This test (saved at `/tmp/test_opsai2.cjs`) signs up a fresh user, runs through onboarding, uploads `cafe_ops_small.csv`, checks the home screen and full briefing, tests chat, and verifies the delete confirm flow. Screenshots saved to `/tmp/shot_*.png`.

---

## Git history

```
26fb0ce Add spinner and animated step indicator to briefing loading state
bf8f4b4 Improve error UX — friendly messages instead of raw API strings
e795bd1 Update NOTES.md handoff for current state (2026-05-27)
f470061 Add port 5175 to CORS allowed origins
ae43975 Add delete business + home screen KPI strip (date range, total value, avg/record)
5d5077a Add Welcome Back home screen with business snapshot + briefing highlights
78549e9 Add business layer + Apple-style onboarding wizard
56c6d5b Add pie chart for category distribution with ≤6 categories
fd8fb88 Phase C: dashboard UI redesign — NavBar, KPI strip, sidebar chat, 2-col grid
7cb503a Phase A: auth layer — signup, login, JWT, user greeting
1b6a740 Phase 4: charting layer + cafe_ops sample dataset
1201f76 Phase 4: chat with tool use + ingest robustness fixes
e05797c Phase 2: briefing pipeline + grounded one-page render
82468fb Phase 1: domain profile + stats engine + synthetic restaurant CSV
```
