"""Domain profile generation — one LLM call per dataset.

Reads the dataset's schema + sample rows + user description, asks Claude
for a strict-shape JSON profile, validates against a Pydantic model, and
writes profile.json next to data.parquet. Retries once on parse/schema
failure (per CLAUDE.md).
"""

from __future__ import annotations

import json
from typing import Optional

import pandas as pd
from pydantic import BaseModel, Field, ValidationError

from app.agent.prompts import PROFILE_PROMPT
from app.services import llm
from app.services.ingest import load_dataset_metadata
from app.storage import paths

MAX_SAMPLE_ROWS = 10


class KeyColumns(BaseModel):
    amount: Optional[str] = None
    date: Optional[str] = None
    actor: Optional[str] = None
    category: Optional[str] = None


class Metric(BaseModel):
    name: str
    definition: str


class Profile(BaseModel):
    domain: str
    entity_grain: str
    key_columns: KeyColumns
    metrics_of_interest: list[Metric] = Field(min_length=1, max_length=10)
    expected_seasonality: str
    anomaly_hints: list[str] = Field(min_length=1, max_length=10)
    glossary: dict[str, str]


def _build_user_message(dataset_id: str) -> str:
    meta = load_dataset_metadata(dataset_id)
    parquet_path = paths.dataset_dir(dataset_id) / "data.parquet"
    sample_df = pd.read_parquet(parquet_path).head(MAX_SAMPLE_ROWS)
    columns_lines = [
        f"- {c['name']} (dtype={c['dtype']}, null_pct={c['null_pct']}, "
        f"sample_values={c['sample_values']})"
        for c in meta["schema"]["columns"]
    ]
    return (
        f"USER DESCRIPTION:\n{meta['meta']['user_description']}\n\n"
        f"ROW COUNT: {meta['schema']['row_count']:,}\n\n"
        f"COLUMNS:\n" + "\n".join(columns_lines) + "\n\n"
        f"SAMPLE ROWS (up to {MAX_SAMPLE_ROWS}, CSV-formatted):\n"
        f"{sample_df.to_csv(index=False)}"
    )


def _strip_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        first_newline = s.find("\n")
        if first_newline != -1:
            s = s[first_newline + 1 :]
        if s.endswith("```"):
            s = s[:-3]
    return s.strip()


def _parse_and_validate(text: str) -> Profile:
    return Profile.model_validate(json.loads(_strip_fences(text)))


def generate_profile(dataset_id: str) -> dict:
    """Run the LLM call, validate, write profile.json, return the dict."""
    user_msg = _build_user_message(dataset_id)
    last_err: Exception | None = None
    profile: Profile | None = None
    for attempt in range(2):
        if attempt == 0:
            prompt_for_call = user_msg
        else:
            prompt_for_call = (
                f"{user_msg}\n\nYour previous response failed validation: "
                f"{last_err}\nReturn ONLY valid JSON matching the schema. "
                "No fences, no commentary."
            )
        raw = llm.complete_text(system=PROFILE_PROMPT, user=prompt_for_call)
        try:
            profile = _parse_and_validate(raw)
            break
        except (json.JSONDecodeError, ValidationError) as e:
            last_err = e
    if profile is None:
        raise RuntimeError(f"Profile generation failed after retry: {last_err}")

    out_path = paths.dataset_dir(dataset_id) / "profile.json"
    out_path.write_text(profile.model_dump_json(indent=2))
    return profile.model_dump()
