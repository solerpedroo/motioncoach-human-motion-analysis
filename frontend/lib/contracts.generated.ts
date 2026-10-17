/* Generated from shared/schemas/contracts.schema.json. Do not edit. */

export type Index = number;
export type X = number;
export type Y = number;
export type Z = number;
export type Visibility = number | null;
export type Presence = number | null;
export type PoseQuality = "GOOD" | "LIMITED" | "INSUFFICIENT";
export type LeftKneeAngleDeg = number | null;
export type RightKneeAngleDeg = number | null;
export type LeftHipAngleDeg = number | null;
export type RightHipAngleDeg = number | null;
export type LeftElbowAngleDeg = number | null;
export type RightElbowAngleDeg = number | null;
export type LeftShoulderAngleDeg = number | null;
export type RightShoulderAngleDeg = number | null;
export type TrunkTiltDeg = number | null;
export type ArmElevationDeg = number | null;
export type LegSpreadRatio = number | null;
export type Interpolated = boolean;
export type SchemaVersion = "1.0.0";
export type TimestampMs = number;
export type Model = "mediapipe-pose-landmarker";
export type ModelVersion = string | null;
export type ModelVariant = "lite" | "full" | "heavy";
export type PoseQuality1 = "GOOD" | "LIMITED" | "INSUFFICIENT";
/**
 * @maxItems 33
 */
export type Landmarks = Landmark[];
export type SchemaVersion1 = "1.0.0";
export type Type =
  | "CAMERA_PERMISSION_DENIED"
  | "POSE_LOST"
  | "POSE_RECOVERED"
  | "LOW_VISIBILITY"
  | "REP_STARTED"
  | "REP_COMPLETED"
  | "REP_INCOMPLETE"
  | "RANGE_VARIATION_OBSERVED"
  | "FEEDBACK_ISSUED"
  | "SESSION_PAUSED"
  | "SESSION_FINISHED";
export type TimestampMs1 = number;
export type Exercise = "squat" | "push_up" | "biceps_curl" | "jumping_jack";
export type RuleId = string;
export type Quality = "GOOD" | "LIMITED" | "INSUFFICIENT";
export type RepIndex = number | null;
export type Phase = string | null;
export type Feature = string | null;
export type ObservedValue = number | null;
export type MessageKey = string | null;
export type Reason = string | null;
export type SchemaVersion2 = "1.0.0";
export type Id = string;
export type Exercise1 = "squat" | "push_up" | "biceps_curl" | "jumping_jack";
export type Source = "webcam" | "upload";
export type StartedAt = string;
export type DurationMs = number;
export type CameraView = "side" | "front" | "diagonal" | "unknown";
export type SelectedSide = ("left" | "right" | "bilateral") | null;
export type CompletedRepetitions = number;
export type IncompleteRepetitions = number;
export type DiscardedRepetitions = number;
export type PoseCoverageRatio = number | null;
export type AlgorithmVersion = string;
export type ConfigurationVersion = string;
export type ConfigurationSha256 = string | null;
export type ModelVariant1 = "lite" | "full" | "heavy";
export type ModelVersion1 = string | null;
export type ModelAssetSha256 = string | null;
export type Status = "not_evaluated";
export type Reason1 = string;
export type Events = SessionEvent[];
export type SchemaVersion3 = "1.0.0";
export type Id1 = "squat" | "push_up" | "biceps_curl" | "jumping_jack";
export type Version = string;
export type DisplayName = string;
export type ValidationStatus = "unvalidated_seed";
export type RecommendedView = "side" | "front" | "either";
export type SideSelection = "best_visible" | "user_selected" | "bilateral";
/**
 * @minItems 1
 * @maxItems 33
 */
export type RequiredLandmarks = [number, ...number[]];
/**
 * @maxItems 33
 */
export type OptionalLandmarks = number[];
/**
 * @minItems 1
 */
export type Features = [FeatureDefinition, ...FeatureDefinition[]];
export type Id2 = string;
export type Kind = "angle_2d" | "ratio" | "offset";
/**
 * @minItems 2
 */
export type Landmarks1 = [number, number, ...number[]];
export type Role = "transition" | "observation";
/**
 * @minItems 1
 */
export type States = [string, ...string[]];
export type InitialState = string;
/**
 * @minItems 1
 */
export type Transitions = [TransitionDefinition, ...TransitionDefinition[]];
export type FromState = string;
export type ToState = string;
/**
 * @minItems 1
 */
export type Conditions = [TransitionCondition, ...TransitionCondition[]];
export type Feature1 = string;
export type Operator = "gte" | "lte";
export type Threshold = string;
export type Match = "all" | "any";
export type RequireDwell = boolean;
export type EmitEvent =
  | (
      | "CAMERA_PERMISSION_DENIED"
      | "POSE_LOST"
      | "POSE_RECOVERED"
      | "LOW_VISIBILITY"
      | "REP_STARTED"
      | "REP_COMPLETED"
      | "REP_INCOMPLETE"
      | "RANGE_VARIATION_OBSERVED"
      | "FEEDBACK_ISSUED"
      | "SESSION_PAUSED"
      | "SESSION_FINISHED"
    )
  | null;
/**
 * @minItems 1
 */
