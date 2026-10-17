"use client";

import type { AngleSample } from "@/features/upload/series";

export function AngleChart({ samples }: { samples: AngleSample[] }) {
  if (samples.length === 0) {
    return <p>No angle was available for this video.</p>;
  }
  const width = 320;
  const height = 140;
  const start = samples[0].timestamp_ms;
  const end = samples[samples.length - 1].timestamp_ms;
  const span = Math.max(end - start, 1);
  const low = Math.min(...samples.map((sample) => sample.angle_deg));
  const high = Math.max(...samples.map((sample) => sample.angle_deg));
  const spread = Math.max(high - low, 1);
  const points = samples
    .map((sample) => {
      const x = ((sample.timestamp_ms - start) / span) * (width - 8) + 4;
      const y = (1 - (sample.angle_deg - low) / spread) * (height - 8) + 4;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      aria-label="Angle over media time"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <title>Angle over media time, in milliseconds</title>
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
