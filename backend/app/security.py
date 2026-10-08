import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import AuthSession, User


def digest(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    value = hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt), n=32768, r=8, p=1, maxmem=67108864
    ).hex()
    return f"scrypt${salt}${value}"


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        # Same expensive work for unknown/unconfigured accounts.
        hash_password(password)
        return False
    try:
        _, salt, expected = encoded.split("$")
        actual = hashlib.scrypt(
            password.encode(),
            salt=bytes.fromhex(salt),
            n=32768,
            r=8,
            p=1,
            maxmem=67108864,
        ).hex()
        return secrets.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def require_gateway(x_host_api_key: str = Header(default="")):
    if not secrets.compare_digest(x_host_api_key, settings.host_api_key):
        raise HTTPException(403, "Invalid API gateway credential")


def current_user(
    db: Session = Depends(get_db),
    x_session_token: str = Header(default=""),
    gateway=Depends(require_gateway),
) -> User:
    session = (
        db.scalar(
            select(AuthSession).where(AuthSession.token_hash == digest(x_session_token))
        )
        if x_session_token
        else None
    )
    if not session or datetime.fromisoformat(session.expires_at) <= datetime.now(
        timezone.utc
    ):
        raise HTTPException(401, "Please sign in to continue")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, "Please sign in to continue")
    return user
