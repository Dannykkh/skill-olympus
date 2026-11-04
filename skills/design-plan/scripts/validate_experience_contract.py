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

# Required only when the contract declares system roles. Single-role or
# unauthenticated products record NOT APPLICABLE and skip these.
ROLE_SECTIONS = ("role variants",)

# 사용자가 무언가를 만들거나 신청하는 여러 화면 앱에서만 요구한다. 단일 페이지는
# `## Object Flows`에 NOT APPLICABLE을 적거나 절을 두지 않는다.
FLOW_SECTIONS = ("scenario facts",)
FLOW_COLUMNS = ("object", "create", "view", "edit", "after")
NOT_APPLICABLE_MARKERS = ("not applicable", "해당 없음")
# 빈 칸으로 보는 값. Edit만 이유를 붙인 n/a를 허용한다.
EMPTY_CELL_VALUES = ("", "-", "—", "n/a", "na", "none", "없음")

ROLE_VISIBILITY_OPERATIONS = (
    "표시",
    "숨김",
    "비활성",
    "읽기전용",
    "visible",
    "hidden",
    "disabled",
    "read-only",
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

CODE_SPAN = re.compile(r"`[^`\n]+`")

# 정하지 못한 결정은 지어내지 않고 권장안과 함께 `## Open Decisions`에 올린다(선택 절).
# 목적·범위(strategy·scope)가 미결이면 구현으로 넘어가지 않는다. 구조 이하는 경고로 남긴다.
DECISION_COLUMNS = ("decision", "layer", "recommendation", "owner")
DECISION_LAYERS = ("strategy", "scope", "structure", "skeleton", "surface")
BLOCKING_LAYERS = ("strategy", "scope")
# 본문에 흩어진 미결 표시. 장부(Open Decisions)가 없으면 경고한다.
UNDECIDED_MARKERS = ("미결", "[확인 필요", "[빈칸", "undecided")

# 루트 PRODUCT.md(strategy·scope 요약) 검사용. 출처 라벨은 세 가지뿐이다(product-md-guide.md).
PRODUCT_SECTIONS = ("strategy", "scope")
STRATEGY_COLUMNS = ("decision", "value", "source")
SCOPE_COLUMNS = ("kind", "item", "reason", "reopen when", "source")
SOURCE_LABELS = ("사용자", "ai 권장", "미결", "user", "ai-recommended", "open")
PRODUCT_MAX_LINES = 60

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
    # 코드 표기(`{프로젝트명} 보드`) 안의 중괄호는 런타임 보간이지 채우지 않은 칸이 아니다
    # (2026-11-04 기준선 S3에서 Accessibility Contract를 이렇게 오탐했다).
    prose = CODE_SPAN.sub("", content)
    return any(pattern.search(prose) for pattern in PLACEHOLDER_PATTERNS)


def contains_any(content: str, values: Iterable[str]) -> bool:
    normalized = normalize(content)
    return any(value in normalized for value in values)


def is_not_applicable(content: str) -> bool:
    normalized = normalize(content)
    return any(marker in normalized for marker in NOT_APPLICABLE_MARKERS)


def parse_table(content: str) -> tuple[list[str], list[list[str]]]:
    """절 본문의 첫 Markdown 표를 (머리 칸, 데이터 행)으로 돌려준다. 구분 줄은 건너뛴다."""
    header: list[str] = []
    rows: list[list[str]] = []
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            if header:
                break
            continue
        cells = [normalize(cell) for cell in stripped.strip("|").split("|")]
        if any(cells) and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells if cell):
            continue
        if not header:
            header = cells
        else:
            rows.append(cells)
    return header, rows


def is_empty_cell(value: str) -> bool:
    return value in EMPTY_CELL_VALUES


def is_missing_screen(value: str) -> bool:
    # Create·View·After는 화면이 있어야 한다. `n/a — 결과 화면 없음`처럼 이유를 붙여도 빈 칸이다.
    return is_empty_cell(value) or re.match(r"^n/?a\b", value) is not None


def edit_cell_ok(value: str) -> bool:
    # 고치기가 없는 대상은 `n/a — 이유`로 적는다. 이유 없는 n/a는 빈 칸과 같다.
    if not is_empty_cell(value):
        match = re.match(r"^(?:n/?a)\b[\s:—–-]*(.*)$", value)
        return match is None or bool(match.group(1).strip())
    return False


def screen_names(value: str) -> set[str]:
    # "class-detail → booking-form"처럼 여러 화면을 적은 칸을 화면 이름 집합으로 나눈다.
    # 괄호 속 설명("booking-done (예약 완료)")은 화면 이름이 아니므로 뺀다.
    value = re.sub(r"\([^)]*\)", " ", value)
    parts = re.split(r"\s*(?:→|->|,|/|·)\s*", value)
    return {part.strip() for part in parts if part.strip()}


