from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["chat"])


@router.post("/datasets/{dataset_id}/chat")
def chat(dataset_id: str):
    raise HTTPException(
        status_code=501,
        detail="Phase 4 (chat with tool use) is gated — not implemented yet.",
    )
