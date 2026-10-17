"""Landmarks to features to FSM with fixed anatomical side selection."""

import copy

from motioncoach.exercises.config import get_config, resolve_side
from motioncoach.exercises.features import exercise_processor
from motioncoach.exercises.fsm import FeatureAnalyzer
from motioncoach.geometry.angles import finite, usable


class ExerciseAnalyzer:
    def __init__(
        self, exercise, *, camera_view, selected_side=None, mirrored=False, clock=lambda: 0
    ):
        self.config = get_config(exercise) if isinstance(exercise, str) else copy.deepcopy(exercise)
        self.camera_view, self.user_side, self.clock = camera_view, selected_side, clock
        if self.config["side_selection"] == "user_selected" and selected_side not in (
            "left",
            "right",
        ):
            raise ValueError("Select left or right before starting this exercise")
        self.fsm = FeatureAnalyzer(self.config, clock)
        self.reset()

    def wrap(self, result):
        return {
            **result,
            "features": copy.deepcopy(self.features),
            "selected_side": self.side if self.locked else None,
        }

    def snapshot(self):
        return self.wrap(self.fsm.snapshot())

    def set_side(self, side):
        self.side = side
        config = self.config if side == "bilateral" else resolve_side(self.config, side)
        self.processor = exercise_processor(config, self.camera_view, self.clock)

    def reset(self):
        selection = self.config["side_selection"]
        self.side = (
            "bilateral"
            if selection == "bilateral"
            else self.user_side
            if selection == "user_selected"
            else None
        )
        self.locked = self.side is not None
        self.last_timestamp, self.processor = None, None
        self.features = {}
        self.fsm.reset()
        if self.side:
            self.set_side(self.side)
        return self.snapshot()

    def pause(self, timestamp=None):
        timestamp = self.clock() if timestamp is None else timestamp
        result = self.fsm.pause(timestamp)
        self.last_timestamp = timestamp
        return self.wrap(result)

    def resume(self, timestamp=None):
        timestamp = self.clock() if timestamp is None else timestamp
        result = self.fsm.resume(timestamp)
        self.last_timestamp = timestamp
        if self.processor:
            self.processor.reset()
        return self.wrap(result)

    def best_side(self, points):
        def score(side):
            config = resolve_side(self.config, side)
            selected = [
                [p for p in points if p["index"] == index] for index in config["required_landmarks"]
            ]
            if any(
                len(matches) != 1
                or not usable(matches[0], self.config["quality"]["min_visibility"])
                for matches in selected
            ):
                return None
            return sum(matches[0]["visibility"] for matches in selected) / len(selected)

        left, right = score("left"), score("right")
        return (
            None
            if left is None and right is None
            else "right"
            if right is not None and (left is None or right > left)
            else "left"
        )

    def canonical(self, features):
        if self.side != "right":
            return features
        return {
            "left_" + key[6:] if key.startswith("right_") else key: value
            for key, value in features.items()
        }

    def update(self, frame):
        time, points = frame["timestamp_ms"], frame["landmarks"]
        if (
            not finite(time)
            or time < 0
            or (self.last_timestamp is not None and time <= self.last_timestamp)
        ):
            if self.processor:
                self.processor.reset()
            self.features = {}
            return self.wrap(
                self.fsm.update(
                    dict(
                        timestamp_ms=time,
                        features={},
                        pose_quality="INSUFFICIENT",
                        continuity_broken=True,
                    )
                )
            )
        self.last_timestamp = time
        if self.fsm.phase == "PAUSED":
            return self.wrap(
                self.fsm.update(dict(timestamp_ms=time, features={}, pose_quality="INSUFFICIENT"))
            )
        changed = False
        if not self.locked:
            side = self.best_side(points)
            if side and side != self.side:
                changed = self.side is not None
                self.set_side(side)
        if not self.processor:
            return self.wrap(
                self.fsm.update(
                    dict(
                        timestamp_ms=time,
                        features={},
                        pose_quality="INSUFFICIENT",
                        reasons=["POSE_LOST" if not points else "LOW_VISIBILITY"],
                    )
                )
            )
        derived = self.processor.update(points, time)
        self.features = derived["features"]
        allowed = (
            self.camera_view in ("front", "side")
            if self.config["recommended_view"] == "either"
            else self.camera_view == self.config["recommended_view"]
        )
        result = self.fsm.update(
            dict(
                timestamp_ms=time,
                features=self.canonical(derived["features"]),
                observed_features=self.canonical(derived["observed_features"]),
                pose_quality=derived["pose_quality"] if allowed else "INSUFFICIENT",
                can_transition=allowed and derived["can_transition"],
                continuity_broken=derived["continuity_broken"] or changed,
                reasons=derived["reasons"] if allowed else ["UNSUPPORTED_CAMERA_VIEW"],
            )
        )
        if not self.locked and result["phase"] not in ("NOT_READY", "UNCERTAIN"):
            self.locked = True
        return self.wrap(result)
