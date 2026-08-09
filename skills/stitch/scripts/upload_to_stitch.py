#!/usr/bin/env python3
"""Upload a supported local file to Stitch without emitting base64 through the model."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import ssl
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_ROOT = "https://stitch.googleapis.com"
MAX_FILE_BYTES = 25 * 1024 * 1024
MIME_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".html": "text/html",
    ".htm": "text/html",
    ".md": "text/markdown",
}


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False))


def ssl_context() -> ssl.SSLContext:
    try:
        import certifi  # type: ignore[import-not-found]

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Upload an image, HTML, or DESIGN.md to Stitch")
    parser.add_argument("--project-id", required=True, help="Bare Stitch project ID")
    parser.add_argument("--file", required=True, type=Path, help="File to upload")
    parser.add_argument("--title", help="Optional screen title or route")
    parser.add_argument("--generated-by", help="Origin label for HTML/Markdown")
    parser.add_argument("--dry-run", action="store_true", help="Validate and summarize without uploading")
    parser.add_argument(
        "--confirm-upload",
        action="store_true",
        help="Assert that the user approved the exact file and project",
    )
    return parser.parse_args()


def file_summary(path: Path, mime_type: str) -> dict[str, Any]:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return {
        "path": str(path),
        "mimeType": mime_type,
        "bytes": path.stat().st_size,
        "sha256": digest.hexdigest(),
    }


def screen_request(
    path: Path, mime_type: str, title: str | None, generated_by: str | None
) -> dict[str, Any]:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    file_object = {"fileContentBase64": encoded, "mimeType": mime_type}
    if mime_type in {"text/html", "text/markdown"}:
        screen: dict[str, Any] = {
            "htmlCode": file_object,
            "screenType": "DOCUMENT",
            "isCreatedByClient": True,
            "generatedBy": generated_by
            or ("UserUploadedDesignMd" if mime_type == "text/markdown" else "UserUploadedHtml"),
        }
    else:
        screen = {
            "screenshot": file_object,
            "screenType": "IMAGE",
            "isCreatedByClient": True,
        }
    if title:
        screen["title"] = title
    return {"screen": screen}


def main() -> int:
    args = parse_args()
    try:
        project_id = args.project_id.strip()
        if not project_id or "/" in project_id or "\\" in project_id:
            raise ValueError("project ID must be a bare identifier")

        path = args.file.resolve(strict=True)
        mime_type = MIME_TYPES.get(path.suffix.lower())
        if mime_type is None:
            raise ValueError(f"unsupported file type: {path.suffix.lower()}")
        if path.stat().st_size > MAX_FILE_BYTES:
            raise ValueError(f"file exceeds the {MAX_FILE_BYTES} byte safety limit")

        summary = file_summary(path, mime_type)
        plan = {
            "ok": True,
            "dryRun": bool(args.dry_run),
            "projectId": project_id,
            "file": summary,
            "title": args.title,
            "generatedBy": args.generated_by,
        }
        if args.dry_run:
            emit(plan)
            return 0
        if not args.confirm_upload:
            raise PermissionError("actual upload requires --confirm-upload after target confirmation")

        api_key = os.environ.get("STITCH_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("STITCH_API_KEY is not set")

        endpoint = f"{API_ROOT}/v1/projects/{project_id}/screens:batchCreate"
        payload = {
            "parent": f"projects/{project_id}",
            "requests": [screen_request(path, mime_type, args.title, args.generated_by)],
            "createScreenInstances": True,
        }
        request = Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "X-Goog-Api-Key": api_key},
            method="POST",
        )
        try:
            with urlopen(request, timeout=120, context=ssl_context()) as response:
                body = response.read().decode("utf-8")
                if not body:
                    raise RuntimeError("Stitch returned an empty response")
                result = json.loads(body)
        except HTTPError as exc:
            response_text = exc.read().decode("utf-8", errors="replace")[:2000]
            response_text = response_text.replace(api_key, "[REDACTED]")
            raise RuntimeError(f"Stitch HTTP {exc.code}: {response_text}") from exc
        except URLError as exc:
            raise RuntimeError(f"Stitch connection failed: {exc.reason}") from exc

        print(f"Uploaded {path.name} to Stitch project {project_id}", file=sys.stderr)
        emit({**plan, "dryRun": False, "result": result})
        return 0
    except Exception as exc:  # deterministic CLI boundary
        print(str(exc), file=sys.stderr)
        emit({"ok": False, "error": type(exc).__name__})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
