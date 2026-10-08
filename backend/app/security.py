import hashlib
import secrets

from fastapi import Header, HTTPException

from .config import settings


def digest(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def require_default_user(x_host_api_key: str = Header(default="")):
    if not secrets.compare_digest(x_host_api_key, settings.host_api_key):
        raise HTTPException(403, "This action requires the default user session")
