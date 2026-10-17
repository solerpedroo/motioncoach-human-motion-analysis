"""Streaming local-file analysis callable by both the CLI and a future worker."""

import hashlib
import json
import re
import uuid
from dataclasses import asdict
from datetime import UTC, datetime

from motioncoach.contracts.models import PoseFrame, SessionSummary
from motioncoach.exercises.analyzer import ExerciseAnalyzer
from motioncoach.exercises.config import get_config
from motioncoach.exercises.feedback import POLICY, FeedbackEngine
from motioncoach.geometry.angles import finite
from motioncoach.pipeline.errors import AnalysisError, check_cancelled
from motioncoach.pose.landmarker import PoseLandmarker, model_manifest
from motioncoach.video.decoder import VideoDecoder, VideoLimits, file_sha256


class SessionAccumulator:
    def __init__(self, config):
        self.config, self.previous, self.latest = config, None, None
        self.covered = self.discarded = self.omitted = 0
        self.events = []

    def consume(self, snapshot, timestamp, extra=(), *, sample=True):
        self.latest = snapshot
        features = snapshot["features"]

        def observable(metric):
            key = metric["id"]
            if snapshot["selected_side"] == "right" and key.startswith("left_"):
                key = "right_" + key[5:]
            return finite(features.get(key))

        usable = (
            snapshot["pose_quality"] != "INSUFFICIENT"
            and features.get("interpolated") is not True
            and all(observable(m) for m in self.config["features"] if m["role"] == "transition")
        )
        if (
            sample
            and self.previous
            and usable
            and self.previous[1]
            and timestamp - self.previous[0] <= self.config["quality"]["max_gap_ms"]
        ):
            self.covered += timestamp - self.previous[0]
        self.previous = (timestamp, usable) if sample else None
        for event in [*snapshot["events"], *extra]:
            if event["type"] == "REP_INCOMPLETE" and re.search(
                r"insufficient|visibility|pose_lost|missing|landmark|long_gap|non_monotonic|interpolat|degenerate|unobservable",
                event["metadata"].get("reason", ""),
                re.I,
            ):
                self.discarded += 1
            self.append(event)

    def append(self, event):
        self.events.append(event)
        if len(self.events) > POLICY["session"]["maximum_events"]:
            self.events.pop(0)
            self.omitted += 1


