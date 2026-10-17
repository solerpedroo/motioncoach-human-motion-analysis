"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSpeechPort } from "@/components/workout/browser-speech";
import {
  type AnalyzerSnapshot,
  createExerciseAnalyzer,
} from "@/features/exercise-engine/exercise-analyzer";
import { getExerciseConfig } from "@/features/exercise-engine/exercise-config";
import {
  createFeedbackEngine,
  type FeedbackDecision,
  feedbackPolicy,
} from "@/features/exercise-engine/feedback";
import { createVoiceFeedback } from "@/features/exercise-engine/voice";
import { cameraError, createCamera } from "@/features/pose-engine/camera";
import { createSessionMetrics } from "@/features/pose-engine/metrics";
import type { WorkerReply } from "@/features/pose-engine/protocol";
import { createPoseClient } from "@/features/pose-engine/worker-client";
import {
  createSessionRecorder,
  type LocalSession,
} from "@/features/session-store/session-recorder";
import type { Landmark } from "@/lib/contracts.generated";
import type { ExerciseId } from "@/lib/exercises";
import { feedbackText, type VoiceLanguage } from "@/messages/catalog";
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
  const recorder = useRef<ReturnType<typeof createSessionRecorder> | null>(
    null,
  );
  const feedbackEngine = useRef<ReturnType<typeof createFeedbackEngine> | null>(
    null,
  );
  const voice = useRef<ReturnType<typeof createVoiceFeedback> | null>(null);
  const speech = useRef<ReturnType<typeof createBrowserSpeechPort>>(null);
  const decision = useRef<FeedbackDecision | null>(null);
  const feedbackUntil = useRef(0);
  const [feedback, setFeedback] = useState<FeedbackDecision | null>(null);
  const [summary, setSummary] = useState<LocalSession | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [originMs, setOriginMs] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>("en");
  const language = useRef<VoiceLanguage>("en");
  useEffect(() => {
    const stored = window.localStorage.getItem("motioncoach.voice_language");
    if (stored === "en" || stored === "pt-BR") {
      language.current = stored;
      setVoiceLanguage(stored);
    }
  }, []);
  useEffect(() => {
    const synth = window.speechSynthesis;
    const port = createBrowserSpeechPort(() => language.current);
    speech.current = port;
    if (!port) return;
    voice.current = createVoiceFeedback(
      port,
      () => performance.now(),
      () => {
        setVoiceEnabled(false);
        setVoiceError(
          "Voice feedback failed. Visual observations remain available.",
        );
      },
    );
    const refresh = () => {
      const available = port.available();
      setVoiceAvailable(available);
      if (!available) {
        voice.current?.setEnabled(false);
        setVoiceEnabled(false);
      }
    };
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => {
      synth.removeEventListener("voiceschanged", refresh);
      voice.current?.setEnabled(false);
      voice.current = null;
      speech.current = null;
    };
  }, []);
  const chooseVoiceLanguage = (value: VoiceLanguage) => {
    language.current = value;
    setVoiceLanguage(value);
    window.localStorage.setItem("motioncoach.voice_language", value);
    voice.current?.cancel();
    const available = speech.current?.available() ?? false;
    setVoiceAvailable(available);
    if (!available) {
      voice.current?.setEnabled(false);
      setVoiceEnabled(false);
      setVoiceError(
        "No local voice is available for this language. The written observation stays on screen.",
      );
      return;
    }
    setVoiceError("");
    if (voiceEnabled) voice.current?.setEnabled(true);
  };
  const toggleVoice = (value: boolean) => {
    setVoiceError("");
    setVoiceEnabled(voice.current?.setEnabled(value) ?? false);
  };
  const observe = (
    value: AnalyzerSnapshot,
    timestamp: number,
    points: Landmark[] = [],
  ) => {
    latest.current = value;
    const outcome = feedbackEngine.current?.update(value, timestamp, points);
    const next = outcome?.decision ?? null;
    if (
      next?.selected &&
      (next.issued || next.selected.category === "capture")
    ) {
      decision.current = next;
      feedbackUntil.current =
        timestamp + feedbackPolicy.completed_rule.cooldown_ms;
    } else if (timestamp > feedbackUntil.current) decision.current = null;
    voice.current?.guard(next?.selected ?? null);
    recorder.current?.consume(value, timestamp, [
      ...(outcome?.observations ?? []),
      ...(outcome?.decision.event ? [outcome.decision.event] : []),
    ]);
    if (outcome?.decision.issued && outcome.decision.selected) {
      const item = outcome.decision.selected;
      const text = feedbackText(language.current, item.message_key);
      if (text) voice.current?.publish(item, text);
    }
  };
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
    if (recorder.current) {
      if (latest.current)
        recorder.current.pause(latest.current, performance.now());
      setSummary(recorder.current.finish(performance.now(), "user_stopped"));
    }
    voice.current?.cancel();
    decision.current = null;
    setFeedback(null);
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
    recorder.current = null;
    feedbackEngine.current = null;
    setSummary(null);
    setElapsedMs(0);
    decision.current = null;
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
        if (latest.current)
          recorder.current?.pause(latest.current, performance.now());
      }
      if (recorder.current)
        setSummary(
          recorder.current.finish(performance.now(), "capture_failed"),
        );
      voice.current?.cancel();
      decision.current = null;
      setFeedback(null);
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
          setOriginMs(barrier.current);
          recorder.current = createSessionRecorder({
            id: crypto.randomUUID(),
            exercise: options.exercise,
            camera_view: options.view,
            started_at: new Date().toISOString(),
            origin_ms: barrier.current,
          });
          feedbackEngine.current = createFeedbackEngine(
            getExerciseConfig(options.exercise),
            options.view,
          );
          if (latest.current)
            recorder.current.consume(latest.current, barrier.current);
          changeState("running");
          return;
        }
        if (state.current !== "running" || reply.timestamp < barrier.current)
          return;
        stale = false;
        landmarks.current = reply.landmarks;
        lastPose.current = performance.now();
        metrics.current.inference(lastPose.current, reply.latency);
        const value = analyzer.current?.update({
          landmarks: reply.landmarks,
          timestamp_ms: reply.timestamp,
        });
        if (value) observe(value, reply.timestamp, reply.landmarks);
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
            const value = analyzer.current?.update({
              landmarks: [],
              timestamp_ms: now,
            });
            if (value) observe(value, now);
          }
          setSnapshot(latest.current);
          setFeedback(decision.current);
          setElapsedMs(recorder.current?.activeDuration(now) ?? 0);
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
    if (latest.current) {
      recorder.current?.pause(latest.current, barrier.current);
      feedbackEngine.current?.update(latest.current, barrier.current);
    }
    voice.current?.cancel();
    decision.current = null;
    setFeedback(null);
    changeState("paused");
    metrics.current = createSessionMetrics();
    setRates(metrics.current.snapshot(barrier.current));
  };
  const resume = () => {
    if (state.current !== "paused") return;
    barrier.current = performance.now();
    latest.current = analyzer.current?.resume(barrier.current) ?? null;
    lastPose.current = barrier.current;
    if (latest.current)
      recorder.current?.resume(latest.current, barrier.current);
    setSnapshot(latest.current);
    changeState("running");
  };
  return {
    feedback,
    originMs,
    summary,
    elapsedMs,
    voiceEnabled,
    voiceAvailable,
    voiceError,
    voiceLanguage,
    chooseVoiceLanguage,
    toggleVoice,
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
