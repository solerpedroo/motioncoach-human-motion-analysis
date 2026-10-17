"""Declarative repetition FSM; a direct port of the TypeScript executor."""

import copy

from motioncoach.exercises.config import validate_config
from motioncoach.geometry.angles import finite


class FeatureAnalyzer:
    def __init__(self, config, clock=lambda: 0):
        self.config = copy.deepcopy(config)
        validate_config(self.config)
        self.clock = clock
        self.thresholds = {t["name"]: t["value"] for t in self.config["thresholds"]}
        self.required_features = [m for m in self.config["features"] if m["role"] == "transition"]
        self.reset()

    def snapshot(self):
        return copy.deepcopy(
            dict(
                phase=self.phase,
                completed_repetitions=self.complete,
                incomplete_repetitions=self.incomplete,
                pose_quality=self.quality,
                features=self.features,
                events=self.events,
                feedback_candidates=[],
            )
        )

    def reset(self):
        self.phase = self.config["initial_state"]
        self.complete = self.incomplete = self.paused_ms = 0
        self.last_timestamp = self.last_sample = self.pause_started = None
        self.started_at = self.last_completed = self.candidate = None
        self.quality = "INSUFFICIENT"
        self.features, self.events = {}, []
        self.lost = self.invalid = False
        return self.snapshot()

    def emit(self, type_, timestamp, rule, reason=None):
        self.events.append(
            dict(
                schema_version="1.0.0",
                type=type_,
                timestamp_ms=timestamp,
                exercise=self.config["id"],
                rule_id=rule,
                quality=self.quality,
                rep_index=self.complete if type_ == "REP_COMPLETED" else None,
                metadata={"phase": self.phase, **({"reason": reason} if reason else {})},
            )
        )

    def abandon(self, timestamp, reason):
        if self.started_at is not None:
            self.incomplete += 1
            rule = next(
                (
                    r["rule_id"]
                    for r in self.config["feedback_rules"]
                    if r["rule_id"].startswith("rep.")
                ),
                "rep.not_fully_observed",
            )
            self.emit("REP_INCOMPLETE", timestamp, rule, reason)
        self.started_at = self.candidate = None

    def uncertain(self, timestamp, reason):
        self.abandon(timestamp, reason)
        self.phase = "UNCERTAIN"

    def command_time(self, timestamp):
        if (
            not finite(timestamp)
            or timestamp < 0
            or (self.last_timestamp is not None and timestamp < self.last_timestamp)
        ):
            raise ValueError("Command timestamp must be finite and nondecreasing")
        self.last_timestamp = timestamp

    def pause(self, timestamp=None):
        timestamp = self.clock() if timestamp is None else timestamp
        self.command_time(timestamp)
        self.events = []
        if self.pause_started is not None:
            return self.snapshot()
        self.abandon(timestamp, "session_paused")
        self.pause_started = timestamp
        self.phase = "PAUSED"
        self.emit("SESSION_PAUSED", timestamp, "session.paused")
        return self.snapshot()

    def resume(self, timestamp=None):
        timestamp = self.clock() if timestamp is None else timestamp
        self.command_time(timestamp)
        self.events = []
        if self.pause_started is not None:
            self.paused_ms += timestamp - self.pause_started
            self.pause_started = self.candidate = self.last_sample = None
            self.phase = "UNCERTAIN"
        return self.snapshot()

    def matches(self, transition, values):
        conditions = []
        for condition in transition["conditions"]:
            value, limit = values.get(condition["feature"]), self.thresholds[condition["threshold"]]
            conditions.append(
                finite(value)
                and (value >= limit if condition["operator"] == "gte" else value <= limit)
            )
        return all(conditions) if transition["match"] == "all" else any(conditions)

    def update(self, sample):
        self.events = []
        time = sample["timestamp_ms"]
        if (
            not finite(time)
            or time < 0
            or (self.last_timestamp is not None and time <= self.last_timestamp)
        ):
            self.candidate = None
            self.quality, self.features = "INSUFFICIENT", {}
            if self.last_timestamp is None:
                self.phase = "UNCERTAIN"
            elif self.pause_started is None:
                self.uncertain(self.last_timestamp, "non_monotonic_timestamp")
            return self.snapshot()
        self.last_timestamp = time
        if self.pause_started is not None:
            return self.snapshot()
        gap = (
            self.last_sample is not None
            and time - self.last_sample > self.config["quality"]["max_gap_ms"]
        )
        self.last_sample = time
        self.quality = (
            sample.get("pose_quality")
            if sample.get("pose_quality") in ("GOOD", "LIMITED", "INSUFFICIENT")
            else "INSUFFICIENT"
        )
        values = sample.get("features", {})
        self.features = {"interpolated": values.get("interpolated") is True}
        for metric in self.config["features"]:
            value = values.get(metric["id"])
            self.features[metric["id"]] = (
                value
                if finite(value) and value >= 0 and (metric["kind"] != "angle_2d" or value <= 180)
                else None
            )
        observed = sample.get("observed_features", self.features)
        valid = all(
            finite(self.features.get(m["id"]))
            and finite(observed.get(m["id"]))
            and observed[m["id"]] >= 0
            and (m["kind"] != "angle_2d" or observed[m["id"]] <= 180)
            for m in self.required_features
        )
        interpolated = self.features["interpolated"] or observed.get("interpolated") is True
        reasons = sample.get("reasons", [])
        unusable = (
            self.quality == "INSUFFICIENT"
            or not valid
            or sample.get("can_transition") is False
            or sample.get("continuity_broken") is True
            or gap
        )
        if unusable or interpolated:
            if not valid:
                self.quality = "INSUFFICIENT"
            self.uncertain(
                time,
                "long_gap"
                if gap
                else "interpolated_sample"
                if interpolated
                else reasons[0]
                if reasons
                else "insufficient_observation",
            )
            if "POSE_LOST" in reasons and not self.lost:
                self.emit("POSE_LOST", time, "pose.lost")
            elif "LOW_VISIBILITY" in reasons and not self.invalid:
                self.emit(
                    "LOW_VISIBILITY",
                    time,
                    self.config["feedback_rules"][0]["rule_id"]
                    if self.config["feedback_rules"]
                    else "capture.insufficient",
                )
            self.lost, self.invalid = "POSE_LOST" in reasons, True
            return self.snapshot()
        if self.lost or self.invalid:
            self.emit("POSE_RECOVERED", time, "pose.recovered")
        self.lost = self.invalid = False
        next_ = next(
            (
                t
                for t in self.config["transitions"]
                if t["from_state"] == self.phase
                and self.matches(t, self.features)
                and self.matches(t, observed)
            ),
            None,
        )
        if next_ is None:
            self.candidate = None
            return self.snapshot()
        active_time = time - self.paused_ms
        if self.candidate is None or self.candidate[0] is not next_:
            self.candidate = (next_, active_time)
        if next_["require_dwell"] and active_time - self.candidate[1] < self.config["min_state_ms"]:
            return self.snapshot()
        self.phase, self.candidate = next_["to_state"], None
        if next_["emit_event"] == "REP_STARTED":
            self.started_at = active_time
            self.emit("REP_STARTED", time, "rep.started")
        elif next_["emit_event"] == "REP_INCOMPLETE":
            self.abandon(
                time,
                "partial_movement"
                if self.config["id"] in ("biceps_curl", "jumping_jack")
                else "not_fully_observed",
            )
        elif next_["emit_event"] == "REP_COMPLETED":
            if (
                self.started_at is not None
                and active_time - self.started_at >= self.config["min_cycle_ms"]
                and (
                    self.last_completed is None
                    or active_time - self.last_completed >= self.config["min_cycle_ms"]
                )
            ):
                self.complete += 1
                self.last_completed, self.started_at = active_time, None
                self.emit("REP_COMPLETED", time, "rep.completed")
            else:
                self.abandon(time, "cycle_too_short")
        return self.snapshot()
