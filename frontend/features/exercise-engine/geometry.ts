import type { Landmark } from "@/lib/contracts.generated";

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export function angle2D(
  a: Point2D | null | undefined,
  b: Point2D | null | undefined,
  c: Point2D | null | undefined,
): number | null {
  if (
    ![a, b, c].every(
      (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y),
    )
  )
    return null;
  if (!a || !b || !c) return null;
  const ux = a.x - b.x;
  const uy = a.y - b.y;
  const vx = c.x - b.x;
  const vy = c.y - b.y;
  const uLength = Math.hypot(ux, uy);
  const vLength = Math.hypot(vx, vy);
  if (
    !Number.isFinite(uLength) ||
    !Number.isFinite(vLength) ||
    uLength === 0 ||
    vLength === 0
  )
    return null;
  // Normalize each vector first to avoid overflow/underflow in their product.
  const cosine =
    (ux / uLength) * (vx / vLength) + (uy / uLength) * (vy / vLength);
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
}

export function isUsableLandmark(
  point: Landmark | undefined,
  minVisibility: number,
): boolean {
  return (
    point !== undefined &&
    Number.isInteger(point.index) &&
    point.index >= 0 &&
    point.index <= 32 &&
    Number.isFinite(point.x) &&
    point.x >= 0 &&
    point.x <= 1 &&
    Number.isFinite(point.y) &&
    point.y >= 0 &&
    point.y <= 1 &&
    Number.isFinite(point.z) &&
    point.visibility !== null &&
    Number.isFinite(point.visibility) &&
    point.visibility >= minVisibility &&
    point.visibility <= 1 &&
    (point.presence === null ||
      (Number.isFinite(point.presence) &&
        point.presence >= 0 &&
        point.presence <= 1))
  );
}

export function landmarkAngle2D(
  points: readonly Landmark[],
  indices: readonly [number, number, number],
  minVisibility: number,
): number | null {
  if (!Number.isFinite(minVisibility) || minVisibility < 0 || minVisibility > 1)
    throw new RangeError("min_visibility must be in [0, 1]");
  const selected = indices.map((index) => {
    const matches = points.filter((point) => point.index === index);
    return matches.length === 1 ? matches[0] : undefined;
  });
  if (!selected.every((point) => isUsableLandmark(point, minVisibility)))
    return null;
  return angle2D(selected[0], selected[1], selected[2]);
}
