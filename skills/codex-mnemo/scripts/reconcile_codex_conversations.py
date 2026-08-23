#!/usr/bin/env python3
"""Conservatively reconcile completed Codex turns into Mnemo Markdown.

Only top-level, completed Codex turns are eligible.  The extractor uses the
rollout task lifecycle rather than treating every assistant message as a turn:

    task_started -> user_message(s) -> final_answer -> task_complete

Developer instructions, injected AGENTS/environment context, commentary,
reasoning, tools, aborted turns, and sub-agent/fork histories are excluded.
For reviewable historical repairs, ``--staging-dir`` writes a deterministic
tree and manifest without changing the live conversations directory.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable


if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass


INDEX_FILENAME = ".mnemo-index.json"
CONV_FILENAME_TEMPLATE = "{date}-codex.md"
MAX_JSONL_LINE_BYTES = 16 * 1024 * 1024
MAX_MESSAGE_CHARS = 2 * 1024 * 1024
MANIFEST_SCHEMA = 2
STRUCTURAL_HEADING_RE = re.compile(
    r"(?m)^## \[(?P<time>\d{2}:\d{2}:\d{2})\] (?P<role>User|Assistant)\s*$"
)
MARKER_RE = re.compile(
    r"(?m)^<!--\s*(?P<kind>turn|turnhash|aborted-turn):(?P<value>[A-Za-z0-9-]+)\s*-->\s*$"
)
PRIVATE_RE = re.compile(r"<private>.*?</private>", re.IGNORECASE | re.DOTALL)
ANSI_RE = re.compile(
    r"(?:\x1b\][^\x07]*(?:\x07|\x1b\\))|(?:\x1b\[[0-?]*[ -/]*[@-~])"
)
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
SECRET_RULES = (
    ("private-key", re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----.*?-----END [A-Z0-9 ]*PRIVATE KEY-----", re.DOTALL), "[REDACTED PRIVATE KEY]"),
    ("bearer-token", re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]{8,}"), "Bearer [REDACTED]"),
    ("provider-token", re.compile(r"\b(?:sk-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{16,}|gh[pousr]_[A-Za-z0-9]{16,}|AKIA[A-Z0-9]{16})\b"), "[REDACTED SECRET]"),
    ("named-secret", re.compile(r"(?i)\b(api[_-]?key|token|secret|password|authorization)([\"'\s:=]+)([A-Za-z0-9_./+=-]{8,})"), r"\1\2[REDACTED]"),
)
SECRET_REPLACEMENTS = tuple((pattern, replacement) for _, pattern, replacement in SECRET_RULES)
INJECTED_CONTEXT_RE = re.compile(
    r"(?im)^(?:# AGENTS\.md instructions for\b|<environment_context>|"
    r"<codex_internal_context\b|<skills_instructions>|<permissions instructions>|"
    r"Message Type:\s*(?:NEW_TASK|MESSAGE|FINAL_ANSWER)\b|"
    r"You are an agent in a team of agents collaborating to complete a task\.)"
)
USER_INJECTION_PREFIXES = (
    "# AGENTS.md instructions for",
    "<environment_context",
    "<codex_internal_context",
    "<skills_instructions",
    "<permissions instructions",
    "<turn_aborted",
    "You are an agent in a team of agents collaborating to complete a task.",
    "Message Type: NEW_TASK",
    "Message Type: MESSAGE",
    "Message Type: FINAL_ANSWER",
)


@dataclass(frozen=True)
class Message:
    timestamp_utc: str
    text: str
    message_id: str = ""


@dataclass
class CompletedTurn:
    session_id: str
    turn_id: str
    started_at: str
    completed_at: str
    user_messages: list[Message]
    assistant: Message
    source_sha256: str
    final_answer_count: int = 1

    @property
    def local_date(self) -> str:
        return utc_iso_to_local(self.completed_at)[0]

    @property
    def user_time(self) -> str:
        return utc_iso_to_local(self.user_messages[0].timestamp_utc)[1]

    @property
    def assistant_time(self) -> str:
        return utc_iso_to_local(self.assistant.timestamp_utc)[1]

    @property
    def input_sha256(self) -> str:
        material = "\n\x1e\n".join(m.text for m in self.user_messages)
        return sha256_text(material)

    @property
    def rendered_user_sha256(self) -> str:
        return sha256_text(render_user_body(self))

    @property
    def local_started_at(self) -> str:
        return utc_iso_to_datetime(self.user_messages[0].timestamp_utc).astimezone().isoformat(timespec="seconds")

    @property
    def output_sha256(self) -> str:
        return sha256_text(self.assistant.text)


@dataclass
class AbortedTurn:
    session_id: str
    turn_id: str
    started_at: str
    aborted_at: str
    user_messages: list[Message]

    @property
    def local_date(self) -> str:
        return utc_iso_to_local(self.user_messages[0].timestamp_utc)[0]

    @property
    def user_time(self) -> str:
        return utc_iso_to_local(self.user_messages[0].timestamp_utc)[1]

    @property
    def local_started_at(self) -> str:
        return utc_iso_to_datetime(self.user_messages[0].timestamp_utc).astimezone().isoformat(timespec="seconds")

    @property
    def input_sha256(self) -> str:
        return sha256_text("\n\x1e\n".join(sanitize_text(message.text) for message in self.user_messages))


@dataclass
class SessionMeta:
    thread_id: str
    session_id: str
    cwd: str
    parent_thread_id: str
    agent_path: str
    thread_source: str
    source: Any
    timestamp: str

    @property
    def is_subagent(self) -> bool:
        return bool(
            self.agent_path
            or self.parent_thread_id
            or self.thread_source == "subagent"
            or isinstance(self.source, dict)
        )


@dataclass
class ConversationRecord:
    raw: str
    marker_kind: str
    marker_value: str
    sort_time: str
    user_bodies: list[str] = field(default_factory=list)
    assistant_bodies: list[str] = field(default_factory=list)
    ordinal: int = 0


@dataclass
class ScanResult:
    root_turns: list[CompletedTurn] = field(default_factory=list)
    subagent_turn_ids: set[str] = field(default_factory=set)
    counts: Counter[str] = field(default_factory=Counter)
    session_ids: set[str] = field(default_factory=set)
    subagent_session_ids: set[str] = field(default_factory=set)
    unresolved: list[dict[str, str]] = field(default_factory=list)
    aborted_root_turns: list[AbortedTurn] = field(default_factory=list)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return sha256_bytes(text.encode("utf-8", errors="replace"))


def normalize_path(value: str | Path) -> str:
    try:
        return str(Path(value).resolve(strict=False)).rstrip("\\/").casefold()
    except (OSError, ValueError, TypeError):
        return str(value).rstrip("\\/").casefold()


def nearest_existing_directory(start: Path) -> Path | None:
    candidate = start.resolve(strict=False)
    if candidate.is_file():
        candidate = candidate.parent
    while not candidate.exists():
        parent = candidate.parent
        if parent == candidate:
            return None
        candidate = parent
    return candidate if candidate.is_dir() else candidate.parent


def find_mnemo_marker_root(start: Path) -> Path | None:
    current = nearest_existing_directory(start)
    while current is not None:
        if (current / ".mnemo-root").is_file():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    return None


def detect_project_root(start: Path) -> Path:
    """Resolve a canonical Mnemo root before considering a nested Git root."""
    requested = start.resolve(strict=False)
    marker_root = find_mnemo_marker_root(requested)
    if marker_root is not None:
        return marker_root

    existing = nearest_existing_directory(requested)
    if existing is None:
        return requested
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=existing,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            git_root = Path(result.stdout.strip()).resolve(strict=False)
            marker_root = find_mnemo_marker_root(git_root)
            return marker_root or git_root
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        pass
    return requested


def codex_sessions_root() -> Path:
    configured = os.environ.get("CODEX_HOME")
    home = Path(configured).resolve() if configured else Path.home() / ".codex"
    return home / "sessions"


def utc_iso_to_datetime(timestamp: str) -> datetime:
    value = timestamp.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def utc_iso_to_local(timestamp: str) -> tuple[str, str]:
    try:
        local = utc_iso_to_datetime(timestamp).astimezone()
        return local.strftime("%Y-%m-%d"), local.strftime("%H:%M:%S")
    except (TypeError, ValueError):
        return "1970-01-01", "00:00:00"


def parse_cutoff(value: str | None) -> tuple[datetime | None, float | None]:
    if not value:
        return None, None
    parsed = utc_iso_to_datetime(value)
    return parsed, parsed.timestamp()


def extract_text(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = [extract_text(item) for item in content]
        return "\n".join(part for part in parts if part)
    if isinstance(content, dict):
        if isinstance(content.get("text"), (str, list, dict)):
            return extract_text(content["text"])
        if isinstance(content.get("content"), (str, list, dict)):
            return extract_text(content["content"])
    return ""


def sanitize_text(text: str) -> str:
    """Apply the hook's private contract plus terminal/secret hardening."""
    value = unicodedata.normalize("NFC", str(text))
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = ANSI_RE.sub("", value)
    value = CONTROL_RE.sub("", value)
    value = PRIVATE_RE.sub("[PRIVATE]", value)
    for pattern, replacement in SECRET_REPLACEMENTS:
        value = pattern.sub(replacement, value)
    value = value.replace("<!--", "&lt;!--")
    safe_lines: list[str] = []
    for line in value.split("\n"):
        if STRUCTURAL_HEADING_RE.fullmatch(line):
            line = "\\" + line
        safe_lines.append(line.rstrip())
    return "\n".join(safe_lines).strip()


