"""Offline filters for experiment D. They do not change the exercise FSM."""

import math

from motioncoach.temporal.ema import EmaFilter


class MovingAverage:
    def __init__(self, window: int):
        if window < 1:
            raise ValueError("Window must be positive")
        self.window = window
        self.values: list[float] = []

    def update(self, value: float, _timestamp_ms: float) -> float:
        self.values.append(value)
        sample = self.values[-self.window :]
        return sum(sample) / len(sample)


class OneEuro:
    """Casiez et al. parameters are experiment factors, not exercise seeds."""

    def __init__(self, min_cutoff: float = 1.0, beta: float = 0.007, d_cutoff: float = 1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.previous = None
        self.previous_time = None
        self.dx = 0.0

    def update(self, value: float, timestamp_ms: float) -> float:
        timestamp_s = timestamp_ms / 1000
        if self.previous is None or self.previous_time is None:
            self.previous = value
            self.previous_time = timestamp_s
            return value
        dt = timestamp_s - self.previous_time
        if dt <= 0:
            return self.previous
        derivative = (value - self.previous) / dt
        dx = _smooth(derivative, self.dx, self.d_cutoff, dt)
        filtered = _smooth(value, self.previous, self.min_cutoff + self.beta * abs(dx), dt)
        self.previous = filtered
        self.previous_time = timestamp_s
        self.dx = dx
        return filtered


def _smooth(value: float, previous: float, cutoff: float, dt: float) -> float:
    tau = 1 / (2 * math.pi * cutoff)
    alpha = 1 / (1 + tau / dt)
    return alpha * value + (1 - alpha) * previous


def apply_filter(name: str, samples: list[dict]) -> list[float]:
    if name == "none":
        return [sample["value"] for sample in samples]
    if name == "ema":
        filt = EmaFilter(0.4, 200)
        return [filt.update(sample["value"], sample["timestamp_ms"])["value"] for sample in samples]
    if name == "moving_average":
        filt = MovingAverage(5)
    elif name == "one_euro":
        filt = OneEuro()
    else:
        raise ValueError(f"Unknown filter {name}")
    return [filt.update(sample["value"], sample["timestamp_ms"]) for sample in samples]


def stable_variability(values: list[float]) -> float:
    mean = sum(values) / len(values)
    return (sum((item - mean) ** 2 for item in values) / len(values)) ** 0.5


def crossing_ms(samples: list[dict], values: list[float], threshold: float) -> float | None:
    for sample, value in zip(samples, values, strict=True):
        if value <= threshold:
            return sample["timestamp_ms"]
    return None
