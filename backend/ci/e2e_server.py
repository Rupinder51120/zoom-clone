"""Run a disposable backend for Playwright; never touch the developer database."""

import os
import signal
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    def stop(_signum, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, stop)
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix="zoom-browser-tests-") as directory:
        env = {
            **os.environ,
            "DATABASE_URL": f"sqlite:///{directory}/e2e.db",
            "HOST_API_KEY": "disposable-e2e-key",
            "FRONTEND_URL": "http://localhost:3004",
            "ALLOWED_ORIGINS": "http://localhost:3004",
        }
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=root,
            env=env,
            check=True,
        )
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8004"],
            cwd=root,
            env=env,
        )
        try:
            process.wait()
        except KeyboardInterrupt:
            pass
        finally:
            if process.poll() is None:
                process.terminate()
            process.wait()


if __name__ == "__main__":
    main()
