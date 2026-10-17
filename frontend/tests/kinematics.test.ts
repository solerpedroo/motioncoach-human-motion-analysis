// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
  createEmaFilter,
  type FilteredSample,
} from "@/features/exercise-engine/ema";
import {
  angle2D,
  landmarkAngle2D,
  type Point2D,
} from "@/features/exercise-engine/geometry";
import { createKinematicsProcessor } from "@/features/exercise-engine/kinematics";
import { evaluatePoseQuality } from "@/features/exercise-engine/quality";
import type {
  AngleMetric,
  CommonEngineConfig,
  LandmarkRequirements,
  QualityResult,
} from "@/features/exercise-engine/types";
import type { Landmark } from "@/lib/contracts.generated";
import commonSchema from "../../shared/exercise-configs/common.schema.json";
import contractSchema from "../../shared/schemas/contracts.schema.json";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), "..", path), "utf8"));
}
const ajv = new Ajv2020({ strict: true, strictNumbers: true });
addFormats(ajv);
ajv.addKeyword({ keyword: "discriminator", valid: true });
ajv.addSchema(contractSchema);
const validCommon = ajv.compile<CommonEngineConfig>(commonSchema);
const commonData = readJson("shared/exercise-configs/common.json");
if (!validCommon(commonData))
  throw new Error(JSON.stringify(validCommon.errors));
const common = commonData;
const emaOptions = {
  alpha: common.smoothing.alpha,
  max_gap_ms: common.quality.max_gap_ms,
};

const geometry = readJson("shared/fixtures/kinematics/geometry.json") as {
  common_config_version: string;
  cases: {
    id: string;
    points: [Point2D | null, Point2D | null, Point2D | null];
    angle_deg: number | null;
  }[];
};
const temporal = readJson("shared/fixtures/kinematics/ema.json") as {
  common_config_version: string;
  cases: {
    id: string;
    samples: {
      timestamp_ms: number;
      value: number | null;
      expected: FilteredSample;
    }[];
  }[];
};
const quality = readJson("shared/fixtures/kinematics/quality.json") as {
  common_config_version: string;
  requirements: LandmarkRequirements;
  cases: {
    id: string;
    landmarks: Landmark[];
    previous?: Landmark[];
    expected: QualityResult;
  }[];
};

function point(
  index: number,
  x: number,
  y: number,
  visibility: number | null = 1,
): Landmark {
  return { index, x, y, z: 0, visibility, presence: null };
}
const bent = [point(11, 0.4, 0.4), point(13, 0.4, 0.5), point(15, 0.5, 0.5)];
const straight = [
  point(11, 0.4, 0.4),
  point(13, 0.4, 0.5),
  point(15, 0.4, 0.6),
];
const requirements = { required: [11, 13, 15], optional: [] };
const metrics: AngleMetric[] = [
  { id: "left_elbow_angle_deg", landmarks: [11, 13, 15], role: "transition" },
];
const makeProcessor = (clock = () => 0) =>
  createKinematicsProcessor({ config: common, requirements, metrics, clock });

it("validates and versions the shared unvalidated seeds", () => {
  expect(common.validation_status).toBe("unvalidated_seed");
  for (const fixture of [geometry, temporal, quality])
    expect(fixture.common_config_version).toBe(common.version);
  for (const patch of [
    { extra: 1 },
    { validation_status: "validated" },
    { smoothing: { type: "ema", alpha: 0 } },
    { quality: { ...common.quality, min_visibility: 2 } },
  ])
    expect(validCommon({ ...common, ...patch })).toBe(false);
});

