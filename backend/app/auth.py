"""Password authentication. Session credentials are exchanged only with the BFF."""

import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .db import get_db
from .models import AuthSession, User
from .security import (
    current_user,
    digest,
    hash_password,
    require_gateway,
    verify_password,
)

router = APIRouter(prefix="/api/auth", dependencies=[Depends(require_gateway)])
SESSION_SECONDS = 7 * 24 * 60 * 60
_attempts: dict[str, deque] = defaultdict(deque)
_lock = threading.Lock()


def throttle(email: str):
    now = time.monotonic()
    with _lock:
        for key in list(_attempts):
            if not _attempts[key] or _attempts[key][-1] < now - 60:
                del _attempts[key]
        attempts = _attempts[email]
        if len(attempts) >= 10:
            raise HTTPException(429, "Too many attempts. Try again in a minute.")
        attempts.append(now)


class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def email_address(cls, value):
        import re

        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value


class Signup(Credentials):
    display_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("display_name")
    @classmethod
    def name(cls, value):
        if not value.strip():
            raise ValueError("Your name is required")
        return value.strip()


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


def public_user(user):
    return {
        "id": user.id,
        "display_name": user.display_name,
        "email": user.email,
        "timezone": user.timezone,
        "availability": user.availability,
        "status_message": user.status_message,
        "work_location": user.work_location,
    }


def issue_session(db, user):
    token = secrets.token_urlsafe(32)
    db.execute(
        delete(AuthSession).where(
            AuthSession.expires_at <= datetime.now(timezone.utc).isoformat()
        )
    )
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=digest(token),
            expires_at=(
                datetime.now(timezone.utc) + timedelta(seconds=SESSION_SECONDS)
            ).isoformat(),
        )
    )
    db.commit()
    return {
        "user": public_user(user),
        "session_token": token,
        "max_age": SESSION_SECONDS,
    }


@router.post("/signup", status_code=201)
def signup(body: Signup, db: Session = Depends(get_db)):
    throttle(body.email)
    user = User(
        display_name=body.display_name,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Unable to create this account. Try signing in instead."
        )
    return issue_session(db, user)


@router.post("/signin")
def signin(body: Credentials, db: Session = Depends(get_db)):
    throttle(body.email)
    user = db.scalar(select(User).where(User.email == body.email))
    if not verify_password(body.password, user.password_hash if user else None):
        raise HTTPException(401, "Incorrect email or password")
    return issue_session(db, user)


@router.get("/me")
def me(user: User = Depends(current_user)):
    return public_user(user)


@router.post("/signout")
def signout(db: Session = Depends(get_db), x_session_token: str = Header(default="")):
    db.execute(
        delete(AuthSession).where(AuthSession.token_hash == digest(x_session_token))
    )
    db.commit()
    return {"message": "Signed out"}


@router.post("/password")
def change_password(
    body: PasswordChange,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(401, "Incorrect current password")
    user.password_hash = hash_password(body.new_password)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.commit()
    return {"message": "Password changed. Please sign in again."}
