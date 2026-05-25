"""Tool handlers for the chat agent (Phase 4).

All handlers are read-only. They take (dataset_id, params) and return
JSON-serializable dicts. The chat loop catches exceptions and feeds the
message back to the LLM as a tool_result so it can self-correct.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import duckdb

from app.services import stats
from app.storage import paths

# ---------- Tool handlers ----------


def list_columns(dataset_id: str, params: dict) -> dict:
    schema_path = paths.dataset_dir(dataset_id) / "schema.json"
    if not schema_path.exists():
        raise FileNotFoundError(f"schema.json missing for {dataset_id}")
    schema = json.loads(schema_path.read_text())
    cols_compact = [
        {
            "name": c["name"],
            "dtype": c["dtype"],
            "nullable": c["nullable"],
            "sample_values": c.get("sample_values", []),
        }
        for c in schema["columns"]
    ]
    return {"row_count": schema["row_count"], "columns": cols_compact}


def get_profile(dataset_id: str, params: dict) -> dict:
    profile_path = paths.dataset_dir(dataset_id) / "profile.json"
    if not profile_path.exists():
        raise FileNotFoundError(f"profile.json missing for {dataset_id}")
    return json.loads(profile_path.read_text())


def compute_stat(dataset_id: str, params: dict) -> dict:
    name = params.get("name")
    if name not in stats.REGISTRY:
        raise ValueError(
            f"unknown stat: {name!r}. Valid: {sorted(stats.REGISTRY)}"
        )
    fn = stats.REGISTRY[name]
    return fn(dataset_id, params.get("params") or {})


# ---------- run_sql with safety checks ----------

_FORBIDDEN_RE = re.compile(
    r"\b(insert|update|delete|drop|create|alter|attach|copy|export|"
    r"pragma|truncate|grant|revoke|install|load|set|use|begin|commit|rollback)\b",
    re.IGNORECASE,
)
_COMMENT_RE = re.compile(r"--.*?$|/\*.*?\*/", re.MULTILINE | re.DOTALL)

MAX_ROWS = 5000


def run_sql(dataset_id: str, params: dict) -> dict:
    raw_sql = (params.get("sql") or "").strip()
    if not raw_sql:
        raise ValueError("`sql` is required.")

    sql = _COMMENT_RE.sub(" ", raw_sql).strip()
    if sql.endswith(";"):
        sql = sql[:-1].rstrip()
    if ";" in sql:
        raise ValueError("Only a single statement is allowed (no `;`).")

    head = sql.lstrip().lower()
    if not (head.startswith("select") or head.startswith("with")):
        raise ValueError(
            "Only SELECT or `WITH ... SELECT` queries are allowed."
        )
    forbidden = _FORBIDDEN_RE.search(sql)
    if forbidden:
        raise ValueError(
            f"Disallowed keyword in SQL: {forbidden.group(0)!r}. Read-only SELECT only."
        )

    parquet_path = paths.dataset_dir(dataset_id) / "data.parquet"
    if not parquet_path.exists():
        raise FileNotFoundError(f"data.parquet missing for {dataset_id}")

    parquet_literal = str(parquet_path).replace("'", "''")
    con = duckdb.connect()
    try:
        con.execute(
            f"CREATE OR REPLACE VIEW dataset AS SELECT * FROM read_parquet('{parquet_literal}')"
        )
        df = con.sql(sql).df()
    finally:
        con.close()

    truncated = len(df) > MAX_ROWS
    if truncated:
        df = df.head(MAX_ROWS)
    return {
        "columns": df.columns.tolist(),
        "rows": [[_jsonable(v) for v in row] for row in df.values.tolist()],
        "row_count": int(len(df)),
        "truncated": truncated,
    }


def _jsonable(v):
    """Best-effort JSON coercion for DuckDB result cells."""
    if v is None:
        return None
    if isinstance(v, (str, int, float, bool)):
        return v
    return str(v)


# ---------- Dispatcher ----------

HANDLERS = {
    "list_columns": list_columns,
    "get_profile": get_profile,
    "compute_stat": compute_stat,
    "run_sql": run_sql,
}


def dispatch(name: str, dataset_id: str, params: dict) -> dict:
    if name not in HANDLERS:
        raise ValueError(f"unknown tool: {name!r}")
    return HANDLERS[name](dataset_id, params or {})
