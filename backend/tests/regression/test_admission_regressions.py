import time

import pytest
from starlette.websockets import WebSocketDisconnect

from app.db import SessionLocal
from app.models import Participant
from app.rooms import registry
from tests.regression.test_meetings import HEADERS, ORIGIN, create, join


def test_duplicate_socket_does_not_remove_original(client):
    meeting = create(client)
    code = meeting["code"]
    host = join(client, code, "Host", meeting["host_token"])
    with client.websocket_connect(f"/ws/meetings/{code}", headers=ORIGIN) as first:
        first.send_json({"token": host["token"]})
        first.receive_json()
        with pytest.raises(WebSocketDisconnect) as rejected:
            with client.websocket_connect(
                f"/ws/meetings/{code}", headers=ORIGIN
            ) as duplicate:
                duplicate.send_json({"token": host["token"]})
                duplicate.receive_json()
        assert rejected.value.code == 4409
        time.sleep(0.02)
        assert host["participant_id"] in registry.rooms.get(code, {})
        with SessionLocal() as db:
            assert db.get(Participant, host["participant_id"]).left_at is None
        first.send_json({"type": "hand", "raised": True})
        assert first.receive_json()["participant"]["hand_raised"] is True
        first.close()


def test_rotation_rejects_stale_host_admission(client):
    meeting = create(client)
    code = meeting["code"]
    old = join(client, code, "Host", meeting["host_token"])
    rotated = client.post(f"/api/meetings/{code}/host", headers=HEADERS)
    assert rotated.status_code == 200
    with pytest.raises(WebSocketDisconnect) as rejected:
        with client.websocket_connect(f"/ws/meetings/{code}", headers=ORIGIN) as stale:
            stale.send_json({"token": old["token"]})
            stale.receive_json()
    assert rejected.value.code == 4403
    fresh = join(client, code, "Host", rotated.json()["host_token"])
    with client.websocket_connect(f"/ws/meetings/{code}", headers=ORIGIN) as socket:
        socket.send_json({"token": fresh["token"]})
        assert socket.receive_json()["type"] == "welcome"
        socket.close()


@pytest.mark.parametrize(
    "value", ["{", "{}", "[{}]", '[{"urls":"https://example.com"}]']
)
def test_invalid_ice_configuration_rejected_before_startup(value):
    from pydantic import ValidationError

    from app.config import Settings

    with pytest.raises(ValidationError):
        Settings(_env_file=None, ice_servers_json=value)


def test_turn_configuration_preserves_credentials():
    from app.config import Settings

    settings = Settings(
        _env_file=None,
        ice_servers_json='[{"urls":["turn:relay.example.com:3478"],"username":"guest","credential":"secret"}]',
    )
    assert settings.ice_servers[0]["credential"] == "secret"
