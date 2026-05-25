import json

from fastapi import APIRouter, HTTPException

from app.services import briefing as briefing_svc
from app.storage import paths

router = APIRouter(tags=["briefings"])


@router.post("/datasets/{dataset_id}/briefings")
def create_briefing(dataset_id: str):
    if not paths.dataset_dir(dataset_id).exists():
        raise HTTPException(status_code=404, detail="Dataset not found.")
    try:
        return briefing_svc.generate_briefing(dataset_id)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/briefings/{briefing_id}")
def get_briefing(briefing_id: str):
    briefings_root = paths.DATA_DIR / "briefings"
    if briefings_root.exists():
        for ds_dir in briefings_root.iterdir():
            candidate = ds_dir / f"{briefing_id}.json"
            if candidate.exists():
                return json.loads(candidate.read_text())
    raise HTTPException(status_code=404, detail="Briefing not found.")
