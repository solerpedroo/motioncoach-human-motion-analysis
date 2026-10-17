// @vitest-environment node
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { createExerciseAnalyzer } from "@/features/exercise-engine/exercise-analyzer";
import {
  type ExerciseId,
  getExerciseConfig,
  resolveSide,
  validateExerciseConfig,
} from "@/features/exercise-engine/exercise-config";
import { createExerciseFeatureProcessor } from "@/features/exercise-engine/exercise-features";
import {
  createFeatureAnalyzer,
  type FeatureSample,
  type FsmSnapshot,
} from "@/features/exercise-engine/exercise-fsm";
import type { Landmark, SessionEvent } from "@/lib/contracts.generated";
import { en } from "@/messages/en";
import fixtures from "../../shared/fixtures/repetitions/features.json";
import landmarkFixtures from "../../shared/fixtures/repetitions/landmarks.json";
import contractSchema from "../../shared/schemas/contracts.schema.json";

const ids: ExerciseId[] = ["squat", "push_up", "biceps_curl", "jumping_jack"];
const ajv = new Ajv2020({ strict: true });
addFormats(ajv);
ajv.addKeyword({ keyword: "discriminator", valid: true });
ajv.addSchema(contractSchema);
const validConfig = ajv.compile({
  $ref: `${contractSchema.$id}#/$defs/ExerciseConfig`,
});
const validEvent = ajv.compile({
  $ref: `${contractSchema.$id}#/$defs/SessionEvent`,
});
function eventProjection(events: readonly SessionEvent[]) {
  return events.map(({ type, timestamp_ms, rule_id, quality, rep_index }) => ({
    type,
    timestamp_ms,
    rule_id,
    quality,
    rep_index,
  }));
}

describe("shared declarative configurations", () => {
  for (const id of ids)
    it(`${id} conforms to the normative domain schema`, () => {
      const config = getExerciseConfig(id);
      expect(validConfig(config), JSON.stringify(validConfig.errors)).toBe(
        true,
      );
      expect(config.validation_status).toBe("unvalidated_seed");
      expect(
        validConfig(resolveSide(config, "right")),
        JSON.stringify(validConfig.errors),
      ).toBe(true);
      for (const rule of config.feedback_rules)
        expect(Object.keys(en.feedback)).toContain(rule.message_key);
    });
  it("rejects broken references, duplicate states and undeclared landmarks", () => {
    const mutations = [
      (c: ReturnType<typeof getExerciseConfig>) => {
        c.transitions[0].conditions[0].threshold = "missing";
      },
      (c: ReturnType<typeof getExerciseConfig>) => {
        c.transitions[0].to_state = "MISSING";
      },
      (c: ReturnType<typeof getExerciseConfig>) => {
        c.features[0].landmarks[0] = 32;
      },
      (c: ReturnType<typeof getExerciseConfig>) => {
        c.states.push(c.states[0]);
      },
      (c: ReturnType<typeof getExerciseConfig>) => {
        c.thresholds.push(c.thresholds[0]);
      },
    ];
    for (const mutate of mutations) {
      const config = getExerciseConfig("squat");
      mutate(config);
      expect(() => validateExerciseConfig(config)).toThrow();
    }
  });
});

describe("shared deterministic repetition fixtures", () => {
  for (const test of fixtures.cases)
    it(test.id, () => {
      const config = getExerciseConfig(test.exercise as ExerciseId);
      expect(config.version).toBe(test.configuration_version);
      const analyzer = createFeatureAnalyzer(config, () => {
        throw new Error("Fixture timestamps are explicit");
      });
      let result: FsmSnapshot = analyzer.snapshot();
      const events: SessionEvent[] = [];
      for (const sample of test.samples) {
        if ("action" in sample && sample.action === "pause")
          result = analyzer.pause(sample.timestamp_ms);
        else if ("action" in sample && sample.action === "resume")
          result = analyzer.resume(sample.timestamp_ms);
        else result = analyzer.update(sample as FeatureSample);
        if ("expected_phase" in sample)
          expect(result.phase, `${test.id}@${sample.timestamp_ms}`).toBe(
            sample.expected_phase,
          );
        for (const event of result.events)
          expect(validEvent(event), JSON.stringify(validEvent.errors)).toBe(
            true,
          );
        events.push(...result.events);
      }
      expect(result.phase).toBe(test.expected.phase);
      expect(result.completed_repetitions).toBe(
        test.expected.completed_repetitions,
      );
      expect(result.incomplete_repetitions).toBe(
        test.expected.incomplete_repetitions,
      );
      expect(eventProjection(events)).toEqual(test.expected.events);
    });
});

