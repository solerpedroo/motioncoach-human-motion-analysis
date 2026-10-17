"""One active analysis job. This process is not the HTTP server."""

import shutil
import time
from pathlib import Path

from backend.app.settings import Settings, load_settings
from backend.app.store import JobStore
from motioncoach.pipeline.analysis import analyze
from motioncoach.pipeline.errors import AnalysisError
from motioncoach.pipeline.output import OutputBundle
from motioncoach.video.decoder import VideoLimits


def job_dir(settings: Settings, job_id: str) -> Path:
    return settings.data_dir / "jobs" / job_id


def purge_expired(store: JobStore, settings: Settings) -> list[str]:
    protected = store.active_ids()
    removed = []
    for row in store.expired(settings.ttl_hours):
        if row["id"] in protected:
            continue
        shutil.rmtree(job_dir(settings, row["id"]), ignore_errors=True)
        store.mark_deleted(row["id"])
        removed.append(row["id"])
    return removed


def process_job(store: JobStore, settings: Settings, job, **analyze_kwargs) -> None:
    directory = job_dir(settings, job["id"])
    source = next(directory.glob("source.*"))
    limits = VideoLimits(max_bytes=settings.max_bytes, max_duration_ms=settings.max_duration_ms)

    def cancelled():
        return store.cancel_requested(job["id"])

    def progress(payload):
        stage = "analysis" if payload.get("stage") == "analyzing" else "pose"
        store.heartbeat(job["id"], stage)

    store.heartbeat(job["id"], "pose")
    try:
        with OutputBundle(directory / "result") as output:
            result = analyze(
                source,
                exercise=job["exercise"],
                camera_view=job["camera_view"],
                selected_side=job["selected_side"],
                model_path=settings.model_path,
                limits=limits,
                cancelled=cancelled,
                frame_sink=output.frame,
                progress=progress,
                **analyze_kwargs,
            )
            store.heartbeat(job["id"], "publication")
            output.publish(result)
        store.finish(job["id"], "COMPLETED", None, None)
    except AnalysisError as error:
        status = "CANCELLED" if error.code == "CANCELLED" else "FAILED"
        store.finish(job["id"], status, error.code, error.message)
    except Exception:
        store.finish(
            job["id"],
            "FAILED",
            "ANALYSIS_FAILED",
            "Analysis stopped before a result could be published.",
        )


def run_once(store: JobStore, settings: Settings, **analyze_kwargs):
    store.recover_stale(settings.stale_seconds)
    purge_expired(store, settings)
    job = store.claim()
    if job is not None:
        process_job(store, settings, job, **analyze_kwargs)
    return job


def main() -> None:
    settings = load_settings()
    store = JobStore(settings.db_path)
    while True:
        if run_once(store, settings) is None:
            time.sleep(0.5)


if __name__ == "__main__":
    main()
