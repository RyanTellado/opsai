# Handoff — last updated 2026-05-14

## Phase 0 status

**Done.** Committed (`43d565b Phase 0: walking skeleton`) and pushed to `origin/main`. Exit criterion met: CSV uploaded via browser, schema renders, files written under `data/datasets/{ulid}/`.

## Last thing we did

Pushed Phase 0 to GitHub. Both dev servers were running locally (backend port 8000, frontend port 5173) — they will be **dead tomorrow** since they're tied to this shell session. Restart per `README.md`.

## Next 3 actions when you come back (in order)

1. **Commit `ngo.csv`:**
   ```bash
   cp <wherever-it-lives> samples/ngo.csv
   git add samples/ngo.csv && git commit -m "Add NGO sample dataset"
   ```
2. **Create `backend/.env`** with `ANTHROPIC_API_KEY=sk-ant-...` (template at `backend/.env.example`).
3. **Tell Claude:** "go on Phase 1, option (a)" (or (b) — see below). That kicks off:
   - `PROFILE_PROMPT` in `app/agent/prompts.py`
   - `app/agent/profile.py` (LLM call + JSON validation)
   - `app/services/stats.py` (7 stat templates via DuckDB)
   - Profile generation wired into `POST /datasets`

## Open decisions

- **Restaurant CSV:** (a) generate a basic synthetic version now so Phase 1 exits against both datasets, or (b) defer to Phase 3. Recommendation in last message: (a). Awaiting your call.
- **Optional cleanup:** GitHub redirects `ryantellado/opsai` → `RyanTellado/opsai`. One-line fix: `git remote set-url origin https://github.com/RyanTellado/opsai.git`.

## Gotchas

- **`data/` is gitignored.** Browser uploads land there and won't get committed automatically. Anything you want in the repo goes in `samples/`.
- **Dev servers don't survive session close.** Restart commands in `README.md`.
- **No `uv` installed.** Backend uses stdlib `venv` at `backend/.venv` + system Python 3.9.6. Works fine; switch to `uv` later if you want.
- **Frontend API URL is hardcoded** to `http://127.0.0.1:8000` in `frontend/src/lib/api.ts`. Change there if backend port ever moves.
- **Plan file** (gates, exit criteria, do-not-build): `/Users/ryantellado/.claude/plans/read-claude-md-first-these-radiant-waterfall.md`. `CLAUDE.md` is the operational version.
- **Deadline math:** ~2.5 weeks left of the 3-week budget. Phase 1 should land this week.