def is_injected_user_text(text: str) -> bool:
    stripped = text.lstrip()
    return any(stripped.startswith(prefix) for prefix in USER_INJECTION_PREFIXES)


def iter_json_objects(path: Path, counts: Counter[str]) -> Iterable[dict[str, Any]]:
    try:
        with path.open("rb") as stream:
            for raw in stream:
                counts["jsonl_lines"] += 1
                if len(raw) > MAX_JSONL_LINE_BYTES:
                    counts["excluded_oversize_jsonl_lines"] += 1
                    continue
                try:
                    text = raw.decode("utf-8", errors="strict").strip()
                    if not text:
                        continue
                    obj = json.loads(text)
                except (UnicodeDecodeError, json.JSONDecodeError):
                    counts["excluded_malformed_jsonl_lines"] += 1
                    continue
                if isinstance(obj, dict):
                    yield obj
                else:
                    counts["excluded_nonobject_jsonl_lines"] += 1
    except OSError:
        counts["excluded_unreadable_rollouts"] += 1


def read_session_meta(path: Path, counts: Counter[str]) -> SessionMeta | None:
    for obj in iter_json_objects(path, counts):
        if obj.get("type") != "session_meta":
            continue
        payload = obj.get("payload") or {}
        if not isinstance(payload, dict):
            return None
        source = payload.get("source")
        thread_id = str(payload.get("id") or "")
        session_id = str(payload.get("session_id") or thread_id)
        return SessionMeta(
            thread_id=thread_id,
            session_id=session_id,
            cwd=str(payload.get("cwd") or ""),
            parent_thread_id=str(payload.get("parent_thread_id") or payload.get("forked_from_id") or ""),
            agent_path=str(payload.get("agent_path") or ""),
            thread_source=str(payload.get("thread_source") or ""),
            source=source,
            timestamp=str(payload.get("timestamp") or obj.get("timestamp") or ""),
        )
    return None


def event_message_text(payload: dict[str, Any]) -> str:
    value = payload.get("message")
    if isinstance(value, str):
        return value
    return extract_text(value)


def turn_is_owned_by_subagent(turn_id: str, meta: SessionMeta) -> bool:
    """UUIDv7 identifiers sort chronologically; inherited fork history is older."""
    return bool(turn_id and meta.thread_id and turn_id >= meta.thread_id)


