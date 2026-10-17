import type { en } from "./en";

export const ptFeedback = {
  "framing.joints_hidden": "Deixe joelhos e quadris visíveis.",
  "framing.arm_hidden": "Mantenha o braço escolhido visível.",
  "framing.prefer_side_view": "Tente posicionar a câmera de lado.",
  "framing.full_body_front": "Mantenha os dois braços e os dois pés visíveis.",
  "framing.prefer_front_view": "Use a câmera de frente para este exercício.",
  "rep.not_fully_observed": "O movimento não foi observado por completo.",
  "rep.partial_movement": "Movimento parcial detectado.",
  "rep.completed": "Repetição concluída.",
  "capture.unstable_view": "Tente um ângulo de câmera mais estável.",
  "consistency.smaller_range":
    "Esta repetição teve uma amplitude observada menor.",
  "consistency.elbow_drift":
    "A posição do cotovelo variou entre as repetições.",
} as const satisfies Record<keyof typeof en.feedback, string>;
