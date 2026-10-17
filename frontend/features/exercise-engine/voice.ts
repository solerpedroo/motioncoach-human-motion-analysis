import { type FeedbackCandidate, feedbackPolicy } from "./feedback";
import type { Clock } from "./types";
export interface SpeechPort {
  available(): boolean;
  speak(text: string, done: () => void, failed: () => void): void;
  cancel(): void;
}
export function createVoiceFeedback(
  port: SpeechPort,
  clock: Clock,
  failed: () => void = () => {},
) {
  let enabled = false,
    token = 0;
  let speaking: FeedbackCandidate | null = null;
  let starts: number[] = [];
  let previousTime = -Infinity;
  const cancel = () => {
    token++;
    speaking = null;
    port.cancel();
  };
  return {
    cancel,
    guard(candidate: FeedbackCandidate | null) {
      if (
        candidate &&
        speaking &&
        feedbackPolicy.classes[candidate.category] <
          feedbackPolicy.classes[speaking.category]
      )
        cancel();
    },
    setEnabled(value: boolean) {
      enabled = value && port.available();
      if (!enabled) cancel();
      return enabled;
    },
    publish(candidate: FeedbackCandidate, text: string) {
      const now = clock();
      if (
        !enabled ||
        !port.available() ||
        !Number.isFinite(now) ||
        now < previousTime
      )
        return false;
      previousTime = now;
      if (speaking) {
        if (
          feedbackPolicy.classes[candidate.category] >=
          feedbackPolicy.classes[speaking.category]
        )
          return false;
        cancel();
      }
      starts = starts.filter(
        (time) => time > now - feedbackPolicy.voice.window_ms,
      );
      if (
        starts.length >= feedbackPolicy.voice.maximum_utterances ||
        (starts.length &&
          now - starts[starts.length - 1] <
            feedbackPolicy.voice.minimum_interval_ms)
      )
        return false;
      const currentToken = ++token;
      speaking = candidate;
      starts.push(now);
      try {
        port.speak(
          text,
          () => {
            if (token === currentToken) speaking = null;
          },
          () => {
            if (token !== currentToken) return;
            enabled = false;
            cancel();
            failed();
          },
        );
        return true;
      } catch {
        enabled = false;
        cancel();
        failed();
        return false;
      }
    },
  };
}
