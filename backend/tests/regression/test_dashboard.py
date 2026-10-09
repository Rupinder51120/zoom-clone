from datetime import datetime, timezone

from sqlalchemy import select, text

from app.config import settings
from app.db import SessionLocal
from app.models import Meeting, User
from app.seed import seed

HEADERS = {"X-Host-Api-Key": settings.host_api_key}


def test_b01_seeded_dashboard_has_default_user_three_upcoming_two_recent(client):
    profile = client.get("/api/profile", headers=HEADERS)
    meetings = client.get("/api/meetings", headers=HEADERS)
    assert profile.status_code == meetings.status_code == 200
    assert profile.json()["display_name"] == "Rupinder Kaur"
    assert profile.json()["timezone"] == "Asia/Kolkata"
    records = meetings.json()
    assert len(records) == 5
    upcoming = [m for m in records if m["status"] == "scheduled"]
    recent = [m for m in records if m["status"] == "ended"]
    assert len(upcoming) == 3 and len(recent) == 2
    now = datetime.now(timezone.utc)
    assert all(datetime.fromisoformat(m["scheduled_start"]) > now for m in upcoming)
    assert all(datetime.fromisoformat(m["ended_at"]) < now for m in recent)


def test_b02_dashboard_payload_has_required_display_fields_and_no_credentials(client):
    required = {
        "code",
        "title",
        "description",
        "scheduled_start",
        "timezone",
        "duration_minutes",
        "status",
        "video_on",
        "invite_link",
        "started_at",
        "ended_at",
    }
    for meeting in client.get("/api/meetings", headers=HEADERS).json():
        assert required <= meeting.keys()
        assert meeting["code"].isdigit() and len(meeting["code"]) == 11
        assert meeting["duration_minutes"] > 0
        assert not any("token" in key or "hash" in key for key in meeting)
        assert (
            meeting["invite_link"]
            == f"{settings.frontend_url}/join?meeting={meeting['code']}"
        )


def test_b03_default_session_is_required_for_dashboard_and_profile_data(client):
    for path in ["/api/profile", "/api/meetings"]:
        assert client.get(path).status_code == 403
        assert (
            client.get(path, headers={"X-Host-Api-Key": "invalid"}).status_code == 403
        )
        assert client.get(path, headers=HEADERS).status_code == 200


def test_b04_seed_runs_do_not_duplicate_or_overwrite_existing_records(client):
    before = client.get("/api/meetings", headers=HEADERS).json()
    client.patch(
        "/api/profile",
        headers=HEADERS,
        json={"display_name": "Default User Updated", "timezone": "UTC"},
    )
    seed()
    seed()
    assert client.get("/api/meetings", headers=HEADERS).json() == before
    assert (
        client.get("/api/profile", headers=HEADERS).json()["display_name"]
        == "Default User Updated"
    )


def test_b05_profile_changes_persist_in_sqlite_and_followup_reads(client):
    result = client.patch(
        "/api/profile",
        headers=HEADERS,
        json={"display_name": "Dashboard Test User", "timezone": "Europe/London"},
    )
    assert result.status_code == 200
    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user.display_name == "Dashboard Test User"
        assert user.timezone == "Europe/London"
    assert client.get("/api/profile", headers=HEADERS).json() == result.json()


def test_b06_each_dashboard_meeting_has_a_working_details_endpoint(client):
    for meeting in client.get("/api/meetings", headers=HEADERS).json():
        response = client.get(f"/api/meetings/{meeting['code']}")
        assert response.status_code == 200
        assert response.json() == meeting


def test_b07_dashboard_records_relate_to_the_default_user_and_enforce_foreign_keys(
    client,
):
    with SessionLocal() as db:
        assert db.execute(text("PRAGMA foreign_keys")).scalar() == 1
        meetings = list(db.scalars(select(Meeting)))
        assert all(m.host_user_id == 1 for m in meetings)
        assert len(db.get(User, 1).meetings) == 5


def test_b08_invalid_profile_settings_are_rejected_without_overwriting_the_user(client):
    before = client.get("/api/profile", headers=HEADERS).json()
    for body in [
        {"display_name": "   ", "timezone": "UTC"},
        {"display_name": "Valid Name", "timezone": "Invalid/Timezone"},
    ]:
        response = client.patch("/api/profile", headers=HEADERS, json=body)
        assert response.status_code == 422
    assert client.get("/api/profile", headers=HEADERS).json() == before
