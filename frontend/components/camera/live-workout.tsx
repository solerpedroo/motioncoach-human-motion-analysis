"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MenuSelect } from "@/components/ui/menu-select";
import {
  SaveSession,
  SessionSummaryView,
} from "@/components/workout/session-summary";
import { TrainerFeedback } from "@/components/workout/trainer-feedback";
import { type ExerciseId, exercises } from "@/lib/exercises";
import styles from "./live-workout.module.css";
import { useLiveSession } from "./use-live-session";

const measurement = (value: number | null) =>
  value === null ? "Not measured" : value.toFixed(1);
export function LiveWorkout({
  initialExercise = "squat",
}: {
  initialExercise?: ExerciseId;
}) {
  const [exercise, setExercise] = useState<ExerciseId>(initialExercise);
  const [side, setSide] = useState<"left" | "right">("left");
  const [view, setView] = useState<"side" | "front">(
    initialExercise === "jumping_jack" ? "front" : "side",
  );
  const [deviceId, setDeviceId] = useState("");
  const [mirrored, setMirrored] = useState(true);
  const session = useLiveSession({ exercise, side, view, deviceId });
  const active = ["requesting", "loading", "running", "paused"].includes(
    session.status,
  );
  const selected =
    exercises.find((item) => item.id === exercise) ?? exercises[0];
  const message =
    session.error ||
    {
      idle: "Choose your exercise and camera view, then start. Your browser will ask for video access only.",
      requesting:
        "Allow camera access in your browser. You can cancel with Stop.",
      loading:
        "Camera on. Loading the local pose model. Use Stop to turn the camera off.",
      running:
        session.snapshot?.pose_quality === "INSUFFICIENT"
          ? "Pose unavailable or incomplete. Keep the required joints in frame and check your selected camera view."
          : session.snapshot?.pose_quality === "LIMITED"
            ? "Limited pose data. Some optional joints are not observable."
            : "Pose data available. Follow the observed phase and keep your full movement in frame.",
      paused:
        "Paused. Camera stays on; counting is paused. Resume starts from the initial position.",
      stopped: "Camera off. Start creates a new session and resets the count.",
      error: "Unable to start. Check your setup and try again.",
    }[session.status];
  return (
    <section aria-label="Live camera session">
      <div className={styles.setup}>
        <MenuSelect
          label="Exercise"
          value={exercise}
          disabled={active}
          options={exercises.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={(id) => {
            const next = id as ExerciseId;
            setExercise(next);
            setView(next === "jumping_jack" ? "front" : "side");
          }}
        />
        <MenuSelect
          label="Camera"
          value={deviceId}
          options={[
            { value: "", label: "Default camera" },
            ...session.devices.map((device, index) => ({
              value: device.deviceId,
              label: device.label || `Camera ${index + 1}`,
            })),
          ]}
          onChange={(id) => {
            session.stop();
            setDeviceId(id);
          }}
        />
        <MenuSelect
          label="Camera view"
          value={view}
          disabled={active || exercise !== "biceps_curl"}
          options={[
            { value: "side", label: "Side view" },
            { value: "front", label: "Front view" },
          ]}
          onChange={(id) => setView(id as "front" | "side")}
        />
        {exercise === "biceps_curl" ? (
          <MenuSelect
            label="Selected arm"
            value={side}
            disabled={active}
            options={[
              { value: "left", label: "Left arm" },
              { value: "right", label: "Right arm" },
            ]}
            onChange={(id) => setSide(id as "left" | "right")}
          />
        ) : null}
        <label className={`${styles.mirror} toggle`}>
          <input
            type="checkbox"
            checked={mirrored}
            onChange={(event) => setMirrored(event.target.checked)}
          />
          Mirror preview
        </label>
      </div>
      <div className={styles.layout}>
        <div className={styles.stage}>
          <div className={`${styles.image} ${mirrored ? styles.mirrored : ""}`}>
            <video
              ref={session.video}
              autoPlay
              muted
              playsInline
              aria-label="Local camera preview"
            />
            <canvas
              ref={session.canvas}
              role="img"
              aria-label="Pose skeleton overlay"
            />
          </div>
          {!session.cameraOn && (
            <div className={styles.placeholder}>
              <p>Your camera is off.</p>
              <small>
                {selected.view} · {selected.joints}
              </small>
            </div>
          )}
          <span className={styles.badge}>
            {session.cameraOn ? "Camera on · video only" : "Camera off"}
          </span>
        </div>
        <aside
          className={styles.panel}
          aria-label="Observed session measurements"
        >
          <h2>Live observations</h2>
          <dl>
            <div>
              <dt>Observed phase</dt>
              <dd>{session.snapshot?.phase ?? "Not measured"}</dd>
            </div>
            <div>
              <dt>Repetitions</dt>
              <dd>{session.snapshot?.completed_repetitions ?? 0}</dd>
            </div>
            <div>
              <dt>Incomplete cycles</dt>
              <dd>{session.snapshot?.incomplete_repetitions ?? 0}</dd>
            </div>
            <div>
              <dt>Pose data quality</dt>
              <dd>{session.snapshot?.pose_quality ?? "Not measured"}</dd>
            </div>
            <div>
              <dt>Fixed side</dt>
              <dd>
                {session.snapshot?.selected_side ?? "Awaiting initial position"}
              </dd>
            </div>
            <div>
              <dt>Observed capture FPS</dt>
              <dd>{measurement(session.rates.capture_fps)}</dd>
            </div>
            <div>
              <dt>Inference FPS</dt>
              <dd>{measurement(session.rates.inference_fps)}</dd>
            </div>
            <div>
              <dt>Mean inference latency</dt>
              <dd>
                {measurement(session.rates.latency_ms)}
                {session.rates.latency_ms !== null && " ms"}
              </dd>
            </div>
          </dl>
          <small>
            Rolling 2-second window. FPS needs at least two samples. No
            performance target is implied.
          </small>
        </aside>
      </div>
      <p className={styles.note}>
        Active session time: {(session.elapsedMs / 1000).toFixed(1)} s
      </p>
      <div className={styles.voiceRow}>
        <label className={`${styles.voice} toggle`}>
          <input
            type="checkbox"
            checked={session.voiceEnabled}
            disabled={!session.voiceAvailable}
            onChange={(event) => session.toggleVoice(event.target.checked)}
          />
          Enable voice feedback
        </label>
        <MenuSelect
          label="Voice language"
          value={session.voiceLanguage}
          options={[
            { value: "en", label: "English" },
            { value: "pt-BR", label: "Português" },
          ]}
          onChange={(value) =>
            session.chooseVoiceLanguage(value as "en" | "pt-BR")
          }
        />
      </div>
      <p className={styles.note}>
        {session.voiceError ||
          (session.voiceAvailable
            ? "Voice reads the same observation shown on screen, in the selected language. No microphone is requested."
            : "This browser cannot speak. The written observation stays on screen.")}
      </p>
      <div className={styles.controls}>
        <Button disabled={active} onClick={() => void session.start()}>
          {session.status === "error" ? "Retry camera" : "Start camera"}
        </Button>
        <Button
          variant="outline"
          disabled={session.status !== "running" && session.status !== "paused"}
          onClick={session.status === "paused" ? session.resume : session.pause}
        >
          {session.status === "paused" ? "Resume" : "Pause"}
        </Button>
        <Button variant="outline" disabled={!active} onClick={session.stop}>
          Stop camera
        </Button>
      </div>
      <p className={styles.status} role="status">
        {message}
      </p>
      <TrainerFeedback
        feedback={session.feedback}
        originMs={session.originMs}
        language={session.voiceLanguage}
      />
      {session.summary && (
        <>
          <SessionSummaryView session={session.summary} />
          <SaveSession
            key={session.summary.summary.id}
            session={session.summary}
          />
        </>
      )}
      <section className={styles.features} aria-label="Observed 2D features">
        {Object.entries(session.snapshot?.features ?? {})
          .filter(([key]) => key !== "interpolated")
          .map(([key, value]) => (
            <span key={key}>
              {key.replaceAll("_", " ")}:{" "}
              {typeof value === "number" ? value.toFixed(1) : "Not observable"}
              {key.endsWith("_deg") && typeof value === "number" ? "°" : ""}
            </span>
          ))}
      </section>
      <p className={styles.note}>
        {selected.detail} {selected.limitation}
        <br />
        Video stays in this browser. No microphone, recording or frame upload.
        Pose quality describes data availability. Development thresholds are
        unvalidated seeds; observations are not a clinical assessment.
      </p>
    </section>
  );
}
