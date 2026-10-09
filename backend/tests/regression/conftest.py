"""Shared test fixtures: always use a disposable SQLite DB, never zoom.db."""

import os
import tempfile

import pytest

_test_directory = tempfile.TemporaryDirectory(prefix="zoom-feature-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_test_directory.name}/features.db"

os.environ["HOST_API_KEY"] = "disposable-regression-key"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:3000"

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.auth import _attempts
from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import AuthSession
from app.rooms import registry
from app.security import digest


@pytest.fixture
def client():
    Base.metadata.create_all(engine)
    registry.rooms.clear()
    _attempts.clear()
    with TestClient(app) as test_client:
        token = "local-regression-session"
        with SessionLocal() as db:
            db.add(
                AuthSession(
                    user_id=1,
                    token_hash=digest(token),
                    expires_at=(
                        datetime.now(timezone.utc) + timedelta(days=1)
                    ).isoformat(),
                )
            )
            db.commit()
        test_client.headers["X-Session-Token"] = token
        yield test_client
    Base.metadata.drop_all(engine)