function point(index: number, x: number, y: number, visibility = 1): Landmark {
  return { index, x, y, z: 0, visibility, presence: 1 };
}
function jackPose(
  armsDeg: number,
  spread: number,
  rightArmsDeg = armsDeg,
): Landmark[] {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  return [
    point(11, 0.4, 0.3),
    point(12, 0.6, 0.3),
    point(23, 0.4, 0.6),
    point(24, 0.6, 0.6),
    point(
      13,
      0.4 - 0.2 * Math.sin(rad(armsDeg)),
      0.3 + 0.2 * Math.cos(rad(armsDeg)),
    ),
    point(
      14,
      0.6 + 0.2 * Math.sin(rad(rightArmsDeg)),
      0.3 + 0.2 * Math.cos(rad(rightArmsDeg)),
    ),
    point(27, 0.5 - 0.1 * spread, 0.9),
    point(28, 0.5 + 0.1 * spread, 0.9),
  ];
}
function armPose(
  deg: number,
  leftVisibility = 1,
  rightVisibility = 1,
): Landmark[] {
  const rad = (deg * Math.PI) / 180;
  return [
    point(11, 0.3, 0.3, leftVisibility),
    point(13, 0.3, 0.5, leftVisibility),
    point(
      15,
      0.3 + 0.15 * Math.sin(rad),
      0.5 - 0.15 * Math.cos(rad),
      leftVisibility,
    ),
    point(12, 0.7, 0.3, rightVisibility),
    point(14, 0.7, 0.5, rightVisibility),
    point(
      16,
      0.7 + 0.15 * Math.sin(rad),
      0.5 - 0.15 * Math.cos(rad),
      rightVisibility,
    ),
    point(23, 0.3, 0.7, leftVisibility),
    point(27, 0.3, 0.95, leftVisibility),
    point(24, 0.7, 0.7, rightVisibility),
    point(28, 0.7, 0.95, rightVisibility),
  ];
}
function driveFrames(
  id: ExerciseId,
  pose: (time: number) => Landmark[],
  options: { selected_side?: "left" | "right"; mirrored?: boolean } = {},
) {
  const analyzer = createExerciseAnalyzer(id, {
    camera_view: id === "jumping_jack" ? "front" : "side",
    clock: () => 0,
    ...options,
  });
  const events: SessionEvent[] = [];
  let result = analyzer.snapshot();
  for (let time = 0; time <= 1800; time += 40) {
    result = analyzer.update({ timestamp_ms: time, landmarks: pose(time) });
    events.push(...result.events);
  }
  return { result, events };
}

it("measures both arms and the horizontal leg ratio from landmarks", () => {
  const processor = createExerciseFeatureProcessor(
    getExerciseConfig("jumping_jack"),
    "front",
    () => 0,
  );
  const result = processor.update(jackPose(160, 2.2, 150), 0);
  expect(result.observed_features.arm_elevation_deg).toBeCloseTo(150);
  expect(result.observed_features.leg_spread_ratio).toBeCloseTo(2.2);
});

