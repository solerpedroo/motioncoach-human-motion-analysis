import type { Landmark } from "@/lib/contracts.generated";
export type WorkerRequest =
  | { type: "init"; origin: string }
  | { type: "frame"; image: ImageBitmap; timestamp: number };
export type WorkerReply =
  | { type: "ready" }
  | { type: "error"; message: string }
  | { type: "pose"; timestamp: number; latency: number; landmarks: Landmark[] };
