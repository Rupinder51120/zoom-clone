import pytest
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import Participant
from app.security import digest


@pytest.fixture
def meeting(client):
    return client.post(
        "/api/meetings", json={}, headers={"X-Host-Api-Key": settings.host_api_key}
    ).json()


def test_guest_admission_history_and_role(client, meeting):
    response = client.post(
        f"/api/meetings/{meeting['code']}/join", json={"display_name": "  Guest  "}
    )
    assert response.status_code == 200
    admission = response.json()
    assert admission["role"] == "guest"
    assert isinstance(admission["ice_servers"], list)
    with SessionLocal() as db:
        p = db.get(Participant, admission["participant_id"])
        assert p.display_name == "Guest" and p.user_id is None
        assert p.token_hash == digest(admission["token"])
    with client.websocket_connect(
        f"/ws/meetings/{meeting['code']}", headers={"origin": "http://localhost:3000"}
    ) as socket:
        socket.send_json({"token": admission["token"]})
        assert socket.receive_json()["type"] == "welcome"
        socket.send_json({"type": "end"})
        assert socket.receive_json()["type"] == "error"
    with SessionLocal() as db:
        p = db.get(Participant, admission["participant_id"])
        assert p.joined_at and p.left_at


@pytest.mark.parametrize("name", ["", "   ", "x" * 101])
def test_invalid_names(client, meeting, name):
    assert (
        client.post(
            f"/api/meetings/{meeting['code']}/join", json={"display_name": name}
        ).status_code
        == 422
    )
    with SessionLocal() as db:
        assert not list(db.scalars(select(Participant)))


def test_missing_and_ended(client):
    assert (
        client.post(
            "/api/meetings/99999999999/join", json={"display_name": "Guest"}
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/meetings/81234567004/join", json={"display_name": "Guest"}
        ).status_code
        == 410
    )


def test_unique_guest_sessions_do_not_elevate_named_host(client, meeting):
    results = [
        client.post(
            f"/api/meetings/{meeting['code']}/join", json={"display_name": "Host"}
        ).json()
        for _ in range(2)
    ]
    assert all(r["role"] == "guest" for r in results)
    assert results[0]["token"] != results[1]["token"]
    assert results[0]["participant_id"] != results[1]["participant_id"]