it("blocks a missing arm, narrow hip span and side views", () => {
  const config = getExerciseConfig("jumping_jack");
  for (const landmarks of [
    jackPose(160, 2.2).filter((p) => p.index !== 14),
    jackPose(160, 2.2).map((p) => (p.index === 24 ? { ...p, x: 0.41 } : p)),
  ]) {
    const result = createExerciseFeatureProcessor(
      config,
      "front",
      () => 0,
    ).update(landmarks, 0);
    expect(result.can_transition).toBe(false);
    expect(result.pose_quality).toBe("INSUFFICIENT");
  }
  const result = createExerciseFeatureProcessor(config, "side", () => 0).update(
    jackPose(160, 2.2),
    0,
  );
  expect(result.features.leg_spread_ratio).toBeNull();
  expect(result.can_transition).toBe(false);
});

it("counts a complete jack with both signals, independent of mirror presentation", () => {
  const pose = (t: number) =>
    jackPose(t < 240 || t >= 1200 ? 20 : 170, t < 240 || t >= 1200 ? 1 : 2.2);
  const normal = driveFrames("jumping_jack", pose);
  const mirrored = driveFrames("jumping_jack", pose, { mirrored: true });
  const reflected = driveFrames("jumping_jack", (t) =>
    pose(t).map((p) => ({ ...p, x: 1 - p.x })),
  );
  expect(normal.result.completed_repetitions).toBe(1);
  expect(eventProjection(normal.events)).toEqual(
    eventProjection(mirrored.events),
  );
  expect(eventProjection(normal.events)).toEqual(
    eventProjection(reflected.events),
  );
});

it("requires an explicit curl arm and never switches it when the other becomes more visible", () => {
  expect(() =>
    createExerciseAnalyzer("biceps_curl", {
      camera_view: "side",
      clock: () => 0,
    }),
  ).toThrow(/Select/);
  const pose = (t: number) =>
    armPose(
      t < 240
        ? 170
        : t < 600
          ? 170 - ((t - 240) * 130) / 360
          : t < 1200
            ? 40
            : t < 1560
              ? 40 + ((t - 1200) * 130) / 360
              : 170,
      0.8,
      t < 500 ? 0.6 : 1,
    );
  const normal = driveFrames("biceps_curl", pose, { selected_side: "left" });
  expect(normal.result.completed_repetitions).toBe(1);
  expect(normal.result.selected_side).toBe("left");
  expect(
    eventProjection(
      driveFrames("biceps_curl", pose, {
        selected_side: "left",
        mirrored: true,
      }).events,
    ),
  ).toEqual(eventProjection(normal.events));
});

it("locks the most visible push-up side only after acquiring the initial state", () => {
  const analyzer = createExerciseAnalyzer("push_up", {
    camera_view: "side",
    clock: () => 0,
  });
  expect(
    analyzer.update({ timestamp_ms: 0, landmarks: armPose(170, 0.7, 1) })
      .selected_side,
  ).toBeNull();
  analyzer.update({ timestamp_ms: 40, landmarks: armPose(170, 0.7, 1) });
  expect(
    analyzer.update({ timestamp_ms: 80, landmarks: armPose(170, 0.7, 1) })
      .selected_side,
  ).toBe("right");
  expect(
    analyzer.update({ timestamp_ms: 120, landmarks: armPose(135, 1, 0.6) })
      .selected_side,
  ).toBe("right");
});

it("does not count non-overlapping raw signals even if smoothing retains apparent overlap", () => {
  const config = getExerciseConfig("jumping_jack");
  const fsm = createFeatureAnalyzer(config, () => 0);
  fsm.update({
    timestamp_ms: 0,
    features: { arm_elevation_deg: 20, leg_spread_ratio: 1 },
    pose_quality: "GOOD",
  });
  fsm.update({
    timestamp_ms: 40,
    features: { arm_elevation_deg: 20, leg_spread_ratio: 1 },
    pose_quality: "GOOD",
  });
  fsm.update({
    timestamp_ms: 80,
    features: { arm_elevation_deg: 160, leg_spread_ratio: 2.2 },
    observed_features: { arm_elevation_deg: 160, leg_spread_ratio: 1 },
    pose_quality: "GOOD",
  });
  for (let t = 120; t <= 400; t += 40)
    expect(
      fsm.update({
        timestamp_ms: t,
        features: { arm_elevation_deg: 160, leg_spread_ratio: 2.2 },
        observed_features: { arm_elevation_deg: 20, leg_spread_ratio: 2.2 },
        pose_quality: "GOOD",
      }).phase,
    ).toBe("OPENING");
  fsm.update({
    timestamp_ms: 440,
    features: { arm_elevation_deg: 20, leg_spread_ratio: 1 },
    pose_quality: "GOOD",
  });
  expect(
    fsm.update({
      timestamp_ms: 480,
      features: { arm_elevation_deg: 20, leg_spread_ratio: 1 },
      pose_quality: "GOOD",
    }),
  ).toMatchObject({ completed_repetitions: 0, incomplete_repetitions: 1 });
});

