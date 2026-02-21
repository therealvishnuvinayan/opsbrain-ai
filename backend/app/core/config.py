from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "OpsBrain AI Backend"
    environment: str = "development"
    log_level: str = "INFO"
    api_prefix: str = "/api"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    database_url: str = "postgresql+asyncpg://opsbrain:opsbrain@localhost:5432/opsbrain"
    sync_database_url: str = "postgresql+psycopg://opsbrain:opsbrain@localhost:5432/opsbrain"

    cors_origins: str = Field(default="http://localhost:3000")

    openai_api_key: str | None = None
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    service_api_key: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
