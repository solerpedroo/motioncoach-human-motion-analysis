import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { feedbackPolicy } from "@/features/exercise-engine/feedback";
import contracts from "../../../shared/schemas/contracts.schema.json";
import localSchema from "../../../shared/schemas/local-session.schema.json";
import type { LocalSession } from "./session-recorder";

const ajv = new Ajv2020({ strict: true, strictNumbers: true });
addFormats(ajv);
ajv.addKeyword({ keyword: "discriminator", valid: true });
ajv.addSchema(contracts);
const validate = ajv.compile<LocalSession>(localSchema);
export function parseLocalSession(value: unknown): LocalSession {
  if (!validate(value))
    throw new Error(
      "Stored session is invalid or uses an unsupported version.",
    );
  if (
    value.summary.events.length > feedbackPolicy.session.maximum_events ||
    value.metrics.active_duration_ms > value.summary.duration_ms ||
    Math.abs(
      value.metrics.active_duration_ms +
        value.metrics.paused_duration_ms -
        value.summary.duration_ms,
    ) > 0.001 ||
    value.summary.discarded_repetitions >
      value.summary.incomplete_repetitions ||
    value.summary.events.some(
      (event) =>
        event.timestamp_ms > value.summary.duration_ms ||
        event.exercise !== value.summary.exercise,
    )
  )
    throw new Error("Stored session has inconsistent timing or events.");
  return structuredClone(value);
}
