import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./zoom.db"
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    frontend_url: str = "http://localhost:3000"
    # In production set a long secret and share it only with the frontend server.
    host_api_key: str = "local-development-only"
    demo_password: str | None = None
    ice_servers_json: str = '[{"urls":"stun:stun.l.google.com:19302"}]'

    @field_validator("ice_servers_json")
    @classmethod
    def validate_ice_servers(cls, value: str) -> str:
        servers = json.loads(value)
        if not isinstance(servers, list):
            raise ValueError("ICE servers must be a JSON array")
        for server in servers:
            if not isinstance(server, dict):
                raise ValueError("Each ICE server must be an object")
            urls = server.get("urls")
            urls = [urls] if isinstance(urls, str) else urls
            if (
                not isinstance(urls, list)
                or not urls
                or any(
                    not isinstance(url, str)
                    or not url.startswith(("stun:", "stuns:", "turn:", "turns:"))
                    for url in urls
                )
            ):
                raise ValueError("ICE server URLs must use STUN or TURN schemes")
        return value

    @property
    def ice_servers(self) -> list[dict]:
        return json.loads(self.ice_servers_json)


settings = Settings()
