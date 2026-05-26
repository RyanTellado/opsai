"""Password hashing and JWT helpers."""
import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
_ALGORITHM = "HS256"
_EXPIRY_HOURS = 24


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=_EXPIRY_HOURS),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def get_current_user(token: str = Depends(_oauth2)) -> str:
    """FastAPI dependency — returns user_id or raises 401."""
    try:
        data = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        user_id: str = data.get("sub", "")
        if not user_id:
            raise ValueError
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id
