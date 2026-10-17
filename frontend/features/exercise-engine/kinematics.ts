import type { FeatureSet } from "@/lib/contracts.generated";
import { createEmaFilter } from "./ema";
import { landmarkAngle2D } from "./geometry";
import {
  evaluatePoseQuality,
  validateQualityConfig,
  validateRequirements,
} from "./quality";
import type {
  AngleMetric,
  Clock,
  CommonEngineConfig,
  KinematicsResult,
  LandmarkRequirements,
  PoseLandmarks,
} from "./types";

export interface KinematicsOptions {
  readonly config: CommonEngineConfig;
  readonly requirements: LandmarkRequirements;
  readonly metrics: readonly AngleMetric[];
  readonly clock: Clock;
}

export function createKinematicsProcessor(options: KinematicsOptions) {
  // Snapshot configuration: a caller cannot silently change a running session.
  const config = structuredClone(options.config);
  const requirements = structuredClone(options.requirements);
  const metrics = structuredClone(options.metrics);
  validateQualityConfig(config.quality);
  validateRequirements(requirements);
  if (config.smoothing.type !== "ema")
    throw new RangeError("Only ema smoothing is supported");
  const configuredIndices = new Set([
    ...requirements.required,
    ...requirements.optional,
  ]);
  const requiredIndices = new Set(requirements.required);
  if (
    metrics.length === 0 ||
    new Set(metrics.map((metric) => metric.id)).size !== metrics.length ||
    !metrics.some((metric) => metric.role === "transition")
  )
    throw new RangeError(
      "Unique metrics with at least one transition metric are required",
    );
  for (const metric of metrics) {
    if (
      metric.landmarks.some((index) => !configuredIndices.has(index)) ||
      (metric.role === "transition" &&
        metric.landmarks.some((index) => !requiredIndices.has(index)))
    )
      throw new RangeError(
        "Transition metric landmarks must be required; observation landmarks must be declared",
      );
  }
  const filters = metrics.map(() =>
    createEmaFilter({
      alpha: config.smoothing.alpha,
      max_gap_ms: config.quality.max_gap_ms,
    }),
  );
  let lastTimestamp: number | null = null;
  let previous: PoseLandmarks | undefined;
  const clearObservations = () => {
    previous = undefined;
    for (const filter of filters) filter.reset();
  };
  const missingFeatures = (): FeatureSet =>
    Object.assign(
      { interpolated: false },
      Object.fromEntries(metrics.map((metric) => [metric.id, null])),
    );
  return {
    reset() {
      lastTimestamp = null;
      clearObservations();
    },
    update(
      points: PoseLandmarks,
      timestampMs = options.clock(),
    ): KinematicsResult {
      const rejected = (
        reason: "INVALID_TIMESTAMP" | "NON_MONOTONIC_TIMESTAMP",
      ): KinematicsResult => ({
        timestamp_ms:
          Number.isFinite(timestampMs) && timestampMs >= 0 ? timestampMs : null,
        pose_quality: "INSUFFICIENT",
        features: missingFeatures(),
        can_transition: false,
        continuity_broken: true,
        reasons: [reason],
      });
      if (!Number.isFinite(timestampMs) || timestampMs < 0)
        return rejected("INVALID_TIMESTAMP");
      if (lastTimestamp !== null && timestampMs <= lastTimestamp)
        return rejected("NON_MONOTONIC_TIMESTAMP");
      const longGap =
        lastTimestamp !== null &&
        timestampMs - lastTimestamp > config.quality.max_gap_ms;
      lastTimestamp = timestampMs;
      if (longGap) clearObservations();
      const quality = evaluatePoseQuality(
        points,
        requirements,
        config.quality,
        previous,
      );
      if (!quality.can_transition) {
        clearObservations();
        return {
          timestamp_ms: timestampMs,
          pose_quality: quality.pose_quality,
          features: missingFeatures(),
          can_transition: false,
          continuity_broken: true,
          reasons: quality.reasons,
        };
      }
      const features = missingFeatures();
      let degenerateTransition = false;
      let degenerateObservation = false;
      for (const [index, metric] of metrics.entries()) {
        const raw = landmarkAngle2D(
          points,
          metric.landmarks,
          config.quality.min_visibility,
        );
        if (raw === null) {
          filters[index].reset();
          degenerateTransition ||= metric.role === "transition";
          degenerateObservation ||= metric.role === "observation";
        } else {
          features[metric.id] = filters[index].update(raw, timestampMs).value;
        }
      }
      if (degenerateTransition) clearObservations();
      else previous = points.map((point) => ({ ...point }));
      return {
        timestamp_ms: timestampMs,
        pose_quality: degenerateTransition
          ? "INSUFFICIENT"
          : degenerateObservation
            ? "LIMITED"
            : quality.pose_quality,
        features,
        can_transition: !longGap && !degenerateTransition,
        continuity_broken: longGap || degenerateTransition,
        reasons: [
          ...quality.reasons,
          ...(longGap ? ["LONG_GAP" as const] : []),
          ...(degenerateTransition
            ? ["DEGENERATE_TRANSITION_ANGLE" as const]
            : []),
          ...(degenerateObservation
            ? ["DEGENERATE_OBSERVATION_ANGLE" as const]
            : []),
        ],
      };
    },
  };
}
