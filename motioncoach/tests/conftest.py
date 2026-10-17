"""Real pose is opt-in; default CI never downloads a model."""

import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--run-pose", action="store_true", help="Run tests requiring the pinned local model."
    )
    parser.addoption(
        "--model-path", default=None, help="Path to a prepared Pose Landmarker Lite asset."
    )


def pytest_collection_modifyitems(config, items):
    if not config.getoption("--run-pose"):
        skip = pytest.mark.skip(reason="Use --run-pose --model-path PATH for real inference")
        for item in items:
            if "pose" in item.keywords:
                item.add_marker(skip)
