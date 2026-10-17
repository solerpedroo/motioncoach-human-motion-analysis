"""Load the same versioned JSON configurations used by the browser."""

import copy
import json
from pathlib import Path

from motioncoach.contracts.models import ExerciseConfig


def shared_path(relative: str) -> Path:
    repo = Path(__file__).resolve().parents[2] / "shared"
    root = (
        repo
        if (repo / "exercise-configs/common.json").is_file()
        else Path(__file__).resolve().parents[1] / "_shared"
    )
    return root / relative


def load_json(relative: str):
    return json.loads(shared_path(relative).read_text(encoding="utf-8"))


def get_config(exercise: str) -> dict:
    if exercise not in ("squat", "push_up", "biceps_curl", "jumping_jack"):
        raise ValueError("Unsupported exercise")
    config = load_json(f"exercise-configs/{exercise}.json")
    validate_config(config)
    return config


def resolve_side(config: dict, side: str) -> dict:
    result = copy.deepcopy(config)
    if side == "left" or config["side_selection"] == "bilateral":
        return result
    if side != "right":
        raise ValueError("Unsupported side")
    mapping = dict(load_json("exercise-configs/side-bindings.json")["left_to_right"])
    for key in ("required_landmarks", "optional_landmarks"):
        result[key] = [mapping.get(index, index) for index in result[key]]
    for metric in result["features"]:
        metric["id"] = rename(metric["id"])
        metric["landmarks"] = [mapping.get(index, index) for index in metric["landmarks"]]
    for transition in result["transitions"]:
        for condition in transition["conditions"]:
            condition["feature"] = rename(condition["feature"])
    return result


def rename(name: str) -> str:
    return "right_" + name[5:] if name.startswith("left_") else name


def validate_config(config: dict) -> None:
    ExerciseConfig.model_validate(config)
    states = set(config["states"])
    features = {item["id"]: item for item in config["features"]}
    thresholds = {item["name"]: item for item in config["thresholds"]}
    indices = config["required_landmarks"] + config["optional_landmarks"]
    if (
        len(states) != len(config["states"])
        or len(features) != len(config["features"])
        or len(thresholds) != len(config["thresholds"])
        or len(set(indices)) != len(indices)
        or not {"NOT_READY", "UNCERTAIN", "PAUSED"} <= states
        or config["initial_state"] != "NOT_READY"
    ):
        raise ValueError("Invalid or duplicate configuration identities")
    for metric in features.values():
        if not set(metric["landmarks"]) <= set(indices):
            raise ValueError("Feature references an undeclared landmark")
    for transition in config["transitions"]:
        if transition["from_state"] not in states or transition["to_state"] not in states:
            raise ValueError("Transition references an unknown state")
        for condition in transition["conditions"]:
            metric, threshold = (
                features.get(condition["feature"]),
                thresholds.get(condition["threshold"]),
            )
            if (
                not metric
                or metric["role"] != "transition"
                or not threshold
                or (metric["kind"] == "angle_2d" and threshold["unit"] != "degree")
                or (metric["kind"] == "ratio" and threshold["unit"] != "ratio")
            ):
                raise ValueError("Invalid transition feature or threshold")
        if transition["require_dwell"] and transition["match"] != "all":
            raise ValueError("Stable states require simultaneous conditions")
        if transition["emit_event"] not in (None, "REP_STARTED", "REP_COMPLETED", "REP_INCOMPLETE"):
            raise ValueError("Unsupported transition event")
    transitions = config["transitions"]
    home = next((t for t in transitions if t["from_state"] == "NOT_READY"), None)
    start = next((t for t in transitions if t["emit_event"] == "REP_STARTED"), None)
    complete = next((t for t in transitions if t["emit_event"] == "REP_COMPLETED"), None)
    extreme = next(
        (
            t
            for t in transitions
            if start and t["from_state"] == start["to_state"] and t["emit_event"] is None
        ),
        None,
    )
    leaving = next(
        (t for t in transitions if extreme and t["from_state"] == extreme["to_state"]), None
    )
    partial = next(
        (
            t
            for t in transitions
            if start
            and t["from_state"] == start["to_state"]
            and t["emit_event"] == "REP_INCOMPLETE"
        ),
        None,
    )
    if (
        not all((home, start, complete, extreme, leaving, partial))
        or not home["require_dwell"]
        or home["emit_event"] is not None
        or not any(
            t["from_state"] == "UNCERTAIN"
            and t["to_state"] == home["to_state"]
            and t["emit_event"] is None
            for t in transitions
        )
        or start["from_state"] != home["to_state"]
        or complete["to_state"] != home["to_state"]
        or leaving["to_state"] != complete["from_state"]
        or partial["to_state"] != home["to_state"]
        or not all(t["require_dwell"] for t in (extreme, complete, partial))
    ):
        raise ValueError("A complete cycle with stable-state reacquisition is required")
    for entry, exit_ in ((home, start), (extreme, leaving)):
        for condition in entry["conditions"]:
            opposite = next(
                (c for c in exit_["conditions"] if c["feature"] == condition["feature"]), None
            )
            if not opposite or opposite["operator"] == condition["operator"]:
                raise ValueError("Entry and exit must define hysteresis")
            a, b = (
                thresholds[condition["threshold"]]["value"],
                thresholds[opposite["threshold"]]["value"],
            )
            if (condition["operator"] == "gte" and a <= b) or (
                condition["operator"] == "lte" and a >= b
            ):
                raise ValueError("Entry and exit must define hysteresis")
    if config["id"] == "jumping_jack":
        minimum = thresholds.get("min_hip_span_x")
        if not minimum or minimum["unit"] != "normalized" or minimum["value"] <= 0:
            raise ValueError("A positive horizontal hip span is required")
