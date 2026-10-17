export interface EmaOptions {
  readonly alpha: number;
  readonly max_gap_ms: number;
}

export interface FilteredSample {
  readonly value: number | null;
  readonly interpolated: boolean;
  readonly can_transition: boolean;
  readonly continuity_broken: boolean;
  readonly reason:
    | "OBSERVED"
    | "HELD"
    | "MISSING"
    | "LONG_GAP"
    | "INVALID_TIMESTAMP"
    | "NON_MONOTONIC_TIMESTAMP";
}

export function createEmaFilter(options: EmaOptions) {
  const { alpha, max_gap_ms: maxGap } = options;
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha > 1)
    throw new RangeError("alpha must be in (0, 1]");
  if (!Number.isFinite(maxGap) || maxGap <= 0)
    throw new RangeError("max_gap_ms must be positive");
  let lastTimestamp: number | null = null;
  let lastObservedTimestamp: number | null = null;
  let smoothed: number | null = null;

  const empty = (reason: FilteredSample["reason"]): FilteredSample => ({
    value: null,
    interpolated: false,
    can_transition: false,
    continuity_broken: true,
    reason,
  });
  return {
    reset() {
      lastTimestamp = null;
      lastObservedTimestamp = null;
      smoothed = null;
    },
    update(value: number | null, timestampMs: number): FilteredSample {
      if (!Number.isFinite(timestampMs) || timestampMs < 0)
        return empty("INVALID_TIMESTAMP");
      if (lastTimestamp !== null && timestampMs <= lastTimestamp)
        return empty("NON_MONOTONIC_TIMESTAMP");
      lastTimestamp = timestampMs;
      const longGap =
        lastObservedTimestamp !== null &&
        timestampMs - lastObservedTimestamp > maxGap;
      if (longGap) smoothed = null;
      if (value === null || !Number.isFinite(value)) {
        if (smoothed !== null)
          return {
            value: smoothed,
            interpolated: true,
            can_transition: false,
            continuity_broken: false,
            reason: "HELD",
          };
        return empty(longGap ? "LONG_GAP" : "MISSING");
      }
      smoothed =
        smoothed === null ? value : alpha * value + (1 - alpha) * smoothed;
      lastObservedTimestamp = timestampMs;
      return {
        value: smoothed,
        interpolated: false,
        can_transition: !longGap,
        continuity_broken: longGap,
        reason: longGap ? "LONG_GAP" : "OBSERVED",
      };
    },
  };
}
