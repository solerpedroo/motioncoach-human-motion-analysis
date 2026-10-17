"""Observational feedback; same policy and guards as the TypeScript engine."""

import copy
import math
from statistics import median

from motioncoach.exercises.config import load_json, rename
from motioncoach.geometry.angles import finite, usable

POLICY = load_json("exercise-configs/feedback.json")


def empty_decision():
    return dict(selected=None, issued=False, event=None)


class FeedbackArbiter:
    def __init__(self, exercise):
        self.exercise, self.last, self.latest = exercise, {}, -math.inf

    def update(self, candidates, timestamp, quality, phase):
        if not finite(timestamp) or timestamp < 0 or timestamp < self.latest:
            return empty_decision()
        self.latest = timestamp
        if not candidates:
            return empty_decision()
        selected = min(
            candidates,
            key=lambda c: (POLICY["classes"][c["category"]], c["priority"], c["rule_id"]),
        )
        previous = self.last.get(selected["category"])
        issued = previous is None or timestamp - previous >= selected["cooldown_ms"]
        if issued:
            self.last[selected["category"]] = timestamp
        event = (
            dict(
                schema_version="1.0.0",
                type="FEEDBACK_ISSUED",
                timestamp_ms=timestamp,
                exercise=self.exercise,
                rule_id=selected["rule_id"],
                quality=quality,
                rep_index=None,
                metadata=dict(
                    phase=phase,
                    feature=selected["feature"],
                    observed_value=selected["observed_value"],
                    message_key=selected["message_key"],
                    reason=selected["reason"],
                ),
            )
            if issued
            else None
        )
        return copy.deepcopy(
            dict(
                selected=selected,
                issued=issued,
                context=dict(timestamp_ms=timestamp, quality=quality, phase=phase),
                event=event,
            )
        )