function limbAngle(id: ExerciseId, time: number): number {
  const low = id === "squat" ? 80 : id === "push_up" ? 70 : 40;
  return time < 240
    ? 170
    : time < 600
      ? 170 - ((time - 240) * (170 - low)) / 360
      : time < 1200
        ? low
        : time < 1560
          ? low + ((time - 1200) * (170 - low)) / 360
          : 170;
}
function squatPose(angle: number): Landmark[] {
  const rad = (angle * Math.PI) / 180;
  return [
    point(11, 0.3, 0.2),
    point(23, 0.3, 0.4),
    point(25, 0.3, 0.6),
    point(27, 0.3 + 0.15 * Math.sin(rad), 0.6 - 0.15 * Math.cos(rad)),
    point(12, 0.7, 0.2, 0.8),
    point(24, 0.7, 0.4, 0.8),
    point(26, 0.7, 0.6, 0.8),
    point(28, 0.7 + 0.15 * Math.sin(rad), 0.6 - 0.15 * Math.cos(rad), 0.8),
  ];
}

for (const id of ids) {
  it(`${id}: landmark pipeline completes exactly one cycle with presentation mirror on/off`, () => {
    const pose = (time: number) =>
      id === "jumping_jack"
        ? jackPose(
            time < 240 || time >= 1200 ? 20 : 170,
            time < 240 || time >= 1200 ? 1 : 2.2,
          )
        : id === "squat"
          ? squatPose(limbAngle(id, time))
          : armPose(limbAngle(id, time), 1, 0.8);
    const options =
      id === "biceps_curl" ? { selected_side: "right" as const } : {};
    const normal = driveFrames(id, pose, options),
      mirror = driveFrames(id, pose, { ...options, mirrored: true });
    expect(normal.result.completed_repetitions).toBe(1);
    expect(normal.result.incomplete_repetitions).toBe(0);
    expect(eventProjection(normal.events)).toEqual(
      eventProjection(mirror.events),
    );
    expect(
      normal.events.filter((event) => event.type === "REP_COMPLETED"),
    ).toHaveLength(1);
  });
  it(`${id}: acquiring the initial state cannot complete a cycle that began outside observation`, () => {
    const sequence = fixtures.cases.find(
      (test) => test.exercise === id && test.id.endsWith("/complete"),
    );
    if (!sequence) throw new Error("Missing complete fixture");
    const fsm = createFeatureAnalyzer(getExerciseConfig(id), () => 0);
    const low = sequence.samples.find(
      (sample) => sample.timestamp_ms === 280,
    ) as FeatureSample;
    const home = sequence.samples[0] as FeatureSample;
    for (const time of [0, 80]) fsm.update({ ...low, timestamp_ms: time });
    fsm.update({ ...home, timestamp_ms: 160 });
    const result = fsm.update({ ...home, timestamp_ms: 240 });
    expect(result).toMatchObject({
      completed_repetitions: 0,
      incomplete_repetitions: 0,
      events: [],
    });
  });
  it(`${id}: interpolated data and duplicate timestamps invalidate an active cycle once`, () => {
    const sequence = fixtures.cases.find(
      (test) => test.exercise === id && test.id.endsWith("/complete"),
    );
    if (!sequence) throw new Error("Missing complete fixture");
    for (const mode of ["held", "duplicate"]) {
      const fsm = createFeatureAnalyzer(getExerciseConfig(id), () => 0);
      for (const sample of sequence.samples.filter(
        (sample) => sample.timestamp_ms <= 280,
      ))
        fsm.update(sample as FeatureSample);
      const sample = sequence.samples.find(
        (item) => item.timestamp_ms === 280,
      ) as FeatureSample;
      const result = fsm.update({
        ...sample,
        timestamp_ms: mode === "held" ? 320 : 280,
        features: { ...sample.features, interpolated: mode === "held" },
      });
      expect(result).toMatchObject({
        phase: "UNCERTAIN",
        completed_repetitions: 0,
        incomplete_repetitions: 1,
      });
      expect(
        result.events.filter((event) => event.type === "REP_INCOMPLETE"),
      ).toHaveLength(1);
      expect(validEvent(result.events[0])).toBe(true);
      fsm.update({
        ...sample,
        timestamp_ms: 360,
        pose_quality: "INSUFFICIENT",
      });
      expect(
        fsm.update({
          ...sample,
          timestamp_ms: 400,
          pose_quality: "INSUFFICIENT",
        }).incomplete_repetitions,
      ).toBe(1);
    }
  });
}

