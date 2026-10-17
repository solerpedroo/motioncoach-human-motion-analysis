import type { AnalyzerSnapshot } from "@/features/exercise-engine/exercise-analyzer";
import { getExerciseConfig } from "@/features/exercise-engine/exercise-config";
import { feedbackPolicy } from "@/features/exercise-engine/feedback";
import model from "@/features/pose-engine/model-manifest.json";
import type {
  FeatureSet,
  SessionEvent,
  SessionSummary,
} from "@/lib/contracts.generated";
export interface LocalSession {
  storage_version: 1;
  summary: SessionSummary;
  final_phase: string;
  metrics: {
    active_duration_ms: number;
    paused_duration_ms: number;
    repetitions_per_minute: number | null;
    mean_repetition_duration_ms: number | null;
    mean_observed_range_deg: number | null;
    observed_range_feature: string | null;
    events_omitted: number;
  };
}
export interface SessionIdentity {
  id: string;
  exercise: SessionSummary["exercise"];
  camera_view: SessionSummary["camera_view"];
  started_at: string;
  origin_ms: number;
}
export function createSessionRecorder(inputIdentity: SessionIdentity) {
  const identity = { ...inputIdentity };
  if (!Number.isFinite(identity.origin_ms) || identity.origin_ms < 0)
    throw new RangeError("Session origin must be finite and nonnegative");
  const config = getExerciseConfig(identity.exercise);
  const events: SessionEvent[] = [];
  let discarded = 0;
  let lastObservedPhase = "NOT_READY";
  let omitted = 0,
    lastTime = identity.origin_ms,
    pausedAt: number | null = null,
    pausedMs = 0,
    coveredMs = 0;
  let previous: { time: number; usable: boolean } | null = null;
  let latest: AnalyzerSnapshot | null = null;
  let cycleStart: number | null = null,
    cycleMin = Infinity,
    cycleMax = -Infinity,
    cycleGood = true;
  let repDurationSum = 0,
    measuredCycles = 0,
    rangeSum = 0,
    measuredRanges = 0;
  let lastRangeFeature: string | null = null;
  let ended: LocalSession | null = null;
  const relative = (timestamp: number) => timestamp - identity.origin_ms;
  const add = (event: SessionEvent) => {
    events.push({
      ...structuredClone(event),
      timestamp_ms: Math.max(0, relative(event.timestamp_ms)),
    });
    if (events.length > feedbackPolicy.session.maximum_events) {
      events.shift();
      omitted++;
    }
  };
  const accept = (timestamp: number) => {
    if (
      !Number.isFinite(timestamp) ||
      timestamp < lastTime ||
      timestamp < identity.origin_ms
    )
      throw new RangeError("Session time must be finite and nondecreasing");
    lastTime = timestamp;
  };
  const elapsedActive = (timestamp: number) =>
    relative(timestamp) -
    pausedMs -
    (pausedAt === null ? 0 : timestamp - pausedAt);
  const usable = (snapshot: AnalyzerSnapshot) =>
    snapshot.pose_quality !== "INSUFFICIENT" &&
    snapshot.features.interpolated !== true &&
    config.features
      .filter((feature) => feature.role === "transition")
      .every((feature) => {
        const key = (
          snapshot.selected_side === "right"
            ? feature.id.replace(/^left_/, "right_")
            : feature.id
        ) as keyof FeatureSet;
        return (
          typeof snapshot.features[key] === "number" &&
          Number.isFinite(snapshot.features[key])
        );
      });
  const consume = (
    snapshot: AnalyzerSnapshot,
    timestamp: number,
    extraEvents: readonly SessionEvent[] = [],
    sample = true,
  ) => {
    if (ended) return;
    accept(timestamp);
    latest = structuredClone(snapshot);
    if (snapshot.phase !== "PAUSED") lastObservedPhase = snapshot.phase;
    const valid = usable(snapshot);
    if (
      sample &&
      pausedAt === null &&
      previous &&
      valid &&
      previous.usable &&
      timestamp - previous.time <= config.quality.max_gap_ms
    )
      coveredMs += timestamp - previous.time;
    previous =
      sample && pausedAt === null ? { time: timestamp, usable: valid } : null;
    for (const event of snapshot.events) {
      if (event.type === "REP_STARTED") {
        cycleStart = event.timestamp_ms;
        cycleMin = Infinity;
        cycleMax = -Infinity;
        cycleGood = true;
      }
      if (
        event.type === "REP_INCOMPLETE" &&
        /insufficient|visibility|pose_lost|missing|landmark|long_gap|non_monotonic|interpolat|degenerate|unobservable/i.test(
          event.metadata.reason ?? "",
        )
      )
        discarded++;
      add(event);
    }
    if (cycleStart !== null) {
      cycleGood &&=
        snapshot.pose_quality === "GOOD" &&
        snapshot.features.interpolated !== true;
      const feature = config.features.find(
        (item) => item.role === "transition" && item.kind === "angle_2d",
      );
      const key = feature
        ? ((snapshot.selected_side === "right"
            ? feature.id.replace(/^left_/, "right_")
            : feature.id) as keyof FeatureSet)
        : null;
      const value = key ? snapshot.features[key] : null;
      if (typeof value === "number" && Number.isFinite(value)) {
        cycleMin = Math.min(cycleMin, value);
        cycleMax = Math.max(cycleMax, value);
        lastRangeFeature = key;
      } else cycleGood = false;
    }
    for (const event of snapshot.events) {
      if (event.type === "REP_COMPLETED" && cycleStart !== null) {
        repDurationSum += event.timestamp_ms - cycleStart;
        measuredCycles++;
        if (
          cycleGood &&
          Number.isFinite(cycleMin) &&
          Number.isFinite(cycleMax)
        ) {
          rangeSum += cycleMax - cycleMin;
          measuredRanges++;
        }
        cycleStart = null;
      } else if (event.type === "REP_INCOMPLETE") cycleStart = null;
    }
    for (const event of extraEvents) add(event);
  };
  return {
    consume,
    pause(snapshot: AnalyzerSnapshot, timestamp: number) {
      if (ended || pausedAt !== null) return;
      consume(snapshot, timestamp, [], false);
      pausedAt = timestamp;
      previous = null;
      cycleStart = null;
    },
    resume(snapshot: AnalyzerSnapshot, timestamp: number) {
      if (ended || pausedAt === null) return;
      accept(timestamp);
      pausedMs += timestamp - pausedAt;
      pausedAt = null;
      previous = null;
      latest = structuredClone(snapshot);
    },
    activeDuration(timestamp: number) {
      return Math.max(0, elapsedActive(Math.max(lastTime, timestamp)));
    },
    finish(timestamp: number, reason: string): LocalSession {
      if (ended) return structuredClone(ended);
      accept(timestamp);
      const finalPhase = lastObservedPhase;
      add({
        schema_version: "1.0.0",
        type: "SESSION_FINISHED",
        timestamp_ms: timestamp,
        exercise: identity.exercise,
        rule_id: "session.finished",
        quality: latest?.pose_quality ?? "INSUFFICIENT",
        rep_index: null,
        metadata: { phase: finalPhase, reason },
      });
      const active = elapsedActive(timestamp),
        paused = relative(timestamp) - active;
      // Discarded means an interrupted cycle explicitly attributed to missing/invalid data.
      // The total is accumulated separately, including events that leave the bounded history.
      ended = {
        storage_version: 1,
        summary: {
          schema_version: "1.0.0",
          id: identity.id,
          exercise: identity.exercise,
          source: "webcam",
          started_at: identity.started_at,
          duration_ms: relative(timestamp),
          camera_view: identity.camera_view,
          selected_side: latest?.selected_side ?? null,
          completed_repetitions: latest?.completed_repetitions ?? 0,
          incomplete_repetitions: latest?.incomplete_repetitions ?? 0,
          discarded_repetitions: discarded,
          pose_coverage_ratio:
            active > 0 ? Math.min(1, coveredMs / active) : null,
          algorithm_version: "0.4.0",
          configuration_version: `${config.version}+feedback.${feedbackPolicy.version}`,
          configuration_sha256: null,
          model_variant: model.model_variant as "lite",
          model_version: model.model_version,
          model_asset_sha256: model.sha256,
          evaluation: {
            status: "not_evaluated",
            reason:
              "No annotated human reference; development thresholds are unvalidated seeds.",
          },
          events: structuredClone(events),
        },
        final_phase: finalPhase,
        metrics: {
          active_duration_ms: active,
          paused_duration_ms: paused,
          repetitions_per_minute:
            active > 0
              ? ((latest?.completed_repetitions ?? 0) * 60000) / active
              : null,
          mean_repetition_duration_ms: measuredCycles
            ? repDurationSum / measuredCycles
            : null,
          mean_observed_range_deg: measuredRanges
            ? rangeSum / measuredRanges
            : null,
          observed_range_feature: measuredRanges ? lastRangeFeature : null,
          events_omitted: omitted,
        },
      };
      return structuredClone(ended);
    },
  };
}