def validate_object_flows(content: str) -> list[str]:
    errors: list[str] = []
    header, rows = parse_table(content)
    if not header or any(column not in header for column in FLOW_COLUMNS):
        return [
            "Object Flows must be a table with Object, Create, View, Edit, and After columns."
        ]
    if not rows:
        return ["Object Flows must list at least one object."]

    index = {column: header.index(column) for column in FLOW_COLUMNS}
    for row in rows:
        cells = {
            column: row[position] if position < len(row) else ""
            for column, position in index.items()
        }
        name = cells["object"] or "(unnamed object)"
        for column in ("create", "view", "after"):
            if is_missing_screen(cells[column]):
                errors.append(f"Object Flows row '{name}' has no {column.capitalize()} screen.")
        if not edit_cell_ok(cells["edit"]):
            errors.append(
                f"Object Flows row '{name}' needs an Edit screen or 'n/a — reason'."
            )
        # 끝 칸에 목록·상세를 적어 형식만 채우는 것을 막는다. 끝은 그 행동의 결과 화면이다.
        if is_missing_screen(cells["after"]):
            continue
        after = screen_names(cells["after"])
        if after and (after <= screen_names(cells["view"]) or after <= screen_names(cells["create"])):
            errors.append(
                f"Object Flows row '{name}' must end on a result screen, not its View or Create screen."
            )
    return errors


def validate_open_decisions(
    content: str, block: bool = True
) -> tuple[list[str], list[str], list[str]]:
    """Open Decisions 표를 검사해 (errors, warnings, 막는 결정 이름)을 돌려준다.

    block=False(PRODUCT.md)면 strategy·scope 미결을 실패로 올리지 않고 목록만 돌려준다.
    """
    header, rows = parse_table(content)
    if not header or any(column not in header for column in DECISION_COLUMNS):
        return (
            ["Open Decisions must be a table with Decision, Layer, Recommendation, and Owner columns."],
            [],
            [],
        )
    errors: list[str] = []
    warnings: list[str] = []
    blocking: list[str] = []
    index = {column: header.index(column) for column in DECISION_COLUMNS}
    for row in rows:
        cells = {
            column: row[position] if position < len(row) else ""
            for column, position in index.items()
        }
        name = cells["decision"] or "(unnamed decision)"
        layer = cells["layer"]
        if layer not in DECISION_LAYERS:
            errors.append(
                f"Open Decisions row '{name}' needs a layer: " + ", ".join(DECISION_LAYERS) + "."
            )
            continue
        # 권장안 없는 미결은 사용자에게 설계를 떠넘기는 것이다(arch 092 권장안 우선).
        if is_empty_cell(cells["recommendation"]):
            errors.append(f"Open Decisions row '{name}' needs a recommendation.")
        if is_empty_cell(cells["owner"]):
            errors.append(f"Open Decisions row '{name}' needs an owner who decides.")
        if layer in BLOCKING_LAYERS:
            blocking.append(name)
        else:
            warnings.append(f"Open decision '{name}' ({layer}) is still undecided.")
    if blocking and block:
        errors.append(
            "Strategy/Scope decisions are still open; get them decided before implementation: "
            + ", ".join(blocking)
        )
    return errors, warnings, blocking


def has_source_label(value: str) -> bool:
    return any(value.startswith(label) for label in SOURCE_LABELS)


