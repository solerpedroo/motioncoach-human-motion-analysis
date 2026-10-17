"""Produce a full deterministic trace for cross-runtime comparison."""

import json
from pathlib import Path

from motioncoach.exercises.analyzer import ExerciseAnalyzer
from motioncoach.exercises.config import get_config, load_json
from motioncoach.exercises.features import FeatureProcessor
from motioncoach.exercises.feedback import FeedbackArbiter, FeedbackEngine
from motioncoach.exercises.fsm import FeatureAnalyzer
from motioncoach.geometry.angles import angle_2d
from motioncoach.quality.gate import evaluate_quality
from motioncoach.temporal.ema import EmaFilter


def trace():
    root = Path(__file__).resolve().parents[2] / "shared" / "fixtures"

    def read(name):
        return json.loads((root / name).read_text())

    common = load_json("exercise-configs/common.json")
    output = {
        "geometry": [angle_2d(*c["points"]) for c in read("kinematics/geometry.json")["cases"]]
    }
    output["ema"] = []
    for case in read("kinematics/ema.json")["cases"]:
        filter_ = EmaFilter(common["smoothing"]["alpha"], common["quality"]["max_gap_ms"])
        output["ema"].append(
            [filter_.update(s["value"], s["timestamp_ms"]) for s in case["samples"]]
        )
    quality = read("kinematics/quality.json")
    output["quality"] = [
        evaluate_quality(
            c["landmarks"], quality["requirements"], common["quality"], c.get("previous")
        )
        for c in quality["cases"]
    ]
    data = read("kinematics/pipeline.json")
    output["pipeline"] = []
    for case in data["cases"]:
        processor = FeatureProcessor(common, data["requirements"], data["metrics"])
        output["pipeline"].append(
            [
                processor.update(s["landmarks"], s["timestamp_ms"], observed=False)
                for s in case["samples"]
            ]
        )
    output["features"] = []
    for case in read("repetitions/features.json")["cases"]:
        engine = FeatureAnalyzer(get_config(case["exercise"]))
        output["features"].append(
            [
                getattr(engine, s["action"])(s["timestamp_ms"])
                if "action" in s
                else engine.update(s)
                for s in case["samples"]
            ]
        )
    output["landmarks"] = []
    for case in read("repetitions/landmarks.json")["cases"]:
        for mirrored in (False, True):
            engine = ExerciseAnalyzer(
                case["exercise"],
                camera_view=case["camera_view"],
                selected_side=case["selected_side"],
                mirrored=mirrored,
            )
            samples = [engine.update(frame) for frame in case["frames"]]
            engine.reset()
            samples.extend(
                engine.update(frame) for frame in case["frames"] if frame["timestamp_ms"] <= 800
            )
            samples.extend((engine.pause(820), engine.resume(2000)))
            samples.extend(
                engine.update({**frame, "timestamp_ms": frame["timestamp_ms"] + 2400})
                for frame in case["frames"]
            )
            output["landmarks"].append(samples)
    output["swapped_sides"] = []
    bindings = load_json("exercise-configs/side-bindings.json")["left_to_right"]
    mapping = {a: b for left, right in bindings for a, b in ((left, right), (right, left))}
    for case in read("repetitions/landmarks.json")["cases"]:
        side = (
            "right"
            if case["selected_side"] == "left"
            else "left"
            if case["selected_side"] == "right"
            else None
        )
        engine = ExerciseAnalyzer(
            case["exercise"], camera_view=case["camera_view"], selected_side=side
        )
        samples = [
            engine.update(
                {
                    **f,
                    "landmarks": [
                        {**p, "index": mapping.get(p["index"], p["index"])} for p in f["landmarks"]
                    ],
                }
            )
            for f in case["frames"]
        ]
        output["swapped_sides"].append(samples)
    output["arbitration"] = []
    for case in read("feedback/arbitration.json"):
        arbiter = FeedbackArbiter("squat")
        samples = []
        for s in case["samples"]:
            candidates = [
                dict(
                    rule_id=c["rule"],
                    message_key=c["rule"],
                    category=c["category"],
                    priority=0,
                    cooldown_ms=3000,
                    feature=None,
                    observed_value=None,
                    reason="synthetic_test",
                )
                for c in s["candidates"]
            ]
            samples.append(arbiter.update(candidates, s["time"], "GOOD", "STANDING"))
        output["arbitration"].append(samples)
    output["observations"] = []
    for case in read("feedback/observations.json")["cases"]:
        engine = FeedbackEngine(get_config(case["exercise"]), case["camera_view"])
        output["observations"].append(
            [
                engine.update(s["snapshot"], s["timestamp_ms"], s["landmarks"])
                for s in case["samples"]
            ]
        )
    return output


if __name__ == "__main__":
    print(json.dumps(trace(), allow_nan=False))
