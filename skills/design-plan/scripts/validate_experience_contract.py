#!/usr/bin/env python3
"""Validate Aphrodite Experience Contract completeness.

The validator checks artifact shape, not design quality. It prevents benchmark and
experience decisions from disappearing before implementation.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Iterable


COMMON_SECTIONS = (
    "source mode",
    "product facts",
    "page goal",
    "audience and tasks",
    "header and navigation",
    "core message",
    "content integrity",
    "section order",
    "cta strategy",
    "trust strategy",
    "asset provenance",
    "desktop structure",
    "mobile transformations",
    "states",
    "performance budget",
    "accessibility contract",
    "prompt contract",
    "success checks",
)

BENCHMARK_SECTIONS = (
    "benchmark sources",
    "adopt",
    "adapt",
    "avoid",
)

MOBILE_OPERATIONS = (
    "retain",
    "reorder",
    "compress",
    "collapse",
    "defer",
    "replace",
    "sticky",
    "remove",
)

PROMPT_FIELDS = (
    "goal",
    "task",
    "facts",
    "content_integrity",
    "assets",
    "responsive",
    "states",
    "success",
)

PLACEHOLDER_PATTERNS = (
    re.compile(r"\{[^}\n]+\}"),
    re.compile(r"\b(?:todo|tbd|fill me)\b", re.IGNORECASE),
)

CONTENT_CLASSIFICATIONS = (
    "verified",
    "prototype",
    "placeholder",
    "hypothesis",
)


def normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).strip().casefold()
    return re.sub(r"\s+", " ", normalized)


def parse_sections(text: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current: str | None = None

    for line in text.splitlines():
        match = re.match(r"^##\s+(.+?)\s*$", line)
        if match:
            current = normalize(match.group(1))
            sections.setdefault(current, [])
            continue
        if current is not None:
            sections[current].append(line)

    return {heading: "\n".join(lines).strip() for heading, lines in sections.items()}


def has_placeholder(content: str) -> bool:
    return any(pattern.search(content) for pattern in PLACEHOLDER_PATTERNS)


def contains_any(content: str, values: Iterable[str]) -> bool:
    normalized = normalize(content)
    return any(value in normalized for value in values)


def detect_mode(source_mode: str) -> str:
    match = re.search(r"\bmode\s*:\s*([a-z-]+)", source_mode, re.IGNORECASE)
    if match:
        return normalize(match.group(1))
    lowered = normalize(source_mode)
    if "benchmark" in lowered:
        return "benchmark"
    if "product-derived" in lowered:
        return "product-derived"
    return "unknown"


def validate_contract(path: Path) -> dict[str, object]:
    result: dict[str, object] = {
        "path": str(path),
        "valid": False,
        "mode": "unknown",
        "missingSections": [],
        "emptySections": [],
        "placeholderSections": [],
        "errors": [],
        "warnings": [],
    }

    if not path.is_file():
        result["errors"] = ["Contract file does not exist."]
        return result

    text = path.read_text(encoding="utf-8-sig")
    sections = parse_sections(text)
    missing = [name for name in COMMON_SECTIONS if name not in sections]
    empty = [name for name in COMMON_SECTIONS if name in sections and not sections[name]]
    placeholders = [
        name
        for name in COMMON_SECTIONS
        if name in sections and sections[name] and has_placeholder(sections[name])
    ]

    source_mode = sections.get("source mode", "")
    mode = detect_mode(source_mode)
    result["mode"] = mode

    if mode == "benchmark":
        missing.extend(name for name in BENCHMARK_SECTIONS if name not in sections)
        empty.extend(
            name for name in BENCHMARK_SECTIONS if name in sections and not sections[name]
        )
        placeholders.extend(
            name
            for name in BENCHMARK_SECTIONS
            if name in sections and sections[name] and has_placeholder(sections[name])
        )
    elif mode == "unknown":
        result["errors"].append(
            "Source Mode must declare 'Mode: benchmark' or 'Mode: product-derived'."
        )

    mobile = sections.get("mobile transformations", "")
    if mobile and not contains_any(mobile, MOBILE_OPERATIONS):
        result["errors"].append(
            "Mobile Transformations must use at least one transformation operation."
        )

    prompt = normalize(sections.get("prompt contract", ""))
    missing_prompt_fields = [field for field in PROMPT_FIELDS if field not in prompt]
    if prompt and missing_prompt_fields:
        result["errors"].append(
            "Prompt Contract is missing fields: " + ", ".join(missing_prompt_fields)
        )

    states = normalize(sections.get("states", ""))
    missing_states = [state for state in ("loading", "empty", "error", "success") if state not in states]
    if states and missing_states:
        result["warnings"].append(
            "States does not mention: " + ", ".join(missing_states)
        )

    integrity = normalize(sections.get("content integrity", ""))
    integrity_not_applicable = "해당 없음" in integrity or "not applicable" in integrity
    if integrity and not integrity_not_applicable and not contains_any(
        integrity, CONTENT_CLASSIFICATIONS
    ):
        result["errors"].append(
            "Content Integrity must classify content as verified, prototype, placeholder, or hypothesis."
        )
    if re.search(r"\|\s*placeholder\s*\|", integrity):
        result["warnings"].append(
            "Content Integrity still contains placeholder content; replace or remove it before final delivery."
        )

    result["missingSections"] = sorted(set(missing))
    result["emptySections"] = sorted(set(empty))
    result["placeholderSections"] = sorted(set(placeholders))

    if missing:
        result["errors"].append("Required section headings are missing.")
    if empty:
        result["errors"].append("Required sections must not be empty.")
    if placeholders:
        result["errors"].append("Required sections still contain placeholders.")

    result["valid"] = not result["errors"]
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("contract", type=Path, help="Path to an Experience Contract markdown file")
    args = parser.parse_args()

    result = validate_contract(args.contract.resolve())
    print(json.dumps(result, ensure_ascii=False, indent=2))
    status = "passed" if result["valid"] else "failed"
    print(f"Experience Contract validation {status}: {args.contract}", file=sys.stderr)
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
