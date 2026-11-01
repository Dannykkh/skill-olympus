#!/usr/bin/env python3
"""
Reconcile conversations/YYYY-MM-DD-claude.md against the JSONL transcript.

Purpose
-------
Stop hook (save-response.ps1/.sh) only captures the LAST assistant message
on each Stop event. If the hook fails once or Claude Code crashes before it
runs, that turn is silently lost from the human-readable mirror. User input
can be lost the same way: a prompt typed while an answer is still running may
never reach the UserPromptSubmit hook (gotcha 123).

The JSONL transcript in <config>/projects/<encoded>/ is the source of truth.
<config> is CLAUDE_CONFIG_DIR when set (e.g. a TermSnap account folder) and
~/.claude otherwise; both are scanned. This script back-fills:
- the final assistant answer of each turn (parsed here; the text a Stop hook
  would have saved, not the progress notes between tool calls), and
- human inputs, through `hooks/claude-event-store.js backfill`, so the hooks
  and this recovery share one input filter and one record marker.

Safety
------
- Idempotent: assistant turns are keyed on JSONL line uuid via a sidecar index
  file at conversations/.mnemo-index.json; user inputs are keyed on the same
  `mnemo-claude-event` marker the hooks write (session id + promptId)
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
import time
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
# 이 시간 안에 바뀐 원본의 마지막 열린 턴은 아직 진행 중일 수 있어 복구하지 않는다.
# 다음 SessionStart가 7일 창 안에서 다시 본다.
OPEN_TURN_GRACE_SECONDS = 600


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
    assistant_turns: int = 0   # final answers of finished turns seen (one per turn)
    unique_turns: int = 0      # dedup by JSONL line uuid
    already_indexed: int = 0   # uuid already recorded in sidecar index
    legacy_matched: int = 0    # fingerprint already present in .md (pre-index era)
    newly_written: int = 0     # actually appended this run
    skipped_empty: int = 0     # text block was empty after trim
    dates_touched: set[str] = field(default_factory=set)
    user_inputs: int = 0       # human inputs found in the window
    user_written: int = 0      # user inputs appended (or that would be, in dry-run)
    user_error: str = ""       # user backfill could not run or failed

    def summary(self) -> str:
        dates = ", ".join(sorted(self.dates_touched)) or "(none)"
        user = f"user_error={self.user_error}" if self.user_error else (
            f"user_inputs={self.user_inputs} user_written={self.user_written}")
        return (
            f"assistant_turns={self.assistant_turns} "
            f"unique_turns={self.unique_turns} "
            f"already_indexed={self.already_indexed} "
            f"legacy_matched={self.legacy_matched} "
            f"newly_written={self.newly_written} "
            f"skipped_empty={self.skipped_empty} "
            f"{user} "
            f"dates={dates}"
        )


# ---------- project root + transcript discovery ----------

# Source checkouts and installed runtime scripts use the same Python bridge.
_mnemo_module_dir = Path(__file__).resolve().parent
if not (_mnemo_module_dir / "mnemo_project_root.py").is_file():
    _mnemo_module_dir = Path(__file__).resolve().parents[2] / "mnemo" / "scripts"
sys.path.insert(0, str(_mnemo_module_dir))
from mnemo_project_root import detect_project_root, validate_project_root


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


def claude_config_dirs() -> list[Path]:
    """
    Claude Code가 원본 세션을 쓰는 설정 폴더 후보.
    CLAUDE_CONFIG_DIR(TermSnap 계정 폴더 등)이 있으면 그 세션은 ~/.claude가 아니라
    그 폴더의 projects/에 쓰인다. 같은 PC에서 두 방식을 함께 쓸 수 있어 둘 다 본다.
    """
    candidates = []
    configured = os.environ.get("CLAUDE_CONFIG_DIR")
    if configured:
        candidates.append(Path(configured).expanduser())
    candidates.append(Path(os.path.expanduser("~")) / ".claude")
    unique: list[Path] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = os.path.normcase(str(candidate.resolve(strict=False)))
        if key not in seen:
            seen.add(key)
            unique.append(candidate)
    return unique


def find_transcript_dirs(project_root: Path) -> list[Path]:
    """Return every <config>/projects/<encoded>/ that exists."""
    encoded = encode_project_path(project_root)
    found: list[Path] = []
    for config in claude_config_dirs():
        base = config / "projects"
        if not base.exists():
            continue
        candidate = base / encoded
        if candidate.exists():
            found.append(candidate)
            continue
        # fallback: case-insensitive match (Windows safety)
        encoded_lower = encoded.lower()
        for child in base.iterdir():
            if child.is_dir() and child.name.lower() == encoded_lower:
                found.append(child)
                break
    return found


def find_transcript_dir(project_root: Path) -> Path | None:
    """First transcript dir (compatibility for callers that expect one)."""
    found = find_transcript_dirs(project_root)
    return found[0] if found else None


def list_transcript_files(transcript_dirs: list[Path], since_epoch: float | None = None) -> list[Path]:
    """
    All *.jsonl files in the transcript dirs, newest first.
    A file last written before the window cannot hold a turn inside it, so it is skipped.
    """
    files = [p for d in transcript_dirs for p in d.glob("*.jsonl")]
    if since_epoch is not None:
        files = [p for p in files if p.stat().st_mtime >= since_epoch]
    return sorted(files, key=lambda p: p.stat().st_mtime, reverse=True)


def window_start_epoch(date_filter: str | None, since_date: str | None) -> float | None:
    """Local midnight of the first day in the window (None = no window)."""
    first = date_filter or since_date
    if not first:
        return None
    try:
        return datetime.strptime(first, "%Y-%m-%d").timestamp()
    except ValueError:
        return None


# ---------- user input backfill (shared with the hooks) ----------

def find_event_store() -> Path | None:
    """hooks/claude-event-store.js beside this module (source checkout or installed config dir)."""
    return next((parent / "hooks" / "claude-event-store.js"
                 for parent in Path(__file__).resolve().parents
                 if (parent / "hooks" / "claude-event-store.js").is_file()), None)


def backfill_user_inputs(
    project_root: Path,
    transcripts: list[Path],
    date_filter: str | None,
    since_date: str | None,
    dry_run: bool,
    stats: ReconcileStats,
) -> None:
    """
    사람 입력 복구는 훅과 같은 Node 판별기에 맡긴다. 입력 판별·표식을 두 언어로 따로 두면
    한쪽만 바뀌어 같은 입력이 두 번 저장되거나 빠진다.
    """
    store = find_event_store()
    if store is None:
        stats.user_error = "claude-event-store.js not found"
        return
    payload = {
        "transcripts": [str(p) for p in transcripts],
        "date": date_filter,
        "since": since_date,
        "dryRun": dry_run,
    }
    try:
        result = subprocess.run(
            ["node", str(store), str(project_root), "backfill"],
            input=json.dumps(payload), capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=120,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        stats.user_error = f"node backfill could not run ({type(error).__name__})"
        return
    lines = [line for line in (result.stdout or "").splitlines() if line.strip()]
    try:
        data = json.loads(lines[-1]) if lines else {}
    except json.JSONDecodeError:
        data = {}
    if not isinstance(data, dict) or "found" not in data:
        detail = (result.stderr or "").strip().splitlines()
        stats.user_error = "node backfill failed" + (f" ({detail[-1]})" if detail else "")
        return
    stats.user_inputs = int(data.get("found") or 0)
    stats.user_written = int(data.get("missing" if dry_run else "saved") or 0)
    if data.get("error"):
        stats.user_error = f"pending user records: {data['error']}"


# ---------- JSONL parsing ----------

def starts_new_turn(obj: dict) -> bool:
    """
    사람·작업 알림의 새 프롬프트 줄이면 True. 도구 결과·메타·압축 요약 줄은 같은 턴 안이다.
    promptSource가 없는 옛 원본에서도 문자열 내용의 user 줄은 새 프롬프트로 본다.
    """
    if obj.get("type") != "user" or obj.get("isSidechain") or obj.get("isMeta") or obj.get("isCompactSummary"):
        return False
    if obj.get("promptSource"):
        return True
    content = (obj.get("message") or {}).get("content")
    if isinstance(content, list):
        return not any(isinstance(b, dict) and b.get("type") == "tool_result" for b in content)
    return isinstance(content, str)


def parse_assistant_turns(
    jsonl_path: Path,
    date_filter: str | None,
    since_date: str | None = None,
) -> list[AssistantTurn]:
    """
    Parse a single JSONL transcript and return the final answer of each turn:
    the last assistant line with a non-empty text block before the turn ends.

    Stop 훅이 저장하는 것도 턴의 마지막 답 하나다. 도구 호출 사이의 중간 진행 문장까지
    복구하면 대화 파일 끝에 순서가 섞인 채 쌓이므로 최종 답만 고른다.
    턴의 끝: stop_hook_summary 줄, 다음 프롬프트 줄. 파일 끝의 열린 턴은 파일이
    OPEN_TURN_GRACE_SECONDS 넘게 바뀌지 않았을 때만 끝난 것으로 본다(진행 중인 세션이나
    대화 압축 때의 SessionStart가 중간 문장을 최종 답으로 저장하지 않게).

    Filtering rules (mutually exclusive), applied after the final answer is chosen:
      - date_filter: only turns whose local date == this exact date
      - since_date:  only turns whose local date >= this date (inclusive window)
      - both None:   no filter (all turns)
    """
    finals: list[AssistantTurn] = []
    pending: AssistantTurn | None = None

    def close_turn() -> None:
        nonlocal pending
        if pending is not None:
            finals.append(pending)
        pending = None

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
                if obj.get("type") == "system" and obj.get("subtype") == "stop_hook_summary":
                    close_turn()
                    continue
                if starts_new_turn(obj):
                    close_turn()
                    continue
                if obj.get("type") != "assistant" or obj.get("isSidechain"):
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
                pending = AssistantTurn(
                    uuid=obj.get("uuid") or "",
                    message_id=(msg.get("id") or ""),
                    timestamp_utc=timestamp_utc,
                    local_date=local_date,
                    local_time=local_time,
                    text="\n".join(texts).strip(),
                )
        if pending is not None and time.time() - jsonl_path.stat().st_mtime >= OPEN_TURN_GRACE_SECONDS:
            close_turn()
    except OSError:
        pass
    return [
        turn for turn in finals
        if not (date_filter and turn.local_date != date_filter)
        and not (since_date and turn.local_date < since_date)
    ]


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
    project_root = detect_project_root(project_root, explicit=True)
    stats = ReconcileStats()
    conv_dir = project_root / "conversations"

    transcript_dirs = find_transcript_dirs(project_root)
    if not transcript_dirs:
        if verbose:
            print(f"[mnemo] no transcript dir for {project_root}", file=sys.stderr)
        return stats

    transcripts = list_transcript_files(transcript_dirs, window_start_epoch(date_filter, since_date))
    if not transcripts:
        if verbose:
            dirs = ", ".join(str(d) for d in transcript_dirs)
            print(f"[mnemo] no JSONL files in the window under {dirs}", file=sys.stderr)
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
    # 답 복구가 끝난 뒤에 돌려, 사용자 입력 복구가 실패해도 답 복구는 남는다.
    backfill_user_inputs(project_root, transcripts, date_filter, since_date, dry_run, stats)
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
    try:
        project_root = detect_project_root(start, explicit=args.project_root is not None)
    except ValueError as error:
        parser.error(str(error))

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
    if stats.user_error:
        # SessionStart 훅이 0이 아닌 종료 코드를 mnemo-errors.log에 남긴다. 조용히 넘기면 입력 유실이 다시 안 보인다.
        print(f"[mnemo] user input backfill: {stats.user_error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
