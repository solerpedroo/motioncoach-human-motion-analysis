"""Stable domain errors shared by local CLI and the future worker."""


class AnalysisError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code, self.message = code, message

    def payload(self):
        return {"error": {"code": self.code, "message": self.message}}


def check_cancelled(cancelled):
    if cancelled():
        raise AnalysisError("CANCELLED", "Analysis was cancelled.")
