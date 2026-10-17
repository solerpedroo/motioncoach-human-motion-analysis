"""Local job settings. No secrets belong in these variables."""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    max_bytes: int
    max_duration_ms: float
    ttl_hours: float
    stale_seconds: float
    max_active_jobs: int
    model_path: Path
    cors_origins: tuple[str, ...]

    @property
    def db_path(self) -> Path:
        return self.data_dir / "jobs.sqlite"


def load_settings() -> Settings:
    origins = os.environ.get(
        "MOTIONCOACH_CORS_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000"
    )
    return Settings(
        data_dir=Path(os.environ.get("MOTIONCOACH_DATA_DIR", "data")),
        max_bytes=int(os.environ.get("MOTIONCOACH_MAX_BYTES", "200000000")),
        max_duration_ms=float(os.environ.get("MOTIONCOACH_MAX_DURATION_MS", "300000")),
        ttl_hours=float(os.environ.get("MOTIONCOACH_TTL_HOURS", "24")),
        stale_seconds=float(os.environ.get("MOTIONCOACH_STALE_SECONDS", "30")),
        max_active_jobs=int(os.environ.get("MOTIONCOACH_MAX_ACTIVE_JOBS", "8")),
        model_path=Path(
            os.environ.get("MOTIONCOACH_MODEL_PATH", "data/models/pose_landmarker_lite.task")
        ),
        cors_origins=tuple(item.strip() for item in origins.split(",") if item.strip()),
    )
