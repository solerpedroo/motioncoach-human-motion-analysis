import type { Landmark } from "@/lib/contracts.generated";
// Preserve model coordinates; out-of-frame points are absent, never clamped into view.
export function normalizeLandmarks(
  points: readonly {
    x: number;
    y: number;
    z: number;
    visibility?: number;
    presence?: number;
  }[],
): Landmark[] {
  return points.slice(0, 33).flatMap((point, index) => {
    if (
      ![point.x, point.y, point.z].every(Number.isFinite) ||
      point.x < 0 ||
      point.x > 1 ||
      point.y < 0 ||
      point.y > 1
    )
      return [];
    const confidence = (value: number | undefined) =>
      value !== undefined && Number.isFinite(value) && value >= 0 && value <= 1
        ? value
        : null;
    return [
      {
        index,
        x: point.x,
        y: point.y,
        z: point.z,
        visibility: confidence(point.visibility),
        presence: confidence(point.presence),
      },
    ];
  });
}
