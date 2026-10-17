"""Shared kinematics and exercise feature extraction."""

import copy

from motioncoach.geometry.angles import finite, landmark_angle
from motioncoach.quality.gate import evaluate_quality, validate_quality, validate_requirements
from motioncoach.temporal.ema import EmaFilter


class FeatureProcessor:
    def __init__(self, config, requirements, metrics, clock=lambda: 0, camera_view="side"):
        self.config, self.requirements, self.metrics = copy.deepcopy(
            (config, requirements, metrics)
        )
        self.clock, self.camera_view = clock, camera_view
        validate_quality(self.config["quality"])
        validate_requirements(self.requirements)
        if config["smoothing"]["type"] != "ema":
            raise ValueError("Only ema smoothing is supported")
        ids = [m["id"] for m in metrics]
        if (
            not ids
            or len(set(ids)) != len(ids)
            or not any(m["role"] == "transition" for m in metrics)
        ):
            raise ValueError("Unique metrics with a transition metric are required")
        for metric in metrics:
            allowed = (
                requirements["required"]
                if metric["role"] == "transition"
                else requirements["required"] + requirements["optional"]
            )
            if not set(metric["landmarks"]) <= set(allowed):
                raise ValueError("Metric landmarks must be declared and transitions required")
        self.filters = [
            EmaFilter(config["smoothing"]["alpha"], config["quality"]["max_gap_ms"])
            for _ in metrics
        ]
        self.reset()

    def clear(self):
        self.previous = None
        for filter_ in self.filters:
            filter_.reset()

    def reset(self):
        self.last_timestamp = None
        self.clear()

    def missing(self):
        return {"interpolated": False, **{m["id"]: None for m in self.metrics}}

    def read(self, metric, points):
        indices, visibility = metric["landmarks"], self.config["quality"]["min_visibility"]
        if metric.get("kind", "angle_2d") == "angle_2d" and len(indices) == 3:
            return landmark_angle(points, indices, visibility)
        if metric["id"] == "arm_elevation_deg" and len(indices) == 6:
            left, right = (
                landmark_angle(points, indices[:3], visibility),
                landmark_angle(points, indices[3:], visibility),
            )
            return None if left is None or right is None else min(left, right)
        if metric["id"] == "leg_spread_ratio" and len(indices) == 4:
            if self.camera_view != "front":
                return None
            selected = [next((p for p in points if p["index"] == index), None) for index in indices]
            if any(p is None for p in selected):
                return None
            left, right, left_hip, right_hip = selected
            span = abs(left_hip["x"] - right_hip["x"])
            minimum = next(
                (t["value"] for t in self.config["thresholds"] if t["name"] == "min_hip_span_x"),
                None,
            )
            return (
                None
                if minimum is None or span < minimum or span == 0
                else abs(left["x"] - right["x"]) / span
            )
        raise ValueError(f"Unsupported feature: {metric['id']}")

    def update(self, points, timestamp=None, *, observed=True):
        timestamp = self.clock() if timestamp is None else timestamp

        def rejected(reason):
            return dict(
                timestamp_ms=timestamp if finite(timestamp) and timestamp >= 0 else None,
                pose_quality="INSUFFICIENT",
                features=self.missing(),
                observed_features=self.missing(),
                can_transition=False,
                continuity_broken=True,
                reasons=[reason],
            )

        if not finite(timestamp) or timestamp < 0:
            result = rejected("INVALID_TIMESTAMP")
        elif self.last_timestamp is not None and timestamp <= self.last_timestamp:
            result = rejected("NON_MONOTONIC_TIMESTAMP")
        else:
            result = self._update(points, timestamp)
        if not observed:
            result.pop("observed_features")
        return result

    def _update(self, points, timestamp):
        gap = (
            self.last_timestamp is not None
            and timestamp - self.last_timestamp > self.config["quality"]["max_gap_ms"]
        )
        self.last_timestamp = timestamp
        if gap:
            self.clear()
        quality = evaluate_quality(points, self.requirements, self.config["quality"], self.previous)
        if not quality["can_transition"]:
            self.clear()
            return dict(
                timestamp_ms=timestamp,
                pose_quality=quality["pose_quality"],
                features=self.missing(),
                observed_features=self.missing(),
                can_transition=False,
                continuity_broken=True,
                reasons=quality["reasons"],
            )
        features, raw_features = self.missing(), self.missing()
        invalid_transition = invalid_observation = unobservable_ratio = False
        for metric, filter_ in zip(self.metrics, self.filters, strict=True):
            value = self.read(metric, points)
            raw = (
                value
                if finite(value)
                and value >= 0
                and (metric.get("kind", "angle_2d") != "angle_2d" or value <= 180)
                else None
            )
            raw_features[metric["id"]] = raw
            if raw is None:
                filter_.reset()
                invalid_transition |= metric["role"] == "transition"
                invalid_observation |= metric["role"] == "observation"
                unobservable_ratio |= (
                    metric.get("kind") == "ratio" and metric["role"] == "transition"
                )
            else:
                features[metric["id"]] = filter_.update(raw, timestamp)["value"]
        if invalid_transition:
            self.clear()
        else:
            self.previous = copy.deepcopy(points)
        reasons = [*quality["reasons"]]
        if gap:
            reasons.append("LONG_GAP")
        if invalid_transition:
            reasons.append(
                "UNOBSERVABLE_TRANSITION_FEATURE"
                if unobservable_ratio
                else "DEGENERATE_TRANSITION_ANGLE"
            )
        if invalid_observation:
            reasons.append("DEGENERATE_OBSERVATION_ANGLE")
        return dict(
            timestamp_ms=timestamp,
            pose_quality="INSUFFICIENT"
            if invalid_transition
            else "LIMITED"
            if invalid_observation
            else quality["pose_quality"],
            features=features,
            observed_features=raw_features,
            can_transition=not gap and not invalid_transition,
            continuity_broken=gap or invalid_transition,
            reasons=reasons,
        )


def exercise_processor(config, camera_view, clock=lambda: 0):
    return FeatureProcessor(
        config,
        dict(required=config["required_landmarks"], optional=config["optional_landmarks"]),
        config["features"],
        clock,
        camera_view,
    )