describe("shared 2D geometry", () => {
  for (const test of geometry.cases)
    it(test.id, () => {
      const actual = angle2D(...test.points);
      if (test.angle_deg === null) expect(actual).toBeNull();
      else expect(actual).toBeCloseTo(test.angle_deg, 10);
    });
  it("keeps angles invariant under visual mirroring", () => {
    for (const test of geometry.cases) {
      const mirrored = test.points.map((p) =>
        p ? { x: 1 - p.x, y: p.y } : null,
      );
      const actual = angle2D(mirrored[0], mirrored[1], mirrored[2]);
      if (test.angle_deg === null) expect(actual).toBeNull();
      else expect(actual).toBeCloseTo(test.angle_deg, 10);
    }
  });
  it.each([NaN, Infinity, -Infinity])(
    "rejects nonfinite coordinates (%s)",
    (value) =>
      expect(
        angle2D({ x: value, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }),
      ).toBeNull(),
  );
  it("ignores z for angle geometry and rejects ambiguous or hidden joints", () => {
    expect(
      landmarkAngle2D(
        bent.map((p) => ({ ...p, z: 100 })),
        [11, 13, 15],
        0.5,
      ),
    ).toBeCloseTo(90);
    expect(
      landmarkAngle2D(
        bent.map((p) => ({ ...p, visibility: 0.49 })),
        [11, 13, 15],
        0.5,
      ),
    ).toBeNull();
    expect(landmarkAngle2D([...bent, bent[0]], [11, 13, 15], 0.5)).toBeNull();
    expect(landmarkAngle2D(bent.slice(1), [11, 13, 15], 0.5)).toBeNull();
  });
});

describe("shared temporal fixtures", () => {
  for (const test of temporal.cases)
    it(test.id, () => {
      const filter = createEmaFilter(emaOptions);
      for (const sample of test.samples) {
        const actual = filter.update(sample.value, sample.timestamp_ms);
        expect({ ...actual, value: null }).toEqual({
          ...sample.expected,
          value: null,
        });
        if (sample.expected.value === null) expect(actual.value).toBeNull();
        else expect(actual.value).toBeCloseTo(sample.expected.value, 10);
      }
    });
  it.each([NaN, Infinity, -Infinity])(
    "never smooths a nonfinite sample (%s)",
    (value) => {
      const filter = createEmaFilter(emaOptions);
      expect(filter.update(value, 0).value).toBeNull();
      expect(filter.update(90, 1).value).toBe(90);
      expect(filter.update(value, 2)).toMatchObject({
        value: 90,
        interpolated: true,
        can_transition: false,
      });
    },
  );
  it.each([NaN, Infinity, -1])(
    "rejects invalid timestamps without advancing time (%s)",
    (time) => {
      const filter = createEmaFilter(emaOptions);
      filter.update(90, 0);
      expect(filter.update(180, time)).toMatchObject({
        value: null,
        reason: "INVALID_TIMESTAMP",
      });
      expect(filter.update(180, 100).value).toBe(126);
    },
  );
  it("reset discards both value and timestamp", () => {
    const filter = createEmaFilter(emaOptions);
    filter.update(180, 1000);
    filter.reset();
    expect(filter.update(90, 0)).toMatchObject({
      value: 90,
      can_transition: true,
    });
  });
  it.each([
    { alpha: 0, max_gap_ms: 200 },
    { alpha: 1.1, max_gap_ms: 200 },
    { alpha: NaN, max_gap_ms: 200 },
    { alpha: 0.4, max_gap_ms: 0 },
    { alpha: 0.4, max_gap_ms: Infinity },
  ])("rejects invalid filter settings %j", (config) =>
    expect(() => createEmaFilter(config)).toThrow(RangeError),
  );
});

describe("shared quality fixtures", () => {
  for (const test of quality.cases)
    it(test.id, () =>
      expect(
        evaluatePoseQuality(
          test.landmarks,
          quality.requirements,
          common.quality,
          test.previous,
        ),
      ).toEqual(test.expected),
    );
  it("includes the exact jump threshold and ignores depth-only changes", () => {
    const previous = [point(11, 0, 0), point(13, 0, 0.1), point(15, 0, 0.2)];
    const current = previous.map((p) => ({
      ...p,
      x: common.quality.max_jump_normalized,
      z: 99,
    }));
    expect(
      evaluatePoseQuality(current, requirements, common.quality, previous)
        .pose_quality,
    ).toBe("GOOD");
  });
  it.each([NaN, Infinity, -Infinity])(
    "rejects nonfinite required landmarks (%s)",
    (value) =>
      expect(
        evaluatePoseQuality(
          bent.map((p) => ({ ...p, x: value })),
          requirements,
          common.quality,
        ),
      ).toMatchObject({ pose_quality: "INSUFFICIENT", can_transition: false }),
  );
  it("validates requirements and thresholds before processing", () => {
    for (const required of [[], [33], [11, 11]])
      expect(() =>
        evaluatePoseQuality(bent, { required, optional: [] }, common.quality),
      ).toThrow(RangeError);
    expect(() =>
      evaluatePoseQuality(bent, requirements, {
        ...common.quality,
        min_visibility: NaN,
      }),
    ).toThrow(RangeError);
    expect(() =>
      evaluatePoseQuality(bent, requirements, {
        ...common.quality,
        max_jump_normalized: 0,
      }),
    ).toThrow(RangeError);
  });
});