export type Thresholds = [DegreeThreshold | ScalarThreshold, ...(DegreeThreshold | ScalarThreshold)[]];
export type Name = string;
export type Unit = "degree";
export type Value = number;
export type Name1 = string;
export type Unit1 = "ratio" | "normalized" | "ms";
export type Value1 = number;
export type MinVisibility = number;
export type MaxGapMs = number;
export type MaxJumpNormalized = number;
export type Type1 = "ema";
export type Alpha = number;
export type MinStateMs = number;
export type MinCycleMs = number;
export type RuleId1 = string;
export type MessageKey1 = string;
export type Priority = number;
export type CooldownMs = number;
export type FeedbackRules = FeedbackRule[];

/**
 * Schema registry only; not an API request or response.
 */
export interface ContractCatalog {
  landmark: Landmark;
  pose_quality: PoseQuality;
  feature_set: FeatureSet;
  pose_frame: PoseFrame;
  session_event: SessionEvent;
  session_summary: SessionSummary;
  exercise_config: ExerciseConfig;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "Landmark".
 */
export interface Landmark {
  index: Index;
  x: X;
  y: Y;
  z: Z;
  visibility: Visibility;
  presence: Presence;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "FeatureSet".
 */
export interface FeatureSet {
  left_knee_angle_deg?: LeftKneeAngleDeg;
  right_knee_angle_deg?: RightKneeAngleDeg;
  left_hip_angle_deg?: LeftHipAngleDeg;
  right_hip_angle_deg?: RightHipAngleDeg;
  left_elbow_angle_deg?: LeftElbowAngleDeg;
  right_elbow_angle_deg?: RightElbowAngleDeg;
  left_shoulder_angle_deg?: LeftShoulderAngleDeg;
  right_shoulder_angle_deg?: RightShoulderAngleDeg;
  trunk_tilt_deg?: TrunkTiltDeg;
  arm_elevation_deg?: ArmElevationDeg;
  leg_spread_ratio?: LegSpreadRatio;
  interpolated?: Interpolated;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "PoseFrame".
 */
export interface PoseFrame {
  schema_version: SchemaVersion;
  timestamp_ms: TimestampMs;
  model: Model;
  model_version: ModelVersion;
  model_variant: ModelVariant;
  pose_quality: PoseQuality1;
  landmarks: Landmarks;
  features: FeatureSet;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "SessionEvent".
 */
export interface SessionEvent {
  schema_version: SchemaVersion1;
  type: Type;
  timestamp_ms: TimestampMs1;
  exercise: Exercise;
  rule_id: RuleId;
  quality: Quality;
  rep_index: RepIndex;
  metadata: EventMetadata;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "EventMetadata".
 */
export interface EventMetadata {
  phase?: Phase;
  feature?: Feature;
  observed_value?: ObservedValue;
  message_key?: MessageKey;
  reason?: Reason;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "SessionSummary".
 */
export interface SessionSummary {
  schema_version: SchemaVersion2;
  id: Id;
  exercise: Exercise1;
  source: Source;
  started_at: StartedAt;
  duration_ms: DurationMs;
  camera_view: CameraView;
  selected_side: SelectedSide;
  completed_repetitions: CompletedRepetitions;
  incomplete_repetitions: IncompleteRepetitions;
  discarded_repetitions: DiscardedRepetitions;
  pose_coverage_ratio: PoseCoverageRatio;
  algorithm_version: AlgorithmVersion;
  configuration_version: ConfigurationVersion;
  configuration_sha256: ConfigurationSha256;
  model_variant: ModelVariant1;
  model_version: ModelVersion1;
  model_asset_sha256: ModelAssetSha256;
  evaluation: Evaluation;
  events: Events;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "Evaluation".
 */
export interface Evaluation {
  status: Status;
  reason: Reason1;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "ExerciseConfig".
 */
export interface ExerciseConfig {
  schema_version: SchemaVersion3;
  id: Id1;
  version: Version;
  display_name: DisplayName;
  validation_status: ValidationStatus;
  recommended_view: RecommendedView;
  side_selection: SideSelection;
  required_landmarks: RequiredLandmarks;
  optional_landmarks: OptionalLandmarks;
  features: Features;
  states: States;
  initial_state: InitialState;
  transitions: Transitions;
  thresholds: Thresholds;
  quality: QualityConfig;
  smoothing: SmoothingConfig;
  min_state_ms: MinStateMs;
  min_cycle_ms: MinCycleMs;
  feedback_rules: FeedbackRules;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "FeatureDefinition".
 */
export interface FeatureDefinition {
  id: Id2;
  kind: Kind;
  landmarks: Landmarks1;
  role: Role;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "TransitionDefinition".
 */
export interface TransitionDefinition {
  from_state: FromState;
  to_state: ToState;
  conditions: Conditions;
  match: Match;
  require_dwell: RequireDwell;
  emit_event: EmitEvent;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "TransitionCondition".
 */
export interface TransitionCondition {
  feature: Feature1;
  operator: Operator;
  threshold: Threshold;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "DegreeThreshold".
 */
export interface DegreeThreshold {
  name: Name;
  unit: Unit;
  value: Value;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "ScalarThreshold".
 */
export interface ScalarThreshold {
  name: Name1;
  unit: Unit1;
  value: Value1;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "QualityConfig".
 */
export interface QualityConfig {
  min_visibility: MinVisibility;
  max_gap_ms: MaxGapMs;
  max_jump_normalized: MaxJumpNormalized;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "SmoothingConfig".
 */
export interface SmoothingConfig {
  type: Type1;
  alpha: Alpha;
}
/**
 * This interface was referenced by `ContractCatalog`'s JSON-Schema
 * via the `definition` "FeedbackRule".
 */
export interface FeedbackRule {
  rule_id: RuleId1;
  message_key: MessageKey1;
  priority: Priority;
  cooldown_ms: CooldownMs;
}
