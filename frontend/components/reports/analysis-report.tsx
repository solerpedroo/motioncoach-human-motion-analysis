"use client";

import { useRef } from "react";
import { AngleChart } from "@/components/charts/angle-chart";
import { Button } from "@/components/ui/button";
import type { AngleSample } from "@/features/upload/series";

type ReportEvent = {
  type: string;
  timestamp_ms: number;
  rep_index: number | null;
};

type ReportSummary = {
  completed_repetitions: number;
  incomplete_repetitions: number;
  duration_ms: number;
  events: ReportEvent[];
};

export function AnalysisReport({
  summary,
  samples,
  mediaUrl,
  exportJsonUrl,
  exportCsvUrl,
  chartWarning,
}: {
  summary: ReportSummary;
  samples: AngleSample[];
  mediaUrl: string;
  exportJsonUrl: string;
  exportCsvUrl: string;
  chartWarning: string | null;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const repetitions = summary.events.filter(
    (event) =>
      event.type === "REP_COMPLETED" || event.type === "REP_INCOMPLETE",
  );
  const completed = repetitions.filter(
    (event) => event.type === "REP_COMPLETED",
  );
  const incomplete = repetitions.filter(
    (event) => event.type === "REP_INCOMPLETE",
  );
  return (
    <section aria-label="Video analysis report">
      <p>
        Complete repetitions {summary.completed_repetitions}. Incomplete
        repetitions {summary.incomplete_repetitions}.
      </p>
      {completed.length !== summary.completed_repetitions ||
      incomplete.length !== summary.incomplete_repetitions ? (
        <p role="alert">The timeline does not match the published summary.</p>
      ) : null}
      {repetitions.length === 0 ? (
        <p>No repetitions were observed in this video.</p>
      ) : null}
      {chartWarning ? (
        <p role="status">
          The chart image could not be created. Counts still come from the
          analysis file.
        </p>
      ) : null}
      <video aria-label="Uploaded video" controls ref={player} src={mediaUrl}>
        <track
          default
          kind="captions"
          label="No spoken audio"
          src="data:text/vtt,WEBVTT"
          srcLang="en"
        />
      </video>
      <AngleChart samples={samples} />
      <ol aria-label="Repetition timeline">
        {repetitions.map((event) => (
          <li key={`${event.type}-${event.timestamp_ms}`}>
            <Button
              type="button"
              onClick={() => {
                if (player.current) {
                  player.current.currentTime = event.timestamp_ms / 1000;
                }
              }}
            >
              {event.type === "REP_COMPLETED" ? "Complete" : "Incomplete"}{" "}
              repetition at {event.timestamp_ms} ms
            </Button>
          </li>
        ))}
      </ol>
      <p>
        <a href={exportJsonUrl}>Export JSON</a>
        <a href={exportCsvUrl}>Export CSV</a>
      </p>
    </section>
  );
}
