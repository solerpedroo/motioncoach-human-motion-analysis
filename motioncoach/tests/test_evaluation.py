"""Wave 8 scoring and the synthetic filter comparison."""

import json
from pathlib import Path

from motioncoach.evaluation.experiment_d import run_filter_experiment
from motioncoach.evaluation.scoring import evaluate_annotations, event_rates, pair_events


def test_pairing_is_one_to_one_inside_500_ms():
    paired = pair_events([1100, 2700], [1000, 2000])
    assert paired["tp"] == 1
    assert paired["fp"] == 1
    assert paired["fn"] == 1
    assert paired["matches"][0]["predicted_ms"] == 1100


def test_empty_denominators_do_not_become_zero_or_one():
    rates = event_rates({"tp": 0, "fp": 0, "fn": 0})
    assert rates["precision"] is None
    assert rates["recall"] is None
    assert rates["f1"] is None
    assert (rates["tp"], rates["fp"], rates["fn"]) == (0, 0, 0)


def test_synthetic_fixture_is_not_a_human_mae():
    report = evaluate_annotations({"source": "synthetic_fixture", "clips": [{"id": "fsm"}]})
    assert report["status"] == "not_evaluated"
    assert report["reason"] == "not_human_annotation"
    assert report["count"]["mae"] is None
    assert report["feedback"]["status"] == "not_evaluated"
    assert report["pose"]["status"] == "not_evaluated"


def test_human_clip_reports_count_error_without_inventing_feedback_precision():
    report = evaluate_annotations(
        {
            "source": "human_annotation",
            "clips": [
                {
                    "id": "person-a-session-1",
                    "predicted_completed": 4,
                    "reference_completed": 5,
                    "predicted_event_ms": [1000],
                    "repetitions": [{"end_ms": 1200}],
                }
            ],
        }
    )
    assert report["count"]["mae"] == 1
    assert report["events"]["tp"] == 1
    assert report["feedback"]["reason"] == "no_review_protocol"


def test_filter_experiment_reduces_stable_jitter_and_names_the_shift():
    report = run_filter_experiment()
    assert report["human_accuracy"]["status"] == "not_evaluated"
    by_name = {item["filter"]: item for item in report["filters"]}
    assert by_name["ema"]["stable_variability"] < by_name["none"]["stable_variability"]
    assert by_name["none"]["event_shift_ms"] == 0
    assert all(item["event_ms"] is not None for item in report["filters"])


def test_written_report_keeps_human_experiments_unevaluated(tmp_path, monkeypatch):
    import scripts.evaluate as evaluate

    monkeypatch.setattr(evaluate, "REPORTS", tmp_path)
    payload = evaluate.write_reports(None)
    saved = json.loads((tmp_path / "wave8.json").read_text(encoding="utf-8"))
    assert saved["human"]["experiments"]["A"]["status"] == "not_evaluated"
    assert saved["human"]["count"]["mae"] is None
    assert saved["protocol"]["thresholds_adjusted_on_test"] is False
    assert payload["filter_d"]["experiment"] == "D"
    assert saved["filter_d"]["human_accuracy"]["status"] == "not_evaluated"
    assert Path("shared/fixtures/repetitions/landmarks.json").exists()
