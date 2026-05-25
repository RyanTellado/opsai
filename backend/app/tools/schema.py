"""Tool schemas for the Phase 4 chat agent (read-only).

Anthropic tool-use format. Handlers in registry.py raise NotImplementedError
until Phase 4 is gated in.
"""

TOOLS = [
    {
        "name": "list_columns",
        "description": "Return the schema for the current dataset: column names, dtypes, nullability, and a few sample values per column.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_profile",
        "description": "Return the domain profile JSON for the current dataset (what the data is about, key columns, metrics of interest, anomaly hints).",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "compute_stat",
        "description": (
            "Run a named stat template and return its numeric result. "
            "Use exact param names listed below.\n\n"
            "- summary  params: {date_col?, amount_col?}\n"
            "- null_rates  params: {}\n"
            "- time_series  params: {date_col, amount_col?, period: 'day'|'week'|'month', agg?: 'sum'|'count'|'avg'}\n"
            "- period_over_period  params: same as time_series\n"
            "- topn  params: {group_col, amount_col?, n?: int (default 5), agg?: 'sum'|'count'|'avg'}\n"
            "- category_distribution  params: {category_col}\n"
            "- anomaly_zscore  params: time_series params + {window?: int (default 6), threshold?: float (default 2.0)}\n\n"
            "Use list_columns() first if you need to know the exact column names. "
            "Use double-quoted identifiers in SQL only — params here take raw strings."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "enum": [
                        "summary",
                        "null_rates",
                        "time_series",
                        "period_over_period",
                        "topn",
                        "category_distribution",
                        "anomaly_zscore",
                    ],
                },
                "params": {
                    "type": "object",
                    "description": "Template-specific parameters (see tool description for exact names).",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "run_sql",
        "description": "Run a read-only SELECT (or `WITH ... SELECT`) query against the dataset's parquet file via DuckDB. Reference the table as `dataset` (e.g. `SELECT COUNT(*) FROM dataset WHERE ...`). Single statement. Results truncated to 5000 rows. Column names with spaces or special chars must be double-quoted.",
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "A single SELECT statement against the `dataset` view.",
                },
            },
            "required": ["sql"],
        },
    },
]

TOOL_NAMES = [t["name"] for t in TOOLS]
