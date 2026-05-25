"""Pydantic models for request / response bodies.

Phase 0: only the upload response surface needs a model. We return plain dicts
from the ingest service for now; this file fills in as endpoints solidify.
"""

from typing import Optional

from pydantic import BaseModel


class ColumnSchema(BaseModel):
    name: str
    dtype: str
    nullable: bool
    null_pct: float
    sample_values: list[str]


class DatasetSchema(BaseModel):
    row_count: int
    columns: list[ColumnSchema]


class DatasetMeta(BaseModel):
    original_filename: str
    uploaded_at: str
    user_description: str


class DatasetResponse(BaseModel):
    dataset_id: str
    schema: DatasetSchema
    meta: DatasetMeta
    profile: Optional[dict] = None
    profile_error: Optional[str] = None
