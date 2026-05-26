from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import (
    create_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.db import get_conn
from app.storage.paths import new_id

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    name: str
    email: str


class MeResponse(BaseModel):
    name: str
    email: str


@router.post("/signup", response_model=AuthResponse)
def signup(req: SignupRequest):
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (req.email.lower(),)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered.")
        user_id = new_id()
        conn.execute(
            "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (
                user_id,
                req.email.lower(),
                req.name.strip(),
                hash_password(req.password),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
    return AuthResponse(
        token=create_token(user_id),
        name=req.name.strip(),
        email=req.email.lower(),
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, password_hash FROM users WHERE email = ?",
            (req.email.lower(),),
        ).fetchone()
    if not row or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    return AuthResponse(
        token=create_token(row["id"]),
        name=row["name"],
        email=req.email.lower(),
    )


@router.get("/me", response_model=MeResponse)
def me(user_id: str = Depends(get_current_user)):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT name, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")
    return MeResponse(name=row["name"], email=row["email"])
