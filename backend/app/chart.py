"""Optional angle chart. A failure here must not discard analysis.json."""

import json
import struct
import zlib
from pathlib import Path


def angle_samples(frames_path: Path) -> list[tuple[float, float]]:
    samples = []
    if not frames_path.is_file():
        return samples
    for line in frames_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        frame = json.loads(line)
        features = frame.get("features") or {}
        value = next(
            (
                item
                for key, item in features.items()
                if key.endswith("_deg") and isinstance(item, (int, float))
            ),
            None,
        )
        if value is not None:
            samples.append((float(frame["timestamp_ms"]), float(value)))
    return samples


def render_angle_chart(frames_path: Path, destination: Path) -> None:
    samples = angle_samples(frames_path)
    width, height = 320, 160
    pixels = bytearray(b"\x14\x1c\x2a" * width * height)
    if samples:
        start, end = samples[0][0], samples[-1][0]
        span = max(end - start, 1)
        low = min(value for _, value in samples)
        high = max(value for _, value in samples)
        spread = max(high - low, 1)

        def xy(time_ms: float, value: float) -> tuple[int, int]:
            x = int((time_ms - start) / span * (width - 1))
            y = int((1 - (value - low) / spread) * (height - 1))
            return min(width - 1, max(0, x)), min(height - 1, max(0, y))

        previous = xy(*samples[0])
        for sample in samples[1:]:
            current = xy(*sample)
            _line(pixels, width, previous, current)
            previous = current
    destination.write_bytes(_png(width, height, pixels))


def write_derivative_status(directory: Path, error: str | None) -> None:
    payload = {
        "chart_png": None if error else "angle.png",
        "chart_error": error,
    }
    (directory / "derivatives.json").write_text(json.dumps(payload), encoding="utf-8")


def _line(pixels: bytearray, width: int, start: tuple[int, int], end: tuple[int, int]) -> None:
    x0, y0 = start
    x1, y1 = end
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for step in range(steps + 1):
        x = x0 + (x1 - x0) * step // steps
        y = y0 + (y1 - y0) * step // steps
        offset = (y * width + x) * 3
        pixels[offset : offset + 3] = b"\x38\xa1\xff"


def _png(width: int, height: int, pixels: bytearray) -> bytes:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y * width * 3 : (y + 1) * width * 3])

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw)))
        + chunk(b"IEND", b"")
    )
