"""Streaming pipeline contracts and cleanup with injected, deterministic pose."""

import json
from dataclasses import replace
from pathlib import Path

import pytest

from motioncoach.cli import main
from motioncoach.contracts.models import PoseFrame, SessionSummary
from motioncoach.pipeline.analysis import analyze
from motioncoach.pipeline.errors import AnalysisError
from motioncoach.pipeline.output import OutputBundle
from motioncoach.tests.video_helpers import make_video
from motioncoach.video.decoder import VideoDecoder, VideoLimits

ROOT = Path(__file__).resolve().parents[2]
CASES = json.loads((ROOT / "shared/fixtures/repetitions/landmarks.json").read_text())["cases"]


@pytest.mark.parametrize("case", CASES, ids=lambda c: c["exercise"])
def test_pipeline_uses_the_port_and_emits_valid_frames_summary(case, tmp_path):
    path = make_video(tmp_path / "synthetic.mp4", range(len(case["frames"])), rate=25)

    class FixturePose:
        closed = False

        def __init__(self, _):
            self.index = 0

        def __enter__(self):
            return self

        def __exit__(self, *_):
            FixturePose.closed = True

        def detect(self, _):
            frame = case["frames"][self.index]
            self.index += 1
            return frame["landmarks"]

    frames, progress = [], []
    result = analyze(
        path,
        exercise=case["exercise"],
        camera_view=case["camera_view"],
        selected_side=case["selected_side"],
        pose_factory=FixturePose,
        frame_sink=frames.append,
        progress=progress.append,
    )
    summary = SessionSummary.model_validate_json(json.dumps(result["summary"]))
    assert (summary.completed_repetitions, summary.incomplete_repetitions) == (1, 0)
    assert summary.source == "upload" and summary.evaluation.status == "not_evaluated"
    assert summary.selected_side == case["expected"]["selected_side"]
    assert result["metadata"]["analyzed_frames"] == len(case["frames"])
    assert result["metadata"]["pts_fallback"] is False
    assert len(progress) == len(frames) and FixturePose.closed
    for frame in frames:
        PoseFrame.model_validate(frame)
    assert [frame["timestamp_ms"] for frame in frames] == [
        frame["timestamp_ms"] for frame in case["frames"]
    ]
    assert summary.events[-1].type == "SESSION_FINISHED"
    assert len(summary.configuration_sha256) == 64


@pytest.mark.parametrize("failure", ["sink", "cancel"])
def test_errors_cancel_and_sink_failure_close_pose_decoder_and_output(tmp_path, failure):
    path = make_video(tmp_path / "synthetic.mp4")
    instances = []

    class TrackedDecoder(VideoDecoder):
        def __enter__(self):
            instances.append(self)
            return super().__enter__()

    class EmptyPose:
        closed = False

        def __init__(self, _):
            EmptyPose.closed = False

        def __enter__(self):
            return self

        def __exit__(self, *_):
            EmptyPose.closed = True

        def detect(self, _):
            return []

    cancelled = False
    destination = tmp_path / failure

    def sink(_):
        nonlocal cancelled
        if failure == "sink":
            raise OSError("injected disk failure")
        cancelled = True

    with pytest.raises((AnalysisError, OSError)):
        with OutputBundle(destination) as output:
            analyze(
                path,
                exercise="squat",
                camera_view="side",
                pose_factory=EmptyPose,
                decoder_factory=TrackedDecoder,
                cancelled=lambda: cancelled,
                frame_sink=lambda frame: (output.frame(frame), sink(frame)),
            )
    assert EmptyPose.closed and instances[-1].container is None
    assert not destination.exists()
    assert not list(tmp_path.glob(".motioncoach-*"))


def test_eof_marks_active_cycle_incomplete_without_fabricating_a_pause_or_loss(tmp_path):
    case = CASES[0]
    path = make_video(tmp_path / "short.mp4", range(24), rate=25)

    class PartialPose:
        def __init__(self, _):
            self.frames = iter(case["frames"])

        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

        def detect(self, _):
            return next(self.frames)["landmarks"]

    result = analyze(path, exercise="squat", camera_view="side", pose_factory=PartialPose)
    summary = result["summary"]
    assert summary["completed_repetitions"] == 0 and summary["incomplete_repetitions"] == 1
    assert summary["discarded_repetitions"] == 0
    assert "SESSION_PAUSED" not in [event["type"] for event in summary["events"]]
    assert summary["events"][-2]["metadata"]["reason"] == "end_of_video"


def test_output_bundle_is_atomic_and_refuses_existing_results(tmp_path):
    destination = tmp_path / "result"
    with OutputBundle(destination) as output:
        output.frame({"timestamp_ms": 0})
        assert not destination.exists()
        output.publish({"summary": {}})
    assert json.loads((destination / "analysis.json").read_text()) == {"summary": {}}
    assert (destination / "frames.jsonl").read_text().strip() == '{"timestamp_ms":0}'
    with pytest.raises(AnalysisError) as error:
        with OutputBundle(destination):
            pass
    assert error.value.code == "OUTPUT_EXISTS"


def test_cli_probe_and_stable_errors_without_http(tmp_path, capsys):
    path = make_video(tmp_path / "synthetic.mp4")
    assert main(["probe", str(path)]) == 0
    assert json.loads(capsys.readouterr().out)["declared_frames"] == 10
    for args, code in [
        (["probe", str(path), "--max-bytes", "1"], "FILE_TOO_LARGE"),
        (["probe", str(path), "--sample-fps", "nan"], "INVALID_OPTIONS"),
        (["probe", str(tmp_path / "missing.mp4")], "FILE_NOT_FOUND"),
        (
            [
                "analyze",
                str(path),
                "--exercise",
                "biceps_curl",
                "--view",
                "side",
                "--output",
                str(tmp_path / "out"),
            ],
            "SIDE_REQUIRED",
        ),
        (
            [
                "analyze",
                str(path),
                "--exercise",
                "squat",
                "--view",
                "front",
                "--output",
                str(tmp_path / "out"),
            ],
            "UNSUPPORTED_VIEW",
        ),
    ]:
        assert main(args) == 2
        captured = capsys.readouterr()
        assert json.loads(captured.err)["error"]["code"] == code
        assert "Traceback" not in captured.err
    assert not (tmp_path / "out").exists()


def test_limits_during_decode_do_not_publish_partial_output(tmp_path):
    path = make_video(tmp_path / "synthetic.mp4")

    class EmptyPose:
        def __init__(self, _):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

        def detect(self, _):
            return []

    with pytest.raises(AnalysisError):
        with OutputBundle(tmp_path / "out") as output:
            analyze(
                path,
                exercise="squat",
                camera_view="side",
                pose_factory=EmptyPose,
                limits=replace(VideoLimits(), max_decoded_frames=1),
                frame_sink=output.frame,
            )
    assert not (tmp_path / "out").exists()


def test_output_cleanup_also_covers_failure_during_enter(tmp_path, monkeypatch):
    original = Path.open

    def fail_frames(self, *args, **kwargs):
        if self.name == "frames.jsonl":
            raise OSError("injected open failure")
        return original(self, *args, **kwargs)

    monkeypatch.setattr(Path, "open", fail_frames)
    with pytest.raises(OSError):
        with OutputBundle(tmp_path / "result"):
            pass
    assert not list(tmp_path.glob(".motioncoach-*"))
    assert not (tmp_path / "result").exists()
