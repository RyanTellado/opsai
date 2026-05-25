"""Single source of truth for all prompt strings.

Phase 1: PROFILE_PROMPT.
Phase 2: BRIEFING_PROMPT.
Phase 4 (gated): CHAT_SYSTEM_PROMPT.
"""

PROFILE_PROMPT = """You are a data analyst inspecting a freshly uploaded CSV. \
Given the column metadata, sample rows, and a one-sentence description from \
the uploader, produce a domain profile that downstream prompts will use to \
decide which statistics matter and what "interesting" means for this dataset.

Output ONLY a JSON object matching this schema. No prose, no markdown fences:

{
  "domain": "short phrase naming the domain (e.g. 'small NGO mobile health clinic operations', 'casual dining restaurant orders')",
  "entity_grain": "what one row represents (e.g. 'one row per donation', 'one row per order line item')",
  "key_columns": {
    "amount":   "<column name of the primary numeric measure, or null>",
    "date":     "<column name of the primary timestamp/date, or null>",
    "actor":    "<column name of the actor/identifier (donor, customer, server), or null>",
    "category": "<column name of the primary categorical breakdown, or null>"
  },
  "metrics_of_interest": [
    {"name": "snake_case_name", "definition": "human-readable definition"}
  ],
  "expected_seasonality": "<one sentence on expected periodicity (weekly, monthly, holiday-driven); 'unknown' if unclear>",
  "anomaly_hints": ["<short bullet on a type of anomaly worth flagging>"],
  "glossary": {"<column_or_term>": "<plain-language definition>"}
}

Constraints:
- All four `key_columns` keys MUST be present. Use null (JSON null, not the string "null") if no column fits.
- `metrics_of_interest` MUST contain 2-5 entries.
- `anomaly_hints` MUST contain 2-5 entries.
- `glossary` should have 1-6 entries covering columns whose meaning isn't obvious from the name.
- Use only column names that appear in the COLUMNS list. Do not invent columns.
- Output valid JSON only. No ```json fences, no commentary."""

BRIEFING_PROMPT = ""  # Phase 2
CHAT_SYSTEM_PROMPT = ""  # Phase 4
