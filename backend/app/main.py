"""HTTP translation for upload jobs. Pose runs only in the worker process."""

import json
import shutil
import uuid
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict

from backend.app.settings import Settings, load_settings
from backend.app.store import JobStore, QueueFull
from motioncoach import __version__
from motioncoach.exercises.config import get_config
from motioncoach.pipeline.analysis import validate_analysis_options
from motioncoach.pipeline.errors import AnalysisError
from motioncoach.video.decoder import VideoLimits, probe

EXERCISES = ("squat", "push_up", "biceps_curl", "jumping_jack")
ARTIFACTS = {"analysis.json", "frames.jsonl"}
JobStatus = Literal["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]
JobStage = Literal["validation", "probe", "pose", "analysis", "publication"]


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["1.0.0"]
    status: Literal["ok"]
    service: Literal["motioncoach-api"]
    version: str


class ErrorBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str
    message: str


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    error: ErrorBody


class ExerciseItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    display_name: str
    version: str
    recommended_view: str
    validation_status: str


class JobView(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["1.0.0"]
    id: str
    status: JobStatus
    stage: JobStage
    exercise: str
    camera_view: str
    selected_side: str | None
    error_code: str | None
    error_message: str | None


def error(status: int, code: str, message: str) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message))
    return JSONResponse(body.model_dump(), status_code=status)


def job_view(row) -> JobView:
    return JobView(
        schema_version="1.0.0",
        id=row["id"],
        status=row["status"],
        stage=row["stage"],
        exercise=row["exercise"],
        camera_view=row["camera_view"],
        selected_side=row["selected_side"],
        error_code=row["error_code"],
        error_message=row["error_message"],
    )


def directory_for(settings: Settings, job_id: str) -> Path:
    return settings.data_dir / "jobs" / job_id


def remove_job_files(settings: Settings, job_id: str, store: JobStore) -> None:
    shutil.rmtree(directory_for(settings, job_id), ignore_errors=True)
    store.mark_deleted(job_id)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    store = JobStore(settings.db_path)
    app = FastAPI(title="MotionCoach API", version=__version__)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
    )
    app.state.settings = settings
    app.state.store = store

    @app.get("/api/health", response_model=HealthResponse, tags=["health"])
    def health() -> HealthResponse:
        return HealthResponse(
            schema_version="1.0.0", status="ok", service="motioncoach-api", version=__version__
        )

    @app.get("/api/exercises", response_model=list[ExerciseItem], tags=["exercises"])
    def exercises() -> list[ExerciseItem]:
        items = []
        for exercise in EXERCISES:
            config = get_config(exercise)
            items.append(
                ExerciseItem(
                    id=config["id"],
                    display_name=config["display_name"],
                    version=config["version"],
                    recommended_view=config["recommended_view"],
                    validation_status=config["validation_status"],
                )
            )
        return items

    @app.post("/api/videos", status_code=202, tags=["jobs"])
    async def create_video(
        request: Request,
        file: UploadFile = File(...),  # noqa: B008
        exercise: str = Form(...),  # noqa: B008
        camera_view: str = Form(...),  # noqa: B008
        selected_side: str | None = Form(None),  # noqa: B008
    ):
        current = request.app.state
        try:
            validate_analysis_options(exercise, camera_view, selected_side)
        except AnalysisError as failure:
            return error(422, failure.code, failure.message)
        except ValueError:
            return error(422, "INVALID_OPTIONS", "Choose a supported exercise and camera view.")
        if selected_side == "":
            selected_side = None
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in {".mp4", ".mov", ".webm"}:
            return error(422, "UNSUPPORTED_EXTENSION", "Choose an MP4, MOV or WebM file.")
        job_id = uuid.uuid4().hex
        directory = directory_for(current.settings, job_id)
        directory.mkdir(parents=True, exist_ok=False)
        target = directory / f"source{suffix}"
        size = 0
        try:
            with target.open("wb") as output:
                while chunk := await file.read(1024 * 1024):
                    size += len(chunk)
                    if size > current.settings.max_bytes:
                        raise AnalysisError(
                            "FILE_TOO_LARGE", "The video exceeds the configured byte limit."
                        )
                    output.write(chunk)
            probe(
                target,
                VideoLimits(
                    max_bytes=current.settings.max_bytes,
                    max_duration_ms=current.settings.max_duration_ms,
                ),
            )
            current.store.insert(
                {
                    "id": job_id,
                    "exercise": exercise,
                    "camera_view": camera_view,
                    "selected_side": selected_side,
                    "max_active_jobs": current.settings.max_active_jobs,
                }
            )
        except QueueFull:
            shutil.rmtree(directory, ignore_errors=True)
            return error(429, "QUEUE_FULL", "Wait for the current local job to finish.")
        except AnalysisError as failure:
            shutil.rmtree(directory, ignore_errors=True)
            return error(422, failure.code, failure.message)
        except Exception:
            shutil.rmtree(directory, ignore_errors=True)
            return error(422, "INVALID_VIDEO", "The file could not be read as a video.")
        return job_view(current.store.get(job_id))

    @app.get("/api/jobs/{job_id}", response_model=JobView, tags=["jobs"])
    def read_job(job_id: str, request: Request):
        row = request.app.state.store.get(job_id)
        if row is None:
            return error(404, "JOB_NOT_FOUND", "No job matches that identifier.")
        return job_view(row)

    @app.delete("/api/jobs/{job_id}", tags=["jobs"])
    def delete_job(job_id: str, request: Request):
        current = request.app.state
        action = current.store.request_cancel(job_id)
        if action is None:
            return error(404, "JOB_NOT_FOUND", "No job matches that identifier.")
        if action == "cancelled":
            remove_job_files(current.settings, job_id, current.store)
        elif action == "terminal":
            remove_job_files(current.settings, job_id, current.store)
        return job_view(current.store.get(job_id))

    @app.get("/api/analyses/{job_id}", tags=["analyses"])
    def analysis(job_id: str, request: Request):
        return _published_json(request, job_id, "summary")

    @app.get("/api/analyses/{job_id}/events", tags=["analyses"])
    def events(job_id: str, request: Request):
        return _published_json(request, job_id, "events")

    @app.get("/api/jobs/{job_id}/artifacts/{name}", tags=["jobs"])
    def artifact(job_id: str, name: str, request: Request):
        current = request.app.state
        row = current.store.get(job_id)
        unavailable = (
            row is None
            or row["status"] != "COMPLETED"
            or row["files_deleted"]
            or name not in ARTIFACTS
        )
        if unavailable:
            return error(404, "ARTIFACT_NOT_FOUND", "That result file is not available.")
        root = (directory_for(current.settings, job_id) / "result").resolve()
        path = (root / name).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            return error(404, "ARTIFACT_NOT_FOUND", "That result file is not available.")
        return FileResponse(path, filename=name)

    return app


def _published_json(request: Request, job_id: str, field: str):
    current = request.app.state
    row = current.store.get(job_id)
    if row is None or row["files_deleted"]:
        return error(404, "ANALYSIS_NOT_FOUND", "No published analysis matches that identifier.")
    if row["status"] != "COMPLETED":
        return error(409, "ANALYSIS_NOT_READY", "The job has not published an analysis.")
    path = directory_for(current.settings, job_id) / "result" / "analysis.json"
    if not path.is_file():
        return error(404, "ANALYSIS_NOT_FOUND", "No published analysis matches that identifier.")
    payload = json.loads(path.read_text(encoding="utf-8"))
    body = payload["summary"] if field == "summary" else payload["summary"]["events"]
    return JSONResponse(body)


app = create_app()
