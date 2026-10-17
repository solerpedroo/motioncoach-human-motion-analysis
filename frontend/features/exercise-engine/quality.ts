import { isUsableLandmark } from "./geometry";
import type {
  LandmarkRequirements,
  PoseLandmarks,
  QualityConfig,
  QualityReason,
  QualityResult,
} from "./types";

export function validateQualityConfig(config: QualityConfig) {
  if (
    !Number.isFinite(config.min_visibility) ||
    config.min_visibility < 0 ||
    config.min_visibility > 1
  )
    throw new RangeError("min_visibility must be in [0, 1]");
  if (!Number.isFinite(config.max_gap_ms) || config.max_gap_ms <= 0)
    throw new RangeError("max_gap_ms must be positive");
  if (
    !Number.isFinite(config.max_jump_normalized) ||
    config.max_jump_normalized <= 0
  )
    throw new RangeError("max_jump_normalized must be positive");
}

export function validateRequirements(requirements: LandmarkRequirements) {
  const indices = [...requirements.required, ...requirements.optional];
  if (
    requirements.required.length === 0 ||
    new Set(indices).size !== indices.length ||
    indices.some((index) => !Number.isInteger(index) || index < 0 || index > 32)
  )
    throw new RangeError(
      "Landmark requirements must be nonempty, unique and in [0, 32]",
    );
}

export function evaluatePoseQuality(
  points: PoseLandmarks,
  requirements: LandmarkRequirements,
  config: QualityConfig,
  previous?: PoseLandmarks,
): QualityResult {
  validateQualityConfig(config);
  validateRequirements(requirements);
  const reasons = new Set<QualityReason>();
  let insufficient = false;
  if (points.length === 0)
    return {
      pose_quality: "INSUFFICIENT",
      can_transition: false,
      reasons: ["POSE_LOST"],
    };
  if (new Set(points.map((point) => point.index)).size !== points.length)
    return {
      pose_quality: "INSUFFICIENT",
      can_transition: false,
      reasons: ["DUPLICATE_LANDMARK"],
    };
  const byIndex = new Map(points.map((point) => [point.index, point]));
  const previousByIndex = new Map(
    previous?.map((point) => [point.index, point]),
  );
  for (const index of [...requirements.required, ...requirements.optional]) {
    const required = requirements.required.includes(index);
    const point = byIndex.get(index);
    if (!point || !isUsableLandmark(point, config.min_visibility)) {
      insufficient ||= required;
      reasons.add(
        required ? "MISSING_REQUIRED_LANDMARK" : "MISSING_OPTIONAL_LANDMARK",
      );
      if (point)
        reasons.add(
          point.visibility === null ||
            (Number.isFinite(point.visibility) &&
              point.visibility < config.min_visibility)
            ? "LOW_VISIBILITY"
            : "INVALID_LANDMARK",
        );
      continue;
    }
    const old = previousByIndex.get(index);
    if (
      old &&
      isUsableLandmark(old, config.min_visibility) &&
      Math.hypot(point.x - old.x, point.y - old.y) > config.max_jump_normalized
    ) {
      reasons.add("LANDMARK_JUMP");
      insufficient = true;
    }
  }
  return {
    pose_quality: insufficient
      ? "INSUFFICIENT"
      : reasons.size
        ? "LIMITED"
        : "GOOD",
    can_transition: !insufficient,
    reasons: [...reasons],
  };
}
