import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from .config import settings
from .db import SessionLocal
from .models import Meeting, User
from .security import digest, hash_password


def seed():
    with SessionLocal() as db:
        if db.get(User, 1) is None:
            db.add(User(id=1, display_name="Rupinder Kaur", email="demo@example.com"))
            db.commit()
        demo = db.get(User, 1)
        if settings.demo_password and not demo.password_hash:
            if len(settings.demo_password) < 12:
                raise ValueError("DEMO_PASSWORD must contain at least 12 characters")
            demo.password_hash = hash_password(settings.demo_password)
            db.commit()
        if db.scalar(select(Meeting.id).limit(1)):
            return
        now = datetime.now(timezone.utc)
        for index, (title, days, duration) in enumerate(
            [
                ("Product design review", 1, 40),
                ("Engineering team sync", 2, 30),
                ("Weekly project catch-up", 3, 60),
                ("Sprint planning", -1, 45),
                ("Design walkthrough", -2, 30),
            ]
        ):
            start = now + timedelta(days=days)
            db.add(
                Meeting(
                    code=str(81234567001 + index),
                    host_user_id=1,
                    title=title,
                    description="Review progress, share updates, and plan the next steps.",
                    scheduled_start=start.isoformat(),
                    duration_minutes=duration,
                    status="scheduled" if days > 0 else "ended",
                    started_at=start.isoformat() if days < 0 else None,
                    ended_at=(start + timedelta(minutes=duration)).isoformat()
                    if days < 0
                    else None,
                    host_token_hash=digest(secrets.token_urlsafe(32)),
                )
            )
        db.commit()
