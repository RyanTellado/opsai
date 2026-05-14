# OpsAI

AI operations analyst for small organizations. Upload a CSV + a one-sentence description of your org; get a one-page briefing with trends, anomalies, and recommended actions, each grounded in a computed statistic.

See `CLAUDE.md` for the operating principles and `docs/ARCHITECTURE.md` for the design.

## Run locally

Requires Python 3.9+ and Node 20+.

### Backend (FastAPI on port 8000)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -e .
cp .env.example .env       # then fill in ANTHROPIC_API_KEY
.venv/bin/uvicorn app.main:app --port 8000 --reload
```

### Frontend (Vite dev server on port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:5173>.

## Phase status

- **Phase 0 — walking skeleton:** CSV upload → parquet + schema.json on disk; schema renders in the browser. ✅
- **Phase 1 — profile + stats:** not started.
- **Phase 2 — briefing generation:** not started.
- **Phase 3 — polish + demo:** not started.
- **Phase 4 — chat (gated):** tool schemas stubbed; handlers raise `NotImplementedError`.
