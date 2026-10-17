"""Bounded libavformat probing and decoding with rational presentation timestamps."""

import hashlib
from dataclasses import asdict, dataclass
from fractions import Fraction
from pathlib import Path
from typing import Any

from motioncoach.geometry.angles import finite
from motioncoach.pipeline.errors import AnalysisError, check_cancelled


@dataclass(frozen=True)
class VideoLimits:
    max_bytes: int = 200_000_000
    max_duration_ms: float = 300_000
    max_pixels: int = 3840 * 2160
    max_decoded_frames: int = 36_000
    sample_fps: float = 30

    def __post_init__(self):
        if any(not finite(v) or v <= 0 for v in asdict(self).values()) or self.sample_fps > 120:
            raise ValueError("Video limits must be positive; sample_fps must be at most 120")
        if any(
            not isinstance(getattr(self, key), int)
            for key in ("max_bytes", "max_pixels", "max_decoded_frames")
        ):
            raise ValueError("Byte, pixel and frame limits must be integers")


@dataclass(frozen=True)
class VideoInfo:
    size_bytes: int
    container: str
    codec: str
    width: int
    height: int
    duration_ms: float | None
    average_fps: float | None
    time_base: str
    start_pts: int | None
    declared_frames: int
    stream_index: int
    timestamp_policy: str = "pts_minus_stream_start; no_fps_fallback"


@dataclass(frozen=True)
class DecodedFrame:
    timestamp_ms: float
    duration_ms: float
    source_pts: int
    source_time_base: str
    rgb: Any


def require_av():
    try:
        import av
    except ImportError as error:
        raise AnalysisError(
            "VIDEO_RUNTIME_MISSING", "Install the video extra to read local videos."
        ) from error
    return av


def validate_file(path: Path, limits: VideoLimits):
    if not path.is_file():
        raise AnalysisError("FILE_NOT_FOUND", "Choose an existing regular video file.")
    if path.suffix.lower() not in (".mp4", ".mov", ".webm"):
        raise AnalysisError("UNSUPPORTED_EXTENSION", "Choose an MP4, MOV or WebM file.")
    size = path.stat().st_size
    if size == 0:
        raise AnalysisError("INVALID_VIDEO", "The video file is empty.")
    if size > limits.max_bytes:
        raise AnalysisError("FILE_TOO_LARGE", "The video exceeds the configured byte limit.")
    return size


def file_sha256(path: Path, cancelled=lambda: False):
    digest = hashlib.sha256()
    with path.open("rb") as file:
        while chunk := file.read(1024 * 1024):
            check_cancelled(cancelled)
            digest.update(chunk)
    return digest.hexdigest()


def inspect(container, path, limits, size):
    videos = list(container.streams.video)
    if not videos:
        raise AnalysisError("INVALID_VIDEO", "The file contains no usable video stream.")
    if len(videos) != 1:
        raise AnalysisError("AMBIGUOUS_VIDEO", "The file must contain exactly one video stream.")
    stream = videos[0]
    format_ = container.format.name
    family = set(format_.split(","))
    webm = path.suffix.lower() == ".webm"
    if (webm and not family.intersection(("matroska", "webm"))) or (
        not webm and "mov" not in family
    ):
        raise AnalysisError(
            "CONTENT_TYPE_MISMATCH",
            "The detected video container does not match the file extension.",
        )
    codec = stream.codec_context.name
    if webm and codec not in ("vp8", "vp9", "av1"):
        raise AnalysisError("UNSUPPORTED_CODEC", "WebM requires a supported WebM video codec.")
    width, height = stream.codec_context.width, stream.codec_context.height
    if width <= 0 or height <= 0:
        raise AnalysisError("INVALID_VIDEO", "The video has no usable dimensions.")
    if width * height > limits.max_pixels:
        raise AnalysisError("RESOLUTION_LIMIT", "The video exceeds the configured pixel limit.")
    if not stream.time_base or stream.time_base <= 0:
        raise AnalysisError("PTS_REQUIRED", "The video has no usable presentation time base.")
    if str(stream.metadata.get("rotate", "0")) not in ("0", "0.0"):
        raise AnalysisError("ROTATION_UNSUPPORTED", "Normalize video rotation before analysis.")
    if stream.sample_aspect_ratio and stream.sample_aspect_ratio != 1:
        raise AnalysisError(
            "PIXEL_ASPECT_UNSUPPORTED", "Normalize non-square pixels before analysis."
        )
    duration = (
        float(stream.duration * stream.time_base * 1000)
        if stream.duration is not None
        else float(container.duration / 1000)
        if container.duration is not None
        else None
    )
    if duration is not None and (not finite(duration) or duration < 0):
        raise AnalysisError("INVALID_VIDEO", "The video has invalid duration metadata.")
    if duration is not None and duration > limits.max_duration_ms:
        raise AnalysisError("DURATION_LIMIT", "The video exceeds the configured duration limit.")
    average = (
        float(stream.average_rate) if stream.average_rate and stream.average_rate > 0 else None
    )
    return VideoInfo(
        size,
        format_,
        codec,
        width,
        height,
        duration,
        average,
        str(stream.time_base),
        stream.start_time,
        stream.frames,
        stream.index,
    ), stream


