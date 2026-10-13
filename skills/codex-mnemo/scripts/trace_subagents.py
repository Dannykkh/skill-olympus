#!/usr/bin/env python3
"""Read a PM's Codex subagent lineage and paged work records without writing files."""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import Counter
from pathlib import Path
from typing import Any, Iterator

import reconcile_codex_conversations as rollout


def safe_text(value: Any) -> str:
    text = rollout.sanitize_text(rollout.extract_text(value))
    return re.sub(r"<private>.*\Z", "[PRIVATE]", text, flags=re.IGNORECASE | re.DOTALL)


def parent_id(meta: rollout.SessionMeta) -> str:
    source = meta.source if isinstance(meta.source, dict) else {}
    subagent = source.get("subagent")
    spawn = subagent.get("thread_spawn", {}) if isinstance(subagent, dict) else {}
    return meta.parent_thread_id or str(spawn.get("parent_thread_id") or "") or meta.forked_from_id


def index_sessions(project: Path) -> dict[str, tuple[Path, rollout.SessionMeta]]:
    """Resolve project membership before reading any session's conversation body."""
    indexed: dict[str, tuple[Path, rollout.SessionMeta]] = {}
    sessions = rollout.codex_sessions_root()
    project_key = rollout.normalize_path(project)
    membership = {project_key: True}
    for directory in (sessions, sessions.parent / "archived_sessions"):
        boundary = directory.resolve()
        for file in rollout.list_rollout_files(directory):
            if not file.resolve().is_relative_to(boundary):
                continue
            try:
                meta = rollout.read_session_meta(file, Counter())
                if meta is None or not meta.thread_id:
                    continue
                cwd_key = rollout.normalize_path(meta.cwd)
                if cwd_key != project_key and not cwd_key.startswith(project_key + os.sep.casefold()):
                    continue
                if cwd_key not in membership:
                    membership[cwd_key] = rollout.normalize_path(rollout.detect_project_root(Path(meta.cwd), explicit=True)) == project_key
                if not membership[cwd_key]:
                    continue
                indexed.setdefault(meta.thread_id, (file, meta))
            except (OSError, ValueError):
                continue
    return indexed


def descendants(indexed: dict[str, tuple[Path, rollout.SessionMeta]], parent: str) -> list[str]:
    if parent not in indexed:
        raise ValueError("Parent session is absent from this project's available Codex rollouts")
    selected: set[str] = set()
    frontier = {parent}
    while frontier:
        children = {key for key, (_, meta) in indexed.items()
                    if key != parent and key not in selected and meta.is_subagent and parent_id(meta) in frontier}
        selected.update(children)
        frontier = children
    return sorted(selected, key=lambda key: (indexed[key][1].timestamp, key))


def work_events(file: Path, meta: rollout.SessionMeta) -> Iterator[dict[str, Any]]:
    """Exclude inherited turns, system context, and reasoning; retain observable work."""
    active_turn = ""
    calls: dict[str, str] = {}
    with file.open(encoding="utf-8-sig", errors="replace") as handle:
        for line_number, line in enumerate(handle, 1):
            if len(line.encode("utf-8")) > rollout.MAX_JSONL_LINE_BYTES:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(obj, dict) or not isinstance(obj.get("payload"), dict):
                continue
            payload = obj["payload"]
            kind = payload.get("type")
            obj_type = obj.get("type")
            if obj_type == "event_msg" and kind == "task_started":
                active_turn = str(payload.get("turn_id") or "")
            # Agent messages can precede task_started; their own metadata carries the turn ID.
            message_meta = payload.get("internal_chat_message_metadata_passthrough") or {}
            message_turn = str(message_meta.get("turn_id") or "") if isinstance(message_meta, dict) else ""
            turn_id = (message_turn or active_turn) if kind == "agent_message" else active_turn
            if not rollout.turn_is_owned_by_session(turn_id, meta):
                continue
            item: dict[str, Any] = {"line": line_number, "timestamp": str(obj.get("timestamp") or ""),
                                    "turn_id": turn_id, "kind": str(kind)}
            if obj_type == "event_msg" and kind in ("task_started", "task_complete", "turn_aborted"):
                item["text"] = safe_text(payload.get("last_agent_message") or "")
            elif obj_type == "response_item" and kind == "agent_message":
                item.update(author=str(payload.get("author") or ""), recipient=str(payload.get("recipient") or ""),
                            text=safe_text(payload.get("content")))
            elif obj_type == "response_item" and kind == "message":
                role = payload.get("role")
                raw = rollout.extract_text(payload.get("content"))
                if role not in ("user", "assistant") or (role == "user" and rollout.is_injected_user_text(raw)):
                    continue
                item.update(role=role, phase=str(payload.get("phase") or ""), text=safe_text(raw))
            elif obj_type == "event_msg" and kind == "user_message":
                raw = rollout.event_message_text(payload)
                if rollout.is_injected_user_text(raw):
                    continue
                item.update(role="user", text=safe_text(raw))
            elif obj_type == "response_item" and kind in ("function_call", "custom_tool_call"):
                call_id = str(payload.get("call_id") or "")
                name = str(payload.get("name") or "")
                calls[call_id] = name
                item.update(name=name, call_id=call_id, text=safe_text(payload.get("arguments") or payload.get("input")))
            elif obj_type == "response_item" and kind in ("function_call_output", "custom_tool_call_output"):
                call_id = str(payload.get("call_id") or "")
                item.update(name=calls.get(call_id, ""), call_id=call_id, text=safe_text(payload.get("output")))
            else:
                continue
            yield item
            if obj_type == "event_msg" and kind in ("task_complete", "turn_aborted"):
                active_turn = ""


