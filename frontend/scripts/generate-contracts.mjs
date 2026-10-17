import { readFile, writeFile } from "node:fs/promises";
import { compile } from "json-schema-to-typescript";

const schema = JSON.parse(
  await readFile(
    new URL("../../shared/schemas/contracts.schema.json", import.meta.url),
    "utf8",
  ),
);
const destination = new URL("../lib/contracts.generated.ts", import.meta.url);
const output = await compile(schema, "ContractCatalog", {
  bannerComment:
    "/* Generated from shared/schemas/contracts.schema.json. Do not edit. */",
  additionalProperties: false,
  unreachableDefinitions: true,
});
if (process.argv.includes("--check")) {
  const existing = await readFile(destination, "utf8");
  if (existing !== output)
    throw new Error("Generated TypeScript differs from shared JSON Schema");
  console.log("TypeScript matches shared JSON Schema");
} else {
  await writeFile(destination, output);
  console.log("Generated contract types");
}
