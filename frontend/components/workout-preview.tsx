"use client";

import {
  ArrowUpRight,
  CameraOff,
  CirclePause,
  Info,
  ScanLine,
  ShieldCheck,
  Upload,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MovementDiagram } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { MenuSelect } from "@/components/ui/menu-select";
import { type ExerciseId, exercises } from "@/lib/exercises";
import { en, type ScreenState } from "@/messages/en";

export function WorkoutPreview({
  mode,
  initialExercise = "squat",
}: {
  mode: "live" | "upload";
  initialExercise?: ExerciseId;
}) {
  const [exerciseId, setExerciseId] = useState<ExerciseId>(initialExercise);
  const [state, setState] = useState<ScreenState>("idle");
  const exercise =
    exercises.find((item) => item.id === exerciseId) ?? exercises[0];
  const status = en.states[state];
  return (
    <>
      <div className="setup-bar panel">
        <MenuSelect
          label="Exercise"
          value={exerciseId}
          options={exercises.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={(id) => setExerciseId(id as ExerciseId)}
        />
        <div className="setup-view">
          <span>Recommended framing</span>
          <strong>{exercise.view}</strong>
        </div>
        <div className="setup-tools">
          <span>
            <CameraOff size={16} /> Camera off
          </span>
          <span>
            <VolumeX size={16} /> Voice off
          </span>
        </div>
      </div>
      <div className="workout-grid">
        <div>
          <section
            className="preview-stage"
            aria-label={
              mode === "live"
                ? "Camera preview placeholder"
                : "Video upload placeholder"
            }
          >
            <div className="stage-top">
              <span>
                <span className="status-dot" />
                {mode === "live" ? "CAMERA OFF" : "NO VIDEO SELECTED"}
              </span>
              <span>PREVIEW ONLY</span>
            </div>
            <div className="frame-corner corner-tl" />
            <div className="frame-corner corner-tr" />
            <div className="frame-corner corner-bl" />
            <div className="frame-corner corner-br" />
            <div className="stage-content">
              {mode === "live" ? (
                <div className="stage-figure">
                  <MovementDiagram kind={exerciseId} />
                </div>
              ) : (
                <div className="upload-symbol">
                  <Upload size={36} />
                </div>
              )}
              <h2>
                {mode === "live"
                  ? "Make room for movement."
                  : "A closer look at your movement."}
              </h2>
              <p>
                {mode === "live"
                  ? "Your camera preview will appear here. Find a clear space and keep your full body in frame."
                  : "Video analysis will support MP4, MOV and WebM. File selection will be available with the upload pipeline."}
              </p>
              <Button disabled>
                {mode === "live"
                  ? "Camera coming in a later release"
                  : "Video upload coming in a later release"}
              </Button>
              <span className="stage-privacy">
                <ShieldCheck size={14} />
                {mode === "live"
                  ? "No camera or microphone access in this preview"
                  : "No file is selected, stored or uploaded"}
              </span>
            </div>
            <div className="stage-bottom">
              <ScanLine size={16} />
              <span>
                {exercise.view} · {exercise.name}
              </span>
              <span>Framing illustration</span>
            </div>
          </section>
          <div className="framing-note">
            <Info size={18} />
            <p>{exercise.detail}</p>
            <Link href="/exercises">
              Framing guide <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <aside className="metrics-panel panel">
          <div className="section-heading">
            <h2>Session at a glance</h2>
            <span className="small-label">PREVIEW</span>
          </div>
          <div className="rep-metric">
            <span>Completed repetitions</span>
            <strong>—</strong>
            <p>Waiting for a measured session</p>
          </div>
          <dl className="metric-list">
            <div>
              <dt>Current phase</dt>
              <dd>Not started</dd>
            </div>
            <div>
              <dt>Observed angle</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>Session duration</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>Pose quality</dt>
              <dd>Unavailable</dd>
            </div>
            <div>
              <dt>Inference FPS</dt>
              <dd>Not measured</dd>
            </div>
          </dl>
          <div className="metric-message">
            <CirclePause size={19} />
            <div>
              <strong>Nothing measured yet</strong>
              <p>Metrics will come from the analysis engine.</p>
            </div>
          </div>
        </aside>
      </div>
      <section className="panel state-preview">
        <div className="state-controls">
          <div>
            <p className="eyebrow">INTERFACE STATES</p>
            <h2>Explore the session experience</h2>
          </div>
          <MenuSelect
            label="Preview state"
            value={state}
            options={Object.keys(en.states).map((item) => ({
              value: item,
              label: item.replaceAll("_", " "),
            }))}
            onChange={(item) => setState(item as ScreenState)}
          />
        </div>
        <div className="state-message" role="status">
          <span className="state-code">{state}</span>
          <h3>{status.title}</h3>
          <p>{status.description}</p>
        </div>
        {["idle", "calibrating", "no_pose", "low_confidence"].includes(
          state,
        ) ? (
          <Button variant="outline" asChild>
            <Link href="/exercises">{status.action}</Link>
          </Button>
        ) : state === "completed" ? (
          <Button variant="outline" asChild>
            <Link href="/sessions/demo">{status.action}</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() =>
              setState(
                state === "analyzing"
                  ? "paused"
                  : state === "paused"
                    ? "analyzing"
                    : "idle",
              )
            }
          >
            {status.action}
          </Button>
        )}
      </section>
    </>
  );
}
