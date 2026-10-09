from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import AuthSession, User
from app.security import digest

GATE = {"X-Host-Api-Key": settings.host_api_key, "X-Session-Token": ""}
PASSWORD = "a long test passphrase"


def register(client, email="one@example.com"):
    r = client.post(
        "/api/auth/signup",
        headers=GATE,
        json={"email": email, "password": PASSWORD, "display_name": " One Person "},
    )
    assert r.status_code == 201, r.text
    return r.json()


def headers(r):
    return {**GATE, "X-Session-Token": r["session_token"]}


def test_signup_signin_and_hashes(client):
    r = register(client, "ONE@EXAMPLE.COM")
    assert r["user"]["email"] == "one@example.com"
    with SessionLocal() as db:
        u = db.get(User, r["user"]["id"])
        assert u.password_hash.startswith("scrypt$") and PASSWORD not in u.password_hash
        assert db.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == digest(r["session_token"])
            )
        )
    assert (
        client.post(
            "/api/auth/signup",
            headers=GATE,
            json={
                "email": "one@example.com",
                "password": PASSWORD,
                "display_name": "Name",
            },
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/auth/signin",
            headers=GATE,
            json={"email": "one@example.com", "password": "bad"},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/signin",
            headers=GATE,
            json={"email": "one@example.com", "password": PASSWORD},
        ).status_code
        == 200
    )


def test_session_revocation_and_expiry(client):
    r = register(client)
    h = headers(r)
    assert client.get("/api/profile", headers=GATE).status_code == 200
    assert client.get("/api/profile", headers=h).status_code == 200
    client.post("/api/auth/signout", headers=h)
    assert client.get("/api/auth/me", headers=h).status_code == 401
    r = client.post(
        "/api/auth/signin",
        headers=GATE,
        json={"email": "one@example.com", "password": PASSWORD},
    ).json()
    with SessionLocal() as db:
        session = db.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == digest(r["session_token"])
            )
        )
        session.expires_at = (
            datetime.now(timezone.utc) - timedelta(seconds=1)
        ).isoformat()
        db.commit()
    assert client.get("/api/auth/me", headers=headers(r)).status_code == 401


def test_ownership_and_guest_join(client):
    a, b = register(client), register(client, "two@example.com")
    ha, hb = headers(a), headers(b)
    m = client.post("/api/meetings", headers=ha, json={}).json()
    assert client.get("/api/meetings", headers=hb).json() == []
    assert len(client.get("/api/meetings", headers=ha).json()) == 1
    assert client.post(f"/api/meetings/{m['code']}/host", headers=hb).status_code == 403
    assert client.post(f"/api/meetings/{m['code']}/host", headers=ha).status_code == 200
    assert (
        client.post(
            f"/api/meetings/{m['code']}/join", json={"display_name": "Guest"}
        ).json()["role"]
        == "guest"
    )
    client.patch(
        "/api/profile", headers=hb, json={"display_name": "Second", "timezone": "UTC"}
    )
    assert client.get("/api/profile", headers=ha).json()["display_name"] == "One Person"


def test_password_change_all_sessions(client):
    a = register(client)
    b = client.post(
        "/api/auth/signin",
        headers=GATE,
        json={"email": "one@example.com", "password": PASSWORD},
    ).json()
    assert (
        client.post(
            "/api/auth/password",
            headers=headers(a),
            json={"current_password": "bad", "new_password": "new long passphrase"},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/password",
            headers=headers(a),
            json={"current_password": PASSWORD, "new_password": "new long passphrase"},
        ).status_code
        == 200
    )
    for r in [a, b]:
        assert client.get("/api/auth/me", headers=headers(r)).status_code == 401
    assert (
        client.post(
            "/api/auth/signin",
            headers=GATE,
            json={"email": "one@example.com", "password": PASSWORD},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/signin",
            headers=GATE,
            json={"email": "one@example.com", "password": "new long passphrase"},
        ).status_code
        == 200
    )


