import type { SpeechPort } from "@/features/exercise-engine/voice";
import type { VoiceLanguage } from "@/messages/catalog";

const pattern: Record<VoiceLanguage, RegExp> = {
  en: /^en(?:-|_)/i,
  "pt-BR": /^pt(?:-|_)/i,
};
const fallbackLang: Record<VoiceLanguage, string> = {
  en: "en-US",
  "pt-BR": "pt-BR",
};

export function createBrowserSpeechPort(
  language: () => VoiceLanguage = () => "en",
): SpeechPort | null {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  )
    return null;
  const synth = window.speechSynthesis;
  const pick = () => {
    const voices = synth.getVoices();
    const matches = voices.filter((item) =>
      pattern[language()].test(item.lang),
    );
    return (
      matches.find((item) => item.localService) ??
      matches[0] ??
      voices.find((item) => item.localService) ??
      voices.find((item) => item.default) ??
      voices[0] ??
      null
    );
  };
  return {
    available: () => true,
    cancel: () => synth.cancel(),
    speak(text, done, failed) {
      const selected = pick();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selected?.lang ?? fallbackLang[language()];
      if (selected) utterance.voice = selected;
      utterance.onend = done;
      utterance.onerror = failed;
      synth.resume?.();
      synth.speak(utterance);
    },
  };
}
