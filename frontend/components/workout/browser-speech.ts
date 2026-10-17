import type { SpeechPort } from "@/features/exercise-engine/voice";
export function createBrowserSpeechPort(): SpeechPort | null {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  )
    return null;
  const synth = window.speechSynthesis;
  const voice = () =>
    synth
      .getVoices()
      .find((item) => item.localService && /^en(?:-|_)/i.test(item.lang));
  return {
    available: () => !!voice(),
    cancel: () => synth.cancel(),
    speak(text, done, failed) {
      const selected = voice();
      if (!selected) {
        failed();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selected;
      utterance.lang = selected.lang;
      utterance.onend = done;
      utterance.onerror = failed;
      synth.speak(utterance);
    },
  };
}
