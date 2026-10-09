"""Feature 2 contracts, exercised against disposable SQLite via TestClient."""

import re

import pytest
from sqlalchemy import func, select

from app.config import settings
from app.db import SessionLocal
from app.models import Meeting
from app.security import digest

HEADERS = {"X-Host-Api-Key": settings.host_api_key}


def create(client, **body):
    response = client.post("/api/meetings", json=body, headers=HEADERS)
    assert response.status_code == 201, response.text
    return response.json()


def test_defaults_and_durable_record(client):
    result = create(client)
    assert re.fullmatch(r"[1-9]\d{10}", result["code"])
    assert result["title"] == "My Meeting"
    assert result["status"] == "active"
    assert result["scheduled_start"] is None
    assert result["started_at"] is None
    assert result["ended_at"] is None
    assert result["video_on"] is True
    assert result["duration_minutes"] == 40
    assert result["created_at"]
    with SessionLocal() as db:
        record = db.scalar(select(Meeting).where(Meeting.code == result["code"]))
        assert record.host_user_id == 1
        assert record.host_token_hash == digest(result["host_token"])
        assert record.host_token_hash != result["host_token"]
    public = client.get(f"/api/meetings/{result['code']}").json()
    assert public == {k: v for k, v in result.items() if k != "host_token"}
    listed = client.get("/api/meetings", headers=HEADERS).json()
    assert public in listed


def test_fifty_creations_have_distinct_ids_and_credentials(client):
    records = [create(client) for _ in range(50)]
    assert len({m["code"] for m in records}) == 50
    assert len({m["host_token"] for m in records}) == 50
    assert all(re.fullmatch(r"[1-9]\d{10}", m["code"]) for m in records)


def test_existing_id_collision_retries(client, monkeypatch):
    first = create(client)
    candidate = 19999999999
    values = iter([int(first["code"]) - 10000000000, candidate - 10000000000])
    monkeypatch.setattr(
        "app.services.meetings.secrets.randbelow", lambda _: next(values)
    )
    second = create(client)
    assert second["code"] == str(candidate)
    assert client.get(f"/api/meetings/{first['code']}").json()["code"] == first["code"]


def test_invite_uses_configured_origin(client, monkeypatch):
    monkeypatch.setattr(settings, "frontend_url", "https://conference.example/")
    result = create(client)
    assert (
        result["invite_link"]
        == f"https://conference.example/join?meeting={result['code']}"
    )
    assert "host_token" not in result["invite_link"]


@pytest.mark.parametrize("video_on", [True, False])
def test_video_mode_persists_and_host_can_enter(client, video_on):
    result = create(client, video_on=video_on)
    assert client.get(f"/api/meetings/{result['code']}").json()["video_on"] == video_on
    admission = client.post(
        f"/api/meetings/{result['code']}/join",
        json={
            "display_name": "Host",
            "host_token": result["host_token"],
        },
    )
    assert admission.status_code == 200
    assert admission.json()["role"] == "host"
    with client.websocket_connect(
        f"/ws/meetings/{result['code']}", headers={"origin": "http://localhost:3000"}
    ) as socket:
        socket.send_json({"token": admission.json()["token"]})
        assert socket.receive_json()["type"] == "welcome"
        details = client.get(f"/api/meetings/{result['code']}").json()
        assert details["started_at"] is not None
        assert details["status"] == "active"
        socket.send_json({"type": "end"})
        assert socket.receive_json()["type"] == "ended"
    assert client.get(f"/api/meetings/{result['code']}").json()["status"] == "ended"


@pytest.mark.parametrize("headers", [{}, {"X-Host-Api-Key": "wrong"}])
def test_unauthorized_creation_has_no_side_effect(client, headers):
    with SessionLocal() as db:
        before = db.scalar(select(func.count()).select_from(Meeting))
    assert client.post("/api/meetings", json={}, headers=headers).status_code == 403
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Meeting)) == before


def test_invalid_input_does_not_create_meeting(client):
    with SessionLocal() as db:
        before = db.scalar(select(func.count()).select_from(Meeting))
    for body in [
        {"title": "   "},
        {"title": "x" * 201},
        {"duration_minutes": 0},
        {"timezone": "bad"},
    ]:
        assert (
            client.post("/api/meetings", json=body, headers=HEADERS).status_code == 422
        )
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Meeting)) == before


def test_credential_is_scoped_to_its_meeting(client):
    first, second = create(client), create(client)
    response = client.post(
        f"/api/meetings/{second['code']}/join",
        json={
            "display_name": "Host",
            "host_token": first["host_token"],
        },
    )
    assert response.status_code == 403


def test_collision_limit_returns_retryable_error(client, monkeypatch):
    first = create(client)
    monkeypatch.setattr(
        "app.services.meetings.secrets.randbelow",
        lambda _: int(first["code"]) - 10000000000,
    )
    response = client.post("/api/meetings", json={}, headers=HEADERS)
    assert response.status_code == 503
    with SessionLocal() as db:
        assert (
            db.scalar(select(func.count()).select_from(Meeting)) == 6
        )  # Five seeds plus first.


def test_competing_insert_collision_is_rolled_back_and_retried(client, monkeypatch):
    from app.schemas import MeetingCreate
    from app.services.meetings import create_meeting

    first = create(client)
    replacement = 19999999998
    candidates = iter([int(first["code"]) - 10000000000, replacement - 10000000000])
    monkeypatch.setattr(
        "app.services.meetings.secrets.randbelow", lambda _: next(candidates)
    )
    with SessionLocal() as db:
        original_scalar = db.scalar
        first_read = True

        def stale_precheck(statement, *args, **kwargs):
            nonlocal first_read
            if first_read:
                first_read = False
                return None  # Another request claimed this ID after our precheck.
            return original_scalar(statement, *args, **kwargs)

        monkeypatch.setattr(db, "scalar", stale_precheck)
        record, token = create_meeting(db, MeetingCreate(), 1)
        assert record.code == str(replacement)
        assert record.host_token_hash == digest(token)
        assert db.is_active


def test_other_integrity_errors_are_not_retried(client, monkeypatch):
    from sqlalchemy.exc import IntegrityError

    from app.schemas import MeetingCreate
    from app.services.meetings import create_meeting

    with SessionLocal() as db:

        def fail_commit():
            raise IntegrityError("insert", {}, Exception("unrelated constraint"))

        monkeypatch.setattr(db, "commit", fail_commit)
        with pytest.raises(IntegrityError):
            create_meeting(db, MeetingCreate(), 1)
        assert db.is_active
