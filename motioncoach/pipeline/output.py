"""Publish a complete result directory only after successful analysis."""

import json
import os
import shutil
import tempfile
from pathlib import Path

from motioncoach.pipeline.errors import AnalysisError


class OutputBundle:
    def __init__(self, destination):
        self.destination, self.temporary, self.file = Path(destination), None, None

    def __enter__(self):
        if self.destination.exists() or self.destination.is_symlink():
            raise AnalysisError(
                "OUTPUT_EXISTS",
                "Choose a new output directory; existing results are not overwritten.",
            )
        self.destination.parent.mkdir(parents=True, exist_ok=True)
        self.temporary = Path(tempfile.mkdtemp(prefix=".motioncoach-", dir=self.destination.parent))
        try:
            self.file = (self.temporary / "frames.jsonl").open("w", encoding="utf-8")
            return self
        except BaseException:
            shutil.rmtree(self.temporary)
            self.temporary = None
            raise

    def frame(self, payload):
        self.file.write(json.dumps(payload, allow_nan=False, separators=(",", ":")) + "\n")

    def publish(self, result):
        self.file.flush()
        os.fsync(self.file.fileno())
        self.file.close()
        self.file = None
        path = self.temporary / "analysis.json"
        with path.open("w", encoding="utf-8") as file:
            json.dump(result, file, allow_nan=False, indent=2)
            file.flush()
            os.fsync(file.fileno())
        if self.destination.exists() or self.destination.is_symlink():
            raise AnalysisError(
                "OUTPUT_EXISTS", "The output directory was created by another operation."
            )
        self.temporary.rename(self.destination)
        self.temporary = None

    def __exit__(self, *_):
        try:
            if self.file:
                self.file.close()
        finally:
            if self.temporary:
                shutil.rmtree(self.temporary)