def extract_completed_turns(
    path: Path,
    meta: SessionMeta,
    cutoff: datetime | None,
    result: ScanResult,
) -> list[CompletedTurn]:
    active: dict[str, Any] | None = None
    completed: list[CompletedTurn] = []
    source_sha256 = sha256_bytes(path.read_bytes()) if not meta.is_subagent else ""

    def finish(reason: str, payload: dict[str, Any], timestamp: str) -> None:
        nonlocal active
        if active is None:
            result.counts[f"excluded_orphan_{reason}"] += 1
            return
        event_turn_id = str(payload.get("turn_id") or "")
        if event_turn_id and active["turn_id"] and event_turn_id != active["turn_id"]:
            result.counts[f"excluded_mismatched_{reason}"] += 1
            return
        if reason == "aborted":
            result.counts["excluded_aborted_turns"] += 1
            if not meta.is_subagent:
                safe_users = [message for message in active["event_users"] if message.text]
                if active["turn_id"] and safe_users:
                    result.aborted_root_turns.append(
                        AbortedTurn(
                            session_id=meta.thread_id,
                            turn_id=active["turn_id"],
                            started_at=active["started_at"],
                            aborted_at=timestamp,
                            user_messages=safe_users,
                        )
                    )
                else:
                    result.counts["excluded_aborted_without_safe_user"] += 1
            active = None
            return

        # Fork rollouts contain inherited parent history followed by the
        # child-owned task.  They are never import candidates: collect only
        # exact owned turn IDs for leakage cleanup, before requiring a normal
        # user/final pair (the child prompt is intentionally classified as an
        # injected NEW_TASK envelope).
        if meta.is_subagent:
            if turn_is_owned_by_subagent(active["turn_id"], meta):
                result.subagent_turn_ids.add(active["turn_id"])
                result.counts["excluded_subagent_completed_turns"] += 1
            else:
                result.counts["excluded_inherited_fork_turns"] += 1
            active = None
            return

        user_messages: list[Message] = active["event_users"]
        if not user_messages:
            user_messages = active["fallback_users"]
            if user_messages:
                result.counts["fallback_user_turns"] += 1
        user_messages = [message for message in user_messages if message.text]
        answer = sanitize_text(str(payload.get("last_agent_message") or ""))
        final_messages: list[Message] = active["finals"]
        if answer and final_messages and answer != final_messages[-1].text:
            result.counts["excluded_answer_mismatch_turns"] += 1
            result.unresolved.append({"turn_id": active["turn_id"], "reason": "task-complete-final-answer-mismatch"})
            active = None
            return
        if not answer and final_messages:
            answer = final_messages[-1].text
        answer_timestamp = final_messages[-1].timestamp_utc if final_messages else timestamp
        if not active["turn_id"] or not user_messages or not answer:
            result.counts["excluded_incomplete_completed_turns"] += 1
            result.unresolved.append({"turn_id": active["turn_id"], "reason": "missing-turn-id-user-or-answer"})
            active = None
            return
        if any(len(message.text) > MAX_MESSAGE_CHARS for message in user_messages) or len(answer) > MAX_MESSAGE_CHARS:
            result.counts["excluded_oversize_messages"] += 1
            result.unresolved.append({"turn_id": active["turn_id"], "reason": "oversize-message"})
            active = None
            return

        turn = CompletedTurn(
            session_id=meta.thread_id,
            turn_id=active["turn_id"],
            started_at=active["started_at"],
            completed_at=timestamp,
            user_messages=user_messages,
            assistant=Message(answer_timestamp, answer, final_messages[-1].message_id if final_messages else ""),
            source_sha256=source_sha256,
            final_answer_count=len(final_messages),
        )
        completed.append(turn)
        active = None

    for obj in iter_json_objects(path, result.counts):
        timestamp = str(obj.get("timestamp") or "")
        if cutoff and timestamp:
            try:
                if utc_iso_to_datetime(timestamp) > cutoff:
                    result.counts["excluded_events_after_cutoff"] += 1
                    continue
            except ValueError:
                result.counts["excluded_bad_timestamps"] += 1
                continue
        obj_type = obj.get("type")
        payload = obj.get("payload") or {}
        if not isinstance(payload, dict):
            continue
        if obj_type == "event_msg" and payload.get("type") == "task_started":
            if active is not None:
                result.counts["excluded_superseded_incomplete_turns"] += 1
            active = {
                "turn_id": str(payload.get("turn_id") or ""),
                "started_at": timestamp,
                "event_users": [],
                "fallback_users": [],
                "finals": [],
            }
            result.counts["task_started"] += 1
            continue
        if active is None:
            continue
        if obj_type == "event_msg" and payload.get("type") == "user_message":
            raw = event_message_text(payload)
            if is_injected_user_text(raw):
                result.counts["excluded_injected_user_messages"] += 1
                continue
            safe = sanitize_text(raw)
            if safe:
                active["event_users"].append(Message(timestamp, safe, str(payload.get("id") or "")))
                result.counts["actual_user_messages"] += 1
            continue
        if obj_type == "response_item" and payload.get("type") == "message":
            role = payload.get("role")
            phase = payload.get("phase")
            raw = extract_text(payload.get("content"))
            if role == "user":
                if is_injected_user_text(raw):
                    result.counts["excluded_injected_response_users"] += 1
                else:
                    safe = sanitize_text(raw)
                    if safe:
                        active["fallback_users"].append(Message(timestamp, safe, str(payload.get("id") or "")))
                continue
            if role == "assistant" and phase == "final_answer":
                safe = sanitize_text(raw)
                if safe:
                    active["finals"].append(Message(timestamp, safe, str(payload.get("id") or "")))
                continue
            if role == "assistant":
                result.counts["excluded_assistant_commentary"] += 1
            elif role == "developer":
                result.counts["excluded_developer_messages"] += 1
            continue
        if obj_type == "event_msg" and payload.get("type") == "task_complete":
            finish("complete", payload, timestamp)
            continue
        if obj_type == "event_msg" and payload.get("type") == "turn_aborted":
            finish("aborted", payload, timestamp)
            continue
        if obj_type == "response_item":
            result.counts["excluded_tool_reasoning_items"] += 1
    if active is not None:
        result.counts["excluded_open_turns"] += 1
    return completed


def list_rollout_files(root: Path, days: int | None = None) -> list[Path]:
    if not root.exists():
        return []
    files = list(root.rglob("rollout-*.jsonl"))
    files.sort(key=lambda item: (item.stat().st_mtime_ns, str(item)), reverse=True)
    if days:
        cutoff = datetime.now().timestamp() - days * 86400
        files = [item for item in files if item.stat().st_mtime <= cutoff + days * 86400]
        files = [item for item in files if item.stat().st_mtime >= cutoff]
    return files


