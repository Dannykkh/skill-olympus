#!/usr/bin/env python3
"""Validate the resumable .stitch/metadata.json contract."""

from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path, PurePosixPath
import re
import sys
from typing import Any


SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False))


def is_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_relative_design_path(value: Any, field: str, errors: list[str]) -> None:
    if value is None:
        return
    if not is_nonempty_string(value):
        errors.append(f"{field} must be a non-empty string")
        return
    normalized = str(value).replace("\\", "/")
    path = PurePosixPath(normalized)
    if path.is_absolute() or ".." in path.parts:
        errors.append(f"{field} must be a safe relative path")
    elif not normalized.startswith(".stitch/designs/"):
        errors.append(f"{field} must be under .stitch/designs/")


def validate_timestamp(value: Any, errors: list[str]) -> None:
    if not is_nonempty_string(value):
        errors.append("lastSyncTime must be a non-empty ISO-8601 string")
        return
    try:
        datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        errors.append("lastSyncTime must be valid ISO-8601")


def validate(data: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["root must be a JSON object"]

    if data.get("schemaVersion") != 1:
        errors.append("schemaVersion must equal 1")

    project_id = data.get("projectId")
    if not is_nonempty_string(project_id):
        errors.append("projectId must be a non-empty string")
    name = data.get("name")
    if name is not None and project_id and name != f"projects/{project_id}":
        errors.append("name must equal projects/{projectId}")
    if "lastSyncTime" in data:
        validate_timestamp(data.get("lastSyncTime"), errors)

    design_source = data.get("designSource")
    if design_source is not None:
        if not isinstance(design_source, dict):
            errors.append("designSource must be an object")
        else:
            if design_source.get("path") != "DESIGN.md":
                errors.append("designSource.path must equal DESIGN.md")
            digest = design_source.get("sha256")
            if not isinstance(digest, str) or not SHA256_RE.fullmatch(digest):
                errors.append("designSource.sha256 must be 64 lowercase hex characters")

    screens = data.get("screens")
    if not isinstance(screens, dict):
        errors.append("screens must be an object keyed by stable page name")
        return errors

    for page_key, screen in screens.items():
        prefix = f"screens.{page_key}"
        if not is_nonempty_string(page_key):
            errors.append("screen page keys must be non-empty strings")
        if not isinstance(screen, dict):
            errors.append(f"{prefix} must be an object")
            continue
        for field in ("id", "screenId", "sourceScreen"):
            if not is_nonempty_string(screen.get(field)):
                errors.append(f"{prefix}.{field} must be a non-empty string")
        source_screen = screen.get("sourceScreen")
        screen_id = screen.get("screenId")
        if project_id and screen_id and source_screen != f"projects/{project_id}/screens/{screen_id}":
            errors.append(f"{prefix}.sourceScreen does not match projectId/screenId")
        for dimension in ("width", "height"):
            value = screen.get(dimension)
            if value is not None and (not isinstance(value, int) or value < 1):
                errors.append(f"{prefix}.{dimension} must be a positive integer")
        validate_relative_design_path(screen.get("htmlPath"), f"{prefix}.htmlPath", errors)
        validate_relative_design_path(
            screen.get("screenshotPath"), f"{prefix}.screenshotPath", errors
        )

    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Stitch runtime metadata")
    parser.add_argument("metadata", type=Path, help="Path to .stitch/metadata.json")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        path = args.metadata.resolve(strict=True)
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        emit({"ok": False, "errors": [type(exc).__name__]})
        return 2

    errors = validate(data)
    emit({"ok": not errors, "path": str(path), "errors": errors})
    if errors:
        print(f"Stitch state validation failed with {len(errors)} error(s)", file=sys.stderr)
        return 1
    print("Stitch state validation passed", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
