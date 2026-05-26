from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.services import chat as chat_svc
from app.storage import paths

router = APIRouter(tags=["chat"])


class ChatHistoryEntry(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatHistoryEntry] = []


@router.post("/datasets/{dataset_id}/chat")
def chat(dataset_id: str, req: ChatRequest, user_id: str = Depends(get_current_user)):
    if not paths.dataset_dir(dataset_id).exists():
        raise HTTPException(status_code=404, detail="Dataset not found.")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")
    try:
        return chat_svc.chat_turn(
            dataset_id,
            req.message.strip(),
            [h.model_dump() for h in req.history],
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
