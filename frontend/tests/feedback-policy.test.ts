// @vitest-environment node
import Ajv2020 from "ajv/dist/2020";
import { expect, it } from "vitest";
import { getExerciseConfig } from "@/features/exercise-engine/exercise-config";
import { en } from "@/messages/en";
import policy from "../../shared/exercise-configs/feedback.json";
import schema from "../../shared/exercise-configs/feedback.schema.json";

it("validates the shared feedback policy and all configured English message keys", () => {
  const validate = new Ajv2020({ strict: true }).compile(schema);
  expect(validate(policy), JSON.stringify(validate.errors)).toBe(true);
  expect(policy.consistency.history_limit).toBeGreaterThanOrEqual(
    policy.consistency.minimum_baseline_repetitions,
  );
  expect(policy.voice.window_ms).toBeGreaterThan(
    policy.voice.minimum_interval_ms,
  );
  expect(policy.consistency.observation_ttl_ms).toBeGreaterThan(
    policy.completed_rule.cooldown_ms,
  );
  for (const id of ["squat", "push_up", "biceps_curl", "jumping_jack"] as const)
    for (const rule of getExerciseConfig(id).feedback_rules)
      expect(Object.keys(en.feedback)).toContain(rule.message_key);
  expect(Object.keys(en.feedback)).toContain(policy.completed_rule.message_key);
});
it("rejects calibrated status, missing fields, invalid thresholds and weaker sample guards", () => {
  const validate = new Ajv2020({ strict: true }).compile(schema);
  for (const bad of [
    { ...policy, validation_status: "validated" },
    { ...policy, extra: "unknown" },
    {
      ...policy,
      consistency: { ...policy.consistency, minimum_baseline_repetitions: 2 },
    },
    {
      ...policy,
      consistency: { ...policy.consistency, smaller_range_ratio: 2 },
    },
    { ...policy, session: { maximum_events: 5001 } },
  ])
    expect(validate(bad)).toBe(false);
});
