import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AnalysisReport } from "@/components/reports/analysis-report";
import { angleSamples } from "@/features/upload/series";

const summary = {
  completed_repetitions: 1,
  incomplete_repetitions: 1,
  duration_ms: 2400,
  events: [
    {
      type: "REP_COMPLETED",
      timestamp_ms: 1200,
      rep_index: 1,
    },
    {
      type: "REP_INCOMPLETE",
      timestamp_ms: 2000,
      rep_index: null,
    },
  ],
};

it("seeks the player to the same timestamp shown on the repetition", () => {
  render(
    <AnalysisReport
      chartWarning={null}
      exportCsvUrl="/export.csv"
      exportJsonUrl="/export.json"
      mediaUrl="/media.mp4"
      samples={[
        { timestamp_ms: 0, angle_deg: 160 },
        { timestamp_ms: 1200, angle_deg: 90 },
      ]}
      summary={summary}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Complete repetition at 1200 ms" }),
  );
  expect(screen.getByLabelText("Uploaded video")).toHaveProperty(
    "currentTime",
    1.2,
  );
  expect(
    screen.getByText("Complete repetitions 1. Incomplete repetitions 1."),
  ).toBeVisible();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("keeps the counts visible when the chart image failed", () => {
  render(
    <AnalysisReport
      chartWarning="CHART_RENDER_FAILED"
      exportCsvUrl="/export.csv"
      exportJsonUrl="/export.json"
      mediaUrl="/media.mp4"
      samples={[]}
      summary={{
        ...summary,
        events: [],
        completed_repetitions: 0,
        incomplete_repetitions: 0,
      }}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("could not be created");
  expect(
    screen.getByText("No repetitions were observed in this video."),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "Export JSON" })).toHaveAttribute(
    "href",
    "/export.json",
  );
});

it("drops landmark payloads when reading angle samples", () => {
  const samples = angleSamples(
    `${JSON.stringify({
      timestamp_ms: 10,
      landmarks: [{ index: 1, x: 0.2 }],
      features: { left_knee_angle_deg: 100, trunk_tilt_deg: null },
    })}\n`,
  );
  expect(samples).toEqual([{ timestamp_ms: 10, angle_deg: 100 }]);
  expect(JSON.stringify(samples)).not.toContain("landmarks");
});
