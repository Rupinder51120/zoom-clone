import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from time import monotonic
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import public_user
from .auth import router as auth_router
from .config import settings
from .db import SessionLocal, get_db
from .models import Meeting, Participant, User, utc_now
from .rooms import Connection, registry
from .schemas import JoinRequest, MeetingCreate, ProfileUpdate
from .security import digest, portal_user
from .seed import seed
from .services.meetings import MeetingIdUnavailable
from .services.meetings import create_meeting as persist_meeting


@asynccontextmanager
async def lifespan(app):
    seed()  # Schema is applied with Alembic before startup.
    # Any sockets from a previous process are gone; close their history records.
    with SessionLocal() as db:
        for participant in db.scalars(
            select(Participant).where(
                Participant.joined_at.is_not(None), Participant.left_at.is_(None)
            )
        ):
            participant.left_at = utc_now()
        db.commit()
    yield


DbSession = Annotated[Session, Depends(get_db)]


app = FastAPI(title="ZOOM-CLONE API", lifespan=lifespan)
app.include_router(auth_router)
origins = [s.strip() for s in settings.allowed_origins.split(",") if s.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "X-Host-Api-Key"],
)


def find_meeting(db, code):
    meeting = db.scalar(select(Meeting).where(Meeting.code == code))
    if not meeting:
        raise HTTPException(
            404, "Meeting not found. Check the meeting ID and try again."
        )
    return meeting


def serialize(meeting):
    return {
        key: getattr(meeting, key)
        for key in [
            "code",
            "title",
            "description",
            "scheduled_start",
            "timezone",
            "duration_minutes",
            "status",
            "video_on",
            "created_at",
            "started_at",
            "ended_at",
        ]
    } | {
        "invite_link": f"{settings.frontend_url.rstrip('/')}/join?meeting={meeting.code}"
    }


@app.get("/health")
def health(db: DbSession):
    db.execute(select(1))
    return {"status": "ok"}


@app.get("/api/profile")
def profile(db: DbSession, user: User = Depends(portal_user)):
    return public_user(user)


@app.patch("/api/profile")
def update_profile(
    body: ProfileUpdate, db: DbSession, user: User = Depends(portal_user)
):
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is None:
            raise HTTPException(422, "Profile fields cannot be null")
        setattr(user, field, value)
    db.commit()
    return profile(db, user)


@app.get("/api/meetings")
def meetings(db: DbSession, user: User = Depends(portal_user)):
    return [
        serialize(m)
        for m in db.scalars(
            select(Meeting)
            .where(Meeting.host_user_id == user.id)
            .order_by(Meeting.created_at.desc())
        )
    ]


@app.post("/api/meetings", status_code=201)
def create_meeting(
    body: MeetingCreate, db: DbSession, user: User = Depends(portal_user)
):
    if body.scheduled_start and body.scheduled_start <= datetime.now(timezone.utc):
        raise HTTPException(422, "Choose a future date and time")
    try:
        meeting, token = persist_meeting(db, body, user.id)
    except MeetingIdUnavailable:
        raise HTTPException(503, "Unable to allocate a meeting ID. Please try again.")
    return serialize(meeting) | {"host_token": token}


@app.get("/api/meetings/{code}")
def meeting_details(code: str, db: DbSession):
    return serialize(find_meeting(db, code))


@app.post("/api/meetings/{code}/host")
async def host_meeting(code: str, db: DbSession, user: User = Depends(portal_user)):
    async with registry.lock:
        meeting = find_meeting(db, code)
        if meeting.host_user_id != user.id:
            raise HTTPException(403, "Only the meeting owner can host this meeting")
        if meeting.status == "ended":
            raise HTTPException(410, "This meeting has ended")
        if any(
            c.participant["role"] == "host"
            for c in registry.rooms.get(code, {}).values()
        ):
            raise HTTPException(409, "This meeting already has a connected host")
        token = secrets.token_urlsafe(32)
        meeting.host_token_hash = digest(token)
        db.commit()
        return {"host_token": token, "video_on": meeting.video_on}


