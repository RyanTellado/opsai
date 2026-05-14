from pathlib import Path

from ulid import ULID

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data"


def new_id() -> str:
    return str(ULID())


def dataset_dir(dataset_id: str) -> Path:
    return DATA_DIR / "datasets" / dataset_id


def briefing_dir(dataset_id: str) -> Path:
    return DATA_DIR / "briefings" / dataset_id
