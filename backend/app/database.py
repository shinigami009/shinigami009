from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Settings(BaseSettings):
    app_name: str = "Space Debris Collision Risk Tracker"
    database_url: str = (
        "postgresql+psycopg2://mission_control:mission_control"
        "@localhost:5432/space_debris"
    )
    celestrak_base_url: str = "https://celestrak.org"
    space_track_base_url: str = "https://www.space-track.org"
    space_track_identity: str | None = None
    space_track_password: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="SPACE_DEBRIS_",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


class Base(DeclarativeBase):
    pass


engine = create_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