def analyze(
    path,
    *,
    exercise,
    camera_view,
    selected_side=None,
    model_path=None,
    limits=None,
    cancelled=lambda: False,
    frame_sink=lambda _: None,
    progress=lambda _: None,
    decoder_factory=VideoDecoder,
    pose_factory=PoseLandmarker,
):
    validate_analysis_options(exercise, camera_view, selected_side)
    limits = limits or VideoLimits()
    config = get_config(exercise)
    analyzer = ExerciseAnalyzer(config, camera_view=camera_view, selected_side=selected_side)
    feedback, aggregate = FeedbackEngine(config, camera_view), SessionAccumulator(config)
    started = datetime.now(UTC)
    manifest = model_manifest()
    config_hash = hashlib.sha256(
        json.dumps(
            {"exercise": config, "feedback": POLICY}, sort_keys=True, separators=(",", ":")
        ).encode()
    ).hexdigest()
    check_cancelled(cancelled)
    with decoder_factory(path, limits, cancelled) as decoder:
        input_hash = file_sha256(decoder.path, cancelled)
        with pose_factory(model_path) as pose:
            last = analyzer.snapshot()
            for frame in decoder:
                check_cancelled(cancelled)
                points = pose.detect(frame)
                last = analyzer.update(dict(timestamp_ms=frame.timestamp_ms, landmarks=points))
                outcome = feedback.update(last, frame.timestamp_ms, points)
                extras = [
                    *outcome["observations"],
                    *([outcome["decision"]["event"]] if outcome["decision"]["event"] else []),
                ]
                aggregate.consume(last, frame.timestamp_ms, extras)
                result = PoseFrame.model_validate(
                    dict(
                        schema_version="1.0.0",
                        timestamp_ms=frame.timestamp_ms,
                        model=manifest["model"],
                        model_version=manifest["model_version"],
                        model_variant=manifest["model_variant"],
                        pose_quality=last["pose_quality"],
                        landmarks=points,
                        features=last["features"],
                    )
                )
                frame_sink(result.model_dump(mode="json", exclude_unset=True))
                progress(
                    dict(
                        stage="analyzing",
                        decoded_frames=decoder.decoded_frames,
                        analyzed_frames=decoder.sampled_frames,
                        timestamp_ms=frame.timestamp_ms,
                        duration_ms=decoder.info.duration_ms,
                    )
                )
            check_cancelled(cancelled)
            duration = decoder.last_end_ms
            final_phase = last["phase"]
            # Reuse pause's interruption invariant; EOF is not a user pause.
            final = analyzer.pause(duration)
            final["events"] = [e for e in final["events"] if e["type"] != "SESSION_PAUSED"]
            for event in final["events"]:
                event["metadata"]["reason"] = "end_of_video"
            aggregate.consume(final, duration, sample=False)
            aggregate.append(
                dict(
                    schema_version="1.0.0",
                    type="SESSION_FINISHED",
                    timestamp_ms=duration,
                    exercise=exercise,
                    rule_id="session.finished",
                    quality=last["pose_quality"],
                    rep_index=None,
                    metadata=dict(phase=final_phase, reason="end_of_video"),
                )
            )
            summary = SessionSummary.model_validate(
                dict(
                    schema_version="1.0.0",
                    id=str(uuid.uuid4()),
                    exercise=exercise,
                    source="upload",
                    started_at=started,
                    duration_ms=duration,
                    camera_view=camera_view,
                    selected_side=last["selected_side"],
                    completed_repetitions=final["completed_repetitions"],
                    incomplete_repetitions=final["incomplete_repetitions"],
                    discarded_repetitions=aggregate.discarded,
                    pose_coverage_ratio=min(1, aggregate.covered / duration)
                    if duration > 0
                    else None,
                    algorithm_version="0.4.0",
                    configuration_version=f"{config['version']}+feedback.{POLICY['version']}",
                    configuration_sha256=config_hash,
                    model_variant=manifest["model_variant"],
                    model_version=manifest["model_version"],
                    model_asset_sha256=manifest["sha256"],
                    evaluation=dict(
                        status="not_evaluated",
                        reason=(
                            "No annotated human reference; "
                            "development thresholds are unvalidated seeds."
                        ),
                    ),
                    events=aggregate.events,
                )
            )
            return dict(
                schema_version="1.0.0",
                summary=summary.model_dump(mode="json", exclude_unset=True),
                metadata=dict(
                    input_sha256=input_hash,
                    video=asdict(decoder.info),
                    limits=asdict(limits),
                    decoded_frames=decoder.decoded_frames,
                    analyzed_frames=decoder.sampled_frames,
                    irregular_pts=decoder.irregular_pts,
                    final_phase=final_phase,
                    events_omitted=aggregate.omitted,
                    mediapipe_version=getattr(pose, "version", "injected_test_double"),
                    decoder_runtime=getattr(decoder, "runtime_versions", {}),
                    pose_preprocessing="PyAV rgb24 to contiguous uint8; no rotation or crop",
                    pts_fallback=False,
                    model_timestamp_policy=(
                        "floor(pts_ms) for SDK only; exact decoded PTS used by engine/output"
                    ),
                ),
            )


def validate_analysis_options(exercise, camera_view, selected_side):
    config = get_config(exercise)
    if camera_view not in ("side", "front"):
        raise AnalysisError("INVALID_VIEW", "Choose a side or front camera view.")
    if config["recommended_view"] != "either" and config["recommended_view"] != camera_view:
        raise AnalysisError(
            "UNSUPPORTED_VIEW", "The selected exercise requires its configured camera view."
        )
    if exercise == "biceps_curl" and selected_side not in ("left", "right"):
        raise AnalysisError("SIDE_REQUIRED", "Choose the left or right arm for biceps curl.")
