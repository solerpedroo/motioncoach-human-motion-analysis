import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { normalizeLandmarks } from "@/features/pose-engine/landmarks";
import type {
  WorkerReply,
  WorkerRequest,
} from "@/features/pose-engine/protocol";
import manifest from "../../shared/models/pose-landmarker-lite.json";

let model: PoseLandmarker | null = null;
const reply = (message: WorkerReply) => self.postMessage(message);
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === "init") {
      if (!model) {
        // Next/Turbopack bootstraps a classic worker; use its matching WASM loader.
        const files = await FilesetResolver.forVisionTasks(
          new URL(manifest.wasm_path, request.origin).href,
          false,
        );
        model = await PoseLandmarker.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: new URL(manifest.model_path, request.origin).href,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          outputSegmentationMasks: false,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }
      reply({ type: "ready" });
    } else {
      try {
        if (!model) throw new Error("Pose model is not ready");
        const start = performance.now();
        const result = model.detectForVideo(request.image, request.timestamp);
        reply({
          type: "pose",
          timestamp: request.timestamp,
          latency: performance.now() - start,
          landmarks: normalizeLandmarks(result.landmarks[0] ?? []),
        });
      } finally {
        request.image.close();
      }
    }
  } catch {
    reply({
      type: "error",
      message:
        "Pose runtime failed. Prepare local model assets, use a browser with Web Worker and OffscreenCanvas support, then retry.",
    });
  }
};
