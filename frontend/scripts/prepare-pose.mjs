import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("features/pose-engine/model-manifest.json", root)),
);
const sdk = JSON.parse(
  await readFile(
    new URL("node_modules/@mediapipe/tasks-vision/package.json", root),
  ),
);
if (sdk.version !== manifest.sdk_version)
  throw new Error("Pose SDK version mismatch");
const target = new URL("public/pose/", root);
await mkdir(target, { recursive: true });
const file = new URL("pose_landmarker_lite.task", target);
let model;
try {
  model = await readFile(file);
} catch {
  const response = await fetch(manifest.url);
  if (!response.ok)
    throw new Error(`Model download failed: ${response.status}`);
  model = Buffer.from(await response.arrayBuffer());
}
if (createHash("sha256").update(model).digest("hex") !== manifest.sha256)
  throw new Error("Model SHA-256 mismatch; remove local asset and retry");
await writeFile(file, model);
await cp(
  new URL("node_modules/@mediapipe/tasks-vision/wasm/", root),
  new URL("wasm/", target),
  { recursive: true },
);
console.log(
  `Prepared Pose Landmarker Lite ${manifest.model_version}; SHA-256 verified; SDK ${sdk.version}.`,
);
