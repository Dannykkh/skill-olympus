#!/usr/bin/env python3
"""
Reconcile conversations/YYYY-MM-DD-codex.md against Codex rollout JSONL.

Purpose
-------
Codex's notify hook (save-turn.ps1/sh) saves one turn per invocation into
conversations/YYYY-MM-DD-codex.md. If the hook fails once (permission error,
JSON parse error, bridge crash, Codex CLI kill before notify fires) the turn
is silently lost — Codex has no retry mechanism.

However, the rollout JSONL at ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
is the source of truth: Codex writes every user/assistant message there
directly, independent of notify hooks. This script scans rollout files,
matches them to a project by cwd (session_meta), and back-fills any turn
missing from the project's conversations/ mirror.

Dedup key
---------
Unlike Claude's JSONL (which has a per-line uuid), Codex rollout lines have
no unique identifier. We construct a deterministic key:

    sha1(timestamp + role + content[:200])

This is stable across runs and resistant to minor content variation.
Keys are stored in conversations/.mnemo-index.json under the "codex" namespace
so Claude and Codex never collide.

Legacy compatibility
--------------------
save-turn writes "<!-- turn:$turnId -->" or "<!-- turnhash:$sha1 -->" markers
at the end of each appended turn. On first reconcile run, we seed the sidecar
index by fingerprint-matching existing turns so nothing is duplicated.

Usage
-----
    python reconcile_codex_conversations.py                  # today, CWD project
    python reconcile_codex_conversations.py --date 2026-04-06
    python reconcile_codex_conversations.py --all            # every date found
    python reconcile_codex_conversations.py --project-root D:/git/foo
    python reconcile_codex_conversations.py --dry-run
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path


# Force UTF-8 stdout on Windows so verbose output isn't mangled by cp949.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass


# ---------- config ----------

INDEX_FILENAME = ".mnemo-index.json"
CONV_FILENAME_TEMPLATE = "{date}-codex.md"
KEY_CONTENT_LEN = 200  # how many characters of content go into the dedup hash


# ---------- models ----------

@dataclass
class CodexTurn:
    """A single user OR assistant message extracted from a rollout file."""
    role: str                # "user" or "assistant"
    timestamp_utc: str       # ISO8601 from JSONL
    local_date: str          # YYYY-MM-DD (local timezone)
    local_time: str          # HH:MM:SS (local timezone)
    text: str                # joined text blocks
    dedup_key: str           # sha1(timestamp + role + text[:200])


@dataclass
class ReconcileStats:
    scanned_files: int = 0
    total_messages: int = 0
    user_turns: int = 0
    assistant_turns: int = 0
    already_indexed: int = 0
    legacy_matched: int = 0
    newly_written: int = 0
    skipped_empty: int = 0
    skipped_other_project: int = 0
    dates_touched: set[str] = field(default_factory=set)

    def summary(self) -> str:
        dates = ", ".join(sorted(self.dates_touched)) or "(none)"
        return (
            f"scanned_files={self.scanned_files} "
            f"total_messages={self.total_messages} "
            f"user={self.user_turns} assistant={self.assistant_turns} "
            f"already_indexed={self.already_indexed} "
            f"legacy_matched={self.legacy_matched} "
            f"newly_written={self.newly_written} "
            f"skipped_empty={self.skipped_empty} "
            f"skipped_other_project={self.skipped_other_project} "
            f"dates={dates}"
        )


# ---------- project root ----------

def detect_project_root(start: Path) -> Path:
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


def normalize_path(p: str) -> str:
    """Normalize a path for comparison (case-insensitive on Windows)."""
    if not p:
        return ""
    try:
        resolved = str(Path(p).resolve()).rstrip("\\/").lower()
        return resolved
    except (OSError, ValueError):
        return p.rstrip("\\/").lower()


# ---------- rollout discovery ----------

def codex_sessions_root() -> Path:
    return Path(os.path.expanduser("~")) / ".codex" / "sessions"


def list_rollout_files(sessions_root: Path, days: int | None = None) -> list[Path]:
    """
    Return rollout JSONL files, newest first. If `days` is set, only scan
    rollouts from the last N days (by filesystem mtime).
    """
    if not sessions_root.exists():
        return []
    files = list(sessions_root.rglob("rollout-*.jsonl"))
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    if days:
        cutoff = datetime.now().timestamp() - days * 86400
        files = [f for f in files if f.stat().st_mtime >= cutoff]
    return files


# ---------- rollout parsing ----------

def extract_text(content) -> str:
    """
    Codex payload.content is a list of blocks. We extract plain text from
    `text`, `output_text`, `input_text`, and nested structures.
    """
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            t = extract_text(item)
            if t:
                parts.append(t)
        return "\n".join(parts)
    if isinstance(content, dict):
        block_type = content.get("type", "")
        if block_type in ("text", "output_text", "input_text"):
            t = content.get("text")
            if isinstance(t, str):
                return t
        # fallback: any 'text' or 'content' key
        if isinstance(content.get("text"), (str, list, dict)):
            return extract_text(content["text"])
        if isinstance(content.get("content"), (str, list, dict)):
            return extract_text(content["content"])
    return ""


def utc_iso_to_local(ts: str) -> tuple[str, str]:
    try:
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


def build_dedup_key(timestamp: str, role: str, text: str) -> str:
    snippet = text[:KEY_CONTENT_LEN]
    material = f"{timestamp}|{role}|{snippet}".encode("utf-8", errors="replace")
    return hashlib.sha1(material).hexdigest()


def parse_rollout(
    path: Path,
    target_project_norm: str | None,
    date_filter: str | None,
    since_date: str | None = None,
) -> tuple[list[CodexTurn], str | None]:
    """
    Parse a single rollout JSONL and return (turns, cwd).
    If target_project_norm is set, the rollout is skipped (empty turns list
    returned) when its session_meta.cwd doesn't match.

    Filtering rules (mutually exclusive):
      - date_filter: only turns whose local date == this exact date
      - since_date:  only turns whose local date >= this date (inclusive window)
      - both None:   no filter (all turns)
    """
    turns: list[CodexTurn] = []
    session_cwd: str | None = None

    try:
        with path.open("r", encoding="utf-8", errors="replace") as f:
            for raw in f:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    obj = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                obj_type = obj.get("type")

                # Capture cwd from session_meta (may appear multiple times)
                if obj_type == "session_meta" and session_cwd is None:
                    payload = obj.get("payload") or {}
                    cwd_candidate = payload.get("cwd")
                    if isinstance(cwd_candidate, str) and cwd_candidate:
                        session_cwd = cwd_candidate
                        # Early exit if project filter doesn't match
                        if target_project_norm:
                            if normalize_path(session_cwd) != target_project_norm:
                                return ([], session_cwd)
                    continue

                if obj_type != "response_item":
                    continue

                payload = obj.get("payload") or {}
                if payload.get("type") != "message":
                    continue

                role = payload.get("role")
                if role not in ("user", "assistant"):
                    continue

                content = payload.get("content")
                text = extract_text(content).strip()
                if not text:
                    continue

                ts_utc = obj.get("timestamp") or ""
                local_date, local_time = utc_iso_to_local(ts_utc)
                if date_filter and local_date != date_filter:
                    continue
                if since_date and local_date < since_date:
                    continue

                turns.append(
                    CodexTurn(
                        role=role,
                        timestamp_utc=ts_utc,
                        local_date=local_date,
                        local_time=local_time,
                        text=text,
                        dedup_key=build_dedup_key(ts_utc, role, text),
                    )
                )
    except OSError:
        return (turns, session_cwd)

    return (turns, session_cwd)


# ---------- conversations file I/O ----------

def ensure_conv_header(conv_path: Path, project_root: Path, date: str) -> None:
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


def append_turn(conv_path: Path, turn: CodexTurn) -> None:
    text = redact_private(turn.text)
    role_label = "User" if turn.role == "user" else "Assistant"
    entry = f"\n## [{turn.local_time}] {role_label}\n\n{text}\n"
    with conv_path.open("a", encoding="utf-8") as f:
        f.write(entry)


def redact_private(text: str) -> str:
    return re.sub(r"<private>.*?</private>", "[PRIVATE]", text, flags=re.DOTALL)


# ---------- sidecar index ----------

def load_index(conv_dir: Path) -> dict:
    path = conv_dir / INDEX_FILENAME
    if not path.exists():
        return {"version": 1, "claude": {}, "codex": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"version": 1, "claude": {}, "codex": {}}
        data.setdefault("version", 1)
        data.setdefault("claude", {})
        data.setdefault("codex", {})
        return data
    except (json.JSONDecodeError, OSError):
        return {"version": 1, "claude": {}, "codex": {}}


def save_index(conv_dir: Path, index: dict) -> None:
    path = conv_dir / INDEX_FILENAME
    conv_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def is_indexed(index: dict, date: str, key: str) -> bool:
    return key in set(index.get("codex", {}).get(date, []))


def add_to_index(index: dict, date: str, key: str) -> None:
    bucket = index.setdefault("codex", {}).setdefault(date, [])
    if key not in bucket:
        bucket.append(key)


# ---------- legacy marker detection ----------

def legacy_fingerprint_present(conv_text: str, turn_text: str) -> bool:
    """
    Check whether the first 80 characters of the turn text are already in
    the conversations file. Matches save-turn's pre-existing behavior for
    backward compatibility.
    """
    if not conv_text or not turn_text:
        return False
    fp_len = min(80, len(turn_text))
    fp = turn_text[:fp_len]
    return fp in conv_text


# ---------- main reconcile loop ----------

def reconcile(
    project_root: Path,
    date_filter: str | None,
    since_date: str | None = None,
    dry_run: bool = False,
    verbose: bool = False,
    days_lookback: int = 30,
) -> ReconcileStats:
    stats = ReconcileStats()
    conv_dir = project_root / "conversations"

    sessions_root = codex_sessions_root()
    if not sessions_root.exists():
        if verbose:
            print(f"[mnemo-codex] no sessions dir at {sessions_root}", file=sys.stderr)
        return stats

    # Only scan recent rollout files to keep the scan fast.
    # --all (date_filter=None and since_date=None) bypasses the limit.
    if date_filter is None and since_date is None:
        # --all: scan everything
        rollouts = list_rollout_files(sessions_root)
    else:
        # --date / --days / default: limit file mtime to days_lookback
        rollouts = list_rollout_files(sessions_root, days=days_lookback)

    if not rollouts:
        return stats

    target_project_norm = normalize_path(str(project_root))
    index = load_index(conv_dir)

    # Collect turns from matching rollouts
    all_turns: list[CodexTurn] = []
    seen_keys: set[str] = set()

    for rollout in rollouts:
        stats.scanned_files += 1
        turns, session_cwd = parse_rollout(rollout, target_project_norm, date_filter, since_date)
        if not turns and session_cwd is not None:
            # Session belonged to a different project
            stats.skipped_other_project += 1
            continue
        for turn in turns:
            stats.total_messages += 1
            if turn.role == "user":
                stats.user_turns += 1
            else:
                stats.assistant_turns += 1
            if turn.dedup_key in seen_keys:
                continue
            seen_keys.add(turn.dedup_key)
            all_turns.append(turn)

    all_turns.sort(key=lambda t: t.timestamp_utc)

    conv_text_cache: dict[str, str] = {}

    for turn in all_turns:
        if not turn.text:
            stats.skipped_empty += 1
            continue

        if is_indexed(index, turn.local_date, turn.dedup_key):
            stats.already_indexed += 1
            continue

        conv_path = conv_dir / CONV_FILENAME_TEMPLATE.format(date=turn.local_date)

        if turn.local_date not in conv_text_cache:
            conv_text_cache[turn.local_date] = (
                conv_path.read_text(encoding="utf-8", errors="replace")
                if conv_path.exists()
                else ""
            )

        if legacy_fingerprint_present(conv_text_cache[turn.local_date], turn.text):
            add_to_index(index, turn.local_date, turn.dedup_key)
            stats.legacy_matched += 1
            continue

        if dry_run:
            stats.newly_written += 1
            stats.dates_touched.add(turn.local_date)
            if verbose:
                preview = turn.text[:60].replace("\n", " ")
                print(f"[dry-run] would append {turn.local_date} {turn.local_time} [{turn.role}] {preview}")
            continue

        ensure_conv_header(conv_path, project_root, turn.local_date)
        append_turn(conv_path, turn)
        conv_text_cache[turn.local_date] = conv_path.read_text(
            encoding="utf-8", errors="replace"
        )
        add_to_index(index, turn.local_date, turn.dedup_key)
        stats.newly_written += 1
        stats.dates_touched.add(turn.local_date)

    if not dry_run:
        save_index(conv_dir, index)

    return stats


# ---------- CLI ----------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reconcile conversations/ mirror against Codex rollout JSONL.",
    )
    parser.add_argument("--project-root", type=Path, default=None)
    parser.add_argument("--date", type=str, default=None,
                        help="Reconcile only this exact date (YYYY-MM-DD)")
    parser.add_argument("--days", type=int, default=None,
                        help="Reconcile last N days (inclusive of today). Default: 7")
    parser.add_argument("--all", action="store_true",
                        help="Reconcile every date found (ignores --date/--days)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    start = args.project_root.resolve() if args.project_root else Path.cwd()
    project_root = detect_project_root(start)

    # Filter resolution priority: --all > --date > --days > default(7 days)
    # Default is 7 days (not "today only") to handle:
    #   1) Sessions crossing midnight (turn at 23:55, next at 00:05)
    #   2) Yesterday's hook silently failed — recover on next day's reconcile
    date_filter: str | None = None
    since_date: str | None = None
    if args.all:
        pass
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
        print(f"[mnemo-codex] reconcile failed: {e}", file=sys.stderr)
        return 1

    if not args.quiet:
        prefix = "[mnemo-codex dry-run]" if args.dry_run else "[mnemo-codex]"
        print(f"{prefix} {stats.summary()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
