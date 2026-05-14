from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["briefings"])


@router.post("/datasets/{dataset_id}/briefings")
def create_briefing(dataset_id: str):
    raise HTTPException(status_code=501, detail="Phase 2 — not implemented yet.")


@router.get("/briefings/{briefing_id}")
def get_briefing(briefing_id: str):
    raise HTTPException(status_code=501, detail="Phase 2 — not implemented yet.")
