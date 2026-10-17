import type {
  ExerciseConfig,
  FeatureSet,
  Landmark,
  SessionEvent,
} from "@/lib/contracts.generated";
import policy from "../../../shared/exercise-configs/feedback.json";
import type { AnalyzerSnapshot } from "./exercise-analyzer";
import { isUsableLandmark } from "./geometry";

export { policy as feedbackPolicy };
export type FeedbackClass = keyof typeof policy.classes;
export interface FeedbackCandidate {
  rule_id: string;
  message_key: string;
  category: FeedbackClass;
  priority: number;
  cooldown_ms: number;
  feature: string | null;
  observed_value: number | null;
  reason: string;
}
export interface FeedbackDecision {
  context?: {
    timestamp_ms: number;
    quality: SessionEvent["quality"];
    phase: string;
  };
  selected: FeedbackCandidate | null;
  issued: boolean;
  event: SessionEvent | null;
}
export function createFeedbackArbiter(exercise: ExerciseConfig["id"]) {
  const last = new Map<FeedbackClass, number>();
  let latest = -Infinity;
  return (
    candidates: readonly FeedbackCandidate[],
    timestamp: number,
    quality: SessionEvent["quality"],
    phase: string,
  ): FeedbackDecision => {
    if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp < latest)
      return { selected: null, issued: false, event: null };
    latest = timestamp;
    const selected =
      [...candidates].sort(
        (a, b) =>
          policy.classes[a.category] - policy.classes[b.category] ||
          a.priority - b.priority ||
          a.rule_id.localeCompare(b.rule_id),
      )[0] ?? null;
    if (!selected) return { selected: null, issued: false, event: null };
    const previous = last.get(selected.category);
    const issued =
      previous === undefined || timestamp - previous >= selected.cooldown_ms;
    if (issued) last.set(selected.category, timestamp);
    return {
      selected,
      issued,
      context: { timestamp_ms: timestamp, quality, phase },
      event: issued
        ? {
            schema_version: "1.0.0",
            type: "FEEDBACK_ISSUED",
            timestamp_ms: timestamp,
            exercise,
            rule_id: selected.rule_id,
            quality,
            rep_index: null,
            metadata: {
              phase,
              feature: selected.feature,
              observed_value: selected.observed_value,
              message_key: selected.message_key,
              reason: selected.reason,
            },
          }
        : null,
    };
  };
}
const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
interface Cycle {
  good: boolean;
  samples: number;
  ranges: Map<string, { min: number; max: number }>;
  offsets: { x: number; y: number }[];
}
export function createFeedbackEngine(
  inputConfig: ExerciseConfig,
  cameraView: string,
) {
  const config = structuredClone(inputConfig);
  const arbitrate = createFeedbackArbiter(config.id);
  const baselines = new Map<string, number[]>();
  const offsets: { x: number; y: number }[] = [];
  let cycle: Cycle | null = null;
  let previous: AnalyzerSnapshot | null = null;
  let lastTime: number | null = null;
  let pending: FeedbackCandidate[] = [];
  let pendingUntil = 0;
  let pendingAfter = 0;
  const candidate = (
    id: string,
    category: FeedbackClass,
    reason: string,
    feature: string | null = null,
    value: number | null = null,
  ): FeedbackCandidate[] => {
    const rule =
      id === "rep.completed"
        ? policy.completed_rule
        : config.feedback_rules.find((item) => item.rule_id === id);
    return rule
      ? [{ ...rule, category, reason, feature, observed_value: value }]
      : [];
  };
  const featureKeys = (snapshot: AnalyzerSnapshot) =>
    config.features
      .filter((item) => item.role === "transition")
      .map((item) =>
        snapshot.selected_side === "right"
          ? item.id.replace(/^left_/, "right_")
          : item.id,
      );
  const extend = (target: Cycle, snapshot: AnalyzerSnapshot) => {
    target.good &&=
      snapshot.pose_quality === "GOOD" &&
      snapshot.features.interpolated !== true;
    for (const key of featureKeys(snapshot)) {
      const value = snapshot.features[key as keyof FeatureSet];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        target.good = false;
        continue;
      }
      const range = target.ranges.get(key);
      target.ranges.set(key, {
        min: Math.min(range?.min ?? value, value),
        max: Math.max(range?.max ?? value, value),
      });
    }
  };
  return {
    update(
      snapshot: AnalyzerSnapshot,
      timestamp: number,
      landmarks: readonly Landmark[] = [],
    ): {
      candidates: FeedbackCandidate[];
      decision: FeedbackDecision;
      observations: SessionEvent[];
    } {
      if (
        !Number.isFinite(timestamp) ||
        timestamp < 0 ||
        (lastTime !== null && timestamp <= lastTime)
      )
        return {
          candidates: [],
          decision: { selected: null, issued: false, event: null },
          observations: [],
        };
      const gap =
        lastTime !== null && timestamp - lastTime > config.quality.max_gap_ms;
      lastTime = timestamp;
      const candidates: FeedbackCandidate[] = [],
        observations: SessionEvent[] = [];
      const incomplete = snapshot.events.some(
        (event) => event.type === "REP_INCOMPLETE",
      );
      if (snapshot.phase === "PAUSED") {
        pending = [];
        cycle = null;
        previous = null;
        return {
          candidates,
          decision: arbitrate(
            [],
            timestamp,
            snapshot.pose_quality,
            snapshot.phase,
          ),
          observations,
        };
      }
      const viewWrong =
        config.recommended_view !== "either" &&
        config.recommended_view !== cameraView;
      const jumped = snapshot.events.some(
        (event) => event.metadata.reason === "LANDMARK_JUMP",
      );
      if (viewWrong)
        candidates.push(
          ...candidate(
            config.recommended_view === "front"
              ? "framing.prefer_front_view"
              : "framing.prefer_side_view",
            "capture",
            "unsupported_camera_view",
          ),
        );
      if (
        jumped &&
        config.feedback_rules.some(
          (rule) => rule.rule_id === "capture.unstable_view",
        )
      )
        candidates.push(
          ...candidate("capture.unstable_view", "capture", "landmark_jump"),
        );
      else if (snapshot.pose_quality === "INSUFFICIENT" || viewWrong) {
        const framing = config.feedback_rules.find(
          (rule) =>
            rule.rule_id.startsWith("framing.") &&
            !rule.rule_id.includes("prefer_"),
        );
        if (framing)
          candidates.push(
            ...candidate(
              framing.rule_id,
              "capture",
              landmarks.length === 0
                ? "pose_unavailable"
                : "required_data_unavailable",
            ),
          );
      }
      if (snapshot.events.some((event) => event.type === "REP_STARTED")) {
        cycle = { good: !gap, samples: 0, ranges: new Map(), offsets: [] };
        if (previous) extend(cycle, previous);
      }
      if (cycle) {
        cycle.good &&= !gap;
        cycle.samples++;
        extend(cycle, snapshot);
        if (config.id === "biceps_curl") {
          const shoulderIndex = snapshot.selected_side === "right" ? 12 : 11;
          const shoulder = landmarks.find(
              (point) => point.index === shoulderIndex,
            ),
            elbow = landmarks.find(
              (point) => point.index === shoulderIndex + 2,
            );
          if (
            shoulder &&
            elbow &&
            isUsableLandmark(shoulder, config.quality.min_visibility) &&
            isUsableLandmark(elbow, config.quality.min_visibility)
          )
            cycle.offsets.push({
              x: elbow.x - shoulder.x,
              y: elbow.y - shoulder.y,
            });
        }
      }
      if (incomplete) {
        const rule = config.feedback_rules.find((item) =>
          item.rule_id.startsWith("rep."),
        );
        if (rule)
          candidates.push(
            ...candidate(
              rule.rule_id,
              "observation",
              snapshot.events.find((event) => event.type === "REP_INCOMPLETE")
                ?.metadata.reason ?? "incomplete_cycle",
            ),
          );
        cycle = null;
      }
      if (snapshot.events.some((event) => event.type === "REP_COMPLETED")) {
        if (snapshot.pose_quality !== "INSUFFICIENT")
          candidates.push(
            ...candidate(
              "rep.completed",
              "completed",
              "complete_observed_cycle",
            ),
          );
        if (
          cycle?.good &&
          cycle.samples >= policy.consistency.minimum_cycle_samples
        ) {
          for (const [key, range] of cycle.ranges) {
            const value = range.max - range.min,
              history = baselines.get(key) ?? [];
            if (
              history.length >=
                policy.consistency.minimum_baseline_repetitions &&
              median(history) > 0 &&
              value < median(history) * policy.consistency.smaller_range_ratio
            )
              candidates.push(
                ...candidate(
                  "consistency.smaller_range",
                  "consistency",
                  "below_own_session_median",
                  key,
                  value,
                ),
              );
            baselines.set(
              key,
              [...history, value].slice(-policy.consistency.history_limit),
            );
          }
          if (
            cycle.offsets.length >= policy.consistency.minimum_cycle_samples
          ) {
            const current = {
              x:
                cycle.offsets.reduce((sum, point) => sum + point.x, 0) /
                cycle.offsets.length,
              y:
                cycle.offsets.reduce((sum, point) => sum + point.y, 0) /
                cycle.offsets.length,
            };
            if (
              offsets.length >= policy.consistency.minimum_baseline_repetitions
            ) {
              const distance = Math.hypot(
                current.x - median(offsets.map((point) => point.x)),
                current.y - median(offsets.map((point) => point.y)),
              );
              if (
                distance > policy.consistency.elbow_offset_difference_normalized
              )
                candidates.push(
                  ...candidate(
                    "consistency.elbow_drift",
                    "consistency",
                    "offset_differs_from_own_session_median",
                    "elbow_shoulder_offset_normalized",
                    distance,
                  ),
                );
            }
            offsets.push(current);
            if (offsets.length > policy.consistency.history_limit)
              offsets.shift();
          }
        }
        for (const item of candidates.filter(
          (item) => item.category === "consistency",
        ))
          observations.push({
            schema_version: "1.0.0",
            type: "RANGE_VARIATION_OBSERVED",
            timestamp_ms: timestamp,
            exercise: config.id,
            rule_id: item.rule_id,
            quality: snapshot.pose_quality,
            rep_index: null,
            metadata: {
              phase: snapshot.phase,
              feature: item.feature,
              observed_value: item.observed_value,
              reason: item.reason,
            },
          });
        cycle = null;
      }
      const consistency = candidates.filter(
        (item) => item.category === "consistency",
      );
      if (consistency.length) {
        pending = consistency;
        pendingUntil = timestamp + policy.consistency.observation_ttl_ms;
        pendingAfter = timestamp + policy.completed_rule.cooldown_ms;
      }
      if (snapshot.pose_quality !== "GOOD" || timestamp > pendingUntil)
        pending = [];
      for (const item of timestamp >= pendingAfter ? pending : [])
        if (!candidates.includes(item)) candidates.push(item);
      previous = structuredClone(snapshot);
      const decision = arbitrate(
        candidates,
        timestamp,
        snapshot.pose_quality,
        snapshot.phase,
      );
      if (decision.issued && decision.selected?.category === "consistency")
        pending = [];
      return { candidates, decision, observations };
    },
  };
}
