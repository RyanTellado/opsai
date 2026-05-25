"""python -m eval.run — golden-check eval over JSON fixtures.

Each fixture: { dataset_csv, user_description, checks: [...] }.
Loads the CSV, runs the full pipeline (ingest -> profile -> briefing),
runs each check, prints a pass/fail table, exits 0 iff all green.

Keyword + schema checks only. No LLM-as-judge (per CLAUDE.md).
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app.agent import profile as profile_mod
from app.services import briefing as briefing_svc
from app.services import ingest

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
REPO_ROOT = Path(__file__).resolve().parents[2]


def _run_fixture(fixture_path: Path) -> tuple[str, list[tuple[str, bool, str]], float]:
    fix = json.loads(fixture_path.read_text())
    csv_path = REPO_ROOT / fix["dataset_csv"]
    contents = csv_path.read_bytes()
    t0 = time.time()
    r = ingest.ingest_csv(contents, csv_path.name, fix["user_description"])
    dataset_id = r["dataset_id"]
    profile_mod.generate_profile(dataset_id)
    bundle = briefing_svc.generate_briefing(dataset_id)
    elapsed = time.time() - t0

    briefing = bundle["briefing"]
    payload = bundle["stats_payload"]
    results: list[tuple[str, bool, str]] = []
    for check in fix["checks"]:
        kind = check["type"]
        try:
            ok, msg = _run_check(kind, check, briefing, payload)
        except Exception as e:
            ok, msg = False, f"{type(e).__name__}: {e}"
        results.append((kind, ok, msg))
    return fix["dataset_csv"], results, elapsed


def _run_check(
    kind: str, check: dict, briefing: dict, payload: dict
) -> tuple[bool, str]:
    if kind == "schema_valid":
        return True, "validated during generation"
    if kind == "min_items":
        field = check["field"]
        n = check["n"]
        actual = len(briefing.get(field, []) or [])
        return actual >= n, f"{field}={actual} (need >= {n})"
    if kind == "all_actions_have_stat_ref":
        bad = [
            a for a in briefing.get("actions", [])
            if a.get("evidence_stat_ref") not in payload
        ]
        return not bad, f"missing_refs={len(bad)}"
    if kind == "all_trends_have_stat_ref":
        bad = [
            t for t in briefing.get("trends", [])
            if t.get("stat_ref") not in payload
        ]
        return not bad, f"missing_refs={len(bad)}"
    if kind == "keyword_any":
        field = check["field"]
        value = (briefing.get(field) or "").lower()
        opts = [o.lower() for o in check["options"]]
        hit = next((o for o in opts if o in value), None)
        return hit is not None, f"hit={hit!r} in {field}"
    return False, f"unknown check: {kind}"


def main() -> int:
    fixtures = sorted(FIXTURES_DIR.glob("*.json"))
    if not fixtures:
        print(f"No fixtures found in {FIXTURES_DIR}")
        return 1

    all_pass = True
    for f in fixtures:
        try:
            name, results, elapsed = _run_fixture(f)
        except Exception as e:
            print(f"\n=== {f.name} ===")
            print(f"  FATAL: {type(e).__name__}: {e}")
            all_pass = False
            continue
        print(f"\n=== {name}  ({elapsed:.1f}s) ===")
        for kind, ok, msg in results:
            mark = "PASS" if ok else "FAIL"
            print(f"  [{mark}] {kind}: {msg}")
            if not ok:
                all_pass = False
    print()
    print("ALL GREEN" if all_pass else "FAILURES PRESENT")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
