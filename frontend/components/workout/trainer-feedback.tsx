import type { FeedbackDecision } from "@/features/exercise-engine/feedback";
import { en } from "@/messages/en";
import styles from "./session.module.css";
export function TrainerFeedback({
  feedback,
  originMs,
}: {
  feedback: FeedbackDecision | null;
  originMs: number;
}) {
  const item = feedback?.selected;
  if (!item) return null;
  return (
    <section
      className={`${styles.panel} ${styles.feedback}`}
      aria-label="Trainer observation"
    >
      <h2>Movement observation</h2>
      <p aria-live="polite">
        {en.feedback[item.message_key as keyof typeof en.feedback]}
      </p>
      <details>
        <summary>Why this observation?</summary>
        <p>
          Rule: {item.rule_id} · Category: {item.category}
        </p>
        {feedback?.context && (
          <p>
            At{" "}
            {Math.max(
              0,
              (feedback.context.timestamp_ms - originMs) / 1000,
            ).toFixed(1)}{" "}
            s elapsed · Pose data: {feedback.context.quality} · Phase:{" "}
            {feedback.context.phase}
          </p>
        )}
        <p>{item.reason.replaceAll("_", " ")}</p>
        {item.feature && (
          <p>
            Feature: {item.feature} · Observed value:{" "}
            {item.observed_value?.toFixed(2) ?? "Not observable"}
          </p>
        )}
      </details>
    </section>
  );
}
