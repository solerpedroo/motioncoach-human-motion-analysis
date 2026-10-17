import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import type { AnalyzerSnapshot } from "@/features/exercise-engine/exercise-analyzer";
import { createSessionStore } from "@/features/session-store/indexeddb";
import { createSessionRecorder } from "@/features/session-store/session-recorder";
import { parseLocalSession } from "@/features/session-store/validation";
import type { SessionEvent } from "@/lib/contracts.generated";

function snapshot(
  time: number,
  quality: AnalyzerSnapshot["pose_quality"] = "GOOD",
  type?: SessionEvent["type"],
  reason?: string,
): AnalyzerSnapshot {
  return {
    phase: "STANDING",
    selected_side: "left",
    completed_repetitions: type === "REP_COMPLETED" ? 1 : 0,
    incomplete_repetitions: type === "REP_INCOMPLETE" ? 1 : 0,
    pose_quality: quality,
    features: { left_knee_angle_deg: type === "REP_STARTED" ? 140 : 170 },
    feedback_candidates: [],
    events: type
      ? [
          {
            schema_version: "1.0.0",
            timestamp_ms: time,
            exercise: "squat",
            type,
            rule_id: "test.synthetic",
            quality,
            rep_index: type === "REP_COMPLETED" ? 1 : null,
            metadata: { phase: "STANDING", reason },
          },
        ]
      : [],
  };
}
const identity = {
  id: "test-session",
  exercise: "squat",
  camera_view: "side",
  started_at: "2026-10-17T12:00:00Z",
  origin_ms: 1000,
} as const;
function completed(id: string = identity.id) {
  const recorder = createSessionRecorder({ ...identity, id });
  recorder.consume(snapshot(1000), 1000);
  recorder.consume(snapshot(1100, "GOOD", "REP_STARTED"), 1100);
  recorder.consume(
    { ...snapshot(1200), features: { left_knee_angle_deg: 80 } },
    1200,
  );
  recorder.consume(snapshot(1300), 1300);
  recorder.consume(snapshot(1500, "GOOD", "REP_COMPLETED"), 1500);
  return recorder.finish(1600, "user_stopped");
}
describe("session aggregation", () => {
  it("produces the normative summary with relative events and measured statistics", () => {
    const record = completed();
    expect(parseLocalSession(record)).toEqual(record);
    expect(record.summary).toMatchObject({
      completed_repetitions: 1,
      duration_ms: 600,
      pose_coverage_ratio: 500 / 600,
      source: "webcam",
      configuration_version: "0.1.0+feedback.0.1.0",
      model_version: "float16/1",
      evaluation: { status: "not_evaluated" },
    });
    expect(record.summary.events.map((event) => event.timestamp_ms)).toEqual([
      100, 500, 600,
    ]);
    expect(record.metrics).toMatchObject({
      active_duration_ms: 600,
      paused_duration_ms: 0,
      repetitions_per_minute: 100,
      mean_repetition_duration_ms: 400,
      mean_observed_range_deg: 90,
    });
    expect(record.final_phase).toBe("STANDING");
  });
  it("excludes pause and long gaps from coverage without inventing observations", () => {
    const recorder = createSessionRecorder(identity);
    recorder.consume(snapshot(1000), 1000);
    recorder.consume(snapshot(1100), 1100);
    recorder.pause({ ...snapshot(1200), phase: "PAUSED" }, 1200);
    recorder.resume(snapshot(2200), 2200);
    recorder.consume(snapshot(2300), 2300);
    recorder.consume(snapshot(2400), 2400);
    recorder.consume(snapshot(2800), 2800);
    recorder.consume(snapshot(2900, "INSUFFICIENT"), 2900);
    const record = recorder.finish(3000, "stopped");
    expect(record.metrics).toMatchObject({
      active_duration_ms: 1000,
      paused_duration_ms: 1000,
    });
    expect(record.summary.pose_coverage_ratio).toBe(0.2);
  });
  it("keeps metrics unavailable for zero duration or no observed cycles", () => {
    const record = createSessionRecorder(identity).finish(1000, "stopped");
    expect(record.summary.pose_coverage_ratio).toBeNull();
    expect(record.metrics.repetitions_per_minute).toBeNull();
    expect(record.metrics.mean_repetition_duration_ms).toBeNull();
  });
  it.each([
    ["POSE_LOST", 1],
    ["LOW_VISIBILITY", 1],
    ["long_gap", 1],
    ["session_paused", 0],
    ["short_cycle", 0],
  ] as const)(
    "classifies discarded cycles for reason %s",
    (reason, discarded) => {
      const recorder = createSessionRecorder(identity);
      recorder.consume(
        snapshot(1100, "INSUFFICIENT", "REP_INCOMPLETE", reason),
        1100,
      );
      const record = recorder.finish(1200, "stopped");
      expect(record.summary.incomplete_repetitions).toBe(1);
      expect(record.summary.discarded_repetitions).toBe(discarded);
    },
  );
  it("finishes idempotently, isolates results and ignores later samples", () => {
    const recorder = createSessionRecorder(identity);
    recorder.consume(snapshot(1000), 1000);
    const first = recorder.finish(1200, "stopped");
    first.summary.events.length = 0;
    recorder.consume(snapshot(1300, "GOOD", "REP_COMPLETED"), 1300);
    expect(recorder.finish(2000, "stopped").summary.events).toHaveLength(1);
    expect(recorder.finish(2000, "stopped").summary.duration_ms).toBe(200);
  });
  it("rejects invalid time and bounds events while preserving totals", () => {
    const recorder = createSessionRecorder(identity);
    for (const time of [999, NaN, Infinity])
      expect(() => recorder.consume(snapshot(time), time)).toThrow(RangeError);
    for (let i = 0; i < 5001; i++)
      recorder.consume(snapshot(1000 + i, "GOOD", "POSE_RECOVERED"), 1000 + i);
    const record = recorder.finish(7000, "stopped");
    expect(record.summary.events).toHaveLength(5000);
    expect(record.metrics.events_omitted).toBe(2);
    expect(record.summary.events.at(-1)?.type).toBe("SESSION_FINISHED");
  });
});
describe("explicit local history", () => {
  it("does not open IndexedDB without save consent", async () => {
    const factory = new IDBFactory(),
      open = vi.spyOn(factory, "open");
    await expect(
      createSessionStore(factory).save(completed(), false),
    ).rejects.toThrow("Choose to save");
    expect(open).not.toHaveBeenCalled();
  });
  it("persists across instances, without raw media or an active session", async () => {
    const factory = new IDBFactory();
    await createSessionStore(factory).save(completed(), true);
    const records = await createSessionStore(factory).list();
    expect(records).toHaveLength(1);
    expect(records[0].summary.completed_repetitions).toBe(1);
    expect(JSON.stringify(records)).not.toMatch(
      /landmarks|data:image|MediaStream|frames/,
    );
  });
  it("upserts, finds and removes individual and all summaries", async () => {
    const factory = new IDBFactory(),
      store = createSessionStore(factory);
    await store.save(completed("a"), true);
    await store.save(completed("a"), true);
    await store.save(completed("b"), true);
    expect(await store.list()).toHaveLength(2);
    expect((await store.get("a"))?.storage_version).toBe(1);
    expect(await store.get("absent")).toBeNull();
    await store.remove("a");
    expect(
      (await createSessionStore(factory).list()).map(
        (record) => record.summary.id,
      ),
    ).toEqual(["b"]);
    await store.clear();
    expect(await createSessionStore(factory).list()).toEqual([]);
  });
  it("rejects unsupported versions, raw-data fields and inconsistent timing", async () => {
    const store = createSessionStore(new IDBFactory());
    for (const value of [
      { ...completed(), storage_version: 2 },
      { ...completed(), landmarks: [] },
      {
        ...completed(),
        metrics: { ...completed().metrics, active_duration_ms: Infinity },
      },
      {
        ...completed(),
        summary: { ...completed().summary, video: "data:video" },
      },
    ])
      await expect(
        store.save(value as ReturnType<typeof completed>, true),
      ).rejects.toThrow();
    const bad = completed();
    bad.summary.events[0].timestamp_ms = bad.summary.duration_ms + 1;
    expect(() => parseLocalSession(bad)).toThrow("inconsistent");
    expect(await store.list()).toEqual([]);
  });
  it("reports unavailable or denied browser storage", async () => {
    await expect(
      createSessionStore(undefined).save(completed(), true),
    ).rejects.toThrow("unavailable");
    const factory = new IDBFactory();
    vi.spyOn(factory, "open").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    await expect(
      createSessionStore(factory).save(completed(), true),
    ).rejects.toThrow();
  });
});
