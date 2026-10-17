import type { ExerciseConfig, FeatureSet } from "@/lib/contracts.generated";
import {
  createFeatureProcessor,
  type FeatureMetric,
} from "./feature-processor";
import { landmarkAngle2D } from "./geometry";
import type { Clock, PoseLandmarks } from "./types";

export function createExerciseFeatureProcessor(
  config: ExerciseConfig,
  cameraView: string,
  clock: Clock,
) {
  const snapshot = structuredClone(config);
  const visibility = snapshot.quality.min_visibility;
  const metricReaders: FeatureMetric[] = snapshot.features.map((definition) => {
    const indices = definition.landmarks;
    const read = (points: PoseLandmarks): number | null => {
      if (definition.kind === "angle_2d" && indices.length === 3)
        return landmarkAngle2D(
          points,
          [indices[0], indices[1], indices[2]],
          visibility,
        );
      if (definition.id === "arm_elevation_deg" && indices.length === 6) {
        const left = landmarkAngle2D(
          points,
          [indices[0], indices[1], indices[2]],
          visibility,
        );
        const right = landmarkAngle2D(
          points,
          [indices[3], indices[4], indices[5]],
          visibility,
        );
        return left === null || right === null ? null : Math.min(left, right);
      }
      if (definition.id === "leg_spread_ratio" && indices.length === 4) {
        if (cameraView !== "front") return null;
        const selected = indices.map((index) =>
          points.find((point) => point.index === index),
        );
        if (selected.some((point) => !point)) return null;
        const [leftAnkle, rightAnkle, leftHip, rightHip] = selected;
        if (!leftAnkle || !rightAnkle || !leftHip || !rightHip) return null;
        const span = Math.abs(leftHip.x - rightHip.x);
        const minimum = snapshot.thresholds.find(
          (threshold) => threshold.name === "min_hip_span_x",
        )?.value;
        if (minimum === undefined || span < minimum || span === 0) return null;
        return Math.abs(leftAnkle.x - rightAnkle.x) / span;
      }
      throw new Error(`Unsupported feature: ${definition.id}`);
    };
    return {
      id: definition.id as Exclude<keyof FeatureSet, "interpolated">,
      role: definition.role,
      landmarks: [...indices],
      kind: definition.kind === "ratio" ? "ratio" : "angle_2d",
      read,
    };
  });
  return createFeatureProcessor({
    config: snapshot,
    clock,
    requirements: {
      required: snapshot.required_landmarks,
      optional: snapshot.optional_landmarks,
    },
    metrics: metricReaders,
  });
}
