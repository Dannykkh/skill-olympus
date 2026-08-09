#!/usr/bin/env python3
"""Download a Stitch artifact atomically without leaking signed URL queries."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import tempfile
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen


def emit(payload: dict[str, object]) -> None:
    print(json.dumps(payload, ensure_ascii=False))


def safe_url(raw_url: str) -> str:
    parsed = urlsplit(raw_url)
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))


def resolved_download_url(raw_url: str, width: int | None) -> str:
    parsed = urlsplit(raw_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("URL must be an absolute HTTP(S) URL")
    if width is None:
        return raw_url
    if width < 1 or width > 10000:
        raise ValueError("width must be between 1 and 10000")
    return urlunsplit(
        (parsed.scheme, parsed.netloc, f"{parsed.path}=w{width}", parsed.query, parsed.fragment)
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download a Stitch HTML or image artifact")
    parser.add_argument("--url", required=True, help="Signed artifact download URL")
    parser.add_argument("--output", required=True, type=Path, help="Local output path")
    parser.add_argument("--width", type=int, help="Request this screenshot width")
    parser.add_argument("--force", action="store_true", help="Replace an existing output")
    parser.add_argument("--dry-run", action="store_true", help="Validate without downloading")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        url = resolved_download_url(args.url, args.width)
        output = args.output.resolve()
        if output.exists() and not args.force:
            raise FileExistsError(f"output already exists: {output}")

        plan = {
            "ok": True,
            "dryRun": bool(args.dry_run),
            "source": safe_url(url),
            "output": str(output),
            "width": args.width,
        }
        if args.dry_run:
            emit(plan)
            return 0

        output.parent.mkdir(parents=True, exist_ok=True)
        request = Request(url, headers={"User-Agent": "skill-olympus-stitch/3"})
        temp_path: Path | None = None
        try:
            with urlopen(request, timeout=120) as response:
                content_type = response.headers.get("Content-Type", "application/octet-stream")
                with tempfile.NamedTemporaryFile(
                    mode="wb", delete=False, dir=output.parent, prefix=f".{output.name}.", suffix=".part"
                ) as temporary:
                    temp_path = Path(temporary.name)
                    while chunk := response.read(1024 * 1024):
                        temporary.write(chunk)
            if output.exists() and not args.force:
                raise FileExistsError(f"output appeared during download: {output}")
            os.replace(temp_path, output)
            temp_path = None
        finally:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink()

        plan.update({"bytes": output.stat().st_size, "contentType": content_type})
        print(f"Downloaded Stitch artifact to {output}", file=sys.stderr)
        emit(plan)
        return 0
    except Exception as exc:  # deterministic CLI boundary
        message = str(exc).replace(args.url, safe_url(args.url))
        print(message, file=sys.stderr)
        emit({"ok": False, "error": type(exc).__name__})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
