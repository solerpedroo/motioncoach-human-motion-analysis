import copy
import json
import math
import subprocess
import sys

import pytest
from jsonschema import Draft202012Validator, FormatChecker, validators
from pydantic import TypeAdapter, ValidationError

from motioncoach import contracts
from motioncoach.contracts.schema import SCHEMA_PATH, adapter_schema

FIXTURES = SCHEMA_PATH.parents[1] / "fixtures/contracts"
SCHEMA = json.loads(SCHEMA_PATH.read_text())
VALID = {p.stem: json.loads(p.read_text())["data"] for p in (FIXTURES / "valid").glob("*.json")}
CASES = json.loads((FIXTURES / "invalid/cases.json").read_text())


def finite_number(checker, value):
    return Draft202012Validator.TYPE_CHECKER.is_type(value, "number") and math.isfinite(value)


FiniteValidator = validators.extend(
    Draft202012Validator,
    type_checker=Draft202012Validator.TYPE_CHECKER.redefine("number", finite_number),
)


def schema_for(name):
    if name == "PoseQuality":
        return SCHEMA["properties"]["pose_quality"]
    return {"$ref": f"#/$defs/{name}", "$defs": SCHEMA["$defs"]}


@pytest.mark.parametrize("name", sorted(VALID))
def test_shared_valid_examples(name):
    data = VALID[name]
    FiniteValidator(schema_for(name), format_checker=FormatChecker()).validate(data)
    result = TypeAdapter(getattr(contracts, name)).validate_json(json.dumps(data))
    if name == "FeatureSet":
        assert result.trunk_tilt_deg is None
    if name == "PoseFrame":
        assert result.features.trunk_tilt_deg is None


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["id"])
def test_shared_invalid_examples(case):
    data = copy.deepcopy(VALID[case["contract"]])
    parent = data
    for part in case["path"][:-1]:
        parent = parent[part]
    key = case["path"][-1]
    if case["operation"] == "remove":
        del parent[key]
    elif case["operation"] == "nonfinite":
        parent[key] = float(case["value"])
    else:
        parent[key] = case["value"]
    assert list(
        FiniteValidator(schema_for(case["contract"]), format_checker=FormatChecker()).iter_errors(
            data
        )
    )
    adapter = TypeAdapter(getattr(contracts, case["contract"]))
    with pytest.raises(ValidationError):
        adapter.validate_json(json.dumps(data))


def test_python_adapter_matches_normative_schema():
    Draft202012Validator.check_schema(SCHEMA)
    assert adapter_schema() == SCHEMA


@pytest.mark.parametrize("exercise", ["squat", "push_up", "biceps_curl", "jumping_jack"])
def test_all_mvp_exercise_ids(exercise):
    data = {**VALID["SessionSummary"], "exercise": exercise, "events": []}
    contracts.SessionSummary.model_validate_json(json.dumps(data))


def test_core_import_does_not_load_http_or_vision(tmp_path):
    script = """
import sys
from motioncoach.contracts import PoseFrame, SessionSummary
for root in ('fastapi', 'starlette', 'cv2', 'mediapipe', 'backend'):
    assert not any(name == root or name.startswith(root + '.') for name in sys.modules), root
"""
    subprocess.run([sys.executable, "-I", "-c", script], cwd=tmp_path, check=True)
