"""Liveness only in Wave 0. No camera frames or video processing."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict

from motioncoach import __version__

app = FastAPI(title="MotionCoach API", version=__version__)


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["1.0.0"]
    status: Literal["ok"]
    service: Literal["motioncoach-api"]
    version: str


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    return HealthResponse(
        schema_version="1.0.0", status="ok", service="motioncoach-api", version=__version__
    )
