# MotionCoach

Educational movement assistant for a live webcam or an uploaded video.
It counts squat, push-up, biceps curl, and jumping jack with explainable rules,
2D joint angles, and feedback that depends on visibility.

It does not diagnose injury, prescribe training, or certify that a movement is safe.
Human counting accuracy was not measured. See [docs/mvp-acceptance.md](docs/mvp-acceptance.md).

## Run locally

Requirements: Python 3.12, uv, Node 24, and npm 11.

```bash
uv sync --locked --extra api --extra video
npm --prefix frontend ci
npm --prefix frontend run pose:prepare
```

In separate terminals:

```bash
uv run --locked uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
uv run --locked python -m backend.app.worker
npm --prefix frontend run dev
```

App: http://127.0.0.1:3000/workout/live  
Upload: http://127.0.0.1:3000/workout/upload  
Health: http://127.0.0.1:8000/api/health

`pose:prepare` downloads the pinned Lite model once and checks its SHA-256.
The live page asks for video only after Start. Frames stay in the browser.
Stop or leaving the page releases the camera. Voice is off until enabled and
never requests a microphone.

Video analysis validates the file in the API, then the worker runs pose.
A finished job shows the video, the repetition timeline, and an angle chart
on media time. JSON and CSV export omit landmarks. Uploaded files are temporary:
the default retention is 24 hours, and a queued or finished job can be deleted
earlier.

Local CLI, without HTTP:

```bash
uv sync --locked --extra video --extra pose
uv run --locked motioncoach prepare-model
uv run --locked motioncoach probe data/input.mp4
uv run --locked motioncoach analyze data/input.mp4 --exercise squat --view side --output data/analysis-1
```

Biceps curl requires `--side left` or `--side right`. Jumping jack requires
`--view front`. The output directory must be new.

## Checks

```bash
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python -m motioncoach.contracts.schema --check
uv run --locked pytest
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run test:parity
npm --prefix frontend run build
```

On 2026-10-17 this set passed locally: 174 Python tests, 1 skipped pose smoke,
286 frontend tests, and parity within 1e-9. The skipped pose test does not
download a model. CI does not download a model or a video of a person.

## Limits

Thresholds are unvalidated development seeds, not recommended ranges.
A missing landmark becomes `null`. Pose quality describes the estimate, not
the exercise. The mirror changes the drawing only. Count, pose error, and
feedback precision are separate. Without an annotated clip they stay
`not_evaluated`. The synthetic filter study in `research/reports/wave8.json`
is not human accuracy.

There is no repository `LICENSE` yet. Model terms were not re-audited for this
acceptance pass. There is no demo video and no screenshot of a person.

Portuguese project documents: [scope](docs/project-scope.md),
[plan](docs/implementation-plan.md), [privacy](docs/privacy.md),
[evaluation](docs/evaluation.md), and [acceptance](docs/mvp-acceptance.md).
