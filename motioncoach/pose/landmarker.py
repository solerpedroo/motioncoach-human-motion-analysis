"""Optional MediaPipe VIDEO adapter with a verified local model."""

import importlib.metadata
from pathlib import Path

from motioncoach.contracts.models import Landmark
from motioncoach.exercises.config import load_json
from motioncoach.geometry.angles import finite
from motioncoach.pipeline.errors import AnalysisError
from motioncoach.video.decoder import file_sha256


def model_manifest():
    return load_json("models/pose-landmarker-lite.json")


def verify_model(path):
    if path is None:
        raise AnalysisError("MODEL_NOT_FOUND", "Choose the prepared local model asset.")
    path = Path(path)
    if not path.is_file():
        raise AnalysisError(
            "MODEL_NOT_FOUND", "Prepare the local Pose Landmarker Lite asset first."
        )
    if file_sha256(path) != model_manifest()["sha256"]:
        raise AnalysisError(
            "MODEL_HASH_MISMATCH", "The local model does not match the pinned SHA-256."
        )
    return path


def normalize_landmarks(points):
    result = []
    for index, point in enumerate(points[:33]):
        if (
            not all(finite(getattr(point, key, None)) for key in ("x", "y", "z"))
            or not 0 <= point.x <= 1
            or not 0 <= point.y <= 1
        ):
            continue

        def confidence(name, point=point):
            value = getattr(point, name, None)
            return value if finite(value) and 0 <= value <= 1 else None

        result.append(
            Landmark(
                index=index,
                x=point.x,
                y=point.y,
                z=point.z,
                visibility=confidence("visibility"),
                presence=confidence("presence"),
            ).model_dump()
        )
    return result


class PoseLandmarker:
    def __init__(self, model_path):
        path = verify_model(model_path)
        try:
            import mediapipe as mp
            import numpy as np
            from mediapipe.tasks.python import BaseOptions
            from mediapipe.tasks.python.vision import PoseLandmarker as NativeLandmarker
            from mediapipe.tasks.python.vision import PoseLandmarkerOptions, RunningMode
        except (ImportError, OSError) as error:
            raise AnalysisError(
                "POSE_RUNTIME_MISSING",
                "Install the pose extra and required native runtime libraries.",
            ) from error
        self.mp, self.np, self.last_timestamp = mp, np, None
        self.version = importlib.metadata.version("mediapipe")
        if self.version != model_manifest()["python_sdk_version"]:
            raise AnalysisError(
                "POSE_VERSION_MISMATCH", "Use the pinned MediaPipe Python version 1.1.1."
            )
        try:
            self.native = NativeLandmarker.create_from_options(
                PoseLandmarkerOptions(
                    base_options=BaseOptions(
                        model_asset_path=str(path), delegate=BaseOptions.Delegate.CPU
                    ),
                    running_mode=RunningMode.VIDEO,
                    num_poses=1,
                    min_pose_detection_confidence=0.5,
                    min_pose_presence_confidence=0.5,
                    min_tracking_confidence=0.5,
                    output_segmentation_masks=False,
                )
            )
        except Exception as error:
            raise AnalysisError(
                "POSE_INIT_FAILED", "The pose runtime could not initialize the verified model."
            ) from error

    def __enter__(self):
        return self

    def close(self):
        if self.native is not None:
            self.native.close()
            self.native = None

    def __exit__(self, *_):
        self.close()

    def detect(self, frame):
        if not finite(frame.timestamp_ms) or frame.timestamp_ms < 0:
            raise AnalysisError(
                "POSE_TIMESTAMP_RESOLUTION", "Pose timestamps must be nonnegative and finite."
            )
        timestamp = int(frame.timestamp_ms)
        if self.last_timestamp is not None and timestamp <= self.last_timestamp:
            raise AnalysisError(
                "POSE_TIMESTAMP_RESOLUTION",
                "Sampled timestamps must remain distinct at integer-millisecond resolution.",
            )
        self.last_timestamp = timestamp
        try:
            image = self.mp.Image(
                image_format=self.mp.ImageFormat.SRGB, data=self.np.ascontiguousarray(frame.rgb)
            )
            result = self.native.detect_for_video(image, timestamp)
            return normalize_landmarks(result.pose_landmarks[0] if result.pose_landmarks else [])
        except AnalysisError:
            raise
        except Exception as error:
            raise AnalysisError(
                "POSE_INFERENCE_FAILED", "Pose inference failed for the decoded frame."
            ) from error