def validate_product(path: Path) -> dict[str, object]:
    """루트 PRODUCT.md를 검사한다. 미결이 남아도 통과하며, 구현 차단은 계약 검증이 맡는다."""
    result: dict[str, object] = {
        "path": str(path),
        "valid": False,
        "missingSections": [],
        "openDecisions": [],
        "errors": [],
        "warnings": [],
    }
    if not path.is_file():
        result["errors"] = ["PRODUCT.md does not exist."]
        return result

    text = path.read_text(encoding="utf-8-sig")
    errors: list[str] = result["errors"]  # type: ignore[assignment]
    lines = len(text.splitlines())
    if lines > PRODUCT_MAX_LINES:
        errors.append(f"PRODUCT.md has {lines} lines; keep it within {PRODUCT_MAX_LINES} and link details.")

    sections = parse_sections(text)
    result["missingSections"] = [name for name in PRODUCT_SECTIONS if name not in sections]
    if result["missingSections"]:
        errors.append("Required section headings are missing.")
    for name in PRODUCT_SECTIONS:
        if name in sections and has_placeholder(sections[name]):
            errors.append(f"{name.capitalize()} still contains placeholders.")

    strategy = sections.get("strategy", "")
    if strategy:
        header, rows = parse_table(strategy)
        if not header or any(column not in header for column in STRATEGY_COLUMNS) or not rows:
            errors.append("Strategy must be a table with Decision, Value, and Source rows.")
        else:
            index = {column: header.index(column) for column in STRATEGY_COLUMNS}
            for row in rows:
                cells = {c: row[i] if i < len(row) else "" for c, i in index.items()}
                if not has_source_label(cells["source"]):
                    errors.append(
                        f"Strategy row '{cells['decision']}' needs a source label: 사용자, AI 권장, or 미결."
                    )

    scope = sections.get("scope", "")
    if scope and not is_not_applicable(scope):
        header, rows = parse_table(scope)
        if not header or any(column not in header for column in SCOPE_COLUMNS):
            errors.append("Scope must be a table with Kind, Item, Reason, Reopen When, and Source columns.")
        else:
            index = {column: header.index(column) for column in SCOPE_COLUMNS}
            excludes = 0
            for row in rows:
                cells = {c: row[i] if i < len(row) else "" for c, i in index.items()}
                item = cells["item"] or "(unnamed item)"
                if cells["kind"] not in ("include", "exclude"):
                    errors.append(f"Scope row '{item}' needs Kind include or exclude.")
                if not has_source_label(cells["source"]):
                    errors.append(f"Scope row '{item}' needs a source label: 사용자, AI 권장, or 미결.")
                if cells["kind"] == "exclude":
                    excludes += 1
                    # 다시 볼 조건이 없는 제외는 반박할 수 없는 관습이 된다(mnemo reopen-when과 같은 이유).
                    if is_empty_cell(cells["reason"]) or is_empty_cell(cells["reopen when"]):
                        errors.append(f"Scope exclusion '{item}' needs a reason and a reopen condition.")
            if not excludes:
                errors.append("Scope needs at least one exclude row, or '해당 없음 — <reason>'.")

    decisions = sections.get("open decisions")
    if decisions and not is_not_applicable(decisions):
        decision_errors, decision_warnings, open_names = validate_open_decisions(decisions, block=False)
        errors.extend(decision_errors)
        result["warnings"].extend(decision_warnings)  # type: ignore[union-attr]
        result["openDecisions"] = open_names

    result["valid"] = not errors
    return result


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
        "blockingDecisions": [],
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

    roles = sections.get("system roles", "")
    if roles and "not applicable" not in normalize(roles):
        missing.extend(name for name in ROLE_SECTIONS if name not in sections)
        empty.extend(
            name for name in ROLE_SECTIONS if name in sections and not sections[name]
        )
        placeholders.extend(
            name
            for name in ROLE_SECTIONS
            if name in sections and sections[name] and has_placeholder(sections[name])
        )
        variants = sections.get("role variants", "")
        if variants and not contains_any(variants, ROLE_VISIBILITY_OPERATIONS):
            result["errors"].append(
                "Role Variants must state per-role visibility (visible / hidden / disabled / read-only)."
            )

    decisions = sections.get("open decisions")
    if decisions and not is_not_applicable(decisions):
        if has_placeholder(decisions):
            placeholders.append("open decisions")
        else:
            decision_errors, decision_warnings, blocking = validate_open_decisions(decisions)
            result["errors"].extend(decision_errors)
            result["warnings"].extend(decision_warnings)
            result["blockingDecisions"] = blocking
    else:
        # 장부 없이 본문 여기저기에 "미결"만 적으면 무엇이 남았는지 한곳에서 볼 수 없다.
        marked = [
            name
            for name in COMMON_SECTIONS
            if name in sections and contains_any(sections[name], UNDECIDED_MARKERS)
        ]
        if marked:
            result["warnings"].append(
                "Undecided markers appear in " + ", ".join(marked)
                + "; list them under '## Open Decisions' with a recommendation and owner."
            )

    flows = sections.get("object flows")
    if flows is not None and not is_not_applicable(flows):
        if not flows:
            empty.append("object flows")
        elif has_placeholder(flows):
            placeholders.append("object flows")
        else:
            result["errors"].extend(validate_object_flows(flows))
        missing.extend(name for name in FLOW_SECTIONS if name not in sections)
        empty.extend(
            name for name in FLOW_SECTIONS if name in sections and not sections[name]
        )
        placeholders.extend(
            name
            for name in FLOW_SECTIONS
            if name in sections and sections[name] and has_placeholder(sections[name])
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
    parser.add_argument(
        "--product", action="store_true", help="Validate a root PRODUCT.md instead of a contract"
    )
    args = parser.parse_args()

    validate = validate_product if args.product else validate_contract
    result = validate(args.contract.resolve())
    print(json.dumps(result, ensure_ascii=False, indent=2))
    status = "passed" if result["valid"] else "failed"
    print(f"Experience Contract validation {status}: {args.contract}", file=sys.stderr)
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
