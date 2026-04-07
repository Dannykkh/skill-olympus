#!/usr/bin/env python3
"""
Reconcile conversations/YYYY-MM-DD-claude.md against the JSONL transcript.

Purpose
-------
Stop hook (save-response.ps1/.sh) only captures the LAST assistant message
on each Stop event. If the hook fails once or Claude Code crashes before it
runs, that turn is silently lost from the human-readable mirror.

The JSONL transcript in ~/.claude/projects/<encoded>/ is the source of truth.
This script scans that transcript, finds every assistant text message, and
back-fills any turns missing from conversations/YYYY-MM-DD-claude.md.

Safety
------
- Idempotent: keyed on JSONL line uuid (unique per line) via a sidecar index
  file at conversations/.mnemo-index.json
- Legacy-compatible: on first run, inspects an existing conversations file,
  matches by 80-char fingerprint, and marks already-present turns as "seen"
  so they are not duplicated
- Dry-run supported (--dry-run)

Usage
-----
    python reconcile_conversations.py                  # today, CWD project
    python reconcile_conversations.py --date 2026-04-06
    python reconcile_conversations.py --all            # every date found
    python reconcile_conversations.py --project-root D:/git/foo
    python reconcile_conversations.py --dry-run

Hook wiring
-----------
Called from hooks/reconcile-conversations.ps1/.sh at SessionStart or via
`/mnemo-reconcile` slash command.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path


# Force UTF-8 on stdout/stderr so verbose output with Korean/Unicode content
# does not get mangled by Windows cp949 code page.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass


# ---------- config ----------

INDEX_FILENAME = ".mnemo-index.json"
CONV_FILENAME_TEMPLATE = "{date}-claude.md"
FINGERPRINT_LEN = 80  # matches save-response.ps1/.sh fingerprint length


# ---------- models ----------

@dataclass
class AssistantTurn:
    uuid: str                # JSONL line uuid (unique per line)
    message_id: str          # Claude message id (may repeat across lines)
    timestamp_utc: str       # ISO8601 from JSONL
    local_date: str          # YYYY-MM-DD (local timezone)
    local_time: str          # HH:MM:SS (local timezone)
    text: str                # joined text blocks


@dataclass
class ReconcileStats:
    assistant_turns: int = 0   # total text-bearing assistant JSONL lines seen
    unique_turns: int = 0      # dedup by JSONL line uuid
    already_indexed: int = 0   # uuid already recorded in sidecar index
    legacy_matched: int = 0    # fingerprint already present in .md (pre-index era)
    newly_written: int = 0     # actually appended this run
    skipped_empty: int = 0     # text block was empty after trim
    dates_touched: set[str] = field(default_factory=set)

    def summary(self) -> str:
        dates = ", ".join(sorted(self.dates_touched)) or "(none)"
        return (
            f"assistant_turns={self.assistant_turns} "
            f"unique_turns={self.unique_turns} "
            f"already_indexed={self.already_indexed} "
            f"legacy_matched={self.legacy_matched} "
            f"newly_written={self.newly_written} "
            f"skipped_empty={self.skipped_empty} "
            f"dates={dates}"
        )


# ---------- project root + transcript discovery ----------

def detect_project_root(start: Path) -> Path:
    """Prefer git root, fall back to start directory."""
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=start,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if out.returncode == 0 and out.stdout.strip():
            return Path(out.stdout.strip())
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return start


def encode_project_path(project_root: Path) -> str:
    """
    Claude Code encodes project paths into ~/.claude/projects/ directory
    names by replacing '\\', '/', ':' with '-'.
    Example: D:\\git\\foo  ->  D--git-foo
    """
    s = str(project_root)
    for ch in ("\\", "/", ":"):
        s = s.replace(ch, "-")
    # collapse any accidental double dashes produced by "D:\\" -> "D--\\" -> "D---"
    while "---" in s:
        s = s.replace("---", "--")
    return s


def find_transcript_dir(project_root: Path) -> Path | None:
    """Return ~/.claude/projects/<encoded>/ if it exists."""
    home = Path(os.path.expanduser("~"))
    base = home / ".claude" / "projects"
    if not base.exists():
        return None
    encoded = encode_project_path(project_root)
    candidate = base / encoded
    if candidate.exists():
        return candidate
    # fallback: case-insensitive match (Windows safety)
    encoded_lower = encoded.lower()
    for child in base.iterdir():
        if child.is_dir() and child.name.lower() == encoded_lower:
            return child
    return None


def list_transcript_files(transcript_dir: Path) -> list[Path]:
    """All *.jsonl files in the transcript dir, newest first."""
    return sorted(
        transcript_dir.glob("*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )


# ---------- JSONL parsing ----------

def parse_assistant_turns(
    jsonl_path: Path,
    date_filter: str | None,
    since_date: str | None = None,
) -> list[AssistantTurn]:
    """
    Parse a single JSONL transcript and return assistant turns that contain
    at least one non-empty text block.

    Filtering rules (mutually exclusive):
      - date_filter: only turns whose local date == this exact date
      - since_date:  only turns whose local date >= this date (inclusive window)
      - both None:   no filter (all turns)
    """
    turns: list[AssistantTurn] = []
    try:
        with jsonl_path.open("r", encoding="utf-8", errors="replace") as f:
            for raw in f:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    obj = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if obj.get("type") != "assistant":
                    continue
                msg = obj.get("message") or {}
                content = msg.get("content") or []
                texts: list[str] = []
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        t = block.get("text")
                        if isinstance(t, str) and t.strip():
                            texts.append(t)
                if not texts:
                    continue

                timestamp_utc = obj.get("timestamp") or ""
                local_date, local_time = utc_iso_to_local(timestamp_utc)
                if date_filter and local_date != date_filter:
                    continue
                if since_date and local_date < since_date:
                    continue

                turns.append(
                    AssistantTurn(
                        uuid=obj.get("uuid") or "",
                        message_id=(msg.get("id") or ""),
                        timestamp_utc=timestamp_utc,
                        local_date=local_date,
                        local_time=local_time,
                        text="\n".join(texts).strip(),
                    )
                )
    except OSError:
        return turns
    return turns


def utc_iso_to_local(ts: str) -> tuple[str, str]:
    """
    Convert an ISO8601 UTC timestamp to (local_date, local_time).
    Falls back to today/00:00:00 on any failure so downstream logic
    never sees empty values.
    """
    try:
        # Claude Code emits e.g. "2026-04-07T01:31:32.109Z"
        if ts.endswith("Z"):
            ts_py = ts[:-1] + "+00:00"
        else:
            ts_py = ts
        dt_utc = datetime.fromisoformat(ts_py)
        if dt_utc.tzinfo is None:
            dt_utc = dt_utc.replace(tzinfo=timezone.utc)
        dt_local = dt_utc.astimezone()
        return dt_local.strftime("%Y-%m-%d"), dt_local.strftime("%H:%M:%S")
    except (ValueError, TypeError):
        now = datetime.now()
        return now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S")


# ---------- conversations file I/O ----------

def ensure_conv_header(conv_path: Path, project_root: Path, date: str) -> None:
    """Create conversations file with frontmatter if it does not exist."""
    if conv_path.exists():
        return
    conv_path.parent.mkdir(parents=True, exist_ok=True)
    project_name = project_root.name
    header = (
        f"---\n"
        f"date: {date}\n"
        f"project: {project_name}\n"
        f"keywords: []\n"
        f'summary: ""\n'
        f"---\n\n"
        f"# {date}\n\n"
    )
    conv_path.write_text(header, encoding="utf-8")


def append_turn(conv_path: Path, turn: AssistantTurn) -> None:
    """Append an assistant turn in the save-response.ps1 format."""
    # <private> blocks are redacted at save-response time, but we also redact
    # here defensively in case the transcript contains raw content.
    text = redact_private(turn.text)
    entry = f"\n## [{turn.local_time}] Assistant\n\n{text}\n"
    with conv_path.open("a", encoding="utf-8") as f:
        f.write(entry)


def redact_private(text: str) -> str:
    """Replace <private>...</private> blocks with [PRIVATE]."""
    import re
    return re.sub(r"<private>.*?</private>", "[PRIVATE]", text, flags=re.DOTALL)


# ---------- sidecar index ----------

def load_index(conv_dir: Path) -> dict:
    """
    Load conversations/.mnemo-index.json.
    Schema:
      {
        "version": 1,
        "claude": { "YYYY-MM-DD": [uuid, uuid, ...] }
      }
    """
    path = conv_dir / INDEX_FILENAME
    if not path.exists():
        return {"version": 1, "claude": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"version": 1, "claude": {}}
        data.setdefault("version", 1)
        data.setdefault("claude", {})
        return data
    except (json.JSONDecodeError, OSError):
        return {"version": 1, "claude": {}}


def save_index(conv_dir: Path, index: dict) -> None:
    path = conv_dir / INDEX_FILENAME
    conv_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def is_indexed(index: dict, date: str, uuid: str) -> bool:
    return uuid in set(index.get("claude", {}).get(date, []))


def add_to_index(index: dict, date: str, uuid: str) -> None:
    bucket = index.setdefault("claude", {}).setdefault(date, [])
    if uuid not in bucket:
        bucket.append(uuid)


# ---------- legacy fingerprint compatibility ----------

def legacy_fingerprint_present(conv_text: str, turn_text: str) -> bool:
    """
    save-response.ps1/.sh uses the first 80 chars of the response as a
    fingerprint. If an existing conversations file already contains that
    fingerprint, the turn is already saved — mark it seen in the index
    without writing a duplicate.
    """
    if not conv_text or not turn_text:
        return False
    fp = turn_text[:FINGERPRINT_LEN]
    return fp in conv_text


# ---------- main reconcile loop ----------

def reconcile(
    project_root: Path,
    date_filter: str | None,
    since_date: str | None = None,
    dry_run: bool = False,
    verbose: bool = False,
) -> ReconcileStats:
    stats = ReconcileStats()
    conv_dir = project_root / "conversations"

    transcript_dir = find_transcript_dir(project_root)
    if transcript_dir is None:
        if verbose:
            print(f"[mnemo] no transcript dir for {project_root}", file=sys.stderr)
        return stats

    transcripts = list_transcript_files(transcript_dir)
    if not transcripts:
        if verbose:
            print(f"[mnemo] no JSONL files in {transcript_dir}", file=sys.stderr)
        return stats

    index = load_index(conv_dir)

    # Collect all turns from all transcripts, filter by date, dedup by uuid.
    all_turns: list[AssistantTurn] = []
    seen_uuids: set[str] = set()
    for jsonl in transcripts:
        for turn in parse_assistant_turns(jsonl, date_filter, since_date):
            stats.assistant_turns += 1
            if not turn.uuid or turn.uuid in seen_uuids:
                continue
            seen_uuids.add(turn.uuid)
            all_turns.append(turn)

    # Sort chronologically so appends arrive in the right order.
    all_turns.sort(key=lambda t: t.timestamp_utc)

    # Cache conversation file contents for legacy fingerprint checks.
    conv_text_cache: dict[str, str] = {}

    for turn in all_turns:
        if not turn.text:
            stats.skipped_empty += 1
            continue

        if is_indexed(index, turn.local_date, turn.uuid):
            stats.already_indexed += 1
            continue

        conv_path = conv_dir / CONV_FILENAME_TEMPLATE.format(date=turn.local_date)

        # Load (and cache) existing conversation text for legacy match.
        if turn.local_date not in conv_text_cache:
            conv_text_cache[turn.local_date] = (
                conv_path.read_text(encoding="utf-8", errors="replace")
                if conv_path.exists()
                else ""
            )

        if legacy_fingerprint_present(conv_text_cache[turn.local_date], turn.text):
            add_to_index(index, turn.local_date, turn.uuid)
            stats.legacy_matched += 1
            continue

        # Need to write.
        if dry_run:
            stats.newly_written += 1
            stats.dates_touched.add(turn.local_date)
            if verbose:
                preview = turn.text[:60].replace("\n", " ")
                print(f"[dry-run] would append {turn.local_date} {turn.local_time} {preview}")
            continue

        ensure_conv_header(conv_path, project_root, turn.local_date)
        append_turn(conv_path, turn)
        # Update cache so subsequent turns in the same date see the new content.
        conv_text_cache[turn.local_date] = conv_path.read_text(
            encoding="utf-8", errors="replace"
        )
        add_to_index(index, turn.local_date, turn.uuid)
        stats.newly_written += 1
        stats.dates_touched.add(turn.local_date)

    if not dry_run:
        save_index(conv_dir, index)

    stats.unique_turns = len(all_turns)
    return stats


# ---------- CLI ----------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reconcile conversations/ mirror against JSONL transcript.",
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=None,
        help="Project root (default: git root of CWD, else CWD).",
    )
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Reconcile only this exact local date (YYYY-MM-DD). Mutually exclusive with --days/--all.",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=None,
        help="Reconcile the last N days (inclusive of today). Default behavior: 7 days.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Reconcile every date found in the transcript (ignores --date/--days).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not write anything. Report what would change.",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress stdout summary. Errors still go to stderr.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-turn decisions.",
    )
    args = parser.parse_args()

    start = args.project_root.resolve() if args.project_root else Path.cwd()
    project_root = detect_project_root(start)

    # Filter resolution priority: --all > --date > --days > default(7 days)
    # Why default 7 days instead of "today only":
    #   1) Sessions can cross midnight — turns at 23:55 and 00:05 belong to
    #      different local dates but the same conversation
    #   2) If yesterday's save-response hook silently failed, "today only"
    #      reconcile would never recover those turns
    #   3) Cost is negligible — uuid dedup makes re-checking instant
    date_filter: str | None = None
    since_date: str | None = None
    if args.all:
        pass  # both None = no filter
    elif args.date:
        date_filter = args.date
    else:
        days = args.days if args.days is not None else 7
        cutoff = datetime.now() - timedelta(days=days - 1)
        since_date = cutoff.strftime("%Y-%m-%d")

    try:
        stats = reconcile(
            project_root=project_root,
            date_filter=date_filter,
            since_date=since_date,
            dry_run=args.dry_run,
            verbose=args.verbose,
        )
    except Exception as e:  # noqa: BLE001
        print(f"[mnemo] reconcile failed: {e}", file=sys.stderr)
        return 1

    if not args.quiet:
        prefix = "[mnemo dry-run]" if args.dry_run else "[mnemo]"
        print(f"{prefix} {stats.summary()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