it("can complete a new cycle after interruption and reset starts a new session", () => {
  for (const id of ids) {
    const config = getExerciseConfig(id),
      fsm = createFeatureAnalyzer(config, () => 0);
    const pause = fixtures.cases.find(
      (test) => test.exercise === id && test.id.endsWith("/pause-at-extreme"),
    );
    const complete = fixtures.cases.find(
      (test) => test.exercise === id && test.id.endsWith("/complete"),
    );
    if (!pause || !complete) throw new Error("Missing fixtures");
    for (const sample of pause.samples) {
      if ("action" in sample && sample.action === "pause")
        fsm.pause(sample.timestamp_ms);
      else if ("action" in sample && sample.action === "resume")
        fsm.resume(sample.timestamp_ms);
      else fsm.update(sample as FeatureSample);
    }
    let result = fsm.snapshot();
    for (const sample of complete.samples)
      result = fsm.update({
        ...sample,
        timestamp_ms: sample.timestamp_ms + 1200,
      } as FeatureSample);
    expect(result).toMatchObject({
      completed_repetitions: 1,
      incomplete_repetitions: 1,
    });
    expect(fsm.reset()).toMatchObject({
      phase: "NOT_READY",
      completed_repetitions: 0,
      incomplete_repetitions: 0,
      events: [],
    });
    expect(fsm.update(complete.samples[0] as FeatureSample).phase).toBe(
      "NOT_READY",
    );
  }
});

it("losing the selected curl arm blocks analysis even when the other arm is fully visible", () => {
  const analyzer = createExerciseAnalyzer("biceps_curl", {
    camera_view: "side",
    selected_side: "left",
    clock: () => 0,
  });
  for (let time = 0; time <= 800; time += 40)
    analyzer.update({
      timestamp_ms: time,
      landmarks: armPose(limbAngle("biceps_curl", time), 0.8, 1),
    });
  const result = analyzer.update({
    timestamp_ms: 840,
    landmarks: armPose(40, 0.1, 1),
  });
  expect(result).toMatchObject({
    selected_side: "left",
    phase: "UNCERTAIN",
    completed_repetitions: 0,
    incomplete_repetitions: 1,
  });
  expect(result.events.some((event) => event.type === "REP_INCOMPLETE")).toBe(
    true,
  );
});

it("validates hysteresis order and simultaneous stable-state conditions", () => {
  const squat = getExerciseConfig("squat");
  const exit = squat.thresholds.find(
    (threshold) => threshold.name === "standing_exit_deg",
  );
  if (!exit) throw new Error("Missing exit seed");
  exit.value = 170;
  expect(() => validateExerciseConfig(squat)).toThrow(/hysteresis/);
  const jack = getExerciseConfig("jumping_jack");
  jack.transitions[3].match = "any";
  expect(() => validateExerciseConfig(jack)).toThrow(/simultaneous/);
});

