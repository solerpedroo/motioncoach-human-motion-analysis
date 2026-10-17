import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontend = fileURLToPath(new URL("../", import.meta.url));
const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../../shared/fixtures/${name}`, import.meta.url),
      "utf8",
    ),
  );
const server = await createServer({
  root: frontend,
  configFile: false,
  resolve: { alias: { "@": frontend } },
  server: { middlewareMode: true, hmr: false },
});
try {
  const module = (name) =>
    server.ssrLoadModule(`/features/exercise-engine/${name}.ts`);
  const { angle2D } = await module("geometry");
  const { createEmaFilter } = await module("ema");
  const { evaluatePoseQuality } = await module("quality");
  const { createKinematicsProcessor } = await module("kinematics");
  const { getExerciseConfig } = await module("exercise-config");
  const { createFeatureAnalyzer } = await module("exercise-fsm");
  const { createExerciseAnalyzer } = await module("exercise-analyzer");
  const { createFeedbackArbiter, createFeedbackEngine } =
    await module("feedback");
  const common = JSON.parse(
    readFileSync(
      new URL("../../shared/exercise-configs/common.json", import.meta.url),
    ),
  );
  const trace = {
    geometry: read("kinematics/geometry.json").cases.map((c) =>
      angle2D(...c.points),
    ),
  };
  trace.ema = read("kinematics/ema.json").cases.map((c) => {
    const filter = createEmaFilter({
      alpha: common.smoothing.alpha,
      max_gap_ms: common.quality.max_gap_ms,
    });
    return c.samples.map((s) => filter.update(s.value, s.timestamp_ms));
  });
  const quality = read("kinematics/quality.json");
  trace.quality = quality.cases.map((c) =>
    evaluatePoseQuality(
      c.landmarks,
      quality.requirements,
      common.quality,
      c.previous,
    ),
  );
  const pipeline = read("kinematics/pipeline.json");
  trace.pipeline = pipeline.cases.map((c) => {
    const engine = createKinematicsProcessor({
      config: common,
      requirements: pipeline.requirements,
      metrics: pipeline.metrics,
      clock: () => 0,
    });
    return c.samples.map((s) => engine.update(s.landmarks, s.timestamp_ms));
  });
  trace.features = read("repetitions/features.json").cases.map((c) => {
    const engine = createFeatureAnalyzer(
      getExerciseConfig(c.exercise),
      () => 0,
    );
    return c.samples.map((s) =>
      s.action ? engine[s.action](s.timestamp_ms) : engine.update(s),
    );
  });
  trace.landmarks = [];
  for (const c of read("repetitions/landmarks.json").cases)
    for (const mirrored of [false, true]) {
      const engine = createExerciseAnalyzer(c.exercise, {
        camera_view: c.camera_view,
        selected_side: c.selected_side ?? undefined,
        mirrored,
        clock: () => 0,
      });
      const samples = c.frames.map((s) => engine.update(s));
      engine.reset();
      samples.push(
        ...c.frames
          .filter((s) => s.timestamp_ms <= 800)
          .map((s) => engine.update(s)),
      );
      samples.push(engine.pause(820), engine.resume(2000));
      samples.push(
        ...c.frames.map((s) =>
          engine.update({ ...s, timestamp_ms: s.timestamp_ms + 2400 }),
        ),
      );
      trace.landmarks.push(samples);
    }
  const bindings = JSON.parse(
    readFileSync(
      new URL(
        "../../shared/exercise-configs/side-bindings.json",
        import.meta.url,
      ),
    ),
  ).left_to_right;
  const mapping = new Map(
    bindings.flatMap(([left, right]) => [
      [left, right],
      [right, left],
    ]),
  );
  trace.swapped_sides = read("repetitions/landmarks.json").cases.map((c) => {
    const side =
      c.selected_side === "left"
        ? "right"
        : c.selected_side === "right"
          ? "left"
          : undefined;
    const engine = createExerciseAnalyzer(c.exercise, {
      camera_view: c.camera_view,
      selected_side: side,
      clock: () => 0,
    });
    return c.frames.map((f) =>
      engine.update({
        ...f,
        landmarks: f.landmarks.map((p) => ({
          ...p,
          index: mapping.get(p.index) ?? p.index,
        })),
      }),
    );
  });
  trace.arbitration = read("feedback/arbitration.json").map((c) => {
    const arbitrate = createFeedbackArbiter("squat");
    return c.samples.map((s) =>
      arbitrate(
        s.candidates.map((c) => ({
          rule_id: c.rule,
          message_key: c.rule,
          category: c.category,
          priority: 0,
          cooldown_ms: 3000,
          feature: null,
          observed_value: null,
          reason: "synthetic_test",
        })),
        s.time,
        "GOOD",
        "STANDING",
      ),
    );
  });
  trace.observations = read("feedback/observations.json").cases.map((c) => {
    const engine = createFeedbackEngine(
      getExerciseConfig(c.exercise),
      c.camera_view,
    );
    return c.samples.map((s) =>
      engine.update(s.snapshot, s.timestamp_ms, s.landmarks),
    );
  });
  const python = JSON.parse(
    execFileSync(
      "uv",
      ["run", "--locked", "python", "-m", "motioncoach.exercises.parity"],
      { cwd: root, maxBuffer: 32 * 1024 * 1024, encoding: "utf8" },
    ),
  );
  let numbers = 0,
    maximumAbsoluteDelta = 0;
  const compare = (left, right, path) => {
    if (typeof left === "number") {
      assert.equal(typeof right, "number", path);
      const delta = Math.abs(left - right);
      numbers++;
      maximumAbsoluteDelta = Math.max(maximumAbsoluteDelta, delta);
      const exact = /timestamp_ms|repetitions|rep_index/.test(path);
      assert(
        delta <= (exact ? 0 : 1e-9 + 1e-9 * Math.abs(left)),
        `${path}: TS=${left}, Python=${right}, delta=${delta}`,
      );
      return;
    }
    if (left === null || typeof left !== "object") {
      assert.equal(right, left, path);
      return;
    }
    assert.deepEqual(Object.keys(right).sort(), Object.keys(left).sort(), path);
    for (const key of Object.keys(left))
      compare(left[key], right[key], `${path}.${key}`);
  };
  compare(JSON.parse(JSON.stringify(trace)), python, "trace");
  console.log(
    `PASS: full TypeScript/Python trace; ${numbers} numeric values; maximum absolute delta=${maximumAbsoluteDelta}; timestamps/counts exact; other numbers atol=1e-9 rtol=1e-9.`,
  );
} finally {
  await server.close();
}
