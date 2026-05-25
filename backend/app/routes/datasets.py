from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.agent import profile as profile_mod
from app.services import ingest

router = APIRouter(prefix="/datasets", tags=["datasets"])

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB hard cap per CLAUDE.md


@router.post("")
async def create_dataset(
    file: UploadFile = File(...),
    description: str = Form(...),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")
    if not description.strip():
        raise HTTPException(status_code=400, detail="Description is required.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.",
        )

    try:
        result = ingest.ingest_csv(
            contents=contents,
            original_filename=file.filename,
            user_description=description.strip(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    profile_payload = None
    profile_error = None
    try:
        profile_payload = profile_mod.generate_profile(result["dataset_id"])
    except Exception as e:
        profile_error = f"{type(e).__name__}: {e}"
        print(f"[profile] generation failed for {result['dataset_id']}: {profile_error}")

    result["profile"] = profile_payload
    result["profile_error"] = profile_error
    return result


@router.get("/{dataset_id}")
def get_dataset(dataset_id: str):
    try:
        return ingest.load_dataset_metadata(dataset_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found.")
