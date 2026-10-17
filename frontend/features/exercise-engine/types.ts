import type {
  ExerciseConfig,
  FeatureSet,
  Landmark,
  PoseQuality,
} from "@/lib/contracts.generated";

export type CommonEngineConfig = Pick<
  ExerciseConfig,
  | "schema_version"
  | "version"
  | "validation_status"
  | "quality"
  | "smoothing"
  | "min_state_ms"
  | "min_cycle_ms"
>;
export type QualityConfig = CommonEngineConfig["quality"];
export type Clock = () => number;
export type AngleFeatureName = Extract<keyof FeatureSet, `${string}_deg`>;

export interface LandmarkRequirements {
  readonly required: readonly number[];
  readonly optional: readonly number[];
}

export interface AngleMetric {
  readonly id: AngleFeatureName;
  readonly landmarks: readonly [number, number, number];
  readonly role: "transition" | "observation";
}

export type QualityReason =
  | "POSE_LOST"
  | "MISSING_REQUIRED_LANDMARK"
  | "MISSING_OPTIONAL_LANDMARK"
  | "LOW_VISIBILITY"
  | "INVALID_LANDMARK"
  | "DUPLICATE_LANDMARK"
  | "LANDMARK_JUMP";

export interface QualityResult {
  readonly pose_quality: PoseQuality;
  readonly can_transition: boolean;
  readonly reasons: readonly QualityReason[];
}

export interface KinematicsResult {
  readonly timestamp_ms: number | null;
  readonly pose_quality: PoseQuality;
  readonly features: FeatureSet;
  readonly can_transition: boolean;
  readonly continuity_broken: boolean;
  readonly reasons: readonly (
    | QualityReason
    | "INVALID_TIMESTAMP"
    | "NON_MONOTONIC_TIMESTAMP"
    | "LONG_GAP"
    | "DEGENERATE_TRANSITION_ANGLE"
    | "DEGENERATE_OBSERVATION_ANGLE"
  )[];
}

export type PoseLandmarks = readonly Landmark[];
