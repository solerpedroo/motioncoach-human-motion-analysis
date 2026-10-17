"""Two-dimensional geometry with the browser's missing-data semantics."""

import math


def finite(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def angle_2d(a, b, c):
    if not all(p and finite(p.get("x")) and finite(p.get("y")) for p in (a, b, c)):
        return None
    ux, uy = a["x"] - b["x"], a["y"] - b["y"]
    vx, vy = c["x"] - b["x"], c["y"] - b["y"]
    u, v = math.hypot(ux, uy), math.hypot(vx, vy)
    if not finite(u) or not finite(v) or u == 0 or v == 0:
        return None
    cosine = (ux / u) * (vx / v) + (uy / u) * (vy / v)
    return math.acos(max(-1, min(1, cosine))) * 180 / math.pi


def usable(point, minimum):
    if not point:
        return False
    index, visibility, presence = point.get("index"), point.get("visibility"), point.get("presence")
    return (
        finite(index)
        and int(index) == index
        and 0 <= index <= 32
        and all(finite(point.get(key)) and 0 <= point[key] <= 1 for key in ("x", "y"))
        and finite(point.get("z"))
        and finite(visibility)
        and minimum <= visibility <= 1
        and (presence is None or (finite(presence) and 0 <= presence <= 1))
    )


def landmark_angle(points, indices, minimum):
    if not finite(minimum) or not 0 <= minimum <= 1:
        raise ValueError("min_visibility must be in [0, 1]")
    selected = [[p for p in points if p["index"] == index] for index in indices]
    if not all(len(matches) == 1 and usable(matches[0], minimum) for matches in selected):
        return None
    return angle_2d(*(matches[0] for matches in selected))
