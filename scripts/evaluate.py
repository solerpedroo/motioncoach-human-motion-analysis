"""Write Wave 8 reports. Human metrics stay not_evaluated without annotations."""

import json
import subprocess
from pathlib import Path

from motioncoach.evaluation.experiment_d import run_filter_experiment
from motioncoach.evaluation.scoring import MATCH_TOLERANCE_MS, evaluate_annotations

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "research" / "reports"


def git_state() -> dict:
    def run(*args: str) -> str:
        completed = subprocess.run(
            ["git", *args], cwd=ROOT, check=False, capture_output=True, text=True
        )
        return completed.stdout.strip()

    commit = run("rev-parse", "HEAD")
    dirty = bool(run("status", "--porcelain"))
    return {"commit": commit or None, "dirty": dirty}


def human_report(annotation_path: Path | None) -> dict:
    document = None
    if annotation_path and annotation_path.is_file():
        document = json.loads(annotation_path.read_text(encoding="utf-8"))
    measured = evaluate_annotations(document)
    return {
        "experiments": {
            "A": {
                "status": measured["status"],
                "reason": measured["reason"],
                "question": "threshold crossing versus smoothing versus FSM",
            },
            "B": {
                "status": "not_evaluated",
                "reason": measured["reason"] or "no_camera_condition_annotations",
            },
            "C": {
                "status": "not_evaluated",
                "reason": measured["reason"] or "no_pose_variant_annotations",
            },
        },
        "count": measured["count"],
        "events": measured["events"],
        "temporal_error_ms": measured["temporal_error_ms"],
        "feedback": measured["feedback"],
        "pose": measured["pose"],
        "tolerance_ms": MATCH_TOLERANCE_MS,
        "acquisition": (
            "No annotated clips were loaded. MM-Fit and RepCount were not downloaded "
            "and their licenses were not audited in this run."
        ),
    }


def write_reports(annotation_path: Path | None = None) -> dict:
    REPORTS.mkdir(parents=True, exist_ok=True)
    payload = {
        "protocol": {
            "match_tolerance_ms": MATCH_TOLERANCE_MS,
            "split_unit": "person_and_session",
            "thresholds_adjusted_on_test": False,
        },
        "git": git_state(),
        "human": human_report(annotation_path),
        "filter_d": run_filter_experiment(),
    }
    (REPORTS / "wave8.json").write_text(
        json.dumps(payload, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )
    return payload


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Write the Wave 8 evaluation reports.")
    parser.add_argument("--annotations", type=Path, default=None)
    args = parser.parse_args()
    report = write_reports(args.annotations)
    summary = {
        "human": report["human"]["experiments"],
        "filter_d": report["filter_d"]["experiment"],
    }
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