@app.post("/api/meetings/{code}/join")
def join_meeting(code: str, body: JoinRequest, db: DbSession):
    meeting = find_meeting(db, code)
    if meeting.status == "ended":
        raise HTTPException(410, "This meeting has ended")
    is_host = body.host_token and secrets.compare_digest(
        digest(body.host_token), meeting.host_token_hash
    )
    if body.host_token and not is_host:
        raise HTTPException(403, "Invalid host credential")
    token = secrets.token_urlsafe(32)
    participant = Participant(
        id=str(uuid.uuid4()),
        meeting_id=meeting.id,
        user_id=meeting.host_user_id if is_host else None,
        display_name=body.display_name,
        role="host" if is_host else "guest",
        token_hash=digest(token),
        host_admission_hash=meeting.host_token_hash if is_host else None,
    )
    db.add(participant)
    db.commit()
    return {
        "participant_id": participant.id,
        "token": token,
        "role": participant.role,
        "ice_servers": settings.ice_servers,
    }


@app.websocket("/ws/meetings/{code}")
async def meeting_socket(socket: WebSocket, code: str):
    # Credentials are sent in the first frame, never in logged request URLs.
    if socket.headers.get("origin") not in origins:
        await socket.close(code=4403)
        return
    await socket.accept()
    participant_id = None
    registered = False
    try:
        import asyncio

        auth = await asyncio.wait_for(socket.receive_json(), timeout=10)
        if not isinstance(auth, dict):
            await socket.close(code=4403)
            return
        async with registry.lock:
            with SessionLocal() as db:
                meeting = db.scalar(select(Meeting).where(Meeting.code == code))
                participant = db.scalar(
                    select(Participant).where(
                        Participant.token_hash == digest(str(auth.get("token", "")))
                    )
                )
                if (
                    not meeting
                    or not participant
                    or participant.meeting_id != meeting.id
                    or participant.removed_at
                    or participant.left_at
                    or (
                        participant.role == "host"
                        and participant.host_admission_hash != meeting.host_token_hash
                    )
                    or meeting.status == "ended"
                ):
                    await socket.close(code=4403)
                    return
                participant_id = participant.id
                room = registry.rooms.setdefault(code, {})
                if participant_id in room or (
                    participant.role == "host"
                    and any(c.participant["role"] == "host" for c in room.values())
                ):
                    await socket.close(code=4409)
                    return
                if participant.role == "host":
                    meeting.status = "active"
                    meeting.started_at = meeting.started_at or utc_now()
                participant.joined_at = utc_now()
                db.commit()
                peer = {
                    "id": participant.id,
                    "display_name": participant.display_name,
                    "role": participant.role,
                    "audio": False,
                    "video": False,
                    "sharing": False,
                    "hand_raised": False,
                }
                await socket.send_json(
                    {
                        "type": "welcome",
                        "peers": registry.peers(code),
                        "chat": registry.chat.get(code, []),
                    }
                )
                room[participant_id] = Connection(socket, peer)
                registered = True
                await registry.broadcast(
                    code,
                    {"type": "participant_joined", "participant": peer},
                    exclude=participant_id,
                )
        while True:
            message = await socket.receive_json()
            if not isinstance(message, dict):
                await socket.send_json(
                    {"type": "error", "message": "Invalid meeting event"}
                )
                continue
            kind = message.get("type")
            async with registry.lock:
                connection = registry.rooms.get(code, {}).get(participant_id)
                if not connection:
                    break
                if kind in ("offer", "answer", "ice"):
                    target = registry.rooms[code].get(message.get("target"))
                    if target and target is not connection:
                        await target.socket.send_json(
                            {
                                "type": kind,
                                "from": participant_id,
                                "data": message.get("data"),
                            }
                        )
                elif kind == "media":
                    for key in ("audio", "video", "sharing"):
                        connection.participant[key] = bool(message.get(key, False))
                    await registry.broadcast(
                        code,
                        {
                            "type": "participant_updated",
                            "participant": connection.participant,
                        },
                    )
                elif kind == "chat":
                    text = message.get("text")
                    if not isinstance(text, str) or not 1 <= len(text.strip()) <= 2000:
                        await socket.send_json(
                            {
                                "type": "error",
                                "message": "Chat messages must contain 1–2000 characters.",
                            }
                        )
                        continue
                    now = monotonic()
                    if now - connection.last_chat < 0.5:
                        await socket.send_json(
                            {
                                "type": "error",
                                "message": "Please wait before sending another message.",
                            }
                        )
                        continue
                    connection.last_chat = now
                    entry = {
                        "id": str(uuid.uuid4()),
                        "sender_id": participant_id,
                        "display_name": connection.participant["display_name"],
                        "text": text.strip(),
                        "sent_at": utc_now(),
                    }
                    history = registry.chat.setdefault(code, [])
                    history.append(entry)
                    del history[:-100]
                    await registry.broadcast(code, {"type": "chat", "entry": entry})
                elif kind == "reaction":
                    emoji = message.get("emoji")
                    if emoji not in ("👍", "👏", "❤️", "😂", "🎉", "😮"):
                        await socket.send_json(
                            {"type": "error", "message": "Unsupported reaction."}
                        )
                        continue
                    now = monotonic()
                    if now - connection.last_reaction < 1:
                        await socket.send_json(
                            {
                                "type": "error",
                                "message": "Please wait before reacting again.",
                            }
                        )
                        continue
                    connection.last_reaction = now
                    await registry.broadcast(
                        code, {"type": "reaction", "id": participant_id, "emoji": emoji}
                    )
                elif kind == "hand":
                    raised = message.get("raised")
                    if not isinstance(raised, bool):
                        await socket.send_json(
                            {"type": "error", "message": "Invalid hand state."}
                        )
                        continue
                    connection.participant["hand_raised"] = raised
                    await registry.broadcast(
                        code,
                        {
                            "type": "participant_updated",
                            "participant": connection.participant,
                        },
                    )
                elif kind in ("mute_all", "remove", "end"):
                    if connection.participant["role"] != "host":
                        await socket.send_json(
                            {
                                "type": "error",
                                "message": "Only the host can perform this action",
                            }
                        )
                        continue
                    if kind == "mute_all":
                        await registry.broadcast(
                            code, {"type": "mute"}, exclude=participant_id
                        )
                    elif kind == "remove":
                        target_id = message.get("target")
                        target = registry.rooms[code].get(target_id)
                        if target and target_id != participant_id:
                            with SessionLocal() as db:
                                db.get(Participant, target_id).removed_at = utc_now()
                                db.commit()
                            await target.socket.send_json({"type": "removed"})
                            registry.rooms[code].pop(target_id)
                            await target.socket.close(code=4003)
                            await registry.broadcast(
                                code, {"type": "participant_left", "id": target_id}
                            )
                    else:
                        with SessionLocal() as db:
                            meeting = find_meeting(db, code)
                            meeting.status, meeting.ended_at = "ended", utc_now()
                            db.commit()
                        await registry.broadcast(code, {"type": "ended"})
                        for c in list(registry.rooms[code].values()):
                            await c.socket.close(code=4000)
                        break
    except (WebSocketDisconnect, TimeoutError, ValueError, RuntimeError):
        pass
    finally:
        if registered and participant_id:
            async with registry.lock:
                room = registry.rooms.get(code, {})
                was_connected = room.pop(participant_id, None) is not None
                if not room:
                    registry.rooms.pop(code, None)
                    registry.chat.pop(code, None)
                with SessionLocal() as db:
                    participant = db.get(Participant, participant_id)
                    if participant:
                        participant.left_at = utc_now()
                        db.commit()
                if was_connected:
                    await registry.broadcast(
                        code, {"type": "participant_left", "id": participant_id}
                    )
