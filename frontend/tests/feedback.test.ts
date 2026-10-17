import { describe, expect, it, vi } from "vitest";
import type { AnalyzerSnapshot } from "@/features/exercise-engine/exercise-analyzer";
import { getExerciseConfig } from "@/features/exercise-engine/exercise-config";
import {
  createFeedbackArbiter,
  createFeedbackEngine,
  type FeedbackCandidate,
} from "@/features/exercise-engine/feedback";
import { createVoiceFeedback } from "@/features/exercise-engine/voice";
import type { SessionEvent } from "@/lib/contracts.generated";
import { en } from "@/messages/en";
import fixtures from "../../shared/fixtures/feedback/arbitration.json";

function snapshot(
  events: SessionEvent[] = [],
  quality: AnalyzerSnapshot["pose_quality"] = "GOOD",
  angle = 160,
): AnalyzerSnapshot {
  return {
    phase: "STANDING",
    completed_repetitions: 0,
    incomplete_repetitions: 0,
    pose_quality: quality,
    features: { left_knee_angle_deg: angle },
    events,
    feedback_candidates: [],
    selected_side: "left",
  };
}
function event(
  type: SessionEvent["type"],
  time: number,
  reason?: string,
): SessionEvent {
  return {
    schema_version: "1.0.0",
    exercise: "squat",
    type,
    timestamp_ms: time,
    rule_id:
      type === "REP_COMPLETED" ? "rep.completed" : "rep.not_fully_observed",
    quality: "GOOD",
    rep_index: type === "REP_COMPLETED" ? 1 : null,
    metadata: { phase: "STANDING", reason },
  };
}
function candidate(
  rule: string,
  category: FeedbackCandidate["category"],
): FeedbackCandidate {
  return {
    rule_id: rule,
    message_key: rule,
    category,
    priority: 0,
    cooldown_ms: 3000,
    feature: null,
    observed_value: null,
    reason: "synthetic_test",
  };
}
describe("feedback arbitration", () => {
  for (const fixture of fixtures)
    it(fixture.name, () => {
      const arbiter = createFeedbackArbiter("squat");
      for (const sample of fixture.samples) {
        const result = arbiter(
          sample.candidates.map((item) =>
            candidate(
              item.rule,
              item.category as FeedbackCandidate["category"],
            ),
          ),
          sample.time,
          "GOOD",
          "STANDING",
        );
        expect(result.selected?.rule_id ?? null).toBe(sample.selected);
        expect(result.issued).toBe(sample.issued);
        if (result.event)
          expect(result.event).toMatchObject({
            type: "FEEDBACK_ISSUED",
            timestamp_ms: sample.time,
            metadata: {
              message_key: sample.selected,
              reason: "synthetic_test",
            },
          });
      }
    });
  it("does not fall through to lower priority while the highest class cools down", () => {
    const arbiter = createFeedbackArbiter("squat");
    arbiter(
      [candidate("capture.a", "capture")],
      0,
      "INSUFFICIENT",
      "UNCERTAIN",
    );
    const result = arbiter(
      [
        candidate("rep.completed", "completed"),
        candidate("capture.b", "capture"),
      ],
      100,
      "INSUFFICIENT",
      "UNCERTAIN",
    );
    expect(result.selected?.rule_id).toBe("capture.b");
    expect(result.issued).toBe(false);
  });
  it("refuses nonmonotonic or invalid times without advancing cooldown", () => {
    const arbiter = createFeedbackArbiter("squat");
    const items = [candidate("rep.completed", "completed")];
    arbiter(items, 100, "GOOD", "TOP");
    for (const time of [-1, NaN, Infinity, 50])
      expect(arbiter(items, time, "GOOD", "TOP").event).toBeNull();
    expect(arbiter(items, 3100, "GOOD", "TOP").issued).toBe(true);
  });
});
describe("observation guards", () => {
  it.each(["squat", "push_up", "biceps_curl", "jumping_jack"] as const)(
    "uses the configured framing rule for %s",
    (id) => {
      const config = getExerciseConfig(id),
        engine = createFeedbackEngine(
          config,
          config.recommended_view === "either"
            ? "side"
            : config.recommended_view,
        );
      const result = engine.update(
        snapshot([event("REP_INCOMPLETE", 0, "POSE_LOST")], "INSUFFICIENT"),
        0,
      );
      expect(result.decision.selected?.category).toBe("capture");
      expect(Object.keys(en.feedback)).toContain(
        result.decision.selected?.message_key,
      );
      expect(
        result.candidates.some((item) => item.category === "observation"),
      ).toBe(true);
    },
  );
  it("does not infer a camera instability claim from ordinary low visibility", () => {
    const engine = createFeedbackEngine(getExerciseConfig("squat"), "side");
    expect(
      engine
        .update(snapshot([], "INSUFFICIENT"), 0)
        .candidates.map((item) => item.rule_id),
    ).not.toContain("capture.unstable_view");
  });
  it("supports the explicit landmark jump signal and view constraints", () => {
    const engine = createFeedbackEngine(getExerciseConfig("squat"), "side");
    expect(
      engine.update(
        snapshot([event("REP_INCOMPLETE", 0, "LANDMARK_JUMP")], "INSUFFICIENT"),
        0,
      ).decision.selected?.rule_id,
    ).toBe("capture.unstable_view");
    const jack = createFeedbackEngine(
      getExerciseConfig("jumping_jack"),
      "side",
    );
    expect(
      jack
        .update(snapshot([], "INSUFFICIENT"), 0)
        .candidates.map((item) => item.rule_id),
    ).toContain("framing.prefer_front_view");
  });
  function cycle(
    engine: ReturnType<typeof createFeedbackEngine>,
    origin: number,
    range: number,
    quality: AnalyzerSnapshot["pose_quality"] = "GOOD",
    incomplete = false,
  ) {
    engine.update(snapshot([], quality, 170), origin);
    engine.update(
      snapshot([event("REP_STARTED", origin + 40)], quality, 160),
      origin + 40,
    );
    for (let i = 2; i <= 6; i++)
      engine.update(
        snapshot([], quality, i < 4 ? 170 - range : 170),
        origin + i * 40,
      );
    return engine.update(
      snapshot(
        [event(incomplete ? "REP_INCOMPLETE" : "REP_COMPLETED", origin + 280)],
        quality,
        170,
      ),
      origin + 280,
    );
  }
  it("compares only after three GOOD complete baseline cycles in the same session", () => {
    const engine = createFeedbackEngine(getExerciseConfig("squat"), "side");
    for (let i = 0; i < 3; i++)
      expect(cycle(engine, i * 400, 80).observations).toEqual([]);
    const changed = cycle(engine, 1200, 30);
    expect(changed.observations).toHaveLength(1);
    expect(changed.observations[0]).toMatchObject({
      type: "RANGE_VARIATION_OBSERVED",
      rule_id: "consistency.smaller_range",
      metadata: { observed_value: 30, feature: "left_knee_angle_deg" },
    });
    expect(changed.decision.selected?.rule_id).toBe("rep.completed");
    // Consistency waits for the completion caption, and still requires current GOOD data.
    expect(engine.update(snapshot(), 1600).decision.selected).toBeNull();
    expect(engine.update(snapshot(), 3000).decision.selected?.rule_id).toBe(
      "consistency.smaller_range",
    );
  });
  it.each(["LIMITED", "INSUFFICIENT"] as const)(
    "excludes %s cycles from the consistency baseline",
    (quality) => {
      const engine = createFeedbackEngine(getExerciseConfig("squat"), "side");
      for (let i = 0; i < 4; i++) cycle(engine, i * 400, 80, quality);
      expect(cycle(engine, 1600, 30).observations).toEqual([]);
    },
  );
  it("never uses incomplete cycles or gaps as baseline and clears paused observations", () => {
    const engine = createFeedbackEngine(getExerciseConfig("squat"), "side");
    for (let i = 0; i < 4; i++) cycle(engine, i * 400, 80, "GOOD", true);
    expect(cycle(engine, 1600, 30).observations).toEqual([]);
    const paused = engine.update({ ...snapshot(), phase: "PAUSED" }, 2000);
    expect(paused.candidates).toEqual([]);
  });
  it("returns no duplicate candidates/events for duplicate timestamps", () => {
    const engine = createFeedbackEngine(getExerciseConfig("squat"), "side");
    engine.update(snapshot([], "INSUFFICIENT"), 1);
    expect(
      engine.update(snapshot([], "INSUFFICIENT"), 1).decision.event,
    ).toBeNull();
  });
  it("keeps the English catalog descriptive and free of normative claims", () => {
    for (const text of Object.values(en.feedback))
      expect(text).not.toMatch(
        /\b(safe|injur\w*|correct posture|wrong|load|weight|pain|danger\w*)\b/i,
      );
  });
});
describe("speech port", () => {
  function fixture() {
    let now = 0;
    const done: (() => void)[] = [];
    const port = {
      available: vi.fn(() => true),
      cancel: vi.fn(),
      speak: vi.fn((_text, finish) => {
        done.push(finish);
      }),
    };
    const failure = vi.fn();
    return {
      port,
      failure,
      done,
      clock: (time: number) => {
        now = time;
      },
      voice: createVoiceFeedback(port, () => now, failure),
    };
  }
  it("defaults off and never queues a second lower-priority utterance", () => {
    const { voice, port } = fixture();
    const item = candidate("rep.completed", "completed");
    expect(voice.publish(item, "Done")).toBe(false);
    voice.setEnabled(true);
    expect(voice.publish(item, "Done")).toBe(true);
    expect(voice.publish(item, "Done")).toBe(false);
    expect(port.speak).toHaveBeenCalledOnce();
  });
  it("mute cancels immediately and stale callbacks cannot affect new speech", () => {
    const { voice, port, clock, done } = fixture();
    const item = candidate("rep.completed", "completed");
    voice.setEnabled(true);
    voice.publish(item, "Done");
    voice.setEnabled(false);
    expect(port.cancel).toHaveBeenCalledOnce();
    clock(2000);
    voice.setEnabled(true);
    voice.publish(item, "Next");
    done[0]();
    expect(voice.publish(item, "Blocked")).toBe(false);
  });
  it("cancels stale speech for a higher-priority visual observation", () => {
    const { voice, port } = fixture();
    voice.setEnabled(true);
    voice.publish(candidate("rep.completed", "completed"), "Done");
    voice.guard(candidate("framing.arm_hidden", "capture"));
    expect(port.cancel).toHaveBeenCalledOnce();
  });
  it("limits speech frequency across classes and does not replay a backlog", () => {
    const { voice, port, done, clock } = fixture();
    voice.setEnabled(true);
    for (let i = 0; i < 3; i++) {
      clock(i * 2000);
      expect(
        voice.publish(candidate("rep.completed", "completed"), "Done"),
      ).toBe(true);
      done.at(-1)?.();
    }
    clock(6000);
    expect(
      voice.publish(candidate("framing.arm_hidden", "capture"), "Visible"),
    ).toBe(false);
    expect(port.speak).toHaveBeenCalledTimes(3);
    clock(15000);
    expect(
      voice.publish(candidate("framing.arm_hidden", "capture"), "Visible"),
    ).toBe(true);
  });
  it("degrades to visual feedback if speech is unavailable or throws", () => {
    const { voice, port, failure } = fixture();
    port.available.mockReturnValue(false);
    expect(voice.setEnabled(true)).toBe(false);
    port.available.mockReturnValue(true);
    voice.setEnabled(true);
    port.speak.mockImplementation(() => {
      throw new Error("audio unavailable");
    });
    expect(voice.publish(candidate("rep.completed", "completed"), "Done")).toBe(
      false,
    );
    expect(failure).toHaveBeenCalledOnce();
    expect(port.cancel).toHaveBeenCalled();
  });
});