describe("quality → geometry → EMA integration", () => {
  it("uses an injected clock or an explicit media timestamp", () => {
    let time = 0;
    const processor = makeProcessor(() => time);
    expect(processor.update(bent)).toMatchObject({
      timestamp_ms: 0,
      can_transition: true,
      features: { left_elbow_angle_deg: 90 },
    });
    time = 100;
    expect(processor.update(straight)).toMatchObject({
      timestamp_ms: 100,
      features: { left_elbow_angle_deg: 126 },
    });
    expect(
      processor.update(bent, 200).features.left_elbow_angle_deg,
    ).toBeCloseTo(111.6);
  });
  it("blocks duplicates and out-of-order frames without contaminating the EMA", () => {
    const processor = makeProcessor();
    processor.update(bent, 100);
    for (const time of [100, 99])
      expect(processor.update(straight, time)).toMatchObject({
        can_transition: false,
        continuity_broken: true,
        features: { left_elbow_angle_deg: null },
        reasons: ["NON_MONOTONIC_TIMESTAMP"],
      });
    expect(processor.update(straight, 150).features.left_elbow_angle_deg).toBe(
      126,
    );
  });
  it("does not blend angles across a long gap or compare old positions", () => {
    const processor = makeProcessor();
    processor.update(bent, 0);
    const moved = straight.map((p) => ({ ...p, x: p.x + 0.3 }));
    expect(processor.update(moved, 201)).toMatchObject({
      pose_quality: "GOOD",
      can_transition: false,
      continuity_broken: true,
      features: { left_elbow_angle_deg: 180 },
      reasons: ["LONG_GAP"],
    });
    expect(processor.update(moved, 250)).toMatchObject({
      can_transition: true,
      continuity_broken: false,
    });
  });
  it("nulls missing/hidden angles and resets before recovering", () => {
    const processor = makeProcessor();
    processor.update(bent, 0);
    expect(
      processor.update(
        bent.map((p) => ({ ...p, visibility: 0.1 })),
        50,
      ),
    ).toMatchObject({
      pose_quality: "INSUFFICIENT",
      features: { left_elbow_angle_deg: null, interpolated: false },
      can_transition: false,
    });
    expect(processor.update(straight, 100).features.left_elbow_angle_deg).toBe(
      180,
    );
    expect(processor.update([], 150).reasons).toEqual(["POSE_LOST"]);
  });
  it("blocks a jump and reacquires the new position without retaining a stale baseline", () => {
    const processor = makeProcessor();
    processor.update(bent, 0);
    const moved = straight.map((p) => ({ ...p, x: p.x + 0.3 }));
    expect(processor.update(moved, 50)).toMatchObject({
      can_transition: false,
      continuity_broken: true,
      features: { left_elbow_angle_deg: null },
      reasons: ["LANDMARK_JUMP"],
    });
    expect(processor.update(moved, 100)).toMatchObject({
      can_transition: true,
      features: { left_elbow_angle_deg: 180 },
    });
  });
  it("keeps optional observations null without suppressing a visible required angle", () => {
    const processor = createKinematicsProcessor({
      config: common,
      requirements: { ...requirements, optional: [23] },
      metrics: [
        ...metrics,
        {
          id: "left_hip_angle_deg",
          landmarks: [11, 23, 13],
          role: "observation",
        },
      ],
      clock: () => 0,
    });
    expect(processor.update(bent)).toMatchObject({
      pose_quality: "LIMITED",
      can_transition: true,
      features: { left_elbow_angle_deg: 90, left_hip_angle_deg: null },
    });
  });
  it("degenerate required geometry blocks transitions even with high visibility", () => {
    const processor = makeProcessor();
    expect(
      processor.update(bent.map((p) => ({ ...p, x: 0.4, y: 0.4 }))),
    ).toMatchObject({
      pose_quality: "INSUFFICIENT",
      can_transition: false,
      features: { left_elbow_angle_deg: null },
      reasons: ["DEGENERATE_TRANSITION_ANGLE"],
    });
  });
  it("copies configuration and accepted landmarks instead of keeping caller mutations", () => {
    const config = structuredClone(common);
    const mutable = structuredClone(bent);
    const processor = createKinematicsProcessor({
      config,
      requirements,
      metrics,
      clock: () => 0,
    });
    processor.update(mutable, 0);
    config.smoothing.alpha = 1;
    mutable[2].x = 0.9;
    expect(processor.update(straight, 50).features.left_elbow_angle_deg).toBe(
      126,
    );
    processor.reset();
    expect(processor.update(straight, 0).features.left_elbow_angle_deg).toBe(
      180,
    );
  });
  it("rejects undeclared landmarks and optional landmarks used for transitions", () => {
    expect(() =>
      createKinematicsProcessor({
        config: common,
        requirements: { required: [11, 13], optional: [15] },
        metrics,
        clock: () => 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      createKinematicsProcessor({
        config: common,
        requirements,
        metrics: [{ ...metrics[0], landmarks: [11, 13, 16] }],
        clock: () => 0,
      }),
    ).toThrow(RangeError);
  });
});

it("replays shared pipeline fixtures for future Python parity", () => {
  const fixture = readJson("shared/fixtures/kinematics/pipeline.json") as {
    common_config_version: string;
    requirements: LandmarkRequirements;
    metrics: AngleMetric[];
    cases: {
      id: string;
      samples: {
        timestamp_ms: number;
        landmarks: Landmark[];
        expected: ReturnType<
          ReturnType<typeof createKinematicsProcessor>["update"]
        >;
      }[];
    }[];
  };
  expect(fixture.common_config_version).toBe(common.version);
  for (const test of fixture.cases) {
    const processor = createKinematicsProcessor({
      config: common,
      requirements: fixture.requirements,
      metrics: fixture.metrics,
      clock: () => {
        throw new Error("Explicit timestamps required by the fixture");
      },
    });
    for (const sample of test.samples) {
      expect(
        processor.update(sample.landmarks, sample.timestamp_ms),
        test.id,
      ).toEqual(sample.expected);
    }
  }
});

it("represents an invalid clock reading with null, without propagating NaN", () => {
  const result = makeProcessor(() => NaN).update(bent);
  expect(result).toMatchObject({
    timestamp_ms: null,
    can_transition: false,
    reasons: ["INVALID_TIMESTAMP"],
  });
  expect(result.features.left_elbow_angle_deg).toBeNull();
});

it("keeps a degenerate optional observation limited while the required metric remains usable", () => {
  const processor = createKinematicsProcessor({
    config: common,
    requirements: { ...requirements, optional: [23] },
    metrics: [
      ...metrics,
      {
        id: "left_hip_angle_deg",
        landmarks: [11, 23, 13],
        role: "observation",
      },
    ],
    clock: () => 0,
  });
  const result = processor.update([...bent, point(23, 0.4, 0.4)]);
  expect(result).toMatchObject({
    pose_quality: "LIMITED",
    can_transition: true,
    features: { left_elbow_angle_deg: 90, left_hip_angle_deg: null },
    reasons: ["DEGENERATE_OBSERVATION_ANGLE"],
  });
});

it("keeps the angle finite for very small or very large finite vectors", () => {
  for (const scale of [1e-200, 1e200]) {
    expect(
      angle2D({ x: scale, y: 0 }, { x: 0, y: 0 }, { x: 0, y: scale }),
    ).toBe(90);
  }
});
