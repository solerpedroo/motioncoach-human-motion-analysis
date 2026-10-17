"""Local CLI for probing and streaming video analysis, without HTTP."""

import argparse
import hashlib
import json
import os
import sys
import tempfile
import urllib.request
from dataclasses import asdict
from pathlib import Path

from motioncoach.pipeline.analysis import analyze, validate_analysis_options
from motioncoach.pipeline.errors import AnalysisError
from motioncoach.pipeline.output import OutputBundle
from motioncoach.pose.landmarker import model_manifest
from motioncoach.video.decoder import VideoLimits, probe


def prepare_model(path):
    manifest = model_manifest()
    if path.exists():
        if hashlib.sha256(path.read_bytes()).hexdigest() != manifest["sha256"]:
            raise AnalysisError(
                "MODEL_HASH_MISMATCH", "Remove the invalid local model and retry preparation."
            )
        return
    with urllib.request.urlopen(manifest["url"], timeout=30) as response:
        payload = response.read(16 * 1024 * 1024 + 1)
    if len(payload) > 16 * 1024 * 1024 or hashlib.sha256(payload).hexdigest() != manifest["sha256"]:
        raise AnalysisError(
            "MODEL_HASH_MISMATCH", "Downloaded model did not match the pinned SHA-256."
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=".pose-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as file:
            file.write(payload)
        Path(temporary).replace(path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def parser():
    result = argparse.ArgumentParser(
        prog="motioncoach", description="Inspect and analyze local exercise videos."
    )
    commands = result.add_subparsers(dest="command", required=True)
    prepare = commands.add_parser(
        "prepare-model", help="Explicitly prepare the pinned model asset."
    )
    prepare.add_argument(
        "--output", type=Path, default=Path("data/models/pose_landmarker_lite.task")
    )
    for name in ("probe", "analyze"):
        command = commands.add_parser(name)
        command.add_argument("file", type=Path)
        command.add_argument("--max-bytes", type=int, default=200_000_000)
        command.add_argument("--max-duration-ms", type=float, default=300_000)
        command.add_argument("--max-pixels", type=int, default=3840 * 2160)
        command.add_argument("--max-decoded-frames", type=int, default=36_000)
        command.add_argument("--sample-fps", type=float, default=30)
        if name == "analyze":
            command.add_argument(
                "--exercise",
                choices=("squat", "push_up", "biceps_curl", "jumping_jack"),
                required=True,
            )
            command.add_argument("--view", choices=("side", "front"), required=True)
            command.add_argument("--side", choices=("left", "right"))
            command.add_argument(
                "--model", type=Path, default=Path("data/models/pose_landmarker_lite.task")
            )
            command.add_argument(
                "--output",
                type=Path,
                required=True,
                help="New directory for analysis.json and frames.jsonl.",
            )
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        if args.command == "prepare-model":
            prepare_model(args.output)
            payload = dict(status="prepared", model_sha256=model_manifest()["sha256"])
        else:
            limits = VideoLimits(
                args.max_bytes,
                args.max_duration_ms,
                args.max_pixels,
                args.max_decoded_frames,
                args.sample_fps,
            )
            if args.command == "probe":
                payload = asdict(probe(args.file, limits))
            else:
                validate_analysis_options(args.exercise, args.view, args.side)
                with OutputBundle(args.output) as output:
                    payload = analyze(
                        args.file,
                        exercise=args.exercise,
                        camera_view=args.view,
                        selected_side=args.side,
                        model_path=args.model,
                        limits=limits,
                        frame_sink=output.frame,
                    )
                    output.publish(payload)
                payload = dict(
                    status="completed",
                    analyzed_frames=payload["metadata"]["analyzed_frames"],
                    summary=payload["summary"],
                )
        print(json.dumps(payload, allow_nan=False))
        return 0
    except AnalysisError as error:
        print(json.dumps(error.payload()), file=sys.stderr)
        return 130 if error.code == "CANCELLED" else 2
    except KeyboardInterrupt:
        print(
            json.dumps(AnalysisError("CANCELLED", "Analysis was cancelled.").payload()),
            file=sys.stderr,
        )
        return 130
    except ValueError:
        print(
            json.dumps(
                AnalysisError(
                    "INVALID_OPTIONS", "Check exercise settings and positive video limits."
                ).payload()
            ),
            file=sys.stderr,
        )
        return 2
    except OSError:
        print(
            json.dumps(
                AnalysisError(
                    "LOCAL_IO_FAILED", "Local input, model download or output operation failed."
                ).payload()
            ),
            file=sys.stderr,
        )
        return 2
