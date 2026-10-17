import type {
  ExerciseConfig,
  FeatureSet,
  PoseQuality,
  SessionEvent,
  TransitionDefinition,
} from "@/lib/contracts.generated";
import { validateExerciseConfig } from "./exercise-config";
import type { Clock } from "./types";

export interface FeatureSample {
  readonly timestamp_ms: number;
  readonly features: FeatureSet;
  readonly observed_features?: FeatureSet;
  readonly pose_quality: PoseQuality;
  readonly can_transition?: boolean;
  readonly continuity_broken?: boolean;
  readonly reasons?: readonly string[];
}

export interface FsmSnapshot {
  readonly phase: string;
  readonly completed_repetitions: number;
  readonly incomplete_repetitions: number;
  readonly pose_quality: PoseQuality;
  readonly features: FeatureSet;
  readonly events: readonly SessionEvent[];
  readonly feedback_candidates: readonly never[];
}

export function createFeatureAnalyzer(
  inputConfig: ExerciseConfig,
  clock: Clock,
) {
  const config = structuredClone(inputConfig);
  validateExerciseConfig(config);
  const thresholds = new Map(
    config.thresholds.map((threshold) => [threshold.name, threshold.value]),
  );
  const requiredFeatures = config.features.filter(
    (feature) => feature.role === "transition",
  );
  let phase = config.initial_state;
  let complete = 0,
    incomplete = 0;
  let lastTimestamp: number | null = null;
  let lastSampleTime: number | null = null;
  let pauseStarted: number | null = null;
  let pausedMs = 0;
  let startedAt: number | null = null;
  let lastCompletedAt: number | null = null;
  let candidate: { transition: TransitionDefinition; since: number } | null =
    null;
  let quality: PoseQuality = "INSUFFICIENT";
  let features: FeatureSet = {};
  let lost = false;
  let invalid = false;
  let events: SessionEvent[] = [];

  const snapshot = (): FsmSnapshot => ({
    phase,
    completed_repetitions: complete,
    incomplete_repetitions: incomplete,
    pose_quality: quality,
    features: { ...features },
    events: events.map((event) => structuredClone(event)),
    feedback_candidates: [],
  });
  const emit = (
    type: SessionEvent["type"],
    timestamp: number,
    rule: string,
    reason?: string,
  ) => {
    events.push({
      schema_version: "1.0.0",
      type,
      timestamp_ms: timestamp,
      exercise: config.id,
      rule_id: rule,
      quality,
      rep_index: type === "REP_COMPLETED" ? complete : null,
      metadata: { phase, ...(reason ? { reason } : {}) },
    });
  };
  const abandon = (timestamp: number, reason: string) => {
    if (startedAt !== null) {
      incomplete++;
      emit(
        "REP_INCOMPLETE",
        timestamp,
        config.feedback_rules.find((rule) => rule.rule_id.startsWith("rep."))
          ?.rule_id ?? "rep.not_fully_observed",
        reason,
      );
    }
    startedAt = null;
    candidate = null;
  };
  const uncertain = (timestamp: number, reason: string) => {
    abandon(timestamp, reason);
    phase = "UNCERTAIN";
  };
  const commandTime = (timestamp: number) => {
    if (
      !Number.isFinite(timestamp) ||
      timestamp < 0 ||
      (lastTimestamp !== null && timestamp < lastTimestamp)
    )
      throw new RangeError(
        "Command timestamp must be finite and nondecreasing",
      );
    lastTimestamp = timestamp;
  };
  const matches = (transition: TransitionDefinition, values: FeatureSet) => {
    const conditions = transition.conditions.map((condition) => {
      const value = values[condition.feature as keyof FeatureSet];
      const limit = thresholds.get(condition.threshold);
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        limit !== undefined &&
        (condition.operator === "gte" ? value >= limit : value <= limit)
      );
    });
    return transition.match === "all"
      ? conditions.every(Boolean)
      : conditions.some(Boolean);
  };

  return {
    snapshot,
    reset() {
      phase = config.initial_state;
      complete = 0;
      incomplete = 0;
      lastTimestamp = null;
      lastSampleTime = null;
      pauseStarted = null;
      pausedMs = 0;
      startedAt = null;
      lastCompletedAt = null;
      candidate = null;
      quality = "INSUFFICIENT";
      features = {};
      events = [];
      lost = false;
      invalid = false;
      return snapshot();
    },
    pause(timestamp = clock()) {
      commandTime(timestamp);
      events = [];
      if (pauseStarted !== null) return snapshot();
      abandon(timestamp, "session_paused");
      pauseStarted = timestamp;
      phase = "PAUSED";
      emit("SESSION_PAUSED", timestamp, "session.paused");
      return snapshot();
    },
    resume(timestamp = clock()) {
      commandTime(timestamp);
      events = [];
      if (pauseStarted === null) return snapshot();
      pausedMs += timestamp - pauseStarted;
      pauseStarted = null;
      phase = "UNCERTAIN";
      candidate = null;
      lastSampleTime = null;
      return snapshot();
    },
    update(sample: FeatureSample): FsmSnapshot {
      events = [];
      const time = sample.timestamp_ms;
      if (
        !Number.isFinite(time) ||
        time < 0 ||
        (lastTimestamp !== null && time <= lastTimestamp)
      ) {
        candidate = null;
        quality = "INSUFFICIENT";
        features = {};
        if (lastTimestamp === null) phase = "UNCERTAIN";
        // An invalid time cannot be serialized as an event timestamp.
        if (lastTimestamp !== null && pauseStarted === null)
          uncertain(lastTimestamp, "non_monotonic_timestamp");
        return snapshot();
      }
      lastTimestamp = time;
      if (pauseStarted !== null) return snapshot();
      const longGap =
        lastSampleTime !== null &&
        time - lastSampleTime > config.quality.max_gap_ms;
      lastSampleTime = time;
      quality = ["GOOD", "LIMITED", "INSUFFICIENT"].includes(
        sample.pose_quality,
      )
        ? sample.pose_quality
        : "INSUFFICIENT";
      features = { interpolated: sample.features.interpolated === true };
      for (const metric of config.features) {
        const key = metric.id as Exclude<keyof FeatureSet, "interpolated">;
        const value = sample.features[key];
        features[key] =
          typeof value === "number" &&
          Number.isFinite(value) &&
          value >= 0 &&
          (metric.kind !== "angle_2d" || value <= 180)
            ? value
            : null;
      }
      const valuesValid = requiredFeatures.every((metric) => {
        const value = features[metric.id as keyof FeatureSet];
        const observed = (sample.observed_features ?? features)[
          metric.id as keyof FeatureSet
        ];
        return (
          typeof value === "number" &&
          Number.isFinite(value) &&
          value >= 0 &&
          (metric.kind !== "angle_2d" || value <= 180) &&
          typeof observed === "number" &&
          Number.isFinite(observed) &&
          observed >= 0 &&
          (metric.kind !== "angle_2d" || observed <= 180)
        );
      });
      const interpolated =
        features.interpolated === true ||
        sample.observed_features?.interpolated === true;
      const unusable =
        quality === "INSUFFICIENT" ||
        !valuesValid ||
        sample.can_transition === false ||
        sample.continuity_broken === true ||
        longGap;
      if (unusable || interpolated) {
        if (!valuesValid) quality = "INSUFFICIENT";
        uncertain(
          time,
          longGap
            ? "long_gap"
            : interpolated
              ? "interpolated_sample"
              : (sample.reasons?.[0] ?? "insufficient_observation"),
        );
        if (sample.reasons?.includes("POSE_LOST") && !lost)
          emit("POSE_LOST", time, "pose.lost");
        else if (sample.reasons?.includes("LOW_VISIBILITY") && !invalid)
          emit(
            "LOW_VISIBILITY",
            time,
            config.feedback_rules[0]?.rule_id ?? "capture.insufficient",
          );
        lost = sample.reasons?.includes("POSE_LOST") ?? false;
        invalid = true;
        return snapshot();
      }
      if (lost || invalid) emit("POSE_RECOVERED", time, "pose.recovered");
      lost = false;
      invalid = false;
      const next = config.transitions.find(
        (transition) =>
          transition.from_state === phase &&
          matches(transition, features) &&
          matches(transition, sample.observed_features ?? features),
      );
      if (!next) {
        candidate = null;
        return snapshot();
      }
      const activeTime = time - pausedMs;
      if (!candidate || candidate.transition !== next)
        candidate = { transition: next, since: activeTime };
      if (
        next.require_dwell &&
        activeTime - candidate.since < config.min_state_ms
      )
        return snapshot();
      phase = next.to_state;
      candidate = null;
      if (next.emit_event === "REP_STARTED") {
        startedAt = activeTime;
        emit("REP_STARTED", time, "rep.started");
      } else if (next.emit_event === "REP_INCOMPLETE") {
        abandon(
          time,
          config.id === "biceps_curl" || config.id === "jumping_jack"
            ? "partial_movement"
            : "not_fully_observed",
        );
      } else if (next.emit_event === "REP_COMPLETED") {
        if (
          startedAt !== null &&
          activeTime - startedAt >= config.min_cycle_ms &&
          (lastCompletedAt === null ||
            activeTime - lastCompletedAt >= config.min_cycle_ms)
        ) {
          complete++;
          lastCompletedAt = activeTime;
          startedAt = null;
          emit("REP_COMPLETED", time, "rep.completed");
        } else abandon(time, "cycle_too_short");
      }
      return snapshot();
    },
  };
}
