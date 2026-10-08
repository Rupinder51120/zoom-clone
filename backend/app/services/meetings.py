"""Meeting creation and database-backed ID allocation."""

import secrets
from datetime import timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import Meeting
from ..schemas import MeetingCreate
from ..security import digest

MAX_ID_ATTEMPTS = 10


class MeetingIdUnavailable(Exception):
    """No unused meeting ID could be allocated within the retry limit."""


def create_meeting(
    db: Session, body: MeetingCreate, host_user_id: int
) -> tuple[Meeting, str]:
    """Persist a meeting; return its record and the once-issued host credential.

    The unique database constraint is authoritative. A precheck avoids an insert
    for known collisions, but a competing request can still claim the ID before
    commit, so that specific constraint failure is rolled back and retried.
    """
    token = secrets.token_urlsafe(32)
    for _ in range(MAX_ID_ATTEMPTS):
        code = str(secrets.randbelow(90000000000) + 10000000000)
        if db.scalar(select(Meeting.id).where(Meeting.code == code)):
            continue
        meeting = Meeting(
            code=code,
            host_user_id=host_user_id,
            title=body.title,
            description=body.description,
            scheduled_start=body.scheduled_start.astimezone(timezone.utc).isoformat()
            if body.scheduled_start
            else None,
            timezone=body.timezone,
            duration_minutes=body.duration_minutes,
            video_on=body.video_on,
            status="scheduled" if body.scheduled_start else "active",
            host_token_hash=digest(token),
        )
        db.add(meeting)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if not db.scalar(select(Meeting.id).where(Meeting.code == code)):
                raise  # Other integrity failures must not be hidden as ID collisions.
        else:
            return meeting, token
    raise MeetingIdUnavailable
