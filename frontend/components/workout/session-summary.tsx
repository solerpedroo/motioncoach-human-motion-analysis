"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LocalSession } from "@/features/session-store/session-recorder";
import { en } from "@/messages/en";
import styles from "./session.module.css";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const number = (value: number | null, unit = "") =>
  value === null ? "Not measured" : `${value.toFixed(1)}${unit}`;
export function SessionSummaryView({ session }: { session: LocalSession }) {
  const { summary, metrics } = session;
  return (
    <section className={styles.panel} aria-label="Workout summary">
      <h2>Workout summary</h2>
      <p>
        {summary.exercise.replaceAll("_", " ")} ·{" "}
        {new Date(summary.started_at).toLocaleString("en-US")}
      </p>
      <dl className={styles.metrics}>
        <div>
          <dt>Complete repetitions</dt>
          <dd>{summary.completed_repetitions}</dd>
        </div>
        <div>
          <dt>Incomplete repetitions</dt>
          <dd>{summary.incomplete_repetitions}</dd>
        </div>
        <div>
          <dt>Incomplete due to unavailable data</dt>
          <dd>{summary.discarded_repetitions}</dd>
        </div>
        <div>
          <dt>Elapsed time</dt>
          <dd>{seconds(summary.duration_ms)}</dd>
        </div>
        <div>
          <dt>Active time</dt>
          <dd>{seconds(metrics.active_duration_ms)}</dd>
        </div>
        <div>
          <dt>Paused time</dt>
          <dd>{seconds(metrics.paused_duration_ms)}</dd>
        </div>
        <div>
          <dt>Observed pose coverage</dt>
          <dd>
            {summary.pose_coverage_ratio === null
              ? "Not measured"
              : `${(summary.pose_coverage_ratio * 100).toFixed(1)}%`}
          </dd>
        </div>
        <div>
          <dt>Repetitions per active minute</dt>
          <dd>{number(metrics.repetitions_per_minute)}</dd>
        </div>
        <div>
          <dt>Mean complete cycle duration</dt>
          <dd>
            {metrics.mean_repetition_duration_ms === null
              ? "Not measured"
              : seconds(metrics.mean_repetition_duration_ms)}
          </dd>
        </div>
        <div>
          <dt>Mean observed angular range</dt>
          <dd>{number(metrics.mean_observed_range_deg, "°")}</dd>
        </div>
        <div>
          <dt>Last observed phase</dt>
          <dd>{session.final_phase}</dd>
        </div>
        <div>
          <dt>Fixed side / camera view</dt>
          <dd>
            {summary.selected_side ?? "Not acquired"} / {summary.camera_view}
          </dd>
        </div>
      </dl>
      <p className={styles.note}>
        Coverage measures time with observable data, excluding pauses and
        unobserved gaps. Unavailable-data cycles are a subset of incomplete
        repetitions. Range describes the observed angle within complete cycles.
      </p>
      <details>
        <summary>
          Events and observation details ({summary.events.length})
        </summary>
        {metrics.events_omitted > 0 && (
          <p>
            {metrics.events_omitted} older events omitted from this bounded
            history.
          </p>
        )}
        <ol className={styles.events}>
          {summary.events.map((event) => (
            <li
              key={`${event.timestamp_ms}-${event.type}-${event.rule_id}-${event.metadata.feature ?? ""}`}
            >
              <details>
                <summary>
                  {seconds(event.timestamp_ms)} ·{" "}
                  {event.type.replaceAll("_", " ")}
                </summary>
                <p>
                  {en.feedback[
                    event.metadata.message_key as keyof typeof en.feedback
                  ] ?? event.rule_id}
                </p>
                <p>
                  Rule: {event.rule_id} · Phase:{" "}
                  {event.metadata.phase ?? "Not observed"} · Pose data:{" "}
                  {event.quality}
                </p>
                {event.metadata.feature && (
                  <p>
                    Observed feature: {event.metadata.feature} · Value:{" "}
                    {number(event.metadata.observed_value ?? null)}
                  </p>
                )}
                {event.metadata.reason && (
                  <p>Reason: {event.metadata.reason.replaceAll("_", " ")}</p>
                )}
              </details>
            </li>
          ))}
        </ol>
      </details>
      <details>
        <summary>Method and limitations</summary>
        <p>
          Algorithm {summary.algorithm_version} · Configuration{" "}
          {summary.configuration_version} · Model {summary.model_variant}{" "}
          {summary.model_version}
        </p>
        <p>
          {summary.evaluation.status}: {summary.evaluation.reason}
        </p>
        <p>
          Configuration hash: {summary.configuration_sha256 ?? "Not recorded"}.
          Model SHA-256: {summary.model_asset_sha256}
        </p>
      </details>
    </section>
  );
}
export function SaveSession({ session }: { session: LocalSession }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const save = async () => {
    setStatus("saving");
    setError("");
    try {
      const { createSessionStore } = await import(
        "@/features/session-store/indexeddb"
      );
      await createSessionStore().save(session, true);
      setStatus("saved");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Summary could not be saved. Try again.",
      );
      setStatus("error");
    }
  };
  return (
    <section className={styles.panel} aria-label="Save session choice">
      <h2>Keep this summary?</h2>
      <p>
        Nothing is saved automatically. Saving keeps counts, metrics and events
        in this browser, without video or landmarks. Leaving without saving
        discards this summary.
      </p>
      <div className={styles.actions}>
        <Button
          disabled={status === "saving" || status === "saved"}
          onClick={() => void save()}
        >
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Summary saved"
              : "Save summary in this browser"}
        </Button>
        <Link href="/dashboard">View local history</Link>
      </div>
      <p aria-live="polite">
        {error ||
          (status === "saved"
            ? "Summary saved in this browser. You can delete it from local history."
            : "This summary has not been saved.")}
      </p>
    </section>
  );
}
