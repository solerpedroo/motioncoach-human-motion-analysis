"""Count and event scoring. Missing references stay not_evaluated."""

MATCH_TOLERANCE_MS = 500


def pair_events(
    predicted_ms: list[float],
    reference_ms: list[float],
    tolerance_ms: float = MATCH_TOLERANCE_MS,
):
    """Greedy one-to-one match. Each reference takes the nearest unused prediction."""
    unused = sorted(predicted_ms)
    matched = []
    for reference in sorted(reference_ms):
        candidates = [item for item in unused if abs(item - reference) <= tolerance_ms]
        if not candidates:
            continue
        choice = min(candidates, key=lambda item: (abs(item - reference), item))
        unused.remove(choice)
        matched.append(
            {
                "reference_ms": reference,
                "predicted_ms": choice,
                "absolute_error_ms": abs(choice - reference),
            }
        )
    tp = len(matched)
    return {
        "matches": matched,
        "tp": tp,
        "fp": len(predicted_ms) - tp,
        "fn": len(reference_ms) - tp,
    }


def rate(numerator: int, denominator: int):
    if denominator == 0:
        return None
    return numerator / denominator


def event_rates(counts: dict):
    tp, fp, fn = counts["tp"], counts["fp"], counts["fn"]
    precision = rate(tp, tp + fp)
    recall = rate(tp, tp + fn)
    f1 = None
    if precision is not None and recall is not None and precision + recall:
        f1 = 2 * precision * recall / (precision + recall)
    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }


def count_mae(cases: list[dict]):
    if not cases:
        return {"status": "not_evaluated", "reason": "no_annotated_clips", "mae": None, "clips": []}
    errors = [abs(case["predicted"] - case["reference"]) for case in cases]
    return {
        "status": "measured",
        "reason": None,
        "mae": sum(errors) / len(errors),
        "clips": [
            {
                "id": case["id"],
                "absolute_error": abs(case["predicted"] - case["reference"]),
            }
            for case in cases
        ],
    }


def _blocked(reason: str):
    return {
        "status": "not_evaluated",
        "reason": reason,
        "count": count_mae([]),
        "events": None,
        "temporal_error_ms": None,
        "feedback": {"status": "not_evaluated", "reason": "no_review_protocol"},
        "pose": {"status": "not_evaluated", "reason": "no_pose_reference"},
    }


def evaluate_annotations(document: dict | None):
    if not document or document.get("source") != "human_annotation":
        reason = "no_annotated_clips" if not document else "not_human_annotation"
        return _blocked(reason)
    clips = document.get("clips") or []
    if not clips:
        return _blocked("no_annotated_clips")
    count_cases = []
    predicted_times = []
    reference_times = []
    for clip in clips:
        count_cases.append(
            {
                "id": clip["id"],
                "predicted": clip["predicted_completed"],
                "reference": clip["reference_completed"],
            }
        )
        predicted_times.extend(clip.get("predicted_event_ms") or [])
        reference_times.extend(
            repetition["end_ms"]
            for repetition in clip.get("repetitions") or []
            if "end_ms" in repetition
        )
    paired = pair_events(predicted_times, reference_times)
    temporal = None
    if paired["matches"]:
        temporal = {
            "status": "measured",
            "mean_absolute_error_ms": sum(item["absolute_error_ms"] for item in paired["matches"])
            / len(paired["matches"]),
            "matches": paired["matches"],
        }
    elif reference_times or predicted_times:
        temporal = {
            "status": "not_evaluated",
            "reason": "no_temporal_match",
            "mean_absolute_error_ms": None,
        }
    return {
        "status": "measured",
        "reason": None,
        "count": count_mae(count_cases),
        "events": event_rates(paired),
        "temporal_error_ms": temporal,
        "feedback": {"status": "not_evaluated", "reason": "no_review_protocol"},
        "pose": {"status": "not_evaluated", "reason": "no_pose_reference"},
    }
