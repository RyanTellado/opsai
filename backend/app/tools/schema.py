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
        "description": "Run a named stat template from the registry and return its numeric result. Available names: time_series, period_over_period, topn, category_distribution, anomaly_zscore, null_rates, summary.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "enum": [
                        "time_series",
                        "period_over_period",
                        "topn",
                        "category_distribution",
                        "anomaly_zscore",
                        "null_rates",
                        "summary",
                    ],
                },
                "params": {
                    "type": "object",
                    "description": "Template-specific parameters (e.g., {metric, by, period}).",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "run_sql",
        "description": "Run a read-only SELECT query against the dataset's parquet file via DuckDB. SELECT only, single statement, results truncated to 5000 rows.",
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "A single SELECT statement. No DDL or DML.",
                },
            },
            "required": ["sql"],
        },
    },
]

TOOL_NAMES = [t["name"] for t in TOOLS]
