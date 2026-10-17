"""Job queue behavior with synthetic video and an injected pose double."""

import asyncio
import json
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx

from backend.app.main import create_app
from backend.app.settings import Settings
from backend.app.store import JobStore
from backend.app.worker import process_job, purge_expired, run_once
from motioncoach.tests.video_helpers import make_video

ROOT = Path(__file__).resolve().parents[2]
CASES = json.loads((ROOT / "shared/fixtures/repetitions/landmarks.json").read_text())["cases"]
SQUAT = next(case for case in CASES if case["exercise"] == "squat")


def settings_for(tmp_path, **overrides):
    values = dict(
        data_dir=tmp_path,
        max_bytes=200_000_000,
        max_duration_ms=300_000,
        ttl_hours=24,
        stale_seconds=30,
        max_active_jobs=8,
        model_path=tmp_path / "missing.task",
        cors_origins=("http://127.0.0.1:3000",),
    )
    values.update(overrides)
    return Settings(**values)


def request(application, method, path, **kwargs):
    async def call():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://test"
        ) as client:
            return await client.request(method, path, **kwargs)

    return asyncio.run(call())


def upload(application, path, **fields):
    payload = {"exercise": "squat", "camera_view": "side", **fields}
    return request(
        application,
        "POST",
        "/api/videos",
        data=payload,
        files={"file": (path.name, path.read_bytes(), "video/mp4")},
    )


class FixturePose:
    def __init__(self, _model):
        self.index = 0

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def detect(self, _frame):
        points = SQUAT["frames"][self.index]["landmarks"]
        self.index += 1
        return points


def test_exercises_publish_versions(tmp_path):
    application = create_app(settings_for(tmp_path))
    body = request(application, "GET", "/api/exercises").json()
    assert {item["id"] for item in body} == {"squat", "push_up", "biceps_curl", "jumping_jack"}
    assert all(item["validation_status"] == "unvalidated_seed" for item in body)


def test_disguised_and_oversized_uploads_never_queue(tmp_path):
    application = create_app(settings_for(tmp_path, max_bytes=64))
    disguised = tmp_path / "clip.mp4"
    disguised.write_bytes(b"not-a-video")
    rejected = upload(application, disguised)
    assert rejected.status_code == 422
    assert rejected.json()["error"]["code"] in {"INVALID_VIDEO", "CORRUPT_VIDEO", "DECODE_FAILED"}
    assert request(application, "GET", "/api/jobs/missing").status_code == 404
    oversized = tmp_path / "big.mp4"
    oversized.write_bytes(b"x" * 80)
    too_big = upload(application, oversized)
    assert too_big.status_code == 422
    assert too_big.json()["error"]["code"] == "FILE_TOO_LARGE"
    wrong = tmp_path / "notes.txt"
    wrong.write_text("hello", encoding="utf-8")
    extension = upload(application, wrong)
    assert extension.status_code == 422
    assert extension.json()["error"]["code"] == "UNSUPPORTED_EXTENSION"
    assert list((tmp_path / "jobs").glob("*")) == []


def test_upload_worker_and_artifact_catalog(tmp_path):
    video = make_video(tmp_path / "synthetic.mp4", range(len(SQUAT["frames"])), rate=25)
    application = create_app(settings_for(tmp_path))
    created = upload(application, video)
    assert created.status_code == 202
    job = created.json()
    assert job["status"] == "QUEUED"
    assert job["stage"] == "probe"
    finished = run_once(
        application.state.store, application.state.settings, pose_factory=FixturePose
    )
    assert finished["id"] == job["id"]
    stored = request(application, "GET", f"/api/jobs/{job['id']}").json()
    assert stored["status"] == "COMPLETED"
    assert stored["error_code"] is None
    summary = request(application, "GET", f"/api/analyses/{job['id']}").json()
    assert summary["completed_repetitions"] == 1
    assert summary["source"] == "upload"
    assert summary["evaluation"]["status"] == "not_evaluated"
    exported = request(application, "GET", f"/api/analyses/{job['id']}/export")
    assert exported.json()["completed_repetitions"] == summary["completed_repetitions"]
    assert "landmarks" not in exported.text
    csv_export = request(application, "GET", f"/api/analyses/{job['id']}/export?format=csv")
    header = csv_export.text.splitlines()[0]
    assert header == "type,timestamp_ms,exercise,rule_id,quality,rep_index"
    assert "landmark" not in header and "frame" not in header
    completed = [line for line in csv_export.text.splitlines() if line.startswith("REP_COMPLETED")]
    assert len(completed) == summary["completed_repetitions"]
    chart = request(application, "GET", f"/api/jobs/{job['id']}/artifacts/angle.png")
    assert chart.status_code == 200 and chart.content.startswith(b"\x89PNG")
    assert request(application, "GET", f"/api/jobs/{job['id']}").json()["chart_warning"] is None
    media = request(application, "GET", f"/api/jobs/{job['id']}/media")
    assert media.status_code == 200 and media.content.startswith(video.read_bytes()[:12])
    events = request(application, "GET", f"/api/analyses/{job['id']}/events").json()
    assert events[-1]["type"] == "SESSION_FINISHED"
    artifact = request(application, "GET", f"/api/jobs/{job['id']}/artifacts/analysis.json")
    assert artifact.status_code == 200
    assert b"completed_repetitions" in artifact.content
    escaped = request(application, "GET", f"/api/jobs/{job['id']}/artifacts/..%2Fsource.mp4")
    assert escaped.status_code == 404
    missing = request(application, "GET", f"/api/jobs/{job['id']}/artifacts/source.mp4")
    assert missing.status_code == 404


