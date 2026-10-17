"""Experiment D on a fixed synthetic angle. Not a human accuracy result."""

from motioncoach.evaluation.filters import apply_filter, crossing_ms, stable_variability

# Fixed jitter around a held angle, then one downward step. No person, no video.
NOISE = (
    0.6,
    -0.4,
    1.1,
    -0.8,
    0.2,
    -1.4,
    0.9,
    -0.3,
    1.6,
    -1.1,
    0.4,
    -0.7,
    1.3,
    -0.5,
    0.8,
    -1.2,
    0.1,
    -0.9,
    1.5,
    -0.2,
)
HELD = 170.0
STEP = 100.0
STEP_MS = 1000
INTERVAL_MS = 50
THRESHOLD = 150.0


def synthetic_signal() -> list[dict]:
    samples = [
        {"timestamp_ms": index * INTERVAL_MS, "value": HELD + noise}
        for index, noise in enumerate(NOISE)
    ]
    samples.append({"timestamp_ms": STEP_MS, "value": STEP})
    samples.append({"timestamp_ms": STEP_MS + INTERVAL_MS, "value": STEP})
    return samples


def run_filter_experiment() -> dict:
    samples = synthetic_signal()
    stable_count = len(NOISE)
    true_event_ms = STEP_MS
    filters = []
    for name in ("none", "ema", "moving_average", "one_euro"):
        values = apply_filter(name, samples)
        event_ms = crossing_ms(samples, values, THRESHOLD)
        filters.append(
            {
                "filter": name,
                "stable_variability": stable_variability(values[:stable_count]),
                "event_ms": event_ms,
                "event_shift_ms": None if event_ms is None else event_ms - true_event_ms,
            }
        )
    return {
        "experiment": "D",
        "signal": "synthetic_held_angle_plus_step",
        "human_accuracy": {"status": "not_evaluated", "reason": "synthetic_signal_is_not_a_person"},
        "true_event_ms": true_event_ms,
        "threshold": THRESHOLD,
        "factors": {
            "ema_alpha": 0.4,
            "moving_average_window": 5,
            "one_euro": {"min_cutoff": 1.0, "beta": 0.007, "d_cutoff": 1.0},
        },
        "filters": filters,
    }
