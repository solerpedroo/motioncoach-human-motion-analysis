"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AnalyzerSnapshot,
  createExerciseAnalyzer,
} from "@/features/exercise-engine/exercise-analyzer";
import { cameraError, createCamera } from "@/features/pose-engine/camera";
import { createSessionMetrics } from "@/features/pose-engine/metrics";
import type { WorkerReply } from "@/features/pose-engine/protocol";
import { createPoseClient } from "@/features/pose-engine/worker-client";
import type { Landmark } from "@/lib/contracts.generated";
import type { ExerciseId } from "@/lib/exercises";
import { drawPose } from "../pose-overlay/draw";
export type LiveStatus =
  | "idle"
  | "requesting"
  | "loading"
  | "running"
  | "paused"
  | "stopped"
  | "error";
export function useLiveSession(options: {
  exercise: ExerciseId;
  side: "left" | "right";
  view: "side" | "front";
  deviceId: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const camera = useRef<ReturnType<typeof createCamera> | null>(null);
  const client = useRef<ReturnType<typeof createPoseClient> | null>(null);
  const analyzer = useRef<ReturnType<typeof createExerciseAnalyzer> | null>(
    null,
  );
  const metrics = useRef(createSessionMetrics());
  const landmarks = useRef<Landmark[]>([]);
  const lastPose = useRef(-Infinity);
  const latest = useRef<AnalyzerSnapshot | null>(null);
  const state = useRef<LiveStatus>("idle");
  const generation = useRef(0);
  const barrier = useRef(0);
  const raf = useRef(0);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [snapshot, setSnapshot] = useState<AnalyzerSnapshot | null>(null);
  const [rates, setRates] = useState(metrics.current.snapshot(0));
  const [cameraOn, setCameraOn] = useState(false);
  const changeState = useCallback((next: LiveStatus) => {
    state.current = next;
    setStatus(next);
  }, []);
  const release = useCallback(() => {
    generation.current++;
    cancelAnimationFrame(raf.current);
    client.current?.stop();
    client.current = null;
    camera.current?.stop();
    if (video.current) video.current.srcObject = null;
    landmarks.current = [];
    const context = canvas.current?.getContext("2d");
    if (context && canvas.current)
      context.clearRect(0, 0, canvas.current.width, canvas.current.height);
  }, []);
  const stop = useCallback(() => {
    if (
      analyzer.current &&
      (state.current === "running" || state.current === "paused")
    ) {
      latest.current = analyzer.current.pause(performance.now());
      setSnapshot(latest.current);
    }
    release();
    setCameraOn(false);
    changeState("stopped");
    metrics.current = createSessionMetrics();
    setRates(metrics.current.snapshot(performance.now()));
  }, [changeState, release]);
  useEffect(
    () => () => {
      state.current = "stopped";
      release();
    },
    [release],
  );
  const start = async () => {
    stop();
    setError("");
    setSnapshot(null);
    latest.current = null;
    lastPose.current = -Infinity;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof Worker === "undefined" ||
      typeof createImageBitmap === "undefined" ||
      typeof OffscreenCanvas === "undefined"
    ) {
      setError(
        "Live pose needs HTTPS or localhost, camera access, Web Workers and OffscreenCanvas. Update your browser and try again.",
      );
      changeState("error");
      return;
    }
    camera.current ??= createCamera(navigator.mediaDevices);
    const token = generation.current;
    const fail = (message: string) => {
      if (token !== generation.current) return;
      if (state.current === "running") {
        latest.current = analyzer.current?.pause(performance.now()) ?? null;
        setSnapshot(latest.current);
      }
      release();
      setCameraOn(false);
      setError(message);
      changeState("error");
    };
    changeState("requesting");
    try {
      const stream = await camera.current.open(options.deviceId || undefined);
      if (!stream || token !== generation.current) return;
      if (!video.current) {
        fail("Camera preview is unavailable. Try again.");
        return;
      }
      setCameraOn(true);
      changeState("loading");
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener(
          "ended",
          () => fail("Camera disconnected. Reconnect it and try again."),
          { once: true },
        );
      });
      video.current.srcObject = stream;
      await video.current.play();
      if (token !== generation.current) return;
      void camera.current
        .devices()
        .then((items) => {
          if (token === generation.current) setDevices(items);
        })
        .catch(() => {});
      analyzer.current = createExerciseAnalyzer(options.exercise, {
        camera_view: options.view,
        selected_side: options.side,
        clock: () => performance.now(),
      });
      latest.current = analyzer.current.snapshot();
      setSnapshot(latest.current);
      let lastVideoTime = -1;
      let lastUI = -Infinity;
      let stale = false;
      const receive = (reply: WorkerReply) => {
        if (token !== generation.current) return;
        if (reply.type === "error") {
          fail(reply.message);
          return;
        }
        if (reply.type === "ready") {
          barrier.current = performance.now();
          lastPose.current = barrier.current;
          changeState("running");
          return;
        }
        if (state.current !== "running" || reply.timestamp < barrier.current)
          return;
        stale = false;
        landmarks.current = reply.landmarks;
        lastPose.current = performance.now();
        metrics.current.inference(lastPose.current, reply.latency);
        latest.current =
          analyzer.current?.update({
            landmarks: reply.landmarks,
            timestamp_ms: reply.timestamp,
          }) ?? null;
      };
      client.current = createPoseClient(
        new Worker(new URL("../../workers/pose.worker.ts", import.meta.url), {
          type: "module",
        }),
        window.location.origin,
        receive,
      );
      const tick = (now: number) => {
        if (token !== generation.current) return;
        const element = video.current;
        if (
          element &&
          state.current === "running" &&
          element.readyState >= 2 &&
          element.currentTime !== lastVideoTime
        ) {
          lastVideoTime = element.currentTime;
          metrics.current.capture(now);
          void client.current?.capture(element, now);
        }
        const surface = canvas.current;
        if (surface && element && element.videoWidth > 0) {
          if (
            surface.width !== element.videoWidth ||
            surface.height !== element.videoHeight
          ) {
            surface.width = element.videoWidth;
            surface.height = element.videoHeight;
          }
          const context = surface.getContext("2d");
          if (context)
            drawPose(
              context,
              state.current === "running" && now - lastPose.current < 300
                ? landmarks.current
                : [],
              surface.width,
              surface.height,
            );
        }
        if (now - lastUI >= 200) {
          lastUI = now;
          if (
            state.current === "running" &&
            !stale &&
            now - lastPose.current > 500
          ) {
            stale = true;
            barrier.current = now;
            landmarks.current = [];
            latest.current =
              analyzer.current?.update({ landmarks: [], timestamp_ms: now }) ??
              null;
          }
          setSnapshot(latest.current);
          setRates(metrics.current.snapshot(now));
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    } catch (cause) {
      fail(cameraError(cause));
    }
  };
  const pause = () => {
    if (state.current !== "running") return;
    barrier.current = performance.now();
    latest.current = analyzer.current?.pause(barrier.current) ?? null;
    setSnapshot(latest.current);
    changeState("paused");
    metrics.current = createSessionMetrics();
    setRates(metrics.current.snapshot(barrier.current));
  };
  const resume = () => {
    if (state.current !== "paused") return;
    barrier.current = performance.now();
    latest.current = analyzer.current?.resume(barrier.current) ?? null;
    lastPose.current = barrier.current;
    setSnapshot(latest.current);
    changeState("running");
  };
  return {
    video,
    canvas,
    status,
    cameraOn,
    error,
    devices,
    snapshot,
    rates,
    start,
    pause,
    resume,
    stop,
  };
}
