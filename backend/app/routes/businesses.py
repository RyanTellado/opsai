from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.db import get_conn
from app.storage.paths import new_id

router = APIRouter(tags=["businesses"])


class CreateBusinessRequest(BaseModel):
    name: str
    industry: str
    description: str


@router.post("/businesses")
def create_business(
    body: CreateBusinessRequest,
    user_id: str = Depends(get_current_user),
):
    biz_id = new_id()
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO businesses (id, user_id, name, industry, description, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (biz_id, user_id, body.name.strip(), body.industry.strip(), body.description.strip(), now),
        )
    return {
        "id": biz_id,
        "name": body.name.strip(),
        "industry": body.industry.strip(),
        "description": body.description.strip(),
        "created_at": now,
    }


@router.get("/businesses")
def list_businesses(user_id: str = Depends(get_current_user)):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT
                b.id, b.name, b.industry, b.description, b.created_at,
                COUNT(r.id) AS report_count,
                MAX(r.created_at) AS last_briefing_at,
                (SELECT headline FROM reports
                 WHERE business_id = b.id
                 ORDER BY created_at DESC LIMIT 1) AS latest_headline
            FROM businesses b
            LEFT JOIN reports r ON r.business_id = b.id
            WHERE b.user_id = ?
            GROUP BY b.id
            ORDER BY b.created_at DESC
            """,
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@router.delete("/businesses/{business_id}", status_code=204)
def delete_business(
    business_id: str,
    user_id: str = Depends(get_current_user),
):
    with get_conn() as conn:
        biz = conn.execute(
            "SELECT id FROM businesses WHERE id = ? AND user_id = ?",
            (business_id, user_id),
        ).fetchone()
        if not biz:
            raise HTTPException(status_code=404, detail="Business not found.")
        conn.execute("DELETE FROM reports WHERE business_id = ?", (business_id,))
        conn.execute("DELETE FROM businesses WHERE id = ?", (business_id,))


@router.get("/businesses/{business_id}/reports")
def list_business_reports(
    business_id: str,
    user_id: str = Depends(get_current_user),
):
    with get_conn() as conn:
        biz = conn.execute(
            "SELECT id FROM businesses WHERE id = ? AND user_id = ?",
            (business_id, user_id),
        ).fetchone()
        if not biz:
            raise HTTPException(status_code=404, detail="Business not found.")
        rows = conn.execute(
            "SELECT id, headline, created_at, dataset_id, briefing_id, business_id "
            "FROM reports WHERE business_id = ? ORDER BY created_at DESC",
            (business_id,),
        ).fetchall()
    return [dict(r) for r in rows]