def scan_rollouts(
    project_root: Path,
    *,
    aliases: Iterable[Path] = (),
    date_filter: str | None = None,
    since_date: str | None = None,
    cutoff: datetime | None = None,
    cutoff_epoch: float | None = None,
    excluded_threads: set[str] | None = None,
    days_lookback: int | None = None,
) -> ScanResult:
    result = ScanResult()
    excluded_threads = excluded_threads or set()
    accepted_roots = {normalize_path(detect_project_root(project_root))}
    accepted_raw = {normalize_path(project_root)}
    for alias in aliases:
        accepted_raw.add(normalize_path(alias))
        accepted_roots.add(normalize_path(detect_project_root(alias)))

    def is_within_any(value: str, roots: set[str]) -> bool:
        return any(value == root or value.startswith(root + os.sep.casefold()) for root in roots if root)

    rollouts = list_rollout_files(codex_sessions_root(), days_lookback)
    result.counts["scanned_rollout_files"] = len(rollouts)
    seen_turn_ids: set[str] = set()
    for path in rollouts:
        stat = path.stat()
        meta = read_session_meta(path, result.counts)
        if meta is None:
            result.counts["excluded_rollouts_without_session_meta"] += 1
            continue
        raw_cwd = normalize_path(meta.cwd)
        # Every accepted canonical/legacy root admits its descendants.  Avoid a
        # Git subprocess for thousands of unrelated historical rollouts.
        if not is_within_any(raw_cwd, accepted_raw | accepted_roots):
            result.counts["excluded_other_project_rollouts"] += 1
            continue

        # An explicitly excluded root rollout must never contribute a turn.
        # Its descendant rollouts are still scanned structurally so exact
        # child-owned turn markers already leaked by notify can be removed.
        is_excluded_lineage = meta.thread_id in excluded_threads or meta.session_id in excluded_threads
        if is_excluded_lineage and not meta.is_subagent:
            result.counts["excluded_explicit_thread_rollouts"] += 1
            continue
        if cutoff_epoch is not None and stat.st_mtime > cutoff_epoch and not meta.is_subagent:
            result.counts["excluded_rollouts_modified_after_cutoff"] += 1
            continue
        if meta.is_subagent:
            result.subagent_session_ids.add(meta.thread_id)
            result.counts["subagent_rollouts"] += 1
            if is_excluded_lineage:
                result.counts["excluded_lineage_subagent_rollouts_scanned_for_ids"] += 1
        else:
            result.session_ids.add(meta.thread_id)
            result.counts["root_rollouts"] += 1
        # Subagents never contribute content; scan their full lifecycle solely
        # to recover exact owned IDs for structural leakage cleanup.
        lineage_cutoff = None if meta.is_subagent else cutoff
        turns = extract_completed_turns(path, meta, lineage_cutoff, result)
        for turn in turns:
            if date_filter and turn.local_date != date_filter:
                result.counts["excluded_date_filtered_turns"] += 1
                continue
            if since_date and turn.local_date < since_date:
                result.counts["excluded_date_filtered_turns"] += 1
                continue
            if turn.turn_id in seen_turn_ids:
                result.counts["excluded_duplicate_root_turns"] += 1
                continue
            seen_turn_ids.add(turn.turn_id)
            result.root_turns.append(turn)
    result.root_turns.sort(key=lambda turn: (turn.completed_at, turn.turn_id))
    result.counts["eligible_completed_root_turns"] = len(result.root_turns)
    return result


def conversation_header(date: str, project_name: str) -> str:
    return (
        "---\n"
        f"date: {date}\n"
        f"project: {project_name}\n"
        "keywords: []\n"
        'summary: ""\n'
        "---\n\n"
        f"# {date}\n\n"
    )


def split_heading_bodies(raw: str, role: str) -> list[str]:
    matches = list(STRUCTURAL_HEADING_RE.finditer(raw))
    bodies: list[str] = []
    for index, match in enumerate(matches):
        if match.group("role") != role:
            continue
        end = matches[index + 1].start() if index + 1 < len(matches) else len(raw)
        body = raw[match.end():end]
        body = MARKER_RE.sub("", body).strip()
        bodies.append(body)
    return bodies


def parse_conversation(text: str, date_hint: str = "1970-01-01") -> tuple[str, list[ConversationRecord], str]:
    first_heading = STRUCTURAL_HEADING_RE.search(text)
    if first_heading is None:
        return text, [], ""
    prefix = text[:first_heading.start()]
    markers = [marker for marker in MARKER_RE.finditer(text) if marker.start() >= first_heading.start()]
    records: list[ConversationRecord] = []
    cursor = first_heading.start()
    for ordinal, marker in enumerate(markers):
        raw = text[cursor:marker.end()].strip()
        headings = list(STRUCTURAL_HEADING_RE.finditer(raw))
        sort_time = f"{date_hint}T{headings[0].group('time')}" if headings else f"{date_hint}T99:99:99"
        records.append(
            ConversationRecord(
                raw=raw,
                marker_kind=marker.group("kind"),
                marker_value=marker.group("value"),
                sort_time=sort_time,
                user_bodies=split_heading_bodies(raw, "User"),
                assistant_bodies=split_heading_bodies(raw, "Assistant"),
                ordinal=ordinal,
            )
        )
        cursor = marker.end()
        while cursor < len(text) and text[cursor] in "\r\n":
            cursor += 1
    trailing = text[cursor:].strip()
    return prefix.rstrip() + "\n\n", records, trailing


def render_user_body(turn: CompletedTurn) -> str:
    chunks = [turn.user_messages[0].text]
    for followup in turn.user_messages[1:]:
        _, local_time = utc_iso_to_local(followup.timestamp_utc)
        chunks.append(f"> Follow-up at {local_time}\n\n{followup.text}")
    return "\n\n".join(chunks)


def render_aborted_user_body(turn: AbortedTurn) -> str:
    chunks = [sanitize_text(turn.user_messages[0].text)]
    for followup in turn.user_messages[1:]:
        _, local_time = utc_iso_to_local(followup.timestamp_utc)
        chunks.append(f"> Follow-up at {local_time}\n\n{sanitize_text(followup.text)}")
    return "\n\n".join(chunks)


def render_turn(turn: CompletedTurn) -> str:
    user_body = render_user_body(turn)
    return (
        f"## [{turn.user_time}] User\n\n{user_body}\n\n"
        f"## [{turn.assistant_time}] Assistant\n\n{turn.assistant.text}\n"
        f"<!-- turn:{turn.turn_id} -->"
    )


def render_aborted_turn(turn: AbortedTurn) -> str:
    return (
        f"## [{turn.user_time}] User\n\n{render_aborted_user_body(turn)}\n"
        f"<!-- aborted-turn:{turn.turn_id} -->"
    )


def exact_pair_candidates(records: list[ConversationRecord], turn: CompletedTurn) -> list[int]:
    answer_hash = turn.output_sha256
    user_hashes = {sha256_text(message.text) for message in turn.user_messages}
    candidates: list[int] = []
    for index, record in enumerate(records):
        answer_match = any(sha256_text(sanitize_text(body)) == answer_hash for body in record.assistant_bodies)
        user_match = any(sha256_text(sanitize_text(body)) in user_hashes for body in record.user_bodies)
        if answer_match and user_match:
            candidates.append(index)
    return candidates


def compose_conversation(prefix: str, records: list[ConversationRecord], trailing: str) -> str:
    ordered = sorted(records, key=lambda record: (record.sort_time, record.ordinal))
    body = "\n\n".join(record.raw.strip() for record in ordered if record.raw.strip())
    output = prefix.rstrip() + "\n\n"
    if body:
        output += body + "\n"
    if trailing:
        output += "\n" + trailing.strip() + "\n"
    return output


