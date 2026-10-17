export const METRICS_WINDOW_MS = 2000;
export function createSessionMetrics() {
  let captured: number[] = [];
  let inferred: { time: number; latency: number }[] = [];
  const trim = (now: number) => {
    captured = captured.filter((time) => time > now - METRICS_WINDOW_MS);
    inferred = inferred.filter(({ time }) => time > now - METRICS_WINDOW_MS);
  };
  const rate = (times: number[]) =>
    times.length < 2
      ? null
      : ((times.length - 1) * 1000) / (times[times.length - 1] - times[0]);
  return {
    capture(time: number) {
      captured.push(time);
      trim(time);
    },
    inference(time: number, latency: number) {
      inferred.push({ time, latency });
      trim(time);
    },
    snapshot(now: number) {
      trim(now);
      return {
        capture_fps: rate(captured),
        inference_fps: rate(inferred.map(({ time }) => time)),
        latency_ms: inferred.length
          ? inferred.reduce((sum, item) => sum + item.latency, 0) /
            inferred.length
          : null,
      };
    },
  };
}
