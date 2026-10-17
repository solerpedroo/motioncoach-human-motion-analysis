import type { SessionSummary } from "@/lib/contracts.generated";

export type ExerciseId = SessionSummary["exercise"];
export const exercises = [
  {
    id: "squat",
    name: "Squat",
    category: "Lower body",
    view: "Side view",
    joints: "Shoulder, hip, knee and ankle",
    detail:
      "Keep your full body in frame. A side view lets us observe knee and hip angles.",
    limitation:
      "A single view cannot describe joint alignment in three dimensions.",
    number: "01",
  },
  {
    id: "push_up",
    name: "Push-up",
    category: "Upper body",
    view: "Side view",
    joints: "Shoulder, elbow, wrist, hip and ankle",
    detail:
      "Place the camera near torso height, with your whole body visible from the side.",
    limitation:
      "Video cannot determine load distribution or contact with the floor.",
    number: "02",
  },
  {
    id: "biceps_curl",
    name: "Biceps curl",
    category: "Upper body",
    view: "Side or front view",
    joints: "Shoulder, elbow and wrist of the selected arm",
    detail:
      "Choose an arm before your session and keep it visible throughout the movement.",
    limitation:
      "The observed angle does not measure weight, muscle effort or training load.",
    number: "03",
  },
  {
    id: "jumping_jack",
    name: "Jumping jack",
    category: "Full body",
    view: "Front view",
    joints: "Both shoulders, elbows, hips and ankles",
    detail:
      "Face the camera and leave room for both arms and both feet to stay in frame.",
    limitation:
      "A front view does not measure jump height or confirm that your feet left the ground.",
    number: "04",
  },
] as const satisfies readonly {
  id: ExerciseId;
  name: string;
  category: string;
  view: string;
  joints: string;
  detail: string;
  limitation: string;
  number: string;
}[];
