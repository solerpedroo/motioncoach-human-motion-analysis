"""SQLite job lifecycle. The API process never runs pose."""

import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


class JobStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    exercise TEXT NOT NULL,
                    camera_view TEXT NOT NULL,
                    selected_side TEXT,
                    stage TEXT NOT NULL,
                    error_code TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    heartbeat_at TEXT,
                    finished_at TEXT,
                    cancel_requested INTEGER NOT NULL DEFAULT 0,
                    files_deleted INTEGER NOT NULL DEFAULT 0
                )
                """
            )

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=5, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA busy_timeout=5000")
        return connection

    def insert(self, job: dict) -> None:
        stamp = utc_now()
        with self.connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            active = connection.execute(
                "SELECT COUNT(*) AS n FROM jobs WHERE status IN ('QUEUED', 'PROCESSING')"
            ).fetchone()["n"]
            if active >= job["max_active_jobs"]:
                connection.execute("ROLLBACK")
                raise QueueFull()
            connection.execute(
                """
                INSERT INTO jobs (
                    id, status, exercise, camera_view, selected_side, stage,
                    created_at, updated_at
                ) VALUES (?, 'QUEUED', ?, ?, ?, 'probe', ?, ?)
                """,
                (
                    job["id"],
                    job["exercise"],
                    job["camera_view"],
                    job["selected_side"],
                    stamp,
                    stamp,
                ),
            )
            connection.execute("COMMIT")

    def get(self, job_id: str):
        with self.connect() as connection:
            return connection.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()

    def claim(self):
        stamp = utc_now()
        with self.connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                """
                SELECT * FROM jobs WHERE status = 'QUEUED'
                ORDER BY created_at LIMIT 1
                """
            ).fetchone()
            if row is None:
                connection.execute("COMMIT")
                return None
            updated = connection.execute(
                """
                UPDATE jobs
                SET status = 'PROCESSING', stage = 'pose', heartbeat_at = ?, updated_at = ?
                WHERE id = ? AND status = 'QUEUED'
                """,
                (stamp, stamp, row["id"]),
            ).rowcount
            connection.execute("COMMIT")
        return self.get(row["id"]) if updated else None

    def heartbeat(self, job_id: str, stage: str) -> None:
        stamp = utc_now()
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE jobs SET stage = ?, heartbeat_at = ?, updated_at = ?
                WHERE id = ? AND status = 'PROCESSING'
                """,
                (stage, stamp, stamp, job_id),
            )

    def cancel_requested(self, job_id: str) -> bool:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT cancel_requested FROM jobs WHERE id = ?", (job_id,)
            ).fetchone()
        return bool(row and row["cancel_requested"])

    def request_cancel(self, job_id: str) -> str | None:
        row = self.get(job_id)
        if row is None:
            return None
        stamp = utc_now()
        with self.connect() as connection:
            if row["status"] == "QUEUED":
                connection.execute(
                    """
                    UPDATE jobs
                    SET status = 'CANCELLED', error_code = 'CANCELLED',
                        error_message = 'Cancelled before processing.',
                        finished_at = ?, updated_at = ?, files_deleted = 1
                    WHERE id = ? AND status = 'QUEUED'
                    """,
                    (stamp, stamp, job_id),
                )
                return "cancelled"
            if row["status"] == "PROCESSING":
                connection.execute(
                    """
                    UPDATE jobs SET cancel_requested = 1, updated_at = ?
                    WHERE id = ? AND status = 'PROCESSING'
                    """,
                    (stamp, job_id),
                )
                return "cancel_requested"
        return "terminal"

    def finish(self, job_id: str, status: str, code: str | None, message: str | None) -> None:
        stamp = utc_now()
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE jobs
                SET status = ?, stage = 'publication', error_code = ?, error_message = ?,
                    finished_at = ?, updated_at = ?
                WHERE id = ? AND status = 'PROCESSING'
                """,
                (status, code, message, stamp, stamp, job_id),
            )

    def mark_deleted(self, job_id: str) -> None:
        with self.connect() as connection:
            connection.execute(
                "UPDATE jobs SET files_deleted = 1, updated_at = ? WHERE id = ?",
                (utc_now(), job_id),
            )

    def recover_stale(self, stale_seconds: float) -> list[str]:
        cutoff = (datetime.now(UTC) - timedelta(seconds=stale_seconds)).isoformat()
        stamp = utc_now()
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT id FROM jobs
                WHERE status = 'PROCESSING' AND heartbeat_at IS NOT NULL AND heartbeat_at < ?
                """,
                (cutoff,),
            ).fetchall()
            ids = [row["id"] for row in rows]
            connection.executemany(
                """
                UPDATE jobs
                SET status = 'FAILED', error_code = 'WORKER_INTERRUPTED',
                    error_message = 'The worker stopped before publishing a result.',
                    finished_at = ?, updated_at = ?
                WHERE id = ? AND status = 'PROCESSING'
                """,
                [(stamp, stamp, job_id) for job_id in ids],
            )
        return ids

    def expired(self, ttl_hours: float):
        cutoff = (datetime.now(UTC) - timedelta(hours=ttl_hours)).isoformat()
        with self.connect() as connection:
            return connection.execute(
                """
                SELECT * FROM jobs
                WHERE status IN ('COMPLETED', 'FAILED', 'CANCELLED')
                  AND files_deleted = 0
                  AND finished_at IS NOT NULL
                  AND finished_at < ?
                """,
                (cutoff,),
            ).fetchall()

    def active_ids(self):
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT id FROM jobs WHERE status IN ('QUEUED', 'PROCESSING')"
            ).fetchall()
        return {row["id"] for row in rows}


class QueueFull(Exception):
    """Raised when queued and processing jobs already fill the local quota."""
