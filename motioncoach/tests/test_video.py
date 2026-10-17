"""Generated, person-free files exercise the real decoder without model downloads."""

from dataclasses import replace
from fractions import Fraction
from types import SimpleNamespace

import pytest

from motioncoach.pipeline.errors import AnalysisError
from motioncoach.tests.video_helpers import make_video
from motioncoach.video.decoder import VideoDecoder, VideoLimits, probe


@pytest.fixture
def video(tmp_path):
    return make_video(tmp_path / "synthetic.mp4")


def test_real_probe_and_decode_pts(video):
    info = probe(video)
    assert (info.width, info.height, info.duration_ms, info.declared_frames) == (64, 48, 1000, 10)
    with VideoDecoder(video) as decoder:
        frames = list(decoder)
        assert [f.timestamp_ms for f in frames] == list(range(0, 1000, 100))
        assert frames[0].rgb.shape == (48, 64, 3)
        assert decoder.last_end_ms == 1000
        assert decoder.container is None
    assert decoder.decoded_frames == decoder.sampled_frames == 10


def test_variable_pts_are_preserved_not_reconstructed_from_average_fps(tmp_path):
    path = make_video(tmp_path / "vfr.mp4", [0, 1, 3, 4, 8, 9], rate=10)
    with VideoDecoder(path) as decoder:
        times = [f.timestamp_ms for f in decoder]
    assert times == [0, 100, 300, 400, 800, 900]
    assert decoder.irregular_pts is True


def test_sampling_selects_existing_pts_without_renumbering(video):
    with VideoDecoder(video, VideoLimits(sample_fps=4)) as decoder:
        frames = list(decoder)
    assert [f.timestamp_ms for f in frames] == [0, 300, 600, 900]
    assert decoder.decoded_frames == 10 and decoder.sampled_frames == 4


def test_nonzero_stream_origin_is_fixed_for_all_frames(tmp_path):
    path = make_video(tmp_path / "offset.mp4", list(range(10, 20)), rate=10)
    info = probe(path)
    assert info.start_pts > 0
    with VideoDecoder(path) as decoder:
        frames = list(decoder)
    assert frames[0].source_pts == info.start_pts
    assert [f.timestamp_ms for f in frames] == list(range(0, 1000, 100))


@pytest.mark.parametrize("suffix", [".mp4", ".mov", ".webm"])
def test_supported_containers(tmp_path, suffix):
    path = make_video(tmp_path / ("synthetic" + suffix))
    with VideoDecoder(path) as decoder:
        assert len(list(decoder)) == 10


@pytest.mark.parametrize(
    "patch,code",
    [
        (dict(max_bytes=100), "FILE_TOO_LARGE"),
        (dict(max_duration_ms=100), "DURATION_LIMIT"),
        (dict(max_pixels=64), "RESOLUTION_LIMIT"),
    ],
)
def test_metadata_limits_fail_stably_and_close(video, patch, code):
    decoder = VideoDecoder(video, replace(VideoLimits(), **patch))
    with pytest.raises(AnalysisError) as error:
        with decoder:
            pass
    assert error.value.code == code and decoder.container is None


def test_frame_limit_and_cancellation_close(video):
    decoder = VideoDecoder(video, VideoLimits(max_decoded_frames=2))
    with pytest.raises(AnalysisError, match="decoded-frame"):
        with decoder:
            list(decoder)
    assert decoder.container is None
    cancelled = False
    decoder = VideoDecoder(video, cancelled=lambda: cancelled)
    with pytest.raises(AnalysisError) as error:
        with decoder:
            iterator = iter(decoder)
            next(iterator)
            cancelled = True
            next(iterator)
    assert error.value.code == "CANCELLED" and decoder.container is None


def test_missing_garbage_empty_and_disguised_files_fail_stably(tmp_path, video):
    cases = [(tmp_path / "missing.mp4", "FILE_NOT_FOUND")]
    for name, data, code in [
        ("empty.mp4", b"", "INVALID_VIDEO"),
        ("garbage.mp4", b"this is not video", "INVALID_VIDEO"),
        ("wrong.txt", b"content", "UNSUPPORTED_EXTENSION"),
        ("disguised.webm", video.read_bytes(), "CONTENT_TYPE_MISMATCH"),
    ]:
        path = tmp_path / name
        path.write_bytes(data)
        cases.append((path, code))
    for path, code in cases:
        with pytest.raises(AnalysisError) as error:
            probe(path)
        assert error.value.code == code


def test_corrupted_or_truncated_file_does_not_succeed(video, tmp_path):
    path = tmp_path / "truncated.mp4"
    path.write_bytes(video.read_bytes()[:300])
    with pytest.raises(AnalysisError) as error:
        with VideoDecoder(path) as decoder:
            list(decoder)
    assert error.value.code in ("INVALID_VIDEO", "DECODE_FAILED", "TRUNCATED_VIDEO", "EMPTY_VIDEO")


def test_rotation_is_rejected_explicitly(tmp_path):
    path = make_video(tmp_path / "rotated.mp4", rotation=90)
    with pytest.raises(AnalysisError) as error:
        with VideoDecoder(path) as decoder:
            list(decoder)
    assert error.value.code == "ROTATION_UNSUPPORTED"


@pytest.mark.parametrize(
    "times,code",
    [
        ([None], "PTS_REQUIRED"),
        ([0, 0], "NON_MONOTONIC_PTS"),
        ([1, 0], "NON_MONOTONIC_PTS"),
        ([-1], "NON_MONOTONIC_PTS"),
    ],
)
def test_bad_frame_pts_have_no_implicit_fps_fallback(video, times, code):
    class FakeContainer:
        closed = False

        def close(self):
            self.closed = True

        def decode(self, _):
            for pts in times:
                yield SimpleNamespace(
                    pts=pts,
                    time_base=Fraction(1, 10),
                    duration=1,
                    width=64,
                    height=48,
                    rotation=0,
                    side_data=[],
                    is_corrupt=False,
                    to_ndarray=lambda **_: None,
                )

    with VideoDecoder(video) as decoder:
        decoder.container.close()
        fake = FakeContainer()
        decoder.container = fake
        with pytest.raises(AnalysisError) as error:
            list(decoder)
        assert error.value.code == code
        assert fake.closed and decoder.container is None


@pytest.mark.parametrize(
    "patch",
    [
        dict(sample_fps=0),
        dict(max_bytes=-1),
        dict(max_duration_ms=float("inf")),
        dict(sample_fps=121),
        dict(max_pixels=1.5),
    ],
)
def test_invalid_limits(patch):
    with pytest.raises(ValueError):
        replace(VideoLimits(), **patch)