def test_validation_and_throttle(client):
    for body in [
        {"email": "bad", "password": PASSWORD, "display_name": "Name"},
        {"email": "one@example.com", "password": "short", "display_name": "Name"},
        {"email": "one@example.com", "password": PASSWORD, "display_name": " "},
    ]:
        assert (
            client.post("/api/auth/signup", headers=GATE, json=body).status_code == 422
        )
    for _ in range(10):
        assert (
            client.post(
                "/api/auth/signin",
                headers=GATE,
                json={"email": "none@example.com", "password": "bad"},
            ).status_code
            == 401
        )
    assert (
        client.post(
            "/api/auth/signin",
            headers=GATE,
            json={"email": "none@example.com", "password": "bad"},
        ).status_code
        == 429
    )


def test_seed_password_is_optional_and_preserves_credentials(client, monkeypatch):
    from app.security import verify_password
    from app.seed import seed

    monkeypatch.setattr(settings, "demo_password", "trusted demo passphrase")
    seed()
    with SessionLocal() as db:
        original = db.get(User, 1).password_hash
        assert verify_password("trusted demo passphrase", original)
    monkeypatch.setattr(settings, "demo_password", "different demo passphrase")
    seed()
    with SessionLocal() as db:
        assert db.get(User, 1).password_hash == original


def test_optional_login_demo_access_and_account_isolation(client):
    anonymous = {**GATE, "X-Session-Token": ""}
    assert client.get("/api/profile", headers=anonymous).status_code == 200
    demo = client.post("/api/meetings", headers=anonymous, json={}).json()
    with SessionLocal() as db:
        from app.models import Meeting

        assert (
            db.scalar(select(Meeting).where(Meeting.code == demo["code"])).host_user_id
            == 1
        )
    assert (
        client.post(f"/api/meetings/{demo['code']}/host", headers=anonymous).status_code
        == 200
    )
    account = register(client)
    assert client.get("/api/meetings", headers=headers(account)).json() == []
    assert (
        client.post(
            f"/api/meetings/{demo['code']}/host", headers=headers(account)
        ).status_code
        == 403
    )
    assert (
        client.get(
            "/api/profile", headers={**GATE, "X-Session-Token": "expired-or-invalid"}
        ).status_code
        == 200
    )
    assert client.get("/api/auth/me", headers=anonymous).status_code == 401
    assert (
        client.post(
            "/api/auth/password",
            headers=anonymous,
            json={"current_password": "any", "new_password": "new long passphrase"},
        ).status_code
        == 401
    )


def test_guest_cannot_forge_host_control_commands(client):
    from app.models import Participant

    headers = {"X-Host-Api-Key": settings.host_api_key}
    meeting = client.post("/api/meetings", headers=headers, json={}).json()
    code = meeting["code"]
    host = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Host", "host_token": meeting["host_token"]},
    ).json()
    guest = client.post(
        f"/api/meetings/{code}/join", json={"display_name": "Guest"}
    ).json()
    origin = {"origin": "http://localhost:3000"}
    with client.websocket_connect(f"/ws/meetings/{code}", headers=origin) as h:
        h.send_json({"token": host["token"]})
        assert h.receive_json()["type"] == "welcome"
        with client.websocket_connect(f"/ws/meetings/{code}", headers=origin) as g:
            g.send_json({"token": guest["token"]})
            assert g.receive_json()["type"] == "welcome"
            assert h.receive_json()["type"] == "participant_joined"
            for command in ["mute_all", "remove", "end"]:
                g.send_json(
                    {"type": command, "target": host["participant_id"], "role": "host"}
                )
                assert g.receive_json()["type"] == "error"
            with SessionLocal() as db:
                assert db.get(Participant, host["participant_id"]).removed_at is None
            h.send_json({"type": "mute_all"})
            assert g.receive_json()["type"] == "mute"
            h.send_json({"type": "remove", "target": guest["participant_id"]})
            assert g.receive_json()["type"] == "removed"
            assert h.receive_json()["type"] == "participant_left"
        h.send_json({"type": "end"})
        assert h.receive_json()["type"] == "ended"
