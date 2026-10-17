"""Export/check the Python adapter's shape against the normative schema."""

import argparse
import json
from pathlib import Path

from motioncoach.contracts import ContractCatalog

SCHEMA_PATH = Path(__file__).resolve().parents[2] / "shared/schemas/contracts.schema.json"


def adapter_schema() -> dict:
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "https://motioncoach.local/schemas/contracts-1.0.0.json",
        **ContractCatalog.model_json_schema(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    schema = adapter_schema()
    if args.check:
        if json.loads(SCHEMA_PATH.read_text()) != schema:
            raise SystemExit("Python adapter differs from shared JSON Schema")
        print("Python adapter matches shared JSON Schema")
    else:
        SCHEMA_PATH.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n")
        print(f"Wrote {SCHEMA_PATH.name}; review changes to the shared specification")


if __name__ == "__main__":
    main()
