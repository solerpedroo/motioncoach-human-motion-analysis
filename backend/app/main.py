"""HTTP translation for upload jobs. Pose runs only in the worker process."""

import csv
import io
import json
import shutil
import uuid
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, ConfigDict

from backend.app.settings import Settings, load_settings
from backend.app.store import JobStore, QueueFull
from motioncoach import __version__
from motioncoach.exercises.config import get_config
from motioncoach.pipeline.analysis import validate_analysis_options
from motioncoach.pipeline.errors import AnalysisError
from motioncoach.video.decoder import VideoLimits, probe

EXERCISES = ("squat", "push_up", "biceps_curl", "jumping_jack")
ARTIFACTS = {"analysis.json", "frames.jsonl", "angle.png"}
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
    chart_warning: str | None = None


def error(status: int, code: str, message: str) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message))
    return JSONResponse(body.model_dump(), status_code=status)


def job_view(row, settings: Settings | None = None) -> JobView:
    warning = None
    if settings is not None and row["status"] == "COMPLETED" and not row["files_deleted"]:
        status_path = directory_for(settings, row["id"]) / "result" / "derivatives.json"
        if status_path.is_file():
            warning = json.loads(status_path.read_text(encoding="utf-8")).get("chart_error")
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
        chart_warning=warning,
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
        return job_view(current.store.get(job_id), current.settings)

    @app.get("/api/jobs/{job_id}", response_model=JobView, tags=["jobs"])
    def read_job(job_id: str, request: Request):
        row = request.app.state.store.get(job_id)
        if row is None:
            return error(404, "JOB_NOT_FOUND", "No job matches that identifier.")
        return job_view(row, request.app.state.settings)

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
        return job_view(current.store.get(job_id), current.settings)

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

    @app.get("/api/jobs/{job_id}/media", tags=["jobs"])
    def media(job_id: str, request: Request):
        current = request.app.state
        row = current.store.get(job_id)
        if row is None or row["status"] != "COMPLETED" or row["files_deleted"]:
            return error(404, "MEDIA_NOT_FOUND", "The uploaded video is not available.")
        matches = [
            path
            for path in directory_for(current.settings, job_id).glob("source.*")
            if path.is_file() and path.suffix.lower() in {".mp4", ".mov", ".webm"}
        ]
        if len(matches) != 1:
            return error(404, "MEDIA_NOT_FOUND", "The uploaded video is not available.")
        return FileResponse(matches[0], filename=matches[0].name)

    @app.get("/api/analyses/{job_id}/export", tags=["analyses"])
    def export_analysis(job_id: str, request: Request):
        published = _load_summary(request, job_id)
        if isinstance(published, JSONResponse):
            return published
        export_format = request.query_params.get("format", "json")
        if export_format == "json":
            return JSONResponse(published)
        if export_format != "csv":
            return error(422, "UNSUPPORTED_EXPORT", "Choose json or csv.")
        buffer = io.StringIO()
        writer = csv.DictWriter(
            buffer,
            fieldnames=["type", "timestamp_ms", "exercise", "rule_id", "quality", "rep_index"],
            lineterminator="\n",
        )
        writer.writeheader()
        for event in published["events"]:
            writer.writerow({name: event.get(name) for name in writer.fieldnames})
        return Response(
            buffer.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="events.csv"'},
        )

    return app


def _load_summary(request: Request, job_id: str):
    current = request.app.state
    row = current.store.get(job_id)
    if row is None or row["files_deleted"]:
        return error(404, "ANALYSIS_NOT_FOUND", "No published analysis matches that identifier.")
    if row["status"] != "COMPLETED":
        return error(409, "ANALYSIS_NOT_READY", "The job has not published an analysis.")
    path = directory_for(current.settings, job_id) / "result" / "analysis.json"
    if not path.is_file():
        return error(404, "ANALYSIS_NOT_FOUND", "No published analysis matches that identifier.")
    return json.loads(path.read_text(encoding="utf-8"))["summary"]


def _published_json(request: Request, job_id: str, field: str):
    published = _load_summary(request, job_id)
    if isinstance(published, JSONResponse):
        return published
    body = published if field == "summary" else published["events"]
    return JSONResponse(body)


app = create_app()
