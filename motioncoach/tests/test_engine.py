"""Shared fixtures are software regression evidence, not human evaluation."""

import json
from pathlib import Path

import pytest

from motioncoach.exercises.analyzer import ExerciseAnalyzer
from motioncoach.exercises.config import get_config, load_json
from motioncoach.exercises.features import FeatureProcessor
from motioncoach.exercises.fsm import FeatureAnalyzer
from motioncoach.geometry.angles import angle_2d
from motioncoach.quality.gate import evaluate_quality
from motioncoach.temporal.ema import EmaFilter

ROOT = Path(__file__).resolve().parents[2] / "shared" / "fixtures"
COMMON = load_json("exercise-configs/common.json")


def fixture(name):
    return json.loads((ROOT / name).read_text())


def close(actual, expected, path="root"):
    if isinstance(expected, dict):
        for key, value in expected.items():
            close(actual[key], value, f"{path}.{key}")
    elif isinstance(expected, list):
        assert len(actual) == len(expected), path
        for i, (a, b) in enumerate(zip(actual, expected, strict=True)):
            close(a, b, f"{path}[{i}]")
    elif isinstance(expected, (float, int)) and not isinstance(expected, bool):
        assert actual == pytest.approx(expected, abs=1e-9, rel=1e-9), path
    else:
        assert actual == expected, path


@pytest.mark.parametrize(
    "case", fixture("kinematics/geometry.json")["cases"], ids=lambda c: c["id"]
)
def test_geometry(case):
    close(angle_2d(*case["points"]), case["angle_deg"])


@pytest.mark.parametrize("case", fixture("kinematics/ema.json")["cases"], ids=lambda c: c["id"])
def test_ema(case):
    filter_ = EmaFilter(COMMON["smoothing"]["alpha"], COMMON["quality"]["max_gap_ms"])
    for sample in case["samples"]:
        close(filter_.update(sample["value"], sample["timestamp_ms"]), sample["expected"])


QUALITY = fixture("kinematics/quality.json")


@pytest.mark.parametrize("case", QUALITY["cases"], ids=lambda c: c["id"])
def test_quality(case):
    close(
        evaluate_quality(
            case["landmarks"], QUALITY["requirements"], COMMON["quality"], case.get("previous")
        ),
        case["expected"],
    )


PIPELINE = fixture("kinematics/pipeline.json")


@pytest.mark.parametrize("case", PIPELINE["cases"], ids=lambda c: c["id"])
def test_kinematics(case):
    processor = FeatureProcessor(COMMON, PIPELINE["requirements"], PIPELINE["metrics"])
    for sample in case["samples"]:
        close(
            processor.update(sample["landmarks"], sample["timestamp_ms"], observed=False),
            sample["expected"],
        )


@pytest.mark.parametrize(
    "case", fixture("repetitions/features.json")["cases"], ids=lambda c: c["id"]
)
def test_feature_repetitions(case):
    analyzer, events = FeatureAnalyzer(get_config(case["exercise"])), []
    for sample in case["samples"]:
        result = (
            getattr(analyzer, sample["action"])(sample["timestamp_ms"])
            if "action" in sample
            else analyzer.update(sample)
        )
        if "expected_phase" in sample:
            assert result["phase"] == sample["expected_phase"]
        events.extend(result["events"])
    expected = case["expected"]
    close(
        result,
        {k: expected[k] for k in ("phase", "completed_repetitions", "incomplete_repetitions")},
    )
    close(
        [
            {k: event[k] for k in ("type", "timestamp_ms", "rule_id", "quality", "rep_index")}
            for event in events
        ],
        expected["events"],
    )


@pytest.mark.parametrize(
    "case", fixture("repetitions/landmarks.json")["cases"], ids=lambda c: c["exercise"]
)
def test_landmark_cycles_and_pause(case):
    for mirrored in (False, True):
        analyzer = ExerciseAnalyzer(
            case["exercise"],
            camera_view=case["camera_view"],
            selected_side=case["selected_side"],
            mirrored=mirrored,
        )
        events = []
        for frame in case["frames"]:
            result = analyzer.update(frame)
            events.extend(result["events"])
        close(
            result,
            {
                k: case["expected"][k]
                for k in ("completed_repetitions", "incomplete_repetitions", "selected_side")
            },
        )
        assert [e["type"] for e in events] == case["expected"]["event_types"]
        analyzer.reset()
        for frame in case["frames"]:
            if frame["timestamp_ms"] <= 800:
                analyzer.update(frame)
        assert analyzer.pause(820)["incomplete_repetitions"] == 1
        assert analyzer.resume(2000)["phase"] == "UNCERTAIN"
        for frame in case["frames"]:
            result = analyzer.update({**frame, "timestamp_ms": frame["timestamp_ms"] + 2400})
        assert (result["completed_repetitions"], result["incomplete_repetitions"]) == (1, 1)


@pytest.mark.parametrize("exercise", ["squat", "push_up"])
def test_auto_selected_side_never_switches_on_loss(exercise):
    case = next(
        c for c in fixture("repetitions/landmarks.json")["cases"] if c["exercise"] == exercise
    )
    analyzer = ExerciseAnalyzer(exercise, camera_view="side")
    for frame in case["frames"]:
        result = analyzer.update(frame)
    assert result["selected_side"] == "left"
    frame = case["frames"][-1]
    result = analyzer.update(
        {"timestamp_ms": 1840, "landmarks": [p for p in frame["landmarks"] if p["index"] % 2 == 0]}
    )
    assert result["selected_side"] == "left" and result["pose_quality"] == "INSUFFICIENT"
    assert result["completed_repetitions"] == 1


def test_configuration_and_result_mutations_do_not_change_the_session():
    case = fixture("repetitions/landmarks.json")["cases"][0]
    config = get_config("squat")
    analyzer = ExerciseAnalyzer(config, camera_view="side")
    config["thresholds"].clear()
    for frame in case["frames"]:
        result = analyzer.update(frame)
        result["features"].clear()
        result["events"].clear()
    assert analyzer.snapshot()["completed_repetitions"] == 1
    with pytest.raises(ValueError):
        analyzer.pause(-1)
