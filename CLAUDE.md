# OpsAI — Project Context for Claude Code

## What this is

An AI operations analyst for small organizations. User uploads a CSV + a one-sentence description; system returns a one-page briefing with trends, anomalies, and recommended actions, each grounded in a computed statistic. Chat with tool use is a **gated Phase 4 feature**; not in scope unless Phases 0–3 finish on time.

## Non-negotiable principles

1. **Deterministic vs. LLM split.** All numbers come from pandas/DuckDB. The LLM decides which numbers matter and writes prose around them. Recommendations must cite a computed statistic via `stat_ref`.
2. **Generic engine + domain profile.** No hard-coded domains. On upload, the LLM generates a `profile.json` that's passed into every downstream prompt.
3. **Chat tool-use loop is gated.** Designed now, built only in Phase 4 if Phases 0–3 finish on time. Max 5 iterations per chat turn. Tools (read-only): `list_columns`, `get_profile`, `compute_stat`, `run_sql`.
4. **Simple stack.** No LangChain. No vector DB. No Postgres, no ORM. User/report metadata lives in a single SQLite file (`data/opsai.db`); dataset/briefing content stays as parquet + JSON on disk. No custom training. No fine-tuning.

## Stack

- **Backend:** FastAPI, pandas, DuckDB (SQL-over-parquet), Anthropic SDK (Claude Sonnet 4.6, native tool use).
- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui.
- **Storage:** parquet on disk for datasets; JSON files on disk for briefing/profile metadata; SQLite (`data/opsai.db`) for users and report index only.
- **Deploy:** localhost only. No Render, no Vercel, no Docker — revisit only if Phase 5 has slack.
- **LLM access:** `ANTHROPIC_API_KEY` in `.env` (loaded at startup; never committed).

## Conventions

- All prompts live in `backend/app/agent/prompts.py` — versioned in git, single source of truth.
- Every feature needs an eval before merge. The eval runner is `python -m eval.run`; fixtures in `backend/eval/fixtures/{ngo,restaurant}.json`.
- Commit after every working state.
- IDs are short ULIDs (sortable, URL-safe) for `dataset_id` and `briefing_id`.
- All endpoints are synchronous. If a request takes 30 seconds, the frontend shows a loader.
- "Endpoint" = a URL on the backend that does one thing when a request hits it.

## How to work with me on this project

- Use planning mode for anything touching the agent loop, schema inference, or prompts.
- Use planning mode for changes spanning more than 2–3 files.
- Normal edit mode is fine for UI tweaks and simple endpoints.
- When in doubt, propose a plan first.
- Push back on scope creep. Re-read the do-not-build list below before suggesting any new functionality.
- I am an undergrad with basic Python and limited backend experience. Define new backend / infra terms briefly inline the first time per session.

## Build list (anything not listed is on the do-not-build list)

- CSV upload → parquet + JSON metadata on disk.
- Domain profile generated once per dataset by a single LLM call.
- Fixed registry of stat templates in `backend/app/services/stats.py`, computed in Python via DuckDB. The LLM never computes numbers.
- Briefing pipeline: stats payload + profile + briefing prompt → JSON briefing validated against a strict schema. Retry once on validation failure.
- Briefing renderer in the frontend: every claim shows the underlying number via `<StatBadge>`.
- Chat tool *interface* (4 tools above, schemas + registry stubs) defined now. Handlers raise `NotImplementedError` until Phase 4.
- Eval runner: `python -m eval.run` over JSON fixtures with keyword + schema checks. No LLM-as-judge.
- Two demo CSVs only: NGO (in hand) and restaurant (proposed schema in Phase 0, generated synthetically).

## Do not build

**Storage / infra:**
- No Postgres, no migrations framework, no ORM. SQLite for users/reports index only (via Python's built-in `sqlite3`). Parquet + JSON for all dataset and briefing content.
- No async job queue, no Celery, no Redis, no worker process. All requests synchronous.
- No websockets, no SSE for upload progress.
- No Docker, no docker-compose, no Kubernetes.
- No remote deployment. Localhost only.
- No CI/CD.

**Auth / multi-user:**
- Auth is email + password + JWT (24h). Passwords hashed with bcrypt. No OAuth, no magic links, no 2FA.
- Per-user report scoping is in scope. No per-user dataset isolation beyond the reports index.

**Data ingestion:**
- No file format other than CSV. No Excel, no JSON, no Google Sheets connector, no S3 sync.
- No streaming uploads. Hard cap at 50 MB; reject above with a clear error.
- No re-upload, no dataset versioning, no edit flows. Upload-once, immutable.
- No interactive CSV cleaning UI (rename columns, change dtypes). Auto-infer; if it's wrong on a non-demo CSV, that's a known limitation.

**LLM features:**
- No model fallback / retry-on-different-model logic. One model, retry once on JSON parse failure.
- No streaming token output for the briefing. Render when the JSON is complete.
- No vector DB, no embeddings, no RAG.
- No fine-tuning.
- No multi-agent orchestration, no agent loops in the briefing path. Single LLM call per stage.
- No LLM-as-judge in eval. Keyword + schema checks only.
- No prompt A/B testing framework.
- **No forecasting.** Trends over time are presented as historical data only — no projection beyond the last observed period.
- **No what-if features.** No "what if I changed X" simulation.

**Briefing / output:**
- No PDF export. HTML page is the deliverable.
- No email delivery, no scheduling, no recurring briefings.
- No comparison briefings (this dataset vs that one).
- No editable briefings. Output is read-only.

**Frontend:**
- No design system beyond Tailwind + shadcn/ui.
- No animations beyond a loading spinner.
- No dark mode.
- No mobile-responsive polish beyond "doesn't break on a laptop screen."
- No type-safe shared schema package between FE/BE. Hand-write TS types from the JSON shape.

**Testing / observability:**
- No unit test suite. The eval runner *is* the test suite.
- No integration test framework.
- No analytics, no telemetry, no cost dashboard. Log to stdout.
- No structured logging beyond `print()` until there is a reason.

**Chat (Phase 4):**
- No chat history persistence. In-memory per session is fine.
- No multi-turn memory beyond the current conversation thread.
- No tool other than the four defined in `docs/ARCHITECTURE.md` §1.8.
