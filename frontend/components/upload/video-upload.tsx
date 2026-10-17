"use client";

import { type FormEvent, useEffect, useState } from "react";
import { AnalysisReport } from "@/components/reports/analysis-report";
import { Button } from "@/components/ui/button";
import { MenuSelect } from "@/components/ui/menu-select";
import { type AngleSample, angleSamples } from "@/features/upload/series";
import { exercises } from "@/lib/exercises";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type JobView = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  stage: string;
  error_code: string | null;
  error_message: string | null;
  chart_warning: string | null;
};

type ReportSummary = {
  completed_repetitions: number;
  incomplete_repetitions: number;
  duration_ms: number;
  events: { type: string; timestamp_ms: number; rep_index: number | null }[];
};

const terminal = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export function VideoUpload() {
  const [exercise, setExercise] = useState("squat");
  const [cameraView, setCameraView] = useState("side");
  const [side, setSide] = useState("left");
  const [job, setJob] = useState<JobView | null>(null);
  const [report, setReport] = useState<{
    summary: ReportSummary;
    samples: AngleSample[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState("Choose MP4, MOV, or WebM");

  useEffect(() => {
    if (!job || terminal.has(job.status)) return undefined;
    const timer = window.setInterval(async () => {
      const response = await fetch(`${apiBase}/api/jobs/${job.id}`);
      if (response.ok) setJob((await response.json()) as JobView);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [job]);

  useEffect(() => {
    if (job?.status !== "COMPLETED") return undefined;
    let active = true;
    Promise.all([
      fetch(`${apiBase}/api/analyses/${job.id}`).then((response) =>
        response.json(),
      ),
      fetch(`${apiBase}/api/jobs/${job.id}/artifacts/frames.jsonl`).then(
        (response) => (response.ok ? response.text() : ""),
      ),
    ]).then(([summary, frames]) => {
      if (active) setReport({ summary, samples: angleSamples(frames) });
    });
    return () => {
      active = false;
    };
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
      setReport(null);
      setError(body.error?.message ?? "The video could not be queued.");
      return;
    }
    setJob(body as JobView);
  }

  return (
    <div>
      <form className="composer panel" onSubmit={onSubmit}>
        <p className="page-description">
          The identifier is unguessable but this local API is still a
          single-user workspace. Uploaded files are temporary and are not used
          to train a model.
        </p>
        <label className="file-field">
          Video file
          <input
            name="file"
            type="file"
            aria-label="Video file"
            accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
            required
            onChange={(event) =>
              setFileName(
                event.target.files?.[0]?.name ?? "Choose MP4, MOV, or WebM",
              )
            }
          />
          <span className="file-face">{fileName}</span>
        </label>
        <MenuSelect
          label="Exercise"
          value={exercise}
          options={exercises.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={setExercise}
        />
        <MenuSelect
          label="Camera view"
          value={cameraView}
          options={[
            { value: "side", label: "Side" },
            { value: "front", label: "Front" },
          ]}
          onChange={setCameraView}
        />
        {exercise === "biceps_curl" ? (
          <MenuSelect
            label="Arm"
            value={side}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={setSide}
          />
        ) : null}
        <div className="composer-actions">
          <Button type="submit" disabled={pending}>
            {pending ? "Checking file" : "Analyze video"}
          </Button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {job && job.status !== "FAILED" && job.status !== "CANCELLED" ? (
          <p role="status">
            Job {job.status.toLowerCase()} during {job.stage}.
          </p>
        ) : null}
        {job?.status === "FAILED" || job?.status === "CANCELLED" ? (
          <>
            <p role="alert">
              {job.error_message ?? "This job did not finish."}
            </p>
            <Button
              type="button"
              onClick={() => {
                setJob(null);
                setReport(null);
              }}
            >
              Start another analysis
            </Button>
          </>
        ) : null}
      </form>
      {job?.status === "COMPLETED" && report ? (
        <AnalysisReport
          chartWarning={job.chart_warning}
          exportCsvUrl={`${apiBase}/api/analyses/${job.id}/export?format=csv`}
          exportJsonUrl={`${apiBase}/api/analyses/${job.id}/export?format=json`}
          mediaUrl={`${apiBase}/api/jobs/${job.id}/media`}
          samples={report.samples}
          summary={report.summary}
        />
      ) : null}
    </div>
  );
}
