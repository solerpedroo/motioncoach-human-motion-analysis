"""EMA port: held values never authorize transitions."""

from motioncoach.geometry.angles import finite


class EmaFilter:
    def __init__(self, alpha: float, max_gap_ms: float):
        if not finite(alpha) or not 0 < alpha <= 1 or not finite(max_gap_ms) or max_gap_ms <= 0:
            raise ValueError("Invalid EMA settings")
        self.alpha, self.max_gap = alpha, max_gap_ms
        self.reset()

    def reset(self):
        self.last_timestamp = self.last_observed = self.smoothed = None

    @staticmethod
    def empty(reason):
        return dict(
            value=None,
            interpolated=False,
            can_transition=False,
            continuity_broken=True,
            reason=reason,
        )

    def update(self, value, timestamp):
        if not finite(timestamp) or timestamp < 0:
            return self.empty("INVALID_TIMESTAMP")
        if self.last_timestamp is not None and timestamp <= self.last_timestamp:
            return self.empty("NON_MONOTONIC_TIMESTAMP")
        self.last_timestamp = timestamp
        gap = self.last_observed is not None and timestamp - self.last_observed > self.max_gap
        if gap:
            self.smoothed = None
        if not finite(value):
            if self.smoothed is not None:
                return dict(
                    value=self.smoothed,
                    interpolated=True,
                    can_transition=False,
                    continuity_broken=False,
                    reason="HELD",
                )
            return self.empty("LONG_GAP" if gap else "MISSING")
        self.smoothed = (
            value
            if self.smoothed is None
            else self.alpha * value + (1 - self.alpha) * self.smoothed
        )
        self.last_observed = timestamp
        return dict(
            value=self.smoothed,
            interpolated=False,
            can_transition=not gap,
            continuity_broken=gap,
            reason="LONG_GAP" if gap else "OBSERVED",
        )
