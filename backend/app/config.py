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


settings = Settings()
