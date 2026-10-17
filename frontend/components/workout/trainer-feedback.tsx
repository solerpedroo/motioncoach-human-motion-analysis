import type { FeedbackDecision } from "@/features/exercise-engine/feedback";
import { feedbackText, type VoiceLanguage } from "@/messages/catalog";
import styles from "./session.module.css";
export function TrainerFeedback({
  feedback,
  originMs,
  language = "en",
}: {
  feedback: FeedbackDecision | null;
  originMs: number;
  language?: VoiceLanguage;
}) {
  const item = feedback?.selected;
  if (!item) return null;
  return (
    <section
      className={`${styles.panel} ${styles.feedback}`}
      aria-label="Trainer observation"
    >
      <h2>
        {language === "pt-BR"
          ? "Observação do movimento"
          : "Movement observation"}
      </h2>
      <p aria-live="polite">{feedbackText(language, item.message_key)}</p>
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