def test_cancel_queued_and_running_are_not_completed(tmp_path):
    video = make_video(tmp_path / "synthetic.mp4", range(3), rate=10)
    application = create_app(settings_for(tmp_path))
    queued = upload(application, video).json()["id"]
    cancelled = request(application, "DELETE", f"/api/jobs/{queued}")
    assert cancelled.json()["status"] == "CANCELLED"
    assert not (tmp_path / "jobs" / queued).exists()
    second = upload(application, video).json()["id"]
    store = application.state.store
    claimed = store.claim()
    assert claimed["id"] == second
    request(application, "DELETE", f"/api/jobs/{second}")
    process_job(store, application.state.settings, store.get(second), pose_factory=FixturePose)
    assert store.get(second)["status"] == "CANCELLED"


def test_only_one_worker_claims_a_job(tmp_path):
    settings = settings_for(tmp_path)
    store = JobStore(settings.db_path)
    store.insert(
        {
            "id": "job-1",
            "exercise": "squat",
            "camera_view": "side",
            "selected_side": None,
            "max_active_jobs": 8,
        }
    )
    claimed = []

    def attempt():
        row = store.claim()
        claimed.append(row["id"] if row else None)

    threads = [threading.Thread(target=attempt) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert claimed.count("job-1") == 1
    assert claimed.count(None) == 1


def test_stale_worker_becomes_failed_not_completed(tmp_path):
    settings = settings_for(tmp_path, stale_seconds=1)
    store = JobStore(settings.db_path)
    store.insert(
        {
            "id": "stale",
            "exercise": "squat",
            "camera_view": "side",
            "selected_side": None,
            "max_active_jobs": 8,
        }
    )
    assert store.claim()["status"] == "PROCESSING"
    old = (datetime.now(UTC) - timedelta(seconds=60)).isoformat()
    with store.connect() as connection:
        connection.execute("UPDATE jobs SET heartbeat_at = ? WHERE id = 'stale'", (old,))
    assert store.recover_stale(settings.stale_seconds) == ["stale"]
    row = store.get("stale")
    assert row["status"] == "FAILED"
    assert row["error_code"] == "WORKER_INTERRUPTED"


def test_chart_failure_keeps_the_published_summary(tmp_path):
    video = make_video(tmp_path / "synthetic.mp4", range(len(SQUAT["frames"])), rate=25)
    application = create_app(settings_for(tmp_path))
    job_id = upload(application, video).json()["id"]

    def fail(_frames, _destination):
        raise RuntimeError("render failed")

    run_once(
        application.state.store,
        application.state.settings,
        pose_factory=FixturePose,
        chart_writer=fail,
    )
    stored = request(application, "GET", f"/api/jobs/{job_id}").json()
    assert stored["status"] == "COMPLETED"
    assert stored["chart_warning"] == "CHART_RENDER_FAILED"
    summary = request(application, "GET", f"/api/analyses/{job_id}").json()
    assert summary["completed_repetitions"] == 1
    assert request(application, "GET", f"/api/jobs/{job_id}/artifacts/angle.png").status_code == 404


def test_retention_skips_active_jobs(tmp_path):
    settings = settings_for(tmp_path, ttl_hours=1)
    application = create_app(settings)
    video = make_video(tmp_path / "synthetic.mp4", range(len(SQUAT["frames"])), rate=25)
    done = upload(application, video).json()["id"]
    run_once(application.state.store, settings, pose_factory=FixturePose)
    waiting = upload(application, video).json()["id"]
    old = (datetime.now(UTC) - timedelta(hours=2)).isoformat()
    with application.state.store.connect() as connection:
        connection.execute("UPDATE jobs SET finished_at = ? WHERE id = ?", (old, done))
    removed = purge_expired(application.state.store, settings)
    assert removed == [done]
    assert not (tmp_path / "jobs" / done).exists()
    assert (tmp_path / "jobs" / waiting / "source.mp4").is_file()
    assert request(application, "GET", f"/api/analyses/{done}").status_code == 404
