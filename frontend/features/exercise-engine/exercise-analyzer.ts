import type {
  ExerciseConfig,
  FeatureSet,
  PoseFrame,
} from "@/lib/contracts.generated";
import {
  type BodySide,
  type ExerciseId,
  getExerciseConfig,
  resolveSide,
} from "./exercise-config";
import { createExerciseFeatureProcessor } from "./exercise-features";
import { createFeatureAnalyzer, type FsmSnapshot } from "./exercise-fsm";
import { isUsableLandmark } from "./geometry";
import type { Clock, PoseLandmarks } from "./types";

export interface AnalyzerOptions {
  readonly camera_view: "side" | "front" | "diagonal" | "unknown";
  readonly selected_side?: BodySide;
  readonly mirrored?: boolean;
  readonly clock: Clock;
}
export interface AnalyzerSnapshot extends FsmSnapshot {
  readonly selected_side: BodySide | "bilateral" | null;
}

export function createExerciseAnalyzer(
  exercise: ExerciseId | ExerciseConfig,
  options: AnalyzerOptions,
) {
  const config =
    typeof exercise === "string"
      ? getExerciseConfig(exercise)
      : structuredClone(exercise);
  const sessionOptions = { ...options };
  if (
    config.side_selection === "user_selected" &&
    !["left", "right"].includes(sessionOptions.selected_side ?? "")
  )
    throw new Error("Select left or right before starting this exercise");
  let side: BodySide | "bilateral" | null =
    config.side_selection === "bilateral"
      ? "bilateral"
      : config.side_selection === "user_selected"
        ? (sessionOptions.selected_side ?? null)
        : null;
  let locked = side !== null;
  let effectiveConfig = config;
  const fsm = createFeatureAnalyzer(config, sessionOptions.clock);
  let processor: ReturnType<typeof createExerciseFeatureProcessor> | null =
    null;
  let lastTimestamp: number | null = null;
  let latestFeatures: FeatureSet = {};
  const canonicalFeatures = (features: FeatureSet): FeatureSet =>
    side === "right"
      ? Object.fromEntries(
          Object.entries(features).map(([key, value]) => [
            key.replace(/^right_/, "left_"),
            value,
          ]),
        )
      : features;
  const snapshot = (result: FsmSnapshot): AnalyzerSnapshot => ({
    ...result,
    features: { ...latestFeatures },
    selected_side: locked ? side : null,
  });
  const setSide = (nextSide: BodySide | "bilateral") => {
    side = nextSide;
    effectiveConfig =
      nextSide === "bilateral"
        ? structuredClone(config)
        : resolveSide(config, nextSide);
    processor = createExerciseFeatureProcessor(
      effectiveConfig,
      sessionOptions.camera_view,
      sessionOptions.clock,
    );
  };
  if (side) setSide(side);
  const bestSide = (points: PoseLandmarks): BodySide | null => {
    const score = (candidate: BodySide) => {
      const resolved = resolveSide(config, candidate);
      const selected = resolved.required_landmarks.map((index) =>
        points.filter((point) => point.index === index),
      );
      if (
        selected.some(
          (matches) =>
            matches.length !== 1 ||
            !isUsableLandmark(matches[0], config.quality.min_visibility),
        )
      )
        return null;
      return (
        selected.reduce(
          (sum, matches) => sum + (matches[0].visibility ?? 0),
          0,
        ) / selected.length
      );
    };
    const left = score("left"),
      right = score("right");
    return left === null && right === null
      ? null
      : right !== null && (left === null || right > left)
        ? "right"
        : "left";
  };
  return {
    snapshot: () => snapshot(fsm.snapshot()),
    reset() {
      side =
        config.side_selection === "bilateral"
          ? "bilateral"
          : config.side_selection === "user_selected"
            ? (sessionOptions.selected_side ?? null)
            : null;
      locked = side !== null;
      lastTimestamp = null;
      processor = null;
      fsm.reset();
      latestFeatures = {};
      if (side) setSide(side);
      return snapshot(fsm.snapshot());
    },
    pause(timestamp = sessionOptions.clock()) {
      const result = fsm.pause(timestamp);
      lastTimestamp = timestamp;
      return snapshot(result);
    },
    resume(timestamp = sessionOptions.clock()) {
      const result = fsm.resume(timestamp);
      lastTimestamp = timestamp;
      processor?.reset();
      return snapshot(result);
    },
    update(frame: Pick<PoseFrame, "landmarks" | "timestamp_ms">) {
      const time = frame.timestamp_ms;
      if (
        !Number.isFinite(time) ||
        time < 0 ||
        (lastTimestamp !== null && time <= lastTimestamp)
      ) {
        processor?.reset();
        latestFeatures = {};
        return snapshot(
          fsm.update({
            timestamp_ms: time,
            features: {},
            pose_quality: "INSUFFICIENT",
            continuity_broken: true,
          }),
        );
      }
      lastTimestamp = time;
      if (fsm.snapshot().phase === "PAUSED")
        return snapshot(
          fsm.update({
            timestamp_ms: time,
            features: {},
            pose_quality: "INSUFFICIENT",
          }),
        );
      let sideChanged = false;
      if (!locked) {
        const next = bestSide(frame.landmarks);
        if (next && next !== side) {
          sideChanged = side !== null;
          setSide(next);
        }
      }
      if (!processor)
        return snapshot(
          fsm.update({
            timestamp_ms: time,
            features: {},
            pose_quality: "INSUFFICIENT",
            reasons: [
              frame.landmarks.length === 0 ? "POSE_LOST" : "LOW_VISIBILITY",
            ],
          }),
        );
      const derived = processor.update(frame.landmarks, time);
      latestFeatures = derived.features;
      const viewAllowed =
        config.recommended_view === "either"
          ? ["front", "side"].includes(sessionOptions.camera_view)
          : config.recommended_view === sessionOptions.camera_view;
      const result = fsm.update({
        timestamp_ms: time,
        features: canonicalFeatures(derived.features),
        observed_features: canonicalFeatures(derived.observed_features),
        pose_quality: viewAllowed ? derived.pose_quality : "INSUFFICIENT",
        can_transition: viewAllowed && derived.can_transition,
        continuity_broken: derived.continuity_broken || sideChanged,
        reasons: viewAllowed ? derived.reasons : ["UNSUPPORTED_CAMERA_VIEW"],
      });
      if (
        !locked &&
        result.phase !== "NOT_READY" &&
        result.phase !== "UNCERTAIN"
      )
        locked = true;
      return snapshot(result);
    },
  };
}

export type ExerciseAnalyzer = ReturnType<typeof createExerciseAnalyzer>;