it("resets initial dwell when the provisional side changes and then locks the new side", () => {
  const analyzer = createExerciseAnalyzer("push_up", {
    camera_view: "side",
    clock: () => 0,
  });
  analyzer.update({ timestamp_ms: 0, landmarks: armPose(170, 1, 0.7) });
  analyzer.update({ timestamp_ms: 40, landmarks: armPose(170, 1, 0.7) });
  expect(
    analyzer.update({ timestamp_ms: 80, landmarks: armPose(170, 0.7, 1) })
      .selected_side,
  ).toBeNull();
  for (const time of [120, 160])
    expect(
      analyzer.update({ timestamp_ms: time, landmarks: armPose(170, 0.7, 1) })
        .selected_side,
    ).toBeNull();
  expect(
    analyzer.update({ timestamp_ms: 200, landmarks: armPose(170, 0.7, 1) })
      .selected_side,
  ).toBe("right");
});

it("uses the injected clock for commands, makes duplicate pause/resume idempotent and excludes paused time", () => {
  let clock = 300;
  const fsm = createFeatureAnalyzer(getExerciseConfig("squat"), () => clock);
  const test = fixtures.cases.find((test) => test.id === "squat/complete");
  if (!test) throw new Error("Missing fixture");
  for (const sample of test.samples.filter(
    (sample) => sample.timestamp_ms <= 280,
  ))
    fsm.update(sample as FeatureSample);
  expect(fsm.pause().events.map((event) => event.type)).toEqual([
    "REP_INCOMPLETE",
    "SESSION_PAUSED",
  ]);
  clock = 400;
  expect(fsm.pause().events).toEqual([]);
  clock = 1000;
  expect(fsm.resume().phase).toBe("UNCERTAIN");
  expect(fsm.resume().events).toEqual([]);
  expect(() => fsm.pause(NaN)).toThrow(RangeError);
  expect(() => fsm.resume(999)).toThrow(RangeError);
  expect(fsm.snapshot()).toMatchObject({
    completed_repetitions: 0,
    incomplete_repetitions: 1,
  });
});

it.each([NaN, Infinity, -Infinity, 181, -1])(
  "nulls invalid angular features instead of emitting them (%s)",
  (value) => {
    const fsm = createFeatureAnalyzer(getExerciseConfig("squat"), () => 0);
    const result = fsm.update({
      timestamp_ms: 0,
      features: { left_knee_angle_deg: value },
      pose_quality: "GOOD",
    });
    expect(result).toMatchObject({
      phase: "UNCERTAIN",
      pose_quality: "INSUFFICIENT",
      features: { left_knee_angle_deg: null },
      completed_repetitions: 0,
    });
    expect(JSON.stringify(result)).not.toContain('"left_knee_angle_deg":181');
  },
);

it("requires both visible arms to rise; one raised arm and moving legs stays incomplete", () => {
  const pose = (time: number) =>
    jackPose(
      time < 240 || time >= 1200 ? 20 : 170,
      time < 240 || time >= 1200 ? 1 : 2.2,
      20,
    );
  const { result, events } = driveFrames("jumping_jack", pose);
  expect(result).toMatchObject({
    completed_repetitions: 0,
    incomplete_repetitions: 1,
  });
  expect(events.map((event) => event.type)).toEqual([
    "REP_STARTED",
    "REP_INCOMPLETE",
  ]);
});

