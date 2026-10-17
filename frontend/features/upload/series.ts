export type AngleSample = { timestamp_ms: number; angle_deg: number };

export function angleSamples(framesJsonl: string): AngleSample[] {
  return framesJsonl
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .flatMap((line) => {
      const frame = JSON.parse(line) as {
        timestamp_ms: number;
        features?: Record<string, number | null>;
      };
      const value = Object.entries(frame.features ?? {}).find(
        ([key, item]) => key.endsWith("_deg") && typeof item === "number",
      )?.[1];
      return typeof value === "number"
        ? [{ timestamp_ms: frame.timestamp_ms, angle_deg: value }]
        : [];
    });
}