class VideoDecoder:
    def __init__(self, path, limits=None, cancelled=lambda: False):
        self.path, self.limits, self.cancelled = Path(path), limits or VideoLimits(), cancelled
        self.container = None
        self.decoded_frames = self.sampled_frames = 0
        self.last_end_ms = 0.0
        self.irregular_pts = False

    def __enter__(self):
        check_cancelled(self.cancelled)
        size = validate_file(self.path, self.limits)
        av = require_av()
        try:
            self.container = av.open(
                str(self.path),
                mode="r",
                options={"protocol_whitelist": "file", "format_whitelist": "mov,matroska,webm"},
                timeout=(5.0, 5.0),
            )
            self.info, self.stream = inspect(self.container, self.path, self.limits, size)
            self.runtime_versions = {
                "pyav": av.__version__,
                "ffmpeg_libraries": {
                    name: ".".join(map(str, version))
                    for name, version in av.library_versions.items()
                },
            }
            # Fixed against the original stream, never the first sampled/cropped frame.
            self.origin = Fraction(self.stream.start_time or 0) * self.stream.time_base
            return self
        except AnalysisError:
            self.close()
            raise
        except (av.FFmpegError, OSError, ValueError) as error:
            self.close()
            raise AnalysisError(
                "INVALID_VIDEO", "The file is not a decodable supported video."
            ) from error

    def close(self):
        if self.container is not None:
            self.container.close()
            self.container = None

    def __exit__(self, *_):
        self.close()

    def __iter__(self):
        if self.container is None:
            raise AnalysisError("DECODER_CLOSED", "Open the video decoder before reading frames.")
        av = require_av()
        previous = first_delta = last_sample = None
        step = Fraction(1000) / Fraction(str(self.limits.sample_fps))
        try:
            for frame in self.container.decode(self.stream):
                check_cancelled(self.cancelled)
                self.decoded_frames += 1
                if self.decoded_frames > self.limits.max_decoded_frames:
                    raise AnalysisError(
                        "FRAME_LIMIT", "The video exceeds the configured decoded-frame limit."
                    )
                if frame.is_corrupt:
                    raise AnalysisError("CORRUPT_VIDEO", "The video contains a corrupt frame.")
                if frame.width * frame.height > self.limits.max_pixels:
                    raise AnalysisError(
                        "RESOLUTION_LIMIT", "A decoded frame exceeds the configured pixel limit."
                    )
                if frame.rotation or any(
                    side.type.name == "DISPLAYMATRIX" for side in frame.side_data
                ):
                    raise AnalysisError(
                        "ROTATION_UNSUPPORTED",
                        "Normalize video display orientation before analysis.",
                    )
                if frame.pts is None or frame.time_base is None:
                    raise AnalysisError(
                        "PTS_REQUIRED", "Every decoded frame must have a presentation timestamp."
                    )
                time = (Fraction(frame.pts) * frame.time_base - self.origin) * 1000
                if time < 0 or (previous is not None and time <= previous):
                    raise AnalysisError(
                        "NON_MONOTONIC_PTS",
                        "Video PTS must be nonnegative and strictly increasing.",
                    )
                if previous is not None:
                    delta = time - previous
                    if first_delta is None:
                        first_delta = delta
                    self.irregular_pts |= delta != first_delta
                previous = time
                duration = max(0, float(frame.duration * frame.time_base * 1000))
                self.last_end_ms = float(time) + duration
                if self.last_end_ms > self.limits.max_duration_ms:
                    raise AnalysisError(
                        "DURATION_LIMIT", "Decoded video exceeds the configured duration limit."
                    )
                if last_sample is not None and time - last_sample < step:
                    continue
                last_sample = time
                self.sampled_frames += 1
                yield DecodedFrame(
                    float(time),
                    duration,
                    frame.pts,
                    str(frame.time_base),
                    frame.to_ndarray(format="rgb24"),
                )
            if not self.decoded_frames:
                raise AnalysisError("EMPTY_VIDEO", "The video contains no decodable frames.")
            if self.info.declared_frames and self.decoded_frames < self.info.declared_frames:
                raise AnalysisError(
                    "TRUNCATED_VIDEO", "The video ended before its declared frame count."
                )
        except (av.FFmpegError, OSError, ValueError) as error:
            raise AnalysisError(
                "DECODE_FAILED", "Video decoding failed before completion."
            ) from error
        finally:
            self.close()


def probe(path, limits=None):
    with VideoDecoder(path, limits) as decoder:
        return decoder.info