it("compares elbow offsets only across enough GOOD complete cycles with observed arm points", () => {
  const engine = createFeedbackEngine(getExerciseConfig("biceps_curl"), "side");
  const run = (origin: number, x: number, visible = true) => {
    let result: ReturnType<typeof engine.update> | null = null;
    for (let index = 0; index < 8; index++) {
      const timestamp = origin + index * 40;
      const type =
        index === 0 ? "REP_STARTED" : index === 7 ? "REP_COMPLETED" : null;
      result = engine.update(
        {
          ...snapshot(),
          phase: "EXTENDED",
          features: { left_elbow_angle_deg: index < 4 ? 60 : 160 },
          events: type
            ? [{ ...event(type, timestamp), exercise: "biceps_curl" }]
            : [],
        },
        timestamp,
        visible
          ? [
              { index: 11, x: 0.2, y: 0.2, z: 0, visibility: 1, presence: 1 },
              { index: 13, x, y: 0.4, z: 0, visibility: 1, presence: 1 },
            ]
          : [],
      );
    }
    return result;
  };
  for (let index = 0; index < 3; index++)
    expect(run(index * 400, 0.3)?.observations).toEqual([]);
  expect(run(1200, 0.5)?.observations[0]).toMatchObject({
    rule_id: "consistency.elbow_drift",
    quality: "GOOD",
    metadata: { feature: "elbow_shoulder_offset_normalized" },
  });
  expect(run(1600, 0.8, false)?.observations).toEqual([]);
});
