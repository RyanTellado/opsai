import io
import json
import unicodedata
import warnings
from datetime import datetime, timezone

import pandas as pd

from app.storage import paths

MAX_SAMPLE_VALUES = 5
DATE_PARSE_MIN_HIT_RATE = 0.8  # ≥80% of non-null values must parse to keep the cast


def _sanitize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names so SQL/JSON tooling can reference them.

    Replaces embedded newlines, tabs, and runs of whitespace with single
    spaces. Disambiguates collisions with _2, _3, ... CSVs in the wild (the
    NGO one, for example) sometimes have multi-line headers from Excel
    exports that survive into the parsed columns as literal `\\n`.
    """
    seen: dict[str, int] = {}
    new_cols: list[str] = []
    for name in df.columns:
        clean = unicodedata.normalize("NFC", " ".join(str(name).split())) or "unnamed"
        if clean in seen:
            seen[clean] += 1
            clean = f"{clean}_{seen[clean]}"
        else:
            seen[clean] = 1
        new_cols.append(clean)
    df.columns = new_cols
    return df


def _coerce_dates(df: pd.DataFrame) -> pd.DataFrame:
    """Best-effort datetime parsing on object columns.

    For each string column, try pd.to_datetime; keep the converted version
    only if ≥80% of non-null values parsed successfully (otherwise the
    column was probably a free-text field with a few date-looking strings).
    """
    for col in df.columns:
        if df[col].dtype != object:
            continue
        non_null = df[col].dropna()
        if non_null.empty:
            continue
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            parsed = pd.to_datetime(non_null, errors="coerce", format="mixed")
        hit_rate = parsed.notna().mean()
        if hit_rate >= DATE_PARSE_MIN_HIT_RATE:
            new_col = pd.to_datetime(df[col], errors="coerce", format="mixed")
            df[col] = new_col
    return df


def ingest_csv(
    contents: bytes,
    original_filename: str,
    user_description: str,
) -> dict:
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise ValueError(f"Could not parse CSV: {e}")

    if df.empty:
        raise ValueError("CSV has no rows.")

    df = _sanitize_column_names(df)
    df = _coerce_dates(df)

    dataset_id = paths.new_id()
    dataset_dir = paths.dataset_dir(dataset_id)
    dataset_dir.mkdir(parents=True, exist_ok=True)

    df.to_parquet(dataset_dir / "data.parquet", index=False)

    schema = _build_schema(df)
    meta = {
        "original_filename": original_filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "user_description": user_description,
    }

    (dataset_dir / "schema.json").write_text(json.dumps(schema, indent=2))
    (dataset_dir / "meta.json").write_text(json.dumps(meta, indent=2))

    return {"dataset_id": dataset_id, "schema": schema, "meta": meta}


def load_dataset_metadata(dataset_id: str) -> dict:
    dataset_dir = paths.dataset_dir(dataset_id)
    if not dataset_dir.exists():
        raise FileNotFoundError(dataset_id)
    schema = json.loads((dataset_dir / "schema.json").read_text())
    meta = json.loads((dataset_dir / "meta.json").read_text())
    profile_path = dataset_dir / "profile.json"
    profile = json.loads(profile_path.read_text()) if profile_path.exists() else None
    return {"dataset_id": dataset_id, "schema": schema, "meta": meta, "profile": profile}


def _build_schema(df: pd.DataFrame) -> dict:
    columns = []
    for name in df.columns:
        col = df[name]
        non_null = col.dropna()
        sample_values = (
            non_null.drop_duplicates().head(MAX_SAMPLE_VALUES).astype(str).tolist()
        )
        columns.append(
            {
                "name": str(name),
                "dtype": str(col.dtype),
                "nullable": bool(col.isna().any()),
                "null_pct": round(float(col.isna().mean()) * 100, 2),
                "sample_values": sample_values,
            }
        )
    return {"row_count": int(len(df)), "columns": columns}