class FeedbackEngine:
    def __init__(self, config, camera_view):
        self.config, self.camera_view = copy.deepcopy(config), camera_view
        self.arbiter = FeedbackArbiter(config["id"])
        self.baselines, self.offsets = {}, []
        self.cycle = self.previous = self.last_time = None
        self.pending, self.pending_until, self.pending_after = [], 0, 0

    def candidate(self, id_, category, reason, feature=None, value=None):
        rule = (
            POLICY["completed_rule"]
            if id_ == "rep.completed"
            else next((r for r in self.config["feedback_rules"] if r["rule_id"] == id_), None)
        )
        return (
            [
                {
                    **rule,
                    "category": category,
                    "reason": reason,
                    "feature": feature,
                    "observed_value": value,
                }
            ]
            if rule
            else []
        )

    def extend(self, cycle, snapshot):
        cycle["good"] &= (
            snapshot["pose_quality"] == "GOOD"
            and snapshot["features"].get("interpolated") is not True
        )
        for metric in self.config["features"]:
            if metric["role"] != "transition":
                continue
            key = rename(metric["id"]) if snapshot["selected_side"] == "right" else metric["id"]
            value = snapshot["features"].get(key)
            if not finite(value):
                cycle["good"] = False
                continue
            low, high = cycle["ranges"].get(key, (value, value))
            cycle["ranges"][key] = (min(low, value), max(high, value))

    def update(self, snapshot, timestamp, landmarks=None):
        landmarks = landmarks or []
        if (
            not finite(timestamp)
            or timestamp < 0
            or (self.last_time is not None and timestamp <= self.last_time)
        ):
            return dict(candidates=[], decision=empty_decision(), observations=[])
        gap = (
            self.last_time is not None
            and timestamp - self.last_time > self.config["quality"]["max_gap_ms"]
        )
        self.last_time = timestamp
        candidates, observations = [], []
        events = snapshot["events"]
        if snapshot["phase"] == "PAUSED":
            self.pending, self.cycle, self.previous = [], None, None
            return dict(
                candidates=[],
                decision=self.arbiter.update(
                    [], timestamp, snapshot["pose_quality"], snapshot["phase"]
                ),
                observations=[],
            )
        wrong_view = (
            self.config["recommended_view"] != "either"
            and self.config["recommended_view"] != self.camera_view
        )
        jumped = any(e["metadata"].get("reason") == "LANDMARK_JUMP" for e in events)
        if wrong_view:
            candidates.extend(
                self.candidate(
                    "framing.prefer_front_view"
                    if self.config["recommended_view"] == "front"
                    else "framing.prefer_side_view",
                    "capture",
                    "unsupported_camera_view",
                )
            )
        if jumped and any(
            r["rule_id"] == "capture.unstable_view" for r in self.config["feedback_rules"]
        ):
            candidates.extend(self.candidate("capture.unstable_view", "capture", "landmark_jump"))
        elif snapshot["pose_quality"] == "INSUFFICIENT" or wrong_view:
            framing = next(
                (
                    r
                    for r in self.config["feedback_rules"]
                    if r["rule_id"].startswith("framing.") and "prefer_" not in r["rule_id"]
                ),
                None,
            )
            if framing:
                candidates.extend(
                    self.candidate(
                        framing["rule_id"],
                        "capture",
                        "pose_unavailable" if not landmarks else "required_data_unavailable",
                    )
                )
        if any(e["type"] == "REP_STARTED" for e in events):
            self.cycle = dict(good=not gap, samples=0, ranges={}, offsets=[])
            if self.previous:
                self.extend(self.cycle, self.previous)
        if self.cycle:
            self.cycle["good"] &= not gap
            self.cycle["samples"] += 1
            self.extend(self.cycle, snapshot)
            if self.config["id"] == "biceps_curl":
                index = 12 if snapshot["selected_side"] == "right" else 11
                shoulder = next((p for p in landmarks if p["index"] == index), None)
                elbow = next((p for p in landmarks if p["index"] == index + 2), None)
                if usable(shoulder, self.config["quality"]["min_visibility"]) and usable(
                    elbow, self.config["quality"]["min_visibility"]
                ):
                    self.cycle["offsets"].append(
                        dict(x=elbow["x"] - shoulder["x"], y=elbow["y"] - shoulder["y"])
                    )
        incomplete = next((e for e in events if e["type"] == "REP_INCOMPLETE"), None)
        if incomplete:
            rule = next(
                (r for r in self.config["feedback_rules"] if r["rule_id"].startswith("rep.")), None
            )
            if rule:
                candidates.extend(
                    self.candidate(
                        rule["rule_id"],
                        "observation",
                        incomplete["metadata"].get("reason", "incomplete_cycle"),
                    )
                )
            self.cycle = None
        if any(e["type"] == "REP_COMPLETED" for e in events):
            if snapshot["pose_quality"] != "INSUFFICIENT":
                candidates.extend(
                    self.candidate("rep.completed", "completed", "complete_observed_cycle")
                )
            policy = POLICY["consistency"]
            if (
                self.cycle
                and self.cycle["good"]
                and self.cycle["samples"] >= policy["minimum_cycle_samples"]
            ):
                for key, (low, high) in self.cycle["ranges"].items():
                    value, history = high - low, self.baselines.get(key, [])
                    if (
                        len(history) >= policy["minimum_baseline_repetitions"]
                        and median(history) > 0
                        and value < median(history) * policy["smaller_range_ratio"]
                    ):
                        candidates.extend(
                            self.candidate(
                                "consistency.smaller_range",
                                "consistency",
                                "below_own_session_median",
                                key,
                                value,
                            )
                        )
                    self.baselines[key] = [*history, value][-policy["history_limit"] :]
                points = self.cycle["offsets"]
                if len(points) >= policy["minimum_cycle_samples"]:
                    current = {key: sum(p[key] for p in points) / len(points) for key in ("x", "y")}
                    if len(self.offsets) >= policy["minimum_baseline_repetitions"]:
                        distance = math.hypot(
                            *(
                                current[key] - median(p[key] for p in self.offsets)
                                for key in ("x", "y")
                            )
                        )
                        if distance > policy["elbow_offset_difference_normalized"]:
                            candidates.extend(
                                self.candidate(
                                    "consistency.elbow_drift",
                                    "consistency",
                                    "offset_differs_from_own_session_median",
                                    "elbow_shoulder_offset_normalized",
                                    distance,
                                )
                            )
                    self.offsets = [*self.offsets, current][-policy["history_limit"] :]
            for item in candidates:
                if item["category"] == "consistency":
                    observations.append(
                        dict(
                            schema_version="1.0.0",
                            type="RANGE_VARIATION_OBSERVED",
                            timestamp_ms=timestamp,
                            exercise=self.config["id"],
                            rule_id=item["rule_id"],
                            quality=snapshot["pose_quality"],
                            rep_index=None,
                            metadata=dict(
                                phase=snapshot["phase"],
                                feature=item["feature"],
                                observed_value=item["observed_value"],
                                reason=item["reason"],
                            ),
                        )
                    )
            self.cycle = None
        consistency = [c for c in candidates if c["category"] == "consistency"]
        if consistency:
            self.pending = consistency
            self.pending_until = timestamp + POLICY["consistency"]["observation_ttl_ms"]
            self.pending_after = timestamp + POLICY["completed_rule"]["cooldown_ms"]
        if snapshot["pose_quality"] != "GOOD" or timestamp > self.pending_until:
            self.pending = []
        if timestamp >= self.pending_after:
            for item in self.pending:
                if item not in candidates:
                    candidates.append(item)
        self.previous = copy.deepcopy(snapshot)
        decision = self.arbiter.update(
            candidates, timestamp, snapshot["pose_quality"], snapshot["phase"]
        )
        if decision["issued"] and decision["selected"]["category"] == "consistency":
            self.pending = []
        return copy.deepcopy(
            dict(candidates=candidates, decision=decision, observations=observations)
        )
