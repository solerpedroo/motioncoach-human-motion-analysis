"""Pose availability, configured landmark jumps and deterministic reason ordering."""

import math

from motioncoach.geometry.angles import finite, usable


def validate_requirements(requirements):
    indices = requirements["required"] + requirements["optional"]
    if (
        not requirements["required"]
        or len(set(indices)) != len(indices)
        or any(not finite(i) or int(i) != i or not 0 <= i <= 32 for i in indices)
    ):
        raise ValueError("Landmark requirements must be nonempty, unique and in [0, 32]")


def validate_quality(config):
    if (
        not finite(config["min_visibility"])
        or not 0 <= config["min_visibility"] <= 1
        or any(
            not finite(config[k]) or config[k] <= 0 for k in ("max_gap_ms", "max_jump_normalized")
        )
    ):
        raise ValueError("Invalid quality configuration")


def evaluate_quality(points, requirements, config, previous=None):
    validate_quality(config)
    validate_requirements(requirements)
    if not points:
        return dict(pose_quality="INSUFFICIENT", can_transition=False, reasons=["POSE_LOST"])
    if len({p["index"] for p in points}) != len(points):
        return dict(
            pose_quality="INSUFFICIENT", can_transition=False, reasons=["DUPLICATE_LANDMARK"]
        )
    reasons = []
    insufficient = False
    by_index = {p["index"]: p for p in points}
    old_by_index = {p["index"]: p for p in previous or []}

    def reason(value):
        if value not in reasons:
            reasons.append(value)

    for index in requirements["required"] + requirements["optional"]:
        required = index in requirements["required"]
        point = by_index.get(index)
        if not usable(point, config["min_visibility"]):
            insufficient |= required
            reason("MISSING_REQUIRED_LANDMARK" if required else "MISSING_OPTIONAL_LANDMARK")
            if point:
                visibility = point.get("visibility")
                reason(
                    "LOW_VISIBILITY"
                    if visibility is None
                    or (finite(visibility) and visibility < config["min_visibility"])
                    else "INVALID_LANDMARK"
                )
            continue
        old = old_by_index.get(index)
        if (
            usable(old, config["min_visibility"])
            and math.hypot(point["x"] - old["x"], point["y"] - old["y"])
            > config["max_jump_normalized"]
        ):
            reason("LANDMARK_JUMP")
            insufficient = True
    return dict(
        pose_quality="INSUFFICIENT" if insufficient else "LIMITED" if reasons else "GOOD",
        can_transition=not insufficient,
        reasons=reasons,
    )
