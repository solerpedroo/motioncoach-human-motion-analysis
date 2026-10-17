// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { en } from "@/messages/en";
import schema from "../../shared/schemas/contracts.schema.json";

const fixtureRoot = `${resolve(process.cwd(), "../shared/fixtures/contracts")}/`;
const valid = Object.fromEntries(
  readdirSync(`${fixtureRoot}valid`).map((name) => {
    const example = JSON.parse(
      readFileSync(`${fixtureRoot}valid/${name}`, "utf8"),
    );
    return [example.contract, example.data];
  }),
);
const invalid: {
  id: string;
  contract: string;
  path: (string | number)[];
  operation: string;
  value: unknown;
}[] = JSON.parse(readFileSync(`${fixtureRoot}invalid/cases.json`, "utf8"));
const ajv = new Ajv2020({ strict: true, strictNumbers: true });
addFormats(ajv);
// Pydantic's discriminator is only a codegen hint; oneOf enforces the union.
ajv.addKeyword({ keyword: "discriminator", valid: true });
ajv.addSchema(schema);
const validators = Object.fromEntries(
  Object.keys(valid).map((name) => [
    name,
    ajv.compile({
      $ref:
        name === "PoseQuality"
          ? `${schema.$id}#/properties/pose_quality`
          : `${schema.$id}#/$defs/${name}`,
    }),
  ]),
);

describe("normative shared contracts", () => {
  it("resolves fixture feedback messages in the canonical English catalog", () => {
    for (const rule of valid.ExerciseConfig.feedback_rules) {
      expect(Object.keys(en.feedback)).toContain(rule.message_key);
    }
  });
  for (const [name, data] of Object.entries(valid)) {
    it(`accepts ${name}`, () =>
      expect(
        validators[name](data),
        JSON.stringify(validators[name].errors),
      ).toBe(true));
  }
  for (const example of invalid) {
    it(`rejects ${example.id}`, () => {
      const data = structuredClone(valid[example.contract]);
      let parent = data;
      for (const part of example.path.slice(0, -1)) parent = parent[part];
      const key = example.path.at(-1) as string | number;
      if (example.operation === "remove") delete parent[key];
      else
        parent[key] =
          example.operation === "nonfinite"
            ? Number(example.value)
            : example.value;
      expect(validators[example.contract](data), example.id).toBe(false);
    });
  }
  it("preserves unavailable angles as null", () =>
    expect(valid.FeatureSet.trunk_tilt_deg).toBeNull());
});
