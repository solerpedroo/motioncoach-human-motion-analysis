import { afterEach, describe, expect, it, vi } from "vitest";
import { drawPose, projectPoint } from "@/components/pose-overlay/draw";
import { cameraError, createCamera } from "@/features/pose-engine/camera";
import { normalizeLandmarks } from "@/features/pose-engine/landmarks";
import { createSessionMetrics } from "@/features/pose-engine/metrics";
import type { WorkerReply } from "@/features/pose-engine/protocol";
import {
  createPoseClient,
  type PoseWorker,
} from "@/features/pose-engine/worker-client";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fakeStream() {
  const stop = vi.fn();
  return {
    stop,
    stream: { getTracks: () => [{ stop }] } as unknown as MediaStream,
  };
}
function fakeWorker(): PoseWorker & { send: (data: WorkerReply) => void } {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
    send(data) {
      this.onmessage?.({ data } as unknown as MessageEvent<WorkerReply>);
    },
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("camera ownership", () => {
  it("requests video only with a bounded initial resolution and releases all tracks", async () => {
    const { stream, stop } = fakeStream();
    const media = {
      getUserMedia: vi.fn().mockResolvedValue(stream),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([
          { kind: "audioinput" },
          { kind: "videoinput", deviceId: "cam" },
        ]),
    };
    const camera = createCamera(media);
    expect(await camera.open()).toBe(stream);
    expect(media.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: { width: { ideal: 640 }, height: { ideal: 480 } },
    });
    expect(await camera.devices()).toEqual([
      { kind: "videoinput", deviceId: "cam" },
    ]);
    camera.stop();
    camera.stop();
    expect(stop).toHaveBeenCalledTimes(1);
  });
  it("stops old camera before switching to an exact device", async () => {
    const first = fakeStream(),
      second = fakeStream();
    const media = {
      getUserMedia: vi
        .fn()
        .mockResolvedValueOnce(first.stream)
        .mockImplementationOnce(() => {
          expect(first.stop).toHaveBeenCalledOnce();
          return Promise.resolve(second.stream);
        }),
      enumerateDevices: vi.fn(),
    };
    const camera = createCamera(media);
    await camera.open();
    await camera.open("usb");
    expect(media.getUserMedia.mock.calls[1][0]).toMatchObject({
      audio: false,
      video: { deviceId: { exact: "usb" } },
    });
    camera.stop();
    expect(second.stop).toHaveBeenCalledOnce();
  });
  it("releases permission arriving after stop or unmount", async () => {
    const late = fakeStream();
    const permission = deferred<MediaStream>();
    const camera = createCamera({
      getUserMedia: () => permission.promise,
      enumerateDevices: vi.fn(),
    });
    const opening = camera.open();
    camera.stop();
    permission.resolve(late.stream);
    expect(await opening).toBeNull();
    expect(late.stop).toHaveBeenCalledOnce();
  });
  it("ignores a superseded permission without stopping the new stream", async () => {
    const a = deferred<MediaStream>(),
      b = deferred<MediaStream>();
    const first = fakeStream(),
      second = fakeStream();
    const camera = createCamera({
      getUserMedia: vi
        .fn()
        .mockReturnValueOnce(a.promise)
        .mockReturnValueOnce(b.promise),
      enumerateDevices: vi.fn(),
    });
    const old = camera.open("a"),
      current = camera.open("b");
    b.resolve(second.stream);
    await current;
    a.resolve(first.stream);
    expect(await old).toBeNull();
    expect(first.stop).toHaveBeenCalledOnce();
    expect(second.stop).not.toHaveBeenCalled();
    camera.stop();
  });
  it.each([
    "NotAllowedError",
    "SecurityError",
    "NotFoundError",
    "NotReadableError",
    "OverconstrainedError",
  ])("provides recovery for %s", async (name) => {
    const error = new DOMException("failed", name);
    const camera = createCamera({
      getUserMedia: vi.fn().mockRejectedValue(error),
      enumerateDevices: vi.fn(),
    });
    await expect(camera.open()).rejects.toBe(error);
    expect(cameraError(error)).toMatch(/try again/);
    camera.stop();
  });
});
describe("one-slot worker transport", () => {
  it("initializes once, waits for ready, drops busy frames, then samples again", async () => {
    const worker = fakeWorker(),
      image = { close: vi.fn() } as unknown as ImageBitmap;
    const bitmap = vi.fn().mockResolvedValue(image),
      receive = vi.fn();
    const client = createPoseClient(
      worker,
      "http://localhost",
      receive,
      bitmap,
    );
    const video = {} as HTMLVideoElement;
    expect(await client.capture(video, 1)).toBe(false);
    expect(bitmap).not.toHaveBeenCalled();
    worker.send({ type: "ready" });
    expect(await client.capture(video, 2)).toBe(true);
    expect(await client.capture(video, 3)).toBe(false);
    expect(bitmap).toHaveBeenCalledTimes(1);
    worker.send({ type: "pose", timestamp: 2, latency: 8, landmarks: [] });
    expect(await client.capture(video, 4)).toBe(true);
    expect(worker.postMessage).toHaveBeenCalledTimes(3);
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      { type: "frame", image, timestamp: 4 },
      [image],
    );
    client.stop();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("owns the slot during bitmap creation and closes late bitmaps", async () => {
    const worker = fakeWorker(),
      pending = deferred<ImageBitmap>();
    const close = vi.fn();
    const bitmap = vi.fn().mockReturnValue(pending.promise),
      receive = vi.fn();
    const client = createPoseClient(
      worker,
      "http://localhost",
      receive,
      bitmap,
    );
    worker.send({ type: "ready" });
    const first = client.capture({} as HTMLVideoElement, 1);
    expect(await client.capture({} as HTMLVideoElement, 2)).toBe(false);
    const saved = worker.onmessage;
    client.stop();
    pending.resolve({ close } as unknown as ImageBitmap);
    expect(await first).toBe(false);
    expect(close).toHaveBeenCalledOnce();
    saved?.({
      data: { type: "pose", timestamp: 1, latency: 1, landmarks: [] },
    } as unknown as MessageEvent<WorkerReply>);
    expect(receive).toHaveBeenCalledTimes(1);
  });
  it.each(["init", "frame", "bitmap"])(
    "times out %s without retaining a worker",
    async (stage) => {
      vi.useFakeTimers();
      const worker = fakeWorker(),
        receive = vi.fn();
      const bitmap =
        stage === "bitmap"
          ? vi.fn().mockReturnValue(new Promise(() => {}))
          : vi.fn().mockResolvedValue({ close: vi.fn() });
      const client = createPoseClient(
        worker,
        "http://localhost",
        receive,
        bitmap,
      );
      if (stage !== "init") {
        worker.send({ type: "ready" });
        void client.capture({} as HTMLVideoElement, 1);
        await Promise.resolve();
      }
      await vi.advanceTimersByTimeAsync(30000);
      expect(worker.terminate).toHaveBeenCalledOnce();
      expect(receive).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "error" }),
      );
    },
  );
  it("releases a bitmap when posting throws", async () => {
    const worker = fakeWorker(),
      receive = vi.fn(),
      close = vi.fn();
    const client = createPoseClient(
      worker,
      "http://localhost",
      receive,
      vi.fn().mockResolvedValue({ close }),
    );
    worker.send({ type: "ready" });
    vi.mocked(worker.postMessage).mockImplementation(() => {
      throw new Error("transfer failed");
    });
    expect(await client.capture({} as HTMLVideoElement, 1)).toBe(false);
    expect(close).toHaveBeenCalledOnce();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("terminates on worker errors with a recoverable message", () => {
    const worker = fakeWorker(),
      receive = vi.fn();
    createPoseClient(worker, "http://localhost", receive, vi.fn());
    worker.onerror?.({} as ErrorEvent);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(receive).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});
describe("measurements and overlay", () => {
  it("reports only measured samples and expires a rolling two-second window", () => {
    const metrics = createSessionMetrics();
    expect(metrics.snapshot(0)).toEqual({
      capture_fps: null,
      inference_fps: null,
      latency_ms: null,
    });
    metrics.capture(0);
    metrics.inference(0, 10);
    expect(metrics.snapshot(0).capture_fps).toBeNull();
    metrics.capture(100);
    metrics.capture(200);
    metrics.inference(200, 30);
    expect(metrics.snapshot(200)).toEqual({
      capture_fps: 10,
      inference_fps: 5,
      latency_ms: 20,
    });
    expect(metrics.snapshot(2200)).toEqual({
      capture_fps: null,
      inference_fps: null,
      latency_ms: null,
    });
  });
  it("preserves indices, depth and confidence, omits invalid/out-of-frame points", () => {
    const points = normalizeLandmarks([
      { x: 1.1, y: 0.2, z: 0 },
      { x: 0.4, y: 0.2, z: -0.1, visibility: 0.9 },
      { x: 0.3, y: 0.2, z: NaN },
    ]);
    expect(points).toEqual([
      { index: 1, x: 0.4, y: 0.2, z: -0.1, visibility: 0.9, presence: null },
    ]);
  });
  it("projects in native image space without mirroring engine coordinates", () => {
    const point = { x: 0.25, y: 0.75 };
    expect(projectPoint(point, 1280, 720)).toEqual({ x: 320, y: 540 });
    expect(point.x).toBe(0.25);
  });
  it("draws only visible connected joints and clears the previous pose", () => {
    const context = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };
    drawPose(
      context as unknown as CanvasRenderingContext2D,
      [
        { index: 11, x: 0.2, y: 0.2, z: 0, visibility: 1, presence: null },
        { index: 12, x: 0.8, y: 0.2, z: 0, visibility: 0, presence: null },
      ],
      640,
      480,
    );
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
    expect(context.stroke).not.toHaveBeenCalled();
    expect(context.arc).toHaveBeenCalledOnce();
  });
});
