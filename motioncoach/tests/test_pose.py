"""Adapter contract tests and separately opted-in real inference."""

import json
import platform
from types import SimpleNamespace

import pytest

from motioncoach.contracts.models import PoseFrame, SessionSummary
from motioncoach.pipeline.analysis import analyze
from motioncoach.pipeline.errors import AnalysisError
from motioncoach.pose.landmarker import model_manifest, normalize_landmarks, verify_model
from motioncoach.tests.video_helpers import make_video


def test_landmark_normalization_matches_the_browser():
    points = [
        SimpleNamespace(x=1.1, y=0.2, z=0),
        SimpleNamespace(x=0.4, y=0.2, z=-0.1, visibility=0.9),
        SimpleNamespace(x=0.3, y=0.2, z=float("nan")),
    ]
    assert normalize_landmarks(points) == [
        dict(index=1, x=0.4, y=0.2, z=-0.1, visibility=0.9, presence=None)
    ]


def test_model_missing_or_wrong_hash_is_explicit(tmp_path):
    with pytest.raises(AnalysisError) as error:
        verify_model(tmp_path / "missing.task")
    assert error.value.code == "MODEL_NOT_FOUND"
    wrong = tmp_path / "wrong.task"
    wrong.write_bytes(b"not a model")
    with pytest.raises(AnalysisError) as error:
        verify_model(wrong)
    assert error.value.code == "MODEL_HASH_MISMATCH"


@pytest.mark.pose
def test_real_pose_model_on_a_generated_person_free_video(tmp_path, request):
    model = request.config.getoption("--model-path")
    assert model, "Pass --model-path to the verified local model; this test never downloads it"
    path = make_video(tmp_path / "blank.mp4")
    frames = []
    result = analyze(
        path, exercise="squat", camera_view="side", model_path=model, frame_sink=frames.append
    )
    SessionSummary.model_validate_json(json.dumps(result["summary"]))
    assert len(frames) == 10
    for frame in frames:
        PoseFrame.model_validate(frame)
    assert result["summary"]["completed_repetitions"] == 0
    assert result["summary"]["evaluation"]["status"] == "not_evaluated"
    manifest = dict(
        model=model_manifest(),
        machine=platform.platform(),
        architecture=platform.machine(),
        decoded_frames=len(frames),
        mediapipe=result["metadata"]["mediapipe_version"],
        input_sha256=result["metadata"]["input_sha256"],
        human_evaluation="not_evaluated",
    )
    (tmp_path / "smoke-manifest.json").write_text(json.dumps(manifest, indent=2))
    print("Pose smoke:", json.dumps(manifest))
