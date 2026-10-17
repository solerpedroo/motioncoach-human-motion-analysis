import type { WorkerReply, WorkerRequest } from "./protocol";
export interface PoseWorker {
  postMessage(message: WorkerRequest, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}
// At most one snapshot, including asynchronous bitmap creation, exists in flight.
// Busy frames are dropped: the next free slot samples the current video, never a backlog.
export function createPoseClient(
  worker: PoseWorker,
  origin: string,
  receive: (reply: WorkerReply) => void,
  bitmap = createImageBitmap,
) {
  let alive = true;
  let busy = false;
  let ready = false;
  let epoch = 0;
  let timer: ReturnType<typeof setTimeout>;
  const fail = () => {
    if (!alive) return;
    stop();
    receive({
      type: "error",
      message:
        "Pose worker timed out or failed. Check local model assets and browser support, then retry.",
    });
  };
  const armTimeout = () => {
    clearTimeout(timer);
    timer = setTimeout(fail, 30000);
  };
  function stop() {
    if (!alive) return;
    alive = false;
    epoch++;
    clearTimeout(timer);
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
  }
  worker.onmessage = ({ data }) => {
    if (!alive) return;
    clearTimeout(timer);
    if (data.type === "ready") ready = true;
    if (data.type === "error") {
      stop();
      receive(data);
      return;
    }
    if (data.type === "pose") busy = false;
    receive(data);
  };
  worker.onerror = fail;
  armTimeout();
  try {
    worker.postMessage({ type: "init", origin });
  } catch {
    fail();
  }
  return {
    stop,
    // Pause invalidates an outstanding result in the caller; in-flight work still owns the slot.
    async capture(video: HTMLVideoElement, timestamp: number) {
      if (!alive || !ready || busy) return false;
      busy = true;
      const token = epoch;
      let image: ImageBitmap | null = null;
      armTimeout();
      try {
        image = await bitmap(video);
        if (!alive || token !== epoch) {
          image.close();
          return false;
        }
        armTimeout();
        worker.postMessage({ type: "frame", image, timestamp }, [image]);
        return true;
      } catch {
        image?.close();
        fail();
        return false;
      }
    },
  };
}
