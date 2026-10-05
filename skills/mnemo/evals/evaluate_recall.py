#!/usr/bin/env python3
"""Evaluate evidence coverage on fixed synthetic chats; no LLM or API calls."""

import argparse
import hashlib
import json
import sys
import tempfile
from pathlib import Path

EVALS = Path(__file__).resolve().parent
SCRIPTS = EVALS.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))
import recall


def check(case: dict, result: dict) -> bool:
    rows = result["results"]
    for expected in case["required"]:
        if not any(row["path"] == expected["path"]
                   and all(s in row.get("content", "") for s in expected.get("contains", []))
                   and all(s not in row.get("content", "") for s in expected.get("absent", []))
                   and ("status" not in expected or row["status"] == expected["status"]) for row in rows):
            return False
    content = "\n".join(row.get("content", "") for row in rows)
    if any(s in content for s in case.get("absent_fragments", [])):
        return False
    if case.get("expect_empty") and rows:
        return False
    if "unresolved_reason" in case and not any(
            issue["reason"] == case["unresolved_reason"] for issue in result["unresolved"]):
        return False
    return True


def evaluate(fixture: Path) -> dict:
    raw = fixture.read_bytes()
    data = json.loads(raw)
    rows = []
    with tempfile.TemporaryDirectory(prefix="mnemo-recall-eval-") as temp:
        root = Path(temp).resolve()
        (root / ".mnemo-root").touch()
        for name, content in data["files"].items():
            path = root / name
            if not path.resolve().is_relative_to(root):
                raise ValueError(f"fixture path escapes project: {name}")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        before = {p.relative_to(root): p.read_bytes() for p in root.rglob("*") if p.is_file()}
        for case in data["cases"]:
            result = recall.recall(root, case["terms"], limit=case["limit"], max_chars=16000)
            # Controlled ablation: same parsing, terms, ranking, and direct
            # matches, with explicit link collection removed. This is NOT the
            # full existing agent workflow, which may follow these links itself.
            direct = {**result, "results": [r for r in result["results"] if r["via"] == "match"],
                      "unresolved": []}
            rows.append({"id": case["id"], "direct_only": check(case, direct),
                         "linked_context": check(case, result),
                         "output_chars": len(recall.serialized(result))})
        after = {p.relative_to(root): p.read_bytes() for p in root.rglob("*") if p.is_file()}
    if before != after:
        raise AssertionError("recall modified the fixture project")
    return {"kind": "synthetic-evidence-coverage", "fixture_sha256": hashlib.sha256(raw).hexdigest(),
            "candidate_sha256": hashlib.sha256((SCRIPTS / "recall.py").read_bytes()).hexdigest(),
            "cases": rows, "direct_only": sum(r["direct_only"] for r in rows),
            "linked_context": sum(r["linked_context"] for r in rows), "total": len(rows),
            "project_unchanged": True, "final_answer_accuracy": "NOT RUN",
            "note": "Direct-only is a link-collection ablation, not an evaluation of the full prior Mnemo agent."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path, default=EVALS / "recall-cases.json")
    args = parser.parse_args()
    result = evaluate(args.cases)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["linked_context"] == result["total"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
