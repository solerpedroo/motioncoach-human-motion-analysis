"""Pydantic adapters; schema equivalence is checked against shared/schemas."""

from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

SchemaVersion = Literal["1.0.0"]
ExerciseId = Literal["squat", "push_up", "biceps_curl", "jumping_jack"]
PoseQuality = Literal["GOOD", "LIMITED", "INSUFFICIENT"]
ModelVariant = Literal["lite", "full", "heavy"]
CameraView = Literal["side", "front", "diagonal", "unknown"]
Side = Literal["left", "right", "bilateral"]
NonNegative = Annotated[float, Field(ge=0)]
Count = Annotated[int, Field(ge=0)]
Ratio = Annotated[float, Field(ge=0, le=1)]
Angle = Annotated[float, Field(ge=0, le=180)]
LandmarkIndex = Annotated[int, Field(ge=0, le=32)]
Identifier = Annotated[str, Field(min_length=1, max_length=120)]
Hash = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Landmark(Contract):
    index: LandmarkIndex
    x: Ratio
    y: Ratio
    z: float
    visibility: Ratio | None
    presence: Ratio | None


class FeatureSet(Contract):
    left_knee_angle_deg: Angle | None = None
    right_knee_angle_deg: Angle | None = None
    left_hip_angle_deg: Angle | None = None
    right_hip_angle_deg: Angle | None = None
    left_elbow_angle_deg: Angle | None = None
    right_elbow_angle_deg: Angle | None = None
    left_shoulder_angle_deg: Angle | None = None
    right_shoulder_angle_deg: Angle | None = None
    trunk_tilt_deg: Angle | None = None
    arm_elevation_deg: Angle | None = None
    leg_spread_ratio: NonNegative | None = None
    interpolated: bool = False


class PoseFrame(Contract):
    schema_version: SchemaVersion
    timestamp_ms: NonNegative
    model: Literal["mediapipe-pose-landmarker"]
    model_version: Identifier | None
    model_variant: ModelVariant
    pose_quality: PoseQuality
    landmarks: Annotated[list[Landmark], Field(max_length=33)]
    features: FeatureSet


EventType = Literal[
    "CAMERA_PERMISSION_DENIED",
    "POSE_LOST",
    "POSE_RECOVERED",
    "LOW_VISIBILITY",
    "REP_STARTED",
    "REP_COMPLETED",
    "REP_INCOMPLETE",
    "RANGE_VARIATION_OBSERVED",
    "FEEDBACK_ISSUED",
    "SESSION_PAUSED",
    "SESSION_FINISHED",
]


class EventMetadata(Contract):
    phase: Identifier | None = None
    feature: Identifier | None = None
    observed_value: float | None = None
    message_key: Identifier | None = None
    reason: Annotated[str, Field(max_length=500)] | None = None


class SessionEvent(Contract):
    schema_version: SchemaVersion
    type: EventType
    timestamp_ms: NonNegative
    exercise: ExerciseId
    rule_id: Identifier
    quality: PoseQuality
    rep_index: Annotated[int, Field(ge=1)] | None
    metadata: EventMetadata


class Evaluation(Contract):
    status: Literal["not_evaluated"]
    reason: Annotated[str, Field(min_length=1, max_length=500)]


class SessionSummary(Contract):
    schema_version: SchemaVersion
    id: Identifier
    exercise: ExerciseId
    source: Literal["webcam", "upload"]
    started_at: AwareDatetime
    duration_ms: NonNegative
    camera_view: CameraView
    selected_side: Side | None
    completed_repetitions: Count
    incomplete_repetitions: Count
    discarded_repetitions: Count
    pose_coverage_ratio: Ratio | None
    algorithm_version: Identifier
    configuration_version: Identifier
    configuration_sha256: Hash | None
    model_variant: ModelVariant
    model_version: Identifier | None
    model_asset_sha256: Hash | None
    evaluation: Evaluation
    events: list[SessionEvent]


class FeatureDefinition(Contract):
    id: Identifier
    kind: Literal["angle_2d", "ratio", "offset"]
    landmarks: Annotated[list[LandmarkIndex], Field(min_length=2)]
    role: Literal["transition", "observation"]


class DegreeThreshold(Contract):
    name: Identifier
    unit: Literal["degree"]
    value: Angle


class ScalarThreshold(Contract):
    name: Identifier
    unit: Literal["ratio", "normalized", "ms"]
    value: NonNegative


class QualityConfig(Contract):
    min_visibility: Ratio
    max_gap_ms: Annotated[float, Field(gt=0)]
    max_jump_normalized: Annotated[float, Field(gt=0)]


class SmoothingConfig(Contract):
    type: Literal["ema"]
    alpha: Annotated[float, Field(gt=0, le=1)]


class FeedbackRule(Contract):
    rule_id: Identifier
    message_key: Identifier
    priority: Count
    cooldown_ms: NonNegative


class TransitionCondition(Contract):
    feature: Identifier
    operator: Literal["gte", "lte"]
    threshold: Identifier


class TransitionDefinition(Contract):
    from_state: Identifier
    to_state: Identifier
    conditions: Annotated[list[TransitionCondition], Field(min_length=1)]
    match: Literal["all", "any"]
    require_dwell: bool
    emit_event: EventType | None


class ExerciseConfig(Contract):
    schema_version: SchemaVersion
    id: ExerciseId
    version: Identifier
    display_name: Identifier
    validation_status: Literal["unvalidated_seed"]
    recommended_view: Literal["side", "front", "either"]
    side_selection: Literal["best_visible", "user_selected", "bilateral"]
    required_landmarks: Annotated[list[LandmarkIndex], Field(min_length=1, max_length=33)]
    optional_landmarks: Annotated[list[LandmarkIndex], Field(max_length=33)]
    features: Annotated[list[FeatureDefinition], Field(min_length=1)]
    states: Annotated[list[Identifier], Field(min_length=1)]
    initial_state: Identifier
    transitions: Annotated[list[TransitionDefinition], Field(min_length=1)]
    thresholds: Annotated[
        list[Annotated[DegreeThreshold | ScalarThreshold, Field(discriminator="unit")]],
        Field(min_length=1),
    ]
    quality: QualityConfig
    smoothing: SmoothingConfig
    min_state_ms: Annotated[float, Field(gt=0)]
    min_cycle_ms: Annotated[float, Field(gt=0)]
    feedback_rules: list[FeedbackRule]


class ContractCatalog(Contract):
    """Schema registry only; not an API request or response."""

    landmark: Landmark
    pose_quality: PoseQuality
    feature_set: FeatureSet
    pose_frame: PoseFrame
    session_event: SessionEvent
    session_summary: SessionSummary
    exercise_config: ExerciseConfig
