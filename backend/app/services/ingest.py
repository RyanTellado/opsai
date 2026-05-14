import io
import json
from datetime import datetime, timezone

import pandas as pd

from app.storage import paths

MAX_SAMPLE_VALUES = 5


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
