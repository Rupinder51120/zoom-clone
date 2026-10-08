"""CI smoke verification; never open the developer or deployed database.

Run from backend/: python ci/verify.py. Local comprehensive suites stay ignored.
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path


def verify():
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix="zoom-ci-") as directory:
        os.environ["DATABASE_URL"] = f"sqlite:///{directory}/ci.db"
        os.environ["HOST_API_KEY"] = "disposable-ci-gateway-key"
        os.environ["ALLOWED_ORIGINS"] = "http://localhost:3000"
        sys.path.insert(0, str(root))
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"], cwd=root, check=True
        )

        from fastapi.testclient import TestClient
        from sqlalchemy import inspect

        from app.db import engine
        from app.main import app

        columns = {column["name"] for column in inspect(engine).get_columns("users")}
        assert {
            "password_hash",
            "availability",
            "status_message",
            "work_location",
        } <= columns
        with TestClient(app) as client:
            assert client.get("/health").json() == {"status": "ok"}
            assert client.post("/api/meetings", json={}).status_code == 403
            headers = {"X-Host-Api-Key": os.environ["HOST_API_KEY"]}
            assert client.get("/api/meetings", headers=headers).json()
            result = client.post(
                "/api/meetings", headers=headers, json={"title": "CI meeting"}
            )
            assert result.status_code == 201
            meeting = result.json()
            assert len(meeting["code"]) == 11
            assert client.get(f"/api/meetings/{meeting['code']}").status_code == 200
            guest = client.post(
                f"/api/meetings/{meeting['code']}/join",
                json={"display_name": "CI guest"},
            )
            assert guest.status_code == 200 and guest.json()["role"] == "guest"
            rejected = client.post(
                f"/api/meetings/{meeting['code']}/join",
                json={"display_name": "CI guest", "host_token": "invalid"},
            )
            assert rejected.status_code == 403
            saved = client.patch(
                "/api/profile", headers=headers, json={"availability": "Busy"}
            )
            assert saved.status_code == 200 and saved.json()["availability"] == "Busy"
        engine.dispose()
    print(
        "CI verification passed: migrations, seed, health, creation, joining and authorization."
    )


if __name__ == "__main__":
    verify()
