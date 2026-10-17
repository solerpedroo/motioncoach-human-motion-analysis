"""Generate small synthetic videos without a person or external assets."""

from fractions import Fraction

import pytest


def make_video(path, pts=None, rate=10, rotation=None):
    av = pytest.importorskip("av")
    with av.open(str(path), "w") as container:
        stream = container.add_stream("libvpx" if path.suffix == ".webm" else "mpeg4", rate=rate)
        stream.width, stream.height, stream.pix_fmt = 64, 48, "yuv420p"
        if rotation is not None:
            stream.set_display_rotation(rotation)
        for time in pts if pts is not None else range(10):
            frame = av.VideoFrame(64, 48, "yuv420p")
            frame.pts, frame.time_base = time, Fraction(1, rate)
            for plane in frame.planes:
                plane.update(bytes(plane.buffer_size))
            for packet in stream.encode(frame):
                container.mux(packet)
        for packet in stream.encode():
            container.mux(packet)
    return path
