import json

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.services import briefing as briefing_svc
from app.storage import paths

router = APIRouter(tags=["briefings"])


@router.post("/datasets/{dataset_id}/briefings")
def create_briefing(dataset_id: str, user_id: str = Depends(get_current_user)):
    if not paths.dataset_dir(dataset_id).exists():
        raise HTTPException(status_code=404, detail="Dataset not found.")
    try:
        return briefing_svc.generate_briefing(dataset_id, user_id=user_id)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/briefings/{briefing_id}")
def get_briefing(briefing_id: str, user_id: str = Depends(get_current_user)):
    briefings_root = paths.DATA_DIR / "briefings"
    if briefings_root.exists():
        for ds_dir in briefings_root.iterdir():
            candidate = ds_dir / f"{briefing_id}.json"
            if candidate.exists():
                return json.loads(candidate.read_text())
    raise HTTPException(status_code=404, detail="Briefing not found.")


@router.get("/users/me/reports")
def list_reports(user_id: str = Depends(get_current_user)):
    from app.db import get_conn
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, headline, created_at, dataset_id, briefing_id FROM reports "
            "WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]