def session_summary(file: Path, meta: rollout.SessionMeta) -> dict[str, Any]:
    counts: Counter[str] = Counter()
    report = ""
    for event in work_events(file, meta):
        counts[event["kind"]] += 1
        if event["kind"] == "task_complete" and event.get("text"):
            report = event["text"]
        elif event.get("phase") == "final_answer":
            report = event["text"]
    return {"session_id": meta.thread_id, "parent_session_id": parent_id(meta),
            "agent_path": meta.agent_path, "source_path": str(file.resolve()), "started_at": meta.timestamp,
            "event_counts": dict(counts), "last_report": report}


def serialize(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def page(base: dict[str, Any], key: str, items: list[dict[str, Any]], offset: int,
         limit: int, max_chars: int) -> dict[str, Any]:
    result = {**base, "total": len(items), "offset": offset, "next_offset": None, key: []}
    for item in items[offset:offset + limit]:
        candidate = {**item}
        result[key].append(candidate)
        next_offset = offset + len(result[key])
        result["next_offset"] = next_offset if next_offset < len(items) else None
        if len(serialize(result)) <= max_chars:
            continue
        if len(result[key]) > 1:
            result[key].pop()
            result["next_offset"] = next_offset - 1
            break
        # Keep valid JSON and the source position for a single oversized event/report.
        field = "text" if "text" in candidate else "last_report"
        if field in candidate:
            candidate.pop(field)
            candidate["content_omitted"] = "max-chars budget; retry this offset with a larger --max-chars"
        if len(serialize(result)) > max_chars:
            raise ValueError("--max-chars is too small for the session metadata")
    return result


def trace(project: Path, parent: str, *, session: str = "", terms: tuple[str, ...] = (),
          offset: int = 0, limit: int = 20, max_chars: int = 16000) -> dict[str, Any]:
    project = rollout.detect_project_root(project, explicit=True)
    indexed = index_sessions(project)
    children = descendants(indexed, parent)
    base = {"project_root": str(project), "parent_session_id": parent, "read_only": True,
            "note": "Child-owned observable records only. Reports are agent statements; tool outputs are execution evidence."}
    if session:
        if session not in children:
            raise ValueError("Requested session is not a subagent descendant of this PM in this project")
        file, meta = indexed[session]
        items = list(work_events(file, meta))
        key = "events"
        base.update(session_id=session, source_path=str(file.resolve()), agent_path=meta.agent_path)
    else:
        items = [session_summary(*indexed[child]) for child in children]
        key = "sessions"
    if terms:
        items = [item for item in items if any(term.casefold() in serialize(item).casefold() for term in terms)]
    return page(base, key, items, offset, limit, max_chars)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--parent-session", required=True, help="PM's exact Codex thread/session ID")
    parser.add_argument("--session", default="", help="List this descendant's work events instead of child summaries")
    parser.add_argument("--term", action="append", default=[], help="Filter sanitized summaries/events; repeatable")
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--max-chars", type=int, default=16000, help="Total JSON character budget")
    args = parser.parse_args()
    if args.offset < 0 or args.limit < 1 or args.max_chars < 2000:
        parser.error("--offset must be nonnegative, --limit positive, and --max-chars at least 2000")
    try:
        result = trace(args.project_root, args.parent_session, session=args.session, terms=tuple(args.term),
                       offset=args.offset, limit=args.limit, max_chars=args.max_chars)
        print(serialize(result))
    except (OSError, ValueError) as error:
        print(serialize({"error": str(error), "read_only": True}))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
