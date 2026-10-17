import { en } from "./en";
import { ptFeedback } from "./pt";

export type VoiceLanguage = "en" | "pt-BR";
export const voiceLanguages: { value: VoiceLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt-BR", label: "Português" },
];

export function feedbackText(language: VoiceLanguage, key: string) {
  if (language === "pt-BR" && key in ptFeedback) {
    return ptFeedback[key as keyof typeof ptFeedback];
  }
  if (key in en.feedback) return en.feedback[key as keyof typeof en.feedback];
  return "";
}
