"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { exercises } from "@/lib/exercises";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type JobView = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  stage: string;
  error_code: string | null;
  error_message: string | null;
};

const terminal = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export function VideoUpload() {
  const [exercise, setExercise] = useState("squat");
  const [cameraView, setCameraView] = useState("side");
  const [side, setSide] = useState("left");
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!job || terminal.has(job.status)) return undefined;
    const timer = window.setInterval(async () => {
      const response = await fetch(`${apiBase}/api/jobs/${job.id}`);
      if (response.ok) setJob((await response.json()) as JobView);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [job]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("exercise", exercise);
    form.set("camera_view", cameraView);
    if (exercise === "biceps_curl") form.set("selected_side", side);
    setPending(true);
    setError(null);
    const response = await fetch(`${apiBase}/api/videos`, {
      method: "POST",
      body: form,
    });
    const body = await response.json();
    setPending(false);
    if (!response.ok) {
      setJob(null);
      setError(body.error?.message ?? "The video could not be queued.");
      return;
    }
    setJob(body as JobView);
  }

  return (
    <form className="setup-bar panel" onSubmit={onSubmit}>
      <p className="page-description">
        The identifier is unguessable but this local API is still a single-user
        workspace. Uploaded files are temporary and are not used to train a
        model.
      </p>
      <label>
        Video file
        <input
          name="file"
          type="file"
          accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
          required
        />
      </label>
      <label>
        Exercise
        <select
          aria-label="Exercise"
          value={exercise}
          onChange={(event) => setExercise(event.target.value)}
        >
          {exercises.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Camera view
        <select
          aria-label="Camera view"
          value={cameraView}
          onChange={(event) => setCameraView(event.target.value)}
        >
          <option value="side">Side</option>
          <option value="front">Front</option>
        </select>
      </label>
      {exercise === "biceps_curl" ? (
        <label>
          Arm
          <select
            aria-label="Arm"
            value={side}
            onChange={(event) => setSide(event.target.value)}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Checking file" : "Analyze video"}
      </Button>
      {error ? <p role="alert">{error}</p> : null}
      {job ? (
        <p role="status">
          Job {job.status.toLowerCase()} during {job.stage}.
          {job.error_message ? ` ${job.error_message}` : ""}
        </p>
      ) : null}
    </form>
  );
}
