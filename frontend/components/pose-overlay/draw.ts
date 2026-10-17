import type { Landmark } from "@/lib/contracts.generated";
export const CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [28, 30],
  [30, 32],
] as const;
export function projectPoint(
  point: Pick<Landmark, "x" | "y">,
  width: number,
  height: number,
) {
  return { x: point.x * width, y: point.y * height };
}
export function drawPose(
  context: CanvasRenderingContext2D,
  points: readonly Landmark[],
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);
  const visible = new Map(
    points
      .filter(
        (point) =>
          (point.visibility ?? 0) >= 0.5 &&
          (point.presence === null || point.presence >= 0.5),
      )
      .map((point) => [point.index, projectPoint(point, width, height)]),
  );
  context.strokeStyle = "#75e5ca";
  context.fillStyle = "#ffffff";
  context.lineWidth = Math.max(2, width / 250);
  for (const [from, to] of CONNECTIONS) {
    const a = visible.get(from),
      b = visible.get(to);
    if (!a || !b) continue;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  }
  for (const [index, point] of visible) {
    if (index < 11) continue;
    context.beginPath();
    context.arc(point.x, point.y, Math.max(3, width / 160), 0, Math.PI * 2);
    context.fill();
  }
}
