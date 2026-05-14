# OpsAI — Prompt inventory

> Three prompts. That's it. Resist adding a "judge" prompt or a "summarizer" prompt.

All prompts live in a single Python module: **`backend/app/agent/prompts.py`**. The module exports one constant per prompt; loaders in `backend/app/agent/profile.py`, `briefing.py`, and (Phase 4) `chat.py` import directly from it. Single source of truth, version-controlled in git, trivially greppable.

| Constant in `prompts.py` | Used by | One-liner |
|---|---|---|
| `PROFILE_PROMPT` | `agent/profile.py` | Given columns + sample rows + user description, output a domain profile JSON. |
| `BRIEFING_PROMPT` | `agent/briefing.py` | Given profile + stats payload, output a briefing JSON conforming to the artifact schema in `docs/ARCHITECTURE.md` §1.7. |
| `CHAT_SYSTEM_PROMPT` *(Phase 4 only)* | `routes/chat.py` | You are an ops analyst; use the four read-only tools to answer with grounded numbers. Max 5 tool-call iterations per turn. |

Each prompt is a triple-quoted string with explicit input/output contract at the top. Output schemas live alongside the prompt (or referenced from `models.py`) so prompt and validator stay in sync.
