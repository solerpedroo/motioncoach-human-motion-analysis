import type { ExerciseConfig, FeatureSet } from "@/lib/contracts.generated";
import bicepsCurl from "../../../shared/exercise-configs/biceps_curl.json";
import jumpingJack from "../../../shared/exercise-configs/jumping_jack.json";
import pushUp from "../../../shared/exercise-configs/push_up.json";
import bindings from "../../../shared/exercise-configs/side-bindings.json";
import squat from "../../../shared/exercise-configs/squat.json";
import { validateQualityConfig, validateRequirements } from "./quality";

export type ExerciseId = ExerciseConfig["id"];
export type BodySide = "left" | "right";
export type NumericFeatureName = Exclude<keyof FeatureSet, "interpolated">;
const catalog = {
  squat,
  push_up: pushUp,
  biceps_curl: bicepsCurl,
  jumping_jack: jumpingJack,
};
const sideMap = new Map(
  bindings.left_to_right.map(([left, right]) => [left, right]),
);

export function resolveSide(
  config: ExerciseConfig,
  side: BodySide,
): ExerciseConfig {
  const resolved = structuredClone(config);
  if (side === "left" || config.side_selection === "bilateral") return resolved;
  const name = (value: string) => value.replace(/^left_/, "right_");
  resolved.required_landmarks = resolved.required_landmarks.map(
    (index) => sideMap.get(index) ?? index,
  ) as ExerciseConfig["required_landmarks"];
  resolved.optional_landmarks = resolved.optional_landmarks.map(
    (index) => sideMap.get(index) ?? index,
  );
  for (const metric of resolved.features) {
    metric.id = name(metric.id);
    metric.landmarks = metric.landmarks.map(
      (index) => sideMap.get(index) ?? index,
    ) as typeof metric.landmarks;
  }
  for (const transition of resolved.transitions)
    for (const condition of transition.conditions)
      condition.feature = name(condition.feature);
  return resolved;
}

export function validateExerciseConfig(config: ExerciseConfig): void {
  validateQualityConfig(config.quality);
  validateRequirements({
    required: config.required_landmarks,
    optional: config.optional_landmarks,
  });
  const states = new Set(config.states);
  const features = new Map(
    config.features.map((feature) => [feature.id, feature]),
  );
  const thresholds = new Map(
    config.thresholds.map((threshold) => [threshold.name, threshold]),
  );
  if (
    states.size !== config.states.length ||
    features.size !== config.features.length ||
    thresholds.size !== config.thresholds.length ||
    !["NOT_READY", "UNCERTAIN", "PAUSED"].every((state) => states.has(state)) ||
    config.initial_state !== "NOT_READY"
  )
    throw new Error("Invalid or duplicate configuration identities");
  if (
    !Number.isFinite(config.min_state_ms) ||
    config.min_state_ms <= 0 ||
    !Number.isFinite(config.min_cycle_ms) ||
    config.min_cycle_ms <= 0 ||
    config.smoothing.type !== "ema" ||
    !Number.isFinite(config.smoothing.alpha) ||
    config.smoothing.alpha <= 0 ||
    config.smoothing.alpha > 1
  )
    throw new Error("Invalid timing or smoothing settings");
  const allowed = new Set([
    ...config.required_landmarks,
    ...config.optional_landmarks,
  ]);
  for (const metric of config.features)
    if (metric.landmarks.some((index) => !allowed.has(index)))
      throw new Error("Feature references an undeclared landmark");
  for (const transition of config.transitions) {
    if (
      !states.has(transition.from_state) ||
      !states.has(transition.to_state) ||
      transition.conditions.length === 0
    )
      throw new Error("Transition references an unknown state");
    for (const condition of transition.conditions) {
      const metric = features.get(condition.feature);
      const threshold = thresholds.get(condition.threshold);
      if (
        metric?.role !== "transition" ||
        !threshold ||
        !Number.isFinite(threshold.value) ||
        threshold.value < 0 ||
        (metric.kind === "angle_2d" &&
          (threshold.unit !== "degree" || threshold.value > 180)) ||
        (metric.kind === "ratio" && threshold.unit !== "ratio")
      )
        throw new Error(
          "Transition references an invalid feature or threshold",
        );
    }
  }
  if (
    !config.transitions.some(
      (transition) => transition.emit_event === "REP_STARTED",
    ) ||
    !config.transitions.some(
      (transition) => transition.emit_event === "REP_COMPLETED",
    )
  )
    throw new Error("A repetition cycle is required");
  const home = config.transitions.find(
    (transition) => transition.from_state === "NOT_READY",
  );
  if (
    !home?.require_dwell ||
    !config.transitions.some(
      (transition) =>
        transition.from_state === "UNCERTAIN" &&
        transition.to_state === home.to_state &&
        transition.emit_event === null,
    )
  )
    throw new Error("Initial-state reacquisition is required");
  const started = config.transitions.find(
    (transition) => transition.emit_event === "REP_STARTED",
  );
  const completed = config.transitions.find(
    (transition) => transition.emit_event === "REP_COMPLETED",
  );
  const extreme = config.transitions.find(
    (transition) =>
      transition.from_state === started?.to_state &&
      transition.emit_event === null,
  );
  const leavingExtreme = config.transitions.find(
    (transition) => transition.from_state === extreme?.to_state,
  );
  const partial = config.transitions.find(
    (transition) =>
      transition.from_state === started?.to_state &&
      transition.emit_event === "REP_INCOMPLETE",
  );
  if (
    !started ||
    !completed ||
    !extreme ||
    !leavingExtreme ||
    !partial ||
    started.from_state !== home.to_state ||
    completed.to_state !== home.to_state ||
    leavingExtreme.to_state !== completed.from_state ||
    partial.to_state !== home.to_state ||
    !extreme.require_dwell ||
    !completed.require_dwell ||
    !partial.require_dwell ||
    home.emit_event !== null
  )
    throw new Error("A complete cycle with stable-state dwell is required");
  for (const transition of config.transitions) {
    if (transition.require_dwell && transition.match !== "all")
      throw new Error("Stable states require simultaneous conditions");
    if (
      transition.emit_event !== null &&
      !["REP_STARTED", "REP_COMPLETED", "REP_INCOMPLETE"].includes(
        transition.emit_event,
      )
    )
      throw new Error("Unsupported transition event");
  }
  for (const [entry, exit] of [
    [home, started],
    [extreme, leavingExtreme],
  ]) {
    for (const condition of entry.conditions) {
      const opposite = exit.conditions.find(
        (item) => item.feature === condition.feature,
      );
      const enterValue = thresholds.get(condition.threshold)?.value;
      const exitValue = opposite
        ? thresholds.get(opposite.threshold)?.value
        : undefined;
      if (
        !opposite ||
        opposite.operator === condition.operator ||
        enterValue === undefined ||
        exitValue === undefined ||
        (condition.operator === "gte"
          ? enterValue <= exitValue
          : enterValue >= exitValue)
      )
        throw new Error("Entry and exit thresholds must define hysteresis");
    }
  }
  if (config.id === "jumping_jack") {
    const minimum = thresholds.get("min_hip_span_x");
    if (
      minimum?.unit !== "normalized" ||
      !Number.isFinite(minimum.value) ||
      minimum.value <= 0
    )
      throw new Error("A positive horizontal hip span is required");
  }
}

export function getExerciseConfig(id: ExerciseId): ExerciseConfig {
  // Bundled JSON is checked against the normative schema by the regression suite.
  const config = structuredClone(catalog[id]) as ExerciseConfig;
  if (!config) throw new Error("Unsupported exercise");
  validateExerciseConfig(config);
  return config;
}
