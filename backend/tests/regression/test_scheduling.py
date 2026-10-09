from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import Meeting

HEADERS = {"X-Host-Api-Key": settings.host_api_key}


def test_schedule_persists_metadata_and_normalizes_offset(client):
    body = {
        "title": "  Planning  ",
        "description": "Agenda",
        "scheduled_start": "2030-01-15T10:30:00+05:30",
        "timezone": "Asia/Kolkata",
        "duration_minutes": 75,
        "video_on": False,
    }
    response = client.post("/api/meetings", json=body, headers=HEADERS)
    assert response.status_code == 201
    result = response.json()
    assert result["title"] == "Planning"
    assert result["description"] == "Agenda"
    assert result["scheduled_start"] == "2030-01-15T05:00:00+00:00"
    assert result["status"] == "scheduled" and result["started_at"] is None
    assert result["duration_minutes"] == 75 and result["video_on"] is False
    with SessionLocal() as db:
        saved = db.scalar(select(Meeting).where(Meeting.code == result["code"]))
        assert saved.scheduled_start == result["scheduled_start"]
        assert saved.description == "Agenda"
    assert (
        client.get(f"/api/meetings/{result['code']}")
        .json()["invite_link"]
        .endswith(result["code"])
    )
    assert any(
        m["code"] == result["code"]
        for m in client.get("/api/meetings", headers=HEADERS).json()
    )


@pytest.mark.parametrize(
    "invalid",
    [
        {"scheduled_start": "2020-01-01T00:00:00Z"},
        {"scheduled_start": "2030-01-01T12:00:00"},
        {"scheduled_start": "invalid"},
        {"duration_minutes": 0},
        {"duration_minutes": 481},
        {"timezone": "Invalid/Zone"},
        {"title": "   "},
        {"description": "x" * 5001},
    ],
)
def test_invalid_schedule_rejected_without_record(client, invalid):
    body = {
        "scheduled_start": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        **invalid,
    }
    assert client.post("/api/meetings", json=body, headers=HEADERS).status_code == 422
    with SessionLocal() as db:
        assert len(list(db.scalars(select(Meeting)))) == 5


@pytest.mark.parametrize("duration", [5, 480])
def test_duration_boundaries(client, duration):
    response = client.post(
        "/api/meetings",
        headers=HEADERS,
        json={"duration_minutes": duration, "scheduled_start": "2030-01-01T00:00:00Z"},
    )
    assert (
        response.status_code == 201 and response.json()["duration_minutes"] == duration
    )