def load_index(conv_dir: Path) -> dict[str, Any]:
    path = conv_dir / INDEX_FILENAME
    if not path.exists():
        return {"version": 1, "claude": {}, "codex": {}, "codex_aborted": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"version": 1, "claude": {}, "codex": {}, "codex_aborted": {}}
    if not isinstance(data, dict):
        data = {}
    data["version"] = 1
    if not isinstance(data.get("claude"), dict):
        data["claude"] = {}
    if not isinstance(data.get("codex"), dict):
        data["codex"] = {}
    if not isinstance(data.get("codex_aborted"), dict):
        data["codex_aborted"] = {}
    return data


def save_index(conv_dir: Path, index: dict[str, Any]) -> None:
    conv_dir.mkdir(parents=True, exist_ok=True)
    (conv_dir / INDEX_FILENAME).write_text(
        json.dumps(index, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def copy_stage_base(base_dir: Path, stage_dir: Path) -> None:
    stage_dir.mkdir(parents=True, exist_ok=True)
    for old in stage_dir.glob("*-codex.md"):
        old.unlink()
    index_path = stage_dir / INDEX_FILENAME
    if index_path.exists():
        index_path.unlink()
    manifest_path = stage_dir / "manifest.json"
    if manifest_path.exists():
        manifest_path.unlink()
    for source in sorted(base_dir.glob("*-codex.md")):
        shutil.copy2(source, stage_dir / source.name)
    if (base_dir / INDEX_FILENAME).exists():
        shutil.copy2(base_dir / INDEX_FILENAME, index_path)


def scan_security(stage_dir: Path) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    files = sorted(stage_dir.glob("*-codex.md"))

    def add_finding(path: Path, text: str, match: re.Match[str], pattern_class: str, risk: str) -> None:
        line_number = text.count("\n", 0, match.start()) + 1
        line_start = text.rfind("\n", 0, match.start()) + 1
        line_end = text.find("\n", match.end())
        if line_end < 0:
            line_end = len(text)
        line = text[line_start:line_end]
        findings.append(
            {
                "file": path.name,
                "line": line_number,
                "pattern_class": pattern_class,
                "risk": risk,
                "line_sha256": sha256_text(line),
                "match_sha256": sha256_text(match.group(0)),
            }
        )

    placeholder_markers = (
        "re.compile", "secret_pattern", "secret_replacement", "placeholder",
        "example", "dummy", "fake", "[redacted", "sk-1234", "예시",
    )
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        for pattern_class, pattern, _ in SECRET_RULES:
            for match in pattern.finditer(text):
                line_start = text.rfind("\n", 0, match.start()) + 1
                line_end = text.find("\n", match.end())
                if line_end < 0:
                    line_end = len(text)
                line_lower = text[line_start:line_end].casefold()
                natural_language_false_positive = (
                    pattern_class == "named-secret"
                    and (match.group(2) or "").isspace()
                    and (match.group(3) or "").isalpha()
                )
                risk = "legacy-documentation-placeholder" if natural_language_false_positive or any(marker in line_lower for marker in placeholder_markers) else "possible-credential"
                add_finding(path, text, match, pattern_class, risk)
        for match in INJECTED_CONTEXT_RE.finditer(text):
            add_finding(path, text, match, "raw-injected-context", "legacy-context")
        for pattern_class, pattern in (("terminal-control", CONTROL_RE), ("terminal-ansi", ANSI_RE)):
            for match in pattern.finditer(text):
                add_finding(path, text, match, pattern_class, "unsafe-control")

    secret_hits = sum(1 for item in findings if item["pattern_class"] in {rule[0] for rule in SECRET_RULES})
    context_hits = sum(1 for item in findings if item["pattern_class"] == "raw-injected-context")
    control_hits = sum(1 for item in findings if item["pattern_class"].startswith("terminal-"))
    possible_credentials = sum(1 for item in findings if item["risk"] == "possible-credential")
    return {
        "files_scanned": len(files),
        "known_secret_pattern_hits": secret_hits,
        "raw_injected_context_marker_hits": context_hits,
        "terminal_control_hits": control_hits,
        "possible_credential_hits": possible_credentials,
        "findings": sorted(findings, key=lambda item: (item["file"], item["line"], item["pattern_class"], item["line_sha256"])),
    }


def compare_security(base_dir: Path, stage_dir: Path) -> dict[str, Any]:
    baseline = scan_security(base_dir)
    staged = scan_security(stage_dir)
    baseline_signatures = Counter(
        (item["pattern_class"], item["match_sha256"]) for item in baseline["findings"]
    )
    introduced: list[dict[str, Any]] = []
    for item in staged["findings"]:
        signature = (item["pattern_class"], item["match_sha256"])
        if baseline_signatures[signature]:
            baseline_signatures[signature] -= 1
        else:
            introduced.append(item)
    delta = {
        "known_secret_pattern_hits": sum(1 for item in introduced if item["pattern_class"] in {rule[0] for rule in SECRET_RULES}),
        "raw_injected_context_marker_hits": sum(1 for item in introduced if item["pattern_class"] == "raw-injected-context"),
        "terminal_control_hits": sum(1 for item in introduced if item["pattern_class"].startswith("terminal-")),
        "findings": introduced,
    }
    passed = (
        not introduced
        and staged["terminal_control_hits"] == 0
    )
    return {"baseline": baseline, "staged": staged, "introduced_delta": delta, "passed": passed}


def reconcile_to_directory(
    result: ScanResult,
    output_dir: Path,
    project_name: str,
    *,
    explicit_remove_turn_ids: set[str] | None = None,
) -> dict[str, Any]:
    explicit_remove_turn_ids = explicit_remove_turn_ids or set()
    # 신규 프로젝트의 첫 reconcile은 conversations/가 없는 상태에서 시작한다.
    output_dir.mkdir(parents=True, exist_ok=True)
    proven_subagent_ids = set(result.subagent_turn_ids) | explicit_remove_turn_ids
    file_state: dict[str, tuple[str, list[ConversationRecord], str]] = {}
    all_dates = {turn.local_date for turn in result.root_turns}
    all_dates.update(turn.local_date for turn in result.aborted_root_turns)
    all_dates.update(path.name[:10] for path in output_dir.glob("*-codex.md"))
    for date in sorted(all_dates):
        path = output_dir / CONV_FILENAME_TEMPLATE.format(date=date)
        text = path.read_text(encoding="utf-8", errors="replace") if path.exists() else conversation_header(date, project_name)
        file_state[date] = parse_conversation(text, date)

    existing_user_hashes: set[str] = set()
    for _, records, _ in file_state.values():
        for record in records:
            existing_user_hashes.update(sha256_text(sanitize_text(body)) for body in record.user_bodies)
    aborted_existing_match_counts = {
        turn.turn_id: sum(sha256_text(sanitize_text(message.text)) in existing_user_hashes for message in turn.user_messages)
        for turn in result.aborted_root_turns
    }

    disposition = Counter()
    removed: list[dict[str, str]] = []
    eligible_manifest: list[dict[str, Any]] = []

    for date, (prefix, records, trailing) in list(file_state.items()):
        kept: list[ConversationRecord] = []
        for record in records:
            if record.marker_kind == "turn" and record.marker_value in proven_subagent_ids:
                removed.append({"turn_id": record.marker_value, "date": date, "reason": "proven-subagent-lineage"})
                disposition["removed_proven_subagent_records"] += 1
                continue
            kept.append(record)
        file_state[date] = (prefix, kept, trailing)

    # Old reconcile versions could append an assistant-only turnhash record.
    # Remove it only when its sole assistant body has exactly one eligible
    # root-turn output match; otherwise preserve it as an explicit orphan.
    outputs: dict[str, list[CompletedTurn]] = {}
    for turn in result.root_turns:
        outputs.setdefault(turn.output_sha256, []).append(turn)
    assistant_only_records: list[tuple[str, ConversationRecord, str]] = []
    for date, (_, records, _) in file_state.items():
        for record in records:
            if record.marker_kind == "turnhash" and not record.user_bodies and len(record.assistant_bodies) == 1:
                assistant_only_records.append((date, record, sha256_text(sanitize_text(record.assistant_bodies[0]))))
    assistant_only_output_counts = Counter(value for _, _, value in assistant_only_records)
    legacy_assistant_duplicates: list[dict[str, str]] = []
    legacy_turnhash_orphans: list[dict[str, str]] = []
    for date, (prefix, records, trailing) in list(file_state.items()):
        kept = []
        for record in records:
            if record.marker_kind != "turnhash" or record.user_bodies or len(record.assistant_bodies) != 1:
                kept.append(record)
                continue
            output_hash = sha256_text(sanitize_text(record.assistant_bodies[0]))
            matches = outputs.get(output_hash, [])
            timestamp_delta: float | None = None
            if len(matches) == 1 and matches[0].local_date == date:
                try:
                    legacy_time = datetime.fromisoformat(record.sort_time)
                    answer_time = datetime.fromisoformat(f"{date}T{matches[0].assistant_time}")
                    timestamp_delta = abs((legacy_time - answer_time).total_seconds())
                except ValueError:
                    timestamp_delta = None
            exact_near_time_duplicate = (
                len(matches) == 1
                and assistant_only_output_counts[output_hash] == 1
                and timestamp_delta is not None
                and timestamp_delta <= 2.0
            )
            if exact_near_time_duplicate:
                legacy_assistant_duplicates.append(
                    {
                        "date": date,
                        "turnhash": record.marker_value,
                        "eligible_turn_id": matches[0].turn_id,
                        "output_sha256": output_hash,
                        "legacy_heading_local_time": record.sort_time,
                        "eligible_answer_local_time": f"{date}T{matches[0].assistant_time}",
                        "timestamp_delta_seconds": str(timestamp_delta),
                    }
                )
                disposition["removed_legacy_assistant_only_duplicate"] += 1
                continue
            legacy_turnhash_orphans.append(
                {
                    "date": date,
                    "turnhash": record.marker_value,
                    "assistant_sha256": output_hash,
                    "eligible_output_match_count": str(len(matches)),
                }
            )
            kept.append(record)
        file_state[date] = (prefix, kept, trailing)

    turn_by_id = {turn.turn_id: turn for turn in result.root_turns}
    aborted_by_id = {turn.turn_id: turn for turn in result.aborted_root_turns}
    for date, (prefix, records, trailing) in list(file_state.items()):
        for record in records:
            turn = turn_by_id.get(record.marker_value) if record.marker_kind == "turn" else None
            if turn is not None:
                record.sort_time = turn.local_started_at
            aborted = aborted_by_id.get(record.marker_value) if record.marker_kind == "aborted-turn" else None
            if aborted is not None:
                record.sort_time = aborted.local_started_at
        file_state[date] = (prefix, records, trailing)

    next_ordinal = 1_000_000
    for turn in result.root_turns:
        prefix, records, trailing = file_state[turn.local_date]
        marker_matches = [index for index, record in enumerate(records) if record.marker_kind == "turn" and record.marker_value == turn.turn_id]
        pair_matches = exact_pair_candidates(records, turn)
        if len(marker_matches) == 1:
            target_index = marker_matches[0]
            status = "existing-marker"
        elif len(marker_matches) > 1:
            disposition["ambiguous_duplicate_marker"] += 1
            result.unresolved.append({"turn_id": turn.turn_id, "reason": "duplicate-exact-marker"})
            status = "unresolved"
            target_index = -1
        elif len(pair_matches) == 1:
            target_index = pair_matches[0]
            status = "matched-exact-pair"
        elif len(pair_matches) > 1:
            disposition["ambiguous_exact_pair"] += 1
            result.unresolved.append({"turn_id": turn.turn_id, "reason": "multiple-exact-pair-matches"})
            status = "unresolved"
            target_index = -1
        else:
            status = "added-missing-turn"
            target_index = -1

        canonical = render_turn(turn)
        if status in ("existing-marker", "matched-exact-pair"):
            existing = records[target_index]
            if existing.raw.strip() == canonical.strip():
                disposition["already_canonical"] += 1
                status = "already-canonical"
            else:
                records[target_index] = ConversationRecord(
                    raw=canonical,
                    marker_kind="turn",
                    marker_value=turn.turn_id,
                    sort_time=turn.local_started_at,
                    user_bodies=[message.text for message in turn.user_messages],
                    assistant_bodies=[turn.assistant.text],
                    ordinal=existing.ordinal,
                )
                disposition["canonicalized_existing_turns"] += 1
                if len(turn.user_messages) > 1:
                    disposition["restored_followup_messages"] += len(turn.user_messages) - 1
                status = "canonicalized-existing"
        elif status == "added-missing-turn":
            records.append(
                ConversationRecord(
                    raw=canonical,
                    marker_kind="turn",
                    marker_value=turn.turn_id,
                    sort_time=turn.local_started_at,
                    user_bodies=[message.text for message in turn.user_messages],
                    assistant_bodies=[turn.assistant.text],
                    ordinal=next_ordinal,
                )
            )
            next_ordinal += 1
            disposition["added_missing_turns"] += 1

        file_state[turn.local_date] = (prefix, records, trailing)
        eligible_manifest.append(
            {
                "session_id": turn.session_id,
                "turn_id": turn.turn_id,
                "date": turn.local_date,
                "started_at": turn.started_at,
                "completed_at": turn.completed_at,
                "user_message_count": len(turn.user_messages),
                "input_sha256": turn.input_sha256,
                "input_hash_contract": "sha256(utf8(sanitized-user-messages joined by LF+RS+LF))",
                "rendered_user_sha256": turn.rendered_user_sha256,
                "render_contract": "first message then each follow-up as '> Follow-up at HH:MM:SS' separated by blank lines",
                "output_sha256": turn.output_sha256,
                "source_rollout_sha256": turn.source_sha256,
                "disposition": status,
            }
        )

    aborted_manifest: list[dict[str, Any]] = []
    for turn in sorted(result.aborted_root_turns, key=lambda item: (item.aborted_at, item.turn_id)):
        prefix, records, trailing = file_state[turn.local_date]
        marker_matches = [
            index
            for index, record in enumerate(records)
            if record.marker_kind == "aborted-turn" and record.marker_value == turn.turn_id
        ]
        canonical = render_aborted_turn(turn)
        if len(marker_matches) == 1:
            target_index = marker_matches[0]
            existing = records[target_index]
            if existing.raw.strip() == canonical.strip():
                disposition["existing_aborted_turns"] += 1
                status = "already-canonical"
            else:
                records[target_index] = ConversationRecord(
                    raw=canonical,
                    marker_kind="aborted-turn",
                    marker_value=turn.turn_id,
                    sort_time=turn.local_started_at,
                    user_bodies=[render_aborted_user_body(turn)],
                    assistant_bodies=[],
                    ordinal=existing.ordinal,
                )
                disposition["canonicalized_aborted_turns"] += 1
                status = "canonicalized-existing"
        elif len(marker_matches) > 1:
            result.unresolved.append({"turn_id": turn.turn_id, "reason": "duplicate-aborted-turn-marker"})
            disposition["ambiguous_aborted_turn_markers"] += 1
            status = "unresolved"
        else:
            records.append(
                ConversationRecord(
                    raw=canonical,
                    marker_kind="aborted-turn",
                    marker_value=turn.turn_id,
                    sort_time=turn.local_started_at,
                    user_bodies=[render_aborted_user_body(turn)],
                    assistant_bodies=[],
                    ordinal=next_ordinal,
                )
            )
            next_ordinal += 1
            disposition["added_aborted_user_turns"] += 1
            disposition["added_aborted_user_messages"] += len(turn.user_messages)
            status = "added-user-only"
        file_state[turn.local_date] = (prefix, records, trailing)
        aborted_manifest.append(
            {
                "session_id": turn.session_id,
                "turn_id": turn.turn_id,
                "date": turn.local_date,
                "started_at": turn.started_at,
                "aborted_at": turn.aborted_at,
                "user_message_count": len(turn.user_messages),
                "user_message_sha256": [sha256_text(sanitize_text(message.text)) for message in turn.user_messages],
                "input_sha256": turn.input_sha256,
                "rendered_user_sha256": sha256_text(render_aborted_user_body(turn)),
                "existing_markdown_user_match_count_before_reconcile": aborted_existing_match_counts[turn.turn_id],
                "disposition": status,
                "assistant_answer_present": False,
            }
        )

    eligible_order = {turn.turn_id: turn.local_started_at for turn in result.root_turns}
    deterministic_order = {**eligible_order, **{turn.turn_id: turn.local_started_at for turn in result.aborted_root_turns}}
    chronological_inversions: list[dict[str, Any]] = []
    chronological_records_checked = 0
    for date, (prefix, records, trailing) in file_state.items():
        path = output_dir / CONV_FILENAME_TEMPLATE.format(date=date)
        path.write_text(compose_conversation(prefix, records, trailing), encoding="utf-8", newline="\n")
        _, rendered_records, _ = parse_conversation(path.read_text(encoding="utf-8", errors="replace"), date)
        previous_id = ""
        previous_time = ""
        for record in rendered_records:
            current_time = deterministic_order.get(record.marker_value, record.sort_time)
            chronological_records_checked += 1
            if previous_time and current_time < previous_time:
                chronological_inversions.append(
                    {
                        "date": date,
                        "previous_turn_id": previous_id,
                        "current_turn_id": record.marker_value,
                        "previous_started_at": previous_time,
                        "current_started_at": current_time,
                    }
                )
            previous_id = record.marker_value
            previous_time = current_time

    index = load_index(output_dir)
    codex_index: dict[str, list[str]] = {}
    codex_aborted_index: dict[str, list[str]] = {}
    for path in sorted(output_dir.glob("*-codex.md")):
        date = path.name[:10]
        _, records, _ = parse_conversation(path.read_text(encoding="utf-8", errors="replace"), date)
        values = sorted({record.marker_value for record in records if record.marker_kind == "turn"})
        aborted_values = sorted({record.marker_value for record in records if record.marker_kind == "aborted-turn"})
        if values:
            codex_index[date] = values
        if aborted_values:
            codex_aborted_index[date] = aborted_values
    index["codex"] = codex_index
    index["codex_aborted"] = codex_aborted_index
    save_index(output_dir, index)

    return {
        "dispositions": dict(sorted(disposition.items())),
        "eligible_root_turns": eligible_manifest,
        "proven_subagent_records_removed": sorted(removed, key=lambda item: (item["date"], item["turn_id"])),
        "legacy_assistant_only_duplicates_removed": sorted(legacy_assistant_duplicates, key=lambda item: (item["date"], item["turnhash"])),
        "legacy_turnhash_orphans_preserved": sorted(legacy_turnhash_orphans, key=lambda item: (item["date"], item["turnhash"])),
        "excluded_aborted_root_turns": aborted_manifest,
        "proven_subagent_turn_ids": sorted(proven_subagent_ids),
        "chronological_validation": {
            "eligible_turns_checked": len(eligible_order),
            "aborted_user_turns_checked": len(result.aborted_root_turns),
            "deterministically_timestamped_records_checked": chronological_records_checked,
            "inversion_count": len(chronological_inversions),
            "inversions": chronological_inversions,
            "passed": not chronological_inversions,
        },
        "unresolved": sorted(result.unresolved, key=lambda item: (item.get("turn_id", ""), item.get("reason", ""))),
    }


def staged_file_hashes(stage_dir: Path) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for path in sorted(stage_dir.iterdir(), key=lambda item: item.name):
        if not path.is_file() or path.name == "manifest.json":
            continue
        data = path.read_bytes()
        entries.append({"name": path.name, "bytes": len(data), "sha256": sha256_bytes(data)})
    return entries


def write_manifest(
    stage_dir: Path,
    result: ScanResult,
    merge: dict[str, Any],
    *,
    project_root: Path,
    base_dir: Path,
    cutoff_value: str | None,
    excluded_threads: set[str],
) -> dict[str, Any]:
    security = compare_security(base_dir, stage_dir)
    context_marker_ids: set[str] = set()
    for path in sorted(base_dir.glob("*-codex.md")):
        _, records, _ = parse_conversation(path.read_text(encoding="utf-8", errors="replace"), path.name[:10])
        for record in records:
            if INJECTED_CONTEXT_RE.search(record.raw):
                context_marker_ids.add(record.marker_value)
    proven_subagent_ids = set(merge.get("proven_subagent_turn_ids", []))
    eligible_ids = {item["turn_id"] for item in merge.get("eligible_root_turns", [])}
    context_proven = sorted(context_marker_ids & proven_subagent_ids)
    context_residual = sorted(context_marker_ids - proven_subagent_ids)
    context_lineage = {
        "baseline_context_record_count": len(context_marker_ids),
        "baseline_context_turn_ids_sha256": sha256_text("\n".join(sorted(context_marker_ids))),
        "proven_subagent_intersection_count": len(context_proven),
        "proven_subagent_intersection_sha256": sha256_text("\n".join(context_proven)),
        "eligible_root_intersection_count": len(context_marker_ids & eligible_ids),
        "unproven_residual_count": len(context_residual),
        "unproven_residual_ids_sha256": sha256_text("\n".join(context_residual)),
        "disposition": "legacy-context-leak-removed-by-exact-lineage" if context_marker_ids and not context_residual else "legacy-context-leak-preserved",
    }
    manifest = {
        "schema_version": MANIFEST_SCHEMA,
        "mode": "review-only-staging",
        "snapshot_cutoff": cutoff_value,
        "project_root": str(project_root),
        "base_snapshot": str(base_dir),
        "excluded_thread_ids": sorted(excluded_threads),
        "counts": dict(sorted(result.counts.items())),
        "root_session_ids": sorted(result.session_ids),
        "subagent_session_ids": sorted(result.subagent_session_ids),
        **merge,
        "security_scan": security,
        "context_lineage_validation": context_lineage,
        "files": staged_file_hashes(stage_dir),
    }
    encoded = json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    (stage_dir / "manifest.json").write_text(encoded, encoding="utf-8", newline="\n")
    return manifest


def summary_line(result: ScanResult, merge: dict[str, Any] | None = None) -> str:
    dispositions = merge.get("dispositions", {}) if merge else {}
    return (
        f"scanned_files={result.counts['scanned_rollout_files']} "
        f"root_sessions={result.counts['root_rollouts']} "
        f"subagent_sessions={result.counts['subagent_rollouts']} "
        f"completed_root_turns={len(result.root_turns)} "
        f"actual_user_messages={result.counts['actual_user_messages']} "
        f"aborted={result.counts['excluded_aborted_turns']} "
        f"commentary_excluded={result.counts['excluded_assistant_commentary']} "
        f"tools_reasoning_excluded={result.counts['excluded_tool_reasoning_items']} "
        f"canonicalized={dispositions.get('canonicalized_existing_turns', 0)} "
        f"added={dispositions.get('added_missing_turns', 0)} "
        f"subagent_records_removed={dispositions.get('removed_proven_subagent_records', 0)} "
        f"unresolved={len(result.unresolved)}"
    )


def reconcile(
    project_root: Path,
    date_filter: str | None,
    since_date: str | None = None,
    dry_run: bool = False,
    verbose: bool = False,
    days_lookback: int = 30,
) -> ScanResult:
    """Compatibility entry point used by older wrappers and tests."""
    root = detect_project_root(project_root)
    result = scan_rollouts(
        root,
        date_filter=date_filter,
        since_date=since_date,
        days_lookback=None if date_filter is None and since_date is None else days_lookback,
    )
    if not dry_run:
        merge = reconcile_to_directory(result, root / "conversations", root.name)
        if verbose:
            print(summary_line(result, merge))
    elif verbose:
        print(summary_line(result))
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, default=None)
    parser.add_argument("--project-alias", action="append", type=Path, default=[])
    parser.add_argument("--date")
    parser.add_argument("--days", type=int)
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--cutoff", help="Inclusive ISO-8601 event and rollout-mtime cutoff")
    parser.add_argument("--exclude-thread", action="append", default=[])
    parser.add_argument("--remove-turn-id", action="append", default=[])
    parser.add_argument("--base-conversations", type=Path)
    parser.add_argument("--staging-dir", type=Path)
    args = parser.parse_args()

    requested = args.project_root.resolve(strict=False) if args.project_root else Path.cwd()
    project_root = detect_project_root(requested)
    cutoff, cutoff_epoch = parse_cutoff(args.cutoff)
    if args.all:
        since_date = None
    elif args.date:
        since_date = None
    else:
        days = args.days if args.days is not None else 7
        since_date = (datetime.now() - timedelta(days=days - 1)).strftime("%Y-%m-%d")
    days_lookback = None if args.all else (args.days if args.days is not None else 7)

    result = scan_rollouts(
        project_root,
        aliases=args.project_alias,
        date_filter=args.date,
        since_date=since_date,
        cutoff=cutoff,
        cutoff_epoch=cutoff_epoch,
        excluded_threads=set(args.exclude_thread),
        days_lookback=days_lookback,
    )

    merge: dict[str, Any] | None = None
    if args.staging_dir:
        stage_dir = args.staging_dir.resolve(strict=False)
        live_dir = (project_root / "conversations").resolve(strict=False)
        if normalize_path(stage_dir) == normalize_path(live_dir):
            parser.error("--staging-dir must not be the live conversations directory")
        base_dir = (args.base_conversations or live_dir).resolve(strict=False)
        if not base_dir.is_dir():
            parser.error(f"base conversations directory does not exist: {base_dir}")
        copy_stage_base(base_dir, stage_dir)
        merge = reconcile_to_directory(
            result,
            stage_dir,
            project_root.name,
            explicit_remove_turn_ids=set(args.remove_turn_id),
        )
        manifest = write_manifest(
            stage_dir,
            result,
            merge,
            project_root=project_root,
            base_dir=base_dir,
            cutoff_value=args.cutoff,
            excluded_threads=set(args.exclude_thread),
        )
        if not manifest["security_scan"]["passed"]:
            print("[mnemo-codex] staging security scan failed", file=sys.stderr)
            return 2
        if manifest["unresolved"] or not manifest["chronological_validation"]["passed"]:
            print("[mnemo-codex] staging structural validation failed", file=sys.stderr)
            return 3
    elif not args.dry_run:
        merge = reconcile_to_directory(result, project_root / "conversations", project_root.name)

    if not args.quiet:
        prefix = "[mnemo-codex staging]" if args.staging_dir else "[mnemo-codex dry-run]" if args.dry_run else "[mnemo-codex]"
        print(f"{prefix} {summary_line(result, merge)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
