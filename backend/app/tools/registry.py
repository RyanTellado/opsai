"""Tool handlers. All raise NotImplementedError until Phase 4."""


def list_columns(dataset_id: str, params: dict) -> dict:
    raise NotImplementedError("list_columns handler — Phase 4")


def get_profile(dataset_id: str, params: dict) -> dict:
    raise NotImplementedError("get_profile handler — Phase 4")


def compute_stat(dataset_id: str, params: dict) -> dict:
    raise NotImplementedError("compute_stat handler — Phase 4")


def run_sql(dataset_id: str, params: dict) -> dict:
    raise NotImplementedError("run_sql handler — Phase 4")


HANDLERS = {
    "list_columns": list_columns,
    "get_profile": get_profile,
    "compute_stat": compute_stat,
    "run_sql": run_sql,
}
