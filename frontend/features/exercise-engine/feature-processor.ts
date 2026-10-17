import type { FeatureSet } from "@/lib/contracts.generated";
import { createEmaFilter } from "./ema";
import {
  evaluatePoseQuality,
  validateQualityConfig,
  validateRequirements,
} from "./quality";
import type {
  Clock,
  CommonEngineConfig,
  KinematicsResult,
  LandmarkRequirements,
  PoseLandmarks,
} from "./types";

export interface FeatureMetric {
  readonly id: Exclude<keyof FeatureSet, "interpolated">;
  readonly landmarks: readonly number[];
  readonly role: "transition" | "observation";
  readonly kind: "angle_2d" | "ratio";
  readonly read: (points: PoseLandmarks) => number | null;
}

export interface FeatureResult extends KinematicsResult {
  readonly observed_features: FeatureSet;
}

export interface FeatureProcessorOptions {
  readonly config: CommonEngineConfig;
  readonly requirements: LandmarkRequirements;
  readonly metrics: readonly FeatureMetric[];
  readonly clock: Clock;
}

export function createFeatureProcessor(options: FeatureProcessorOptions) {
  // Snapshot configuration: a caller cannot silently change a running session.
  const config = structuredClone(options.config);
  const requirements = structuredClone(options.requirements);
  const metrics = options.metrics.map((metric) => ({
    ...metric,
    landmarks: [...metric.landmarks],
  }));
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
    ): FeatureResult {
      const rejected = (
        reason: "INVALID_TIMESTAMP" | "NON_MONOTONIC_TIMESTAMP",
      ): FeatureResult => ({
        timestamp_ms:
          Number.isFinite(timestampMs) && timestampMs >= 0 ? timestampMs : null,
        pose_quality: "INSUFFICIENT",
        features: missingFeatures(),
        observed_features: missingFeatures(),
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
          observed_features: missingFeatures(),
          can_transition: false,
          continuity_broken: true,
          reasons: quality.reasons,
        };
      }
      const features = missingFeatures();
      const observedFeatures = missingFeatures();
      let degenerateTransition = false;
      let degenerateObservation = false;
      let unobservableRatio = false;
      for (const [index, metric] of metrics.entries()) {
        const value = metric.read(points);
        const raw =
          value !== null &&
          Number.isFinite(value) &&
          value >= 0 &&
          (metric.kind !== "angle_2d" || value <= 180)
            ? value
            : null;
        observedFeatures[metric.id] = raw;
        if (raw === null) {
          filters[index].reset();
          degenerateTransition ||= metric.role === "transition";
          unobservableRatio ||=
            metric.kind === "ratio" && metric.role === "transition";
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
        observed_features: observedFeatures,
        can_transition: !longGap && !degenerateTransition,
        continuity_broken: longGap || degenerateTransition,
        reasons: [
          ...quality.reasons,
          ...(longGap ? ["LONG_GAP" as const] : []),
          ...(degenerateTransition
            ? [
                unobservableRatio
                  ? ("UNOBSERVABLE_TRANSITION_FEATURE" as const)
                  : ("DEGENERATE_TRANSITION_ANGLE" as const),
              ]
            : []),
          ...(degenerateObservation
            ? ["DEGENERATE_OBSERVATION_ANGLE" as const]
            : []),
        ],
      };
    },
  };
}
