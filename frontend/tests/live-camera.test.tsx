import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LiveWorkout } from "@/components/camera/live-workout";
import type {
  WorkerReply,
  WorkerRequest,
} from "@/features/pose-engine/protocol";
import fixture from "../../shared/fixtures/repetitions/landmarks.json";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<WorkerReply>) => void) | null = null;
  onerror = null;
  terminate = vi.fn();
  postMessage = vi.fn<(request: WorkerRequest) => void>();
  constructor() {
    FakeWorker.instances.push(this);
  }
  send(data: WorkerReply) {
    this.onmessage?.({ data } as MessageEvent<WorkerReply>);
  }
}
let clock = 100;
let raf: FrameRequestCallback | null;
let stopTrack: ReturnType<typeof vi.fn>;
let track: EventTarget;
let media: {
  getUserMedia: ReturnType<typeof vi.fn>;
  enumerateDevices: ReturnType<typeof vi.fn>;
};
let stream: MediaStream;
const context = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
};
beforeEach(() => {
  clock = 100;
  raf = null;
  FakeWorker.instances = [];
  stopTrack = vi.fn();
  track = new EventTarget();
  Object.assign(track, { stop: stopTrack });
  stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  media = {
    getUserMedia: vi.fn().mockResolvedValue(stream),
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([
        { kind: "videoinput", deviceId: "usb", label: "USB camera" },
      ]),
  };
  vi.stubGlobal("navigator", { mediaDevices: media });
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("OffscreenCanvas", class {});
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ close: vi.fn() }),
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback) => {
      raf = callback;
      return 1;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function start() {
  fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
  await act(async () => {});
  const worker = FakeWorker.instances.at(-1);
  expect(worker).toBeDefined();
  act(() => worker?.send({ type: "ready" }));
  return worker as FakeWorker;
}
async function tick(time: number) {
  clock = time;
  await act(async () => {
    raf?.(time);
  });
}
function prepareVideo() {
  const video = screen.getByLabelText(
    "Local camera preview",
  ) as HTMLVideoElement;
  Object.defineProperties(video, {
    readyState: { configurable: true, value: 2 },
    videoWidth: { configurable: true, value: 640 },
    videoHeight: { configurable: true, value: 480 },
  });
  return video;
}
it("opens only on explicit user action and exposes a shared mirrored image layer", () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  render(<LiveWorkout />);
  expect(media.getUserMedia).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  const video = screen.getByLabelText("Local camera preview"),
    canvas = screen.getByLabelText("Pose skeleton overlay");
  expect(video.parentElement).toBe(canvas.parentElement);
  expect(video.parentElement?.className).toContain("mirrored");
  fireEvent.click(screen.getByRole("checkbox", { name: "Mirror preview" }));
  expect(video.parentElement?.className).not.toContain("mirrored");
});
it("starts a VIDEO worker session, pauses, resumes UNCERTAIN, and releases on stop", async () => {
  render(<LiveWorkout />);
  const worker = await start();
  expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({
    type: "init",
    origin: window.location.origin,
  });
  expect(screen.getByText("Camera on · video only")).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Exercise" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  expect(screen.getByText("PAUSED")).toBeVisible();
  expect(stopTrack).not.toHaveBeenCalled();
  clock += 10;
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  expect(screen.getByText("UNCERTAIN")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Stop camera" }));
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(screen.getByText("Camera off")).toBeVisible();
});
it("switching camera stops the session before requesting the new device", async () => {
  render(<LiveWorkout />);
  const worker = await start();
  fireEvent.change(screen.getByRole("combobox", { name: "Camera" }), {
    target: { value: "usb" },
  });
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(media.getUserMedia).toHaveBeenCalledTimes(1);
  await start();
  expect(media.getUserMedia).toHaveBeenLastCalledWith(
    expect.objectContaining({
      audio: false,
      video: expect.objectContaining({ deviceId: { exact: "usb" } }),
    }),
  );
});
it("unmount releases active camera and worker", async () => {
  const view = render(<LiveWorkout />);
  const worker = await start();
  view.unmount();
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(worker.terminate).toHaveBeenCalledOnce();
});
it("cancelled pending permission releases its late stream", async () => {
  let resolve!: (value: MediaStream) => void;
  media.getUserMedia.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(<LiveWorkout />);
  fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
  expect(screen.getByRole("status")).toHaveTextContent("Allow camera access");
  fireEvent.click(screen.getByRole("button", { name: "Stop camera" }));
  await act(async () => {
    resolve(stream);
  });
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(FakeWorker.instances).toHaveLength(0);
  expect(screen.getByText("Camera off")).toBeVisible();
});
it("permission denial shows an actionable retry without creating a worker", async () => {
  media.getUserMedia.mockRejectedValue(
    new DOMException("no", "NotAllowedError"),
  );
  render(<LiveWorkout />);
  fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
  await act(async () => {});
  expect(screen.getByRole("status")).toHaveTextContent(
    "Camera permission denied",
  );
  expect(screen.getByRole("button", { name: "Retry camera" })).toBeEnabled();
  expect(FakeWorker.instances).toHaveLength(0);
});
it("model failure and disconnected tracks release camera and offer retry", async () => {
  render(<LiveWorkout />);
  const worker = await start();
  act(() =>
    worker.send({
      type: "error",
      message: "Model unavailable. Prepare assets and retry.",
    }),
  );
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(screen.getByRole("status")).toHaveTextContent("Model unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Retry camera" }));
  await act(async () => {});
  act(() => track.dispatchEvent(new Event("ended")));
  expect(screen.getByRole("status")).toHaveTextContent("Camera disconnected");
  expect(stopTrack).toHaveBeenCalledTimes(2);
});
it("unsupported browsers fail before requesting camera permission", async () => {
  vi.stubGlobal("OffscreenCanvas", undefined);
  render(<LiveWorkout />);
  await userEvent.click(screen.getByRole("button", { name: "Start camera" }));
  expect(media.getUserMedia).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent("Update your browser");
});
it("ignores in-flight inference results across pause/resume and does not infer paused video", async () => {
  render(<LiveWorkout />);
  const worker = await start(),
    video = prepareVideo();
  await tick(120);
  expect(worker.postMessage).toHaveBeenCalledTimes(2);
  clock = 130;
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  video.currentTime = 1;
  await tick(150);
  expect(worker.postMessage).toHaveBeenCalledTimes(2);
  clock = 160;
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  act(() =>
    worker.send({
      type: "pose",
      timestamp: 120,
      latency: 5,
      landmarks: fixture.cases[0].frames[0].landmarks,
    }),
  );
  await tick(340);
  expect(screen.getByText("UNCERTAIN")).toBeVisible();
});
it("does not repeat inference for an unchanged video frame and invalidates stale pose", async () => {
  render(<LiveWorkout />);
  const worker = await start();
  prepareVideo();
  await tick(120);
  act(() =>
    worker.send({ type: "pose", timestamp: 120, latency: 5, landmarks: [] }),
  );
  await tick(400);
  expect(worker.postMessage).toHaveBeenCalledTimes(2);
  await tick(800);
  expect(screen.getByText("INSUFFICIENT")).toBeVisible();
  expect(screen.getByText("UNCERTAIN")).toBeVisible();
});
it("feeds synthetic landmarks through the real FSM and does not send frames to HTTP or storage", async () => {
  const fetch = vi.spyOn(globalThis, "fetch"),
    save = vi.spyOn(Storage.prototype, "setItem");
  render(<LiveWorkout />);
  const worker = await start(),
    video = prepareVideo();
  for (const frame of fixture.cases[0].frames) {
    if (frame.timestamp_ms === 800)
      fireEvent.click(screen.getByRole("checkbox", { name: "Mirror preview" }));
    const timestamp = frame.timestamp_ms + 200;
    video.currentTime = timestamp / 1000;
    await tick(timestamp);
    act(() =>
      worker.send({
        type: "pose",
        timestamp,
        latency: 5,
        landmarks: frame.landmarks,
      }),
    );
  }
  await tick(clock + 200);
  const label = screen.getByText("Repetitions");
  expect(label.nextElementSibling).toHaveTextContent("1");
  expect(fetch).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Stop camera" }));
  await start();
  expect(label.nextElementSibling).toHaveTextContent("0");
});

it("pause invalidates an active synthetic cycle and resume cannot complete it", async () => {
  render(<LiveWorkout />);
  const worker = await start(),
    video = prepareVideo();
  const frames = fixture.cases[0].frames;
  const send = async (frame: (typeof frames)[number], offset: number) => {
    const timestamp = frame.timestamp_ms + offset;
    video.currentTime = timestamp / 1000;
    await tick(timestamp);
    act(() =>
      worker.send({
        type: "pose",
        timestamp,
        latency: 5,
        landmarks: frame.landmarks,
      }),
    );
  };
  for (const frame of frames.slice(0, 25)) await send(frame, 200);
  clock += 1;
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  expect(
    screen.getByText("Incomplete cycles").nextElementSibling,
  ).toHaveTextContent("1");
  clock += 20;
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  for (const frame of frames.slice(25)) await send(frame, 240);
  await tick(clock + 200);
  expect(screen.getByText("Repetitions").nextElementSibling).toHaveTextContent(
    "0",
  );
  expect(
    screen.getByText("Incomplete cycles").nextElementSibling,
  ).toHaveTextContent("1");
});