for (const test of landmarkFixtures.cases)
  it(`shared landmarks: ${test.exercise} matches known cycle and mirror flag`, () => {
    const outcomes = [false, true].map((mirrored) => {
      const analyzer = createExerciseAnalyzer(test.exercise as ExerciseId, {
        camera_view: test.camera_view as "front" | "side",
        selected_side: test.selected_side as "right" | undefined,
        mirrored,
        clock: () => 0,
      });
      const events: SessionEvent[] = [];
      let result = analyzer.snapshot();
      for (const frame of test.frames) {
        result = analyzer.update(frame);
        events.push(...result.events);
      }
      expect(result).toMatchObject({
        completed_repetitions: test.expected.completed_repetitions,
        incomplete_repetitions: test.expected.incomplete_repetitions,
        selected_side: test.expected.selected_side,
      });
      expect(events.map((event) => event.type)).toEqual(
        test.expected.event_types,
      );
      for (const event of events)
        expect(validEvent(event), JSON.stringify(validEvent.errors)).toBe(true);
      return eventProjection(events);
    });
    expect(outcomes[0]).toEqual(outcomes[1]);
  });

for (const test of landmarkFixtures.cases)
  it(`landmark pause/resume: ${test.exercise} discards the old cycle and allows a new one`, () => {
    const analyzer = createExerciseAnalyzer(test.exercise as ExerciseId, {
      camera_view: test.camera_view as "front" | "side",
      selected_side: test.selected_side === "right" ? "right" : undefined,
      clock: () => 0,
    });
    for (const frame of test.frames.filter(
      (frame) => frame.timestamp_ms <= 800,
    ))
      analyzer.update(frame);
    const paused = analyzer.pause(820);
    expect(paused).toMatchObject({
      phase: "PAUSED",
      completed_repetitions: 0,
      incomplete_repetitions: 1,
      selected_side: test.expected.selected_side,
    });
    expect(analyzer.resume(2000).phase).toBe("UNCERTAIN");
    for (const time of [2040, 2080, 2120, 2160])
      expect(
        analyzer.update({ ...test.frames[0], timestamp_ms: time })
          .completed_repetitions,
      ).toBe(0);
    let result = analyzer.snapshot();
    for (const frame of test.frames)
      result = analyzer.update({
        ...frame,
        timestamp_ms: frame.timestamp_ms + 2400,
      });
    expect(result).toMatchObject({
      completed_repetitions: 1,
      incomplete_repetitions: 1,
      selected_side: test.expected.selected_side,
    });
  });

for (const id of ["squat", "push_up"] as const)
  it(`${id}: losing the auto-selected side never switches the active session`, () => {
    const analyzer = createExerciseAnalyzer(id, {
      camera_view: "side",
      clock: () => 0,
    });
    const pose = (time: number, lost = false) =>
      (id === "squat"
        ? squatPose(limbAngle(id, time))
        : armPose(limbAngle(id, time))
      ).map((point) => ({
        ...point,
        visibility: point.index % 2 === 1 ? (lost ? 1 : 0.7) : lost ? 0.1 : 0.9,
      }));
    for (let time = 0; time <= 800; time += 40)
      analyzer.update({ timestamp_ms: time, landmarks: pose(time) });
    expect(analyzer.snapshot().selected_side).toBe("right");
    const result = analyzer.update({
      timestamp_ms: 840,
      landmarks: pose(840, true),
    });
    expect(result).toMatchObject({
      selected_side: "right",
      phase: "UNCERTAIN",
      completed_repetitions: 0,
      incomplete_repetitions: 1,
    });
  });

it("rejects the wrong camera view even when the points are otherwise visible", () => {
  for (const id of ["squat", "push_up", "jumping_jack"] as const) {
    const test = landmarkFixtures.cases.find((test) => test.exercise === id);
    if (!test) throw new Error("Missing landmark fixture");
    const analyzer = createExerciseAnalyzer(id, {
      camera_view: id === "jumping_jack" ? "side" : "front",
      clock: () => 0,
    });
    let result = analyzer.snapshot();
    for (const frame of test.frames) result = analyzer.update(frame);
    expect(result).toMatchObject({
      phase: "UNCERTAIN",
      completed_repetitions: 0,
      pose_quality: "INSUFFICIENT",
    });
  }
});
