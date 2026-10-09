from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from starlette.websockets import WebSocketDisconnect

from app.config import settings
from app.db import SessionLocal
from app.models import Meeting, Participant

HEADERS = {"X-Host-Api-Key": settings.host_api_key}
ORIGIN = {"origin": "http://localhost:3000"}


def create(client, **kwargs):
    response = client.post(
        "/api/meetings", json={"title": "Integration call", **kwargs}, headers=HEADERS
    )
    assert response.status_code == 201, response.text
    return response.json()


def join(client, code, name, host_token=None):
    response = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": name, "host_token": host_token},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_health_schedule_validation_and_default_user(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert (
        client.post("/api/meetings", json={"title": "Unauthorized"}).status_code == 403
    )
    assert client.get("/api/meetings/99999999999").status_code == 404
    assert (
        client.post("/api/meetings", json={"title": "   "}, headers=HEADERS).status_code
        == 422
    )
    assert (
        client.post(
            "/api/meetings",
            json={"scheduled_start": "2020-01-01T00:00:00Z"},
            headers=HEADERS,
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/meetings", json={"timezone": "Invalid/Zone"}, headers=HEADERS
        ).status_code
        == 422
    )
    when = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    meeting = create(client, scheduled_start=when, duration_minutes=45)
    assert meeting["status"] == "scheduled"
    assert len(meeting["code"]) == 11
    assert meeting["invite_link"].endswith(meeting["code"])
    assert "host_token" not in client.get(f"/api/meetings/{meeting['code']}").json()
    assert (
        client.post(
            f"/api/meetings/{meeting['code']}/join",
            json={"display_name": "Guest", "host_token": "wrong"},
        ).status_code
        == 403
    )


def test_signaling_host_controls_history_and_end(client):
    meeting = create(client)
    code = meeting["code"]
    host = join(client, code, "Host", meeting["host_token"])
    guest = join(client, code, "Guest")
    with client.websocket_connect(f"/ws/meetings/{code}", headers=ORIGIN) as h:
        h.send_json({"token": host["token"]})
        assert h.receive_json()["type"] == "welcome"
        with client.websocket_connect(f"/ws/meetings/{code}", headers=ORIGIN) as g:
            g.send_json({"token": guest["token"]})
            assert g.receive_json()["peers"][0]["role"] == "host"
            assert h.receive_json()["type"] == "participant_joined"
            g.send_json({"type": "end"})
            assert g.receive_json()["type"] == "error"
            g.send_json(
                {
                    "type": "offer",
                    "target": host["participant_id"],
                    "from": "spoofed",
                    "data": {"type": "offer", "sdp": "test"},
                }
            )
            assert h.receive_json()["from"] == guest["participant_id"]
            h.send_json({"type": "mute_all"})
            assert g.receive_json()["type"] == "mute"
            h.send_json({"type": "remove", "target": guest["participant_id"]})
            assert g.receive_json()["type"] == "removed"
            assert h.receive_json()["type"] == "participant_left"
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(
                f"/ws/meetings/{code}", headers=ORIGIN
            ) as retry:
                retry.send_json({"token": guest["token"]})
                retry.receive_json()
        h.send_json({"type": "end"})
        event = h.receive_json()
        while event["type"] != "ended":
            event = h.receive_json()
    assert client.get(f"/api/meetings/{code}").json()["status"] == "ended"
    assert (
        client.post(
            f"/api/meetings/{code}/join", json={"display_name": "Late"}
        ).status_code
        == 410
    )
    with SessionLocal() as db:
        record = db.get(Participant, guest["participant_id"])
        assert record.removed_at and record.left_at
        assert db.scalar(select(Meeting).where(Meeting.code == code)).ended_at


def test_wrong_room_token_and_origin(client):
    first, second = create(client), create(client)
    guest = join(client, first["code"], "Guest")
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(
            f"/ws/meetings/{second['code']}", headers=ORIGIN
        ) as socket:
            socket.send_json({"token": guest["token"]})
            socket.receive_json()
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(
            f"/ws/meetings/{first['code']}",
            headers={"origin": "https://untrusted.example"},
        ):
            pass
