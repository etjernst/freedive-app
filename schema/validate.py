"""Validate the seed fixture library against the Phase 0a JSON Schema.

Usage: python app/schema/validate.py
Exits non-zero on any validation error.
"""
import json
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator
except ImportError:
    sys.exit("jsonschema not installed. Run: pip install jsonschema")

HERE = Path(__file__).resolve().parent
SCHEMA = HERE / "freedive.schema.json"
FIXTURES = HERE.parent / "seed" / "fixtures.json"


def main() -> int:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    data = json.loads(FIXTURES.read_text(encoding="utf-8"))

    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))

    if errors:
        print(f"INVALID: {len(errors)} error(s) in {FIXTURES.name}")
        for e in errors:
            loc = "/".join(str(p) for p in e.path) or "(root)"
            print(f"  - at {loc}: {e.message}")
        return 1

    n = len(data.get("templates", []))
    print(f"VALID: {FIXTURES.name} -- {n} templates conform to {SCHEMA.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
