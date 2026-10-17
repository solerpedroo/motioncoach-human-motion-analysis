import { createFeatureProcessor } from "./feature-processor";
import { landmarkAngle2D } from "./geometry";
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
  const metrics = structuredClone(options.metrics);
  const minVisibility = options.config.quality.min_visibility;
  const processor = createFeatureProcessor({
    ...options,
    metrics: metrics.map((metric) => ({
      ...metric,
      kind: "angle_2d" as const,
      read: (points: PoseLandmarks) =>
        landmarkAngle2D(points, metric.landmarks, minVisibility),
    })),
  });
  return {
    reset: processor.reset,
    update(points: PoseLandmarks, timestampMs?: number): KinematicsResult {
      const { observed_features: _, ...result } = processor.update(
        points,
        timestampMs,
      );
      return result;
    },
  };
}
