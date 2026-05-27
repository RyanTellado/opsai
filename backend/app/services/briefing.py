"""Briefing generation: profile + computed stats -> grounded JSON briefing.

Single LLM call (no agent loop in the briefing path — per CLAUDE.md).
Validates the artifact shape AND that every stat_ref points into the
computed stats payload. Retries once on parse/schema/unknown-ref failure.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field, ValidationError

from app.agent.prompts import BRIEFING_PROMPT
from app.services import llm, stats, stats_selector
from app.services.ingest import load_dataset_metadata
from app.storage import paths


class Trend(BaseModel):
    claim: str
    stat_ref: str
    rationale: str


class Anomaly(BaseModel):
    claim: str
    stat_ref: str
    rationale: str


class Action(BaseModel):
    action: str
    evidence_stat_ref: str
    expected_impact: str


class Briefing(BaseModel):
    dataset_id: str = ""
    briefing_id: str = ""
    headline: str
    trends: list[Trend] = Field(min_length=1, max_length=6)
    anomalies: list[Anomaly] = Field(default_factory=list, max_length=6)
    actions: list[Action] = Field(min_length=1, max_length=6)


def _compute_stats(dataset_id: str, profile: dict) -> dict:
    payload: dict[str, dict] = {}
    for call in stats_selector.select_stats(profile):
        fn = stats.REGISTRY[call["name"]]
        result = fn(dataset_id, call["params"])
        payload[f"{call['name']}.{call['alias']}"] = result
    return payload


def _strip_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        first_newline = s.find("\n")
        if first_newline != -1:
            s = s[first_newline + 1 :]
        if s.endswith("```"):
            s = s[:-3]
    return s.strip()


def _unknown_refs(briefing: Briefing, payload: dict) -> list[str]:
    valid = set(payload.keys())
    bad: list[str] = []
    for t in briefing.trends:
        if t.stat_ref not in valid:
            bad.append(t.stat_ref)
    for a in briefing.anomalies:
        if a.stat_ref not in valid:
            bad.append(a.stat_ref)
    for ac in briefing.actions:
        if ac.evidence_stat_ref not in valid:
            bad.append(ac.evidence_stat_ref)
    return bad


def _build_user_message(profile: dict, payload: dict) -> str:
    stat_lines = []
    for k, v in payload.items():
        line = f"  {k}: {v.get('description', '')} | value={v.get('value')}"
        series = v.get("series")
        if isinstance(series, list) and series:
            preview = series[:12]
            line += f" | series_first_{len(preview)}={preview}"
        stat_lines.append(line)
    keys_list = "\n".join(f"  - {k}" for k in payload.keys())
    return (
        "PROFILE:\n"
        + json.dumps(profile, indent=2, ensure_ascii=False)
        + "\n\nSTATS PAYLOAD KEYS (use VERBATIM for stat_ref / evidence_stat_ref):\n"
        + keys_list
        + "\n\nSTATS PAYLOAD:\n"
        + "\n".join(stat_lines)
        + "\n\nNow write the briefing. Output ONLY the JSON."
    )


def generate_briefing(dataset_id: str, user_id: str | None = None, business_id: str | None = None) -> dict:
    """Run the full briefing pipeline. Returns the bundle dict."""
    meta = load_dataset_metadata(dataset_id)
    profile = meta.get("profile")
    if not profile:
        raise RuntimeError(
            "Dataset has no profile; cannot generate briefing. Re-upload after "
            "the LLM key is configured."
        )

    payload = _compute_stats(dataset_id, profile)
    user_msg = _build_user_message(profile, payload)

    last_err: Optional[str] = None
    briefing: Optional[Briefing] = None
    for attempt in range(2):
        if attempt == 0:
            prompt = user_msg
        else:
            prompt = (
                f"{user_msg}\n\nYour previous response was rejected: {last_err}\n"
                "Return ONLY valid JSON matching the schema. Every stat_ref / "
                "evidence_stat_ref MUST appear verbatim in STATS PAYLOAD KEYS."
            )
        raw = llm.complete_text(system=BRIEFING_PROMPT, user=prompt, max_tokens=4096)
        try:
            data = json.loads(_strip_fences(raw))
            candidate = Briefing.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as e:
            last_err = f"{type(e).__name__}: {e}"
            continue
        bad = _unknown_refs(candidate, payload)
        if bad:
            last_err = (
                f"Unknown stat_refs: {bad}. Valid keys: {sorted(payload.keys())}"
            )
            continue
        briefing = candidate
        break

    if briefing is None:
        raise RuntimeError(f"Briefing generation failed after retry: {last_err}")

    briefing.dataset_id = dataset_id
    briefing.briefing_id = paths.new_id()

    out_dir = paths.briefing_dir(dataset_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    bundle = {
        "briefing": briefing.model_dump(),
        "stats_payload": payload,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    (out_dir / f"{briefing.briefing_id}.json").write_text(
        json.dumps(bundle, indent=2, default=str)
    )

    if user_id:
        from app.db import get_conn
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO reports (id, user_id, dataset_id, briefing_id, headline, created_at, business_id) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    paths.new_id(),
                    user_id,
                    dataset_id,
                    briefing.briefing_id,
                    briefing.headline,
                    datetime.now(timezone.utc).isoformat(),
                    business_id,
                ),
            )

    return bundle
