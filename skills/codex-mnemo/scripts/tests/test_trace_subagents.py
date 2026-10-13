from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import trace_subagents as trace


PARENT = "019ff850-0000-7000-8000-000000000000"
OTHER_PM = "019ff850-1000-7000-8000-000000000000"
CHILD = "019ff852-0000-7000-8000-000000000000"
GRANDCHILD = "019ff854-0000-7000-8000-000000000000"
INHERITED = "019ff851-0000-7000-8000-000000000000"
OWN = "019ff853-0000-7000-8000-000000000000"


def event(kind: str, **fields: object) -> dict:
    return {"timestamp": "2026-10-13T01:00:00Z", "type": "event_msg", "payload": {"type": kind, **fields}}


def item(kind: str, **fields: object) -> dict:
    return {"timestamp": "2026-10-13T01:00:00Z", "type": "response_item", "payload": {"type": kind, **fields}}


class TraceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="mnemo-trace-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / "project"
        self.project.mkdir()
        (self.project / ".mnemo-root").touch()
        self.codex = self.root / "codex"
        self.env = mock.patch.dict(os.environ, {"CODEX_HOME": str(self.codex)})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.write(PARENT)

    def write(self, identifier: str, records: list[dict] | None = None, *, parent: str = "",
              project: Path | None = None, archived: bool = False, **extra: object) -> Path:
        directory = self.codex / ("archived_sessions" if archived else "sessions")
        directory.mkdir(parents=True, exist_ok=True)
        meta = {"id": identifier, "cwd": str(project or self.project), "source": "cli",
                "timestamp": "2026-10-13T00:00:00Z"}
        if parent:
            meta.update(source={"subagent": {"thread_spawn": {"parent_thread_id": parent}}},
                        agent_path="/root/worker", parent_thread_id=parent, thread_source="subagent")
        meta.update(extra)
        objects = [{"type": "session_meta", "payload": meta}, *(records or [])]
        file = directory / f"rollout-fixture-{identifier}.jsonl"
        file.write_text("\n".join(json.dumps(obj) for obj in objects) + "\n", encoding="utf-8")
        return file

    def child_records(self) -> list[dict]:
        return [
            event("task_started", turn_id=INHERITED),
            item("custom_tool_call", name="exec", call_id="parent-call", input="parent-only command"),
            event("task_complete", turn_id=INHERITED, last_agent_message="parent-only answer"),
            item("agent_message", author="/root", recipient="/root/worker", content=[{"type": "input_text", "text": "작업 지시: 로그인 검사"}],
                 internal_chat_message_metadata_passthrough={"turn_id": OWN}),
            event("task_started", turn_id=OWN),
            item("message", role="developer", content="do-not-show-system-context"),
            item("reasoning", summary="do-not-show-reasoning"),
            item("message", role="user", content="# AGENTS.md instructions for hidden-context"),
            item("custom_tool_call", name="exec", call_id="exec-1", input="검사 명령 <private>private-argument</private>"),
            item("custom_tool_call_output", call_id="exec-1", output="검사 통과 Bearer tokenabcdefgh123456 <private>private-output</private>"),
            item("function_call", name="send_message", call_id="message-1", arguments='{"target":"/root","message":"검사 완료"}'),
            item("function_call_output", call_id="message-1", output="Delivered"),
            item("message", role="assistant", phase="final_answer", content="로그인 검사 완료"),
            event("task_complete", turn_id=OWN, last_agent_message="로그인 검사 완료"),
        ]

    def test_child_work_includes_assignment_calls_outputs_and_report_without_inherited_or_private_content(self) -> None:
        self.write(CHILD, self.child_records(), parent=PARENT)
        result = trace.trace(self.project, PARENT, session=CHILD)
        text = trace.serialize(result)
        self.assertIn("작업 지시: 로그인 검사", text)
        self.assertIn("검사 통과", text)
        self.assertIn("로그인 검사 완료", text)
        for hidden in ("parent-only", "private-argument", "private-output", "tokenabcdefgh123456", "do-not-show", "hidden-context"):
            self.assertNotIn(hidden, text)
        output = next(e for e in result["events"] if e["kind"] == "custom_tool_call_output")
        self.assertEqual("exec", output["name"])
        self.assertEqual("exec-1", output["call_id"])
        self.assertTrue(all(e["line"] > 0 and e["turn_id"] == OWN for e in result["events"]))
        summary = trace.trace(self.project, PARENT)["sessions"][0]
        self.assertEqual("로그인 검사 완료", summary["last_report"])
        self.assertEqual(1, summary["event_counts"]["custom_tool_call"])

    def test_descendants_include_nested_and_archived_children_but_exclude_user_forks_and_other_pms(self) -> None:
        self.write(CHILD, self.child_records(), parent=PARENT)
        self.write(GRANDCHILD, parent=CHILD, archived=True)
        self.write(OTHER_PM)
        other_child = "019ff855-0000-7000-8000-000000000000"
        user_fork = "019ff856-0000-7000-8000-000000000000"
        self.write(other_child, parent=OTHER_PM)
        self.write(user_fork, forked_from_id=PARENT, thread_source="user")
        result = trace.trace(self.project, PARENT)
        self.assertEqual({CHILD, GRANDCHILD}, {s["session_id"] for s in result["sessions"]})
        with self.assertRaisesRegex(ValueError, "not a subagent descendant"):
            trace.trace(self.project, PARENT, session=other_child)
        with self.assertRaisesRegex(ValueError, "not a subagent descendant"):
            trace.trace(self.project, PARENT, session=user_fork)

    def test_other_project_sessions_are_not_read_or_exposed(self) -> None:
        other = self.root / "other-project"
        other.mkdir()
        (other / ".mnemo-root").touch()
        file = self.write(CHILD, self.child_records(), parent=PARENT, project=other)
        with mock.patch.object(trace, "work_events", side_effect=AssertionError("body must not be read")):
            result = trace.trace(self.project, PARENT)
        self.assertEqual([], result["sessions"])
        self.assertNotIn(str(file), trace.serialize(result))
        with self.assertRaises(ValueError):
            trace.trace(self.project, PARENT, session=CHILD)

    def test_search_pages_are_filtered_after_redaction_and_budget_keeps_valid_json(self) -> None:
        self.write(CHILD, self.child_records(), parent=PARENT)
        first = trace.trace(self.project, PARENT, session=CHILD, limit=2)
        second = trace.trace(self.project, PARENT, session=CHILD, offset=first["next_offset"], limit=2)
        self.assertTrue({e["line"] for e in first["events"]}.isdisjoint(e["line"] for e in second["events"]))
        self.assertEqual([], trace.trace(self.project, PARENT, session=CHILD, terms=("private-output",))["events"])
        matched = trace.trace(self.project, PARENT, session=CHILD, terms=("검사 통과",))
        self.assertEqual(1, matched["total"])
        self.write(CHILD, [event("task_started", turn_id=OWN),
                           item("custom_tool_call_output", call_id="large", output="X" * 12000)], parent=PARENT)
        result = trace.trace(self.project, PARENT, session=CHILD, offset=1, max_chars=2000)
        self.assertLessEqual(len(trace.serialize(result)), 2000)
        self.assertIn("content_omitted", result["events"][0])
        self.assertNotIn("text", result["events"][0])

    def test_unclosed_private_blocks_are_redacted_and_metadata_only_parent_link_is_supported(self) -> None:
        self.assertEqual("Visible [PRIVATE]", trace.safe_text("Visible <private>hidden-tail"))
        self.write(CHILD, self.child_records(), parent=PARENT, parent_thread_id="", forked_from_id="")
        self.assertEqual(CHILD, trace.trace(self.project, PARENT)["sessions"][0]["session_id"])

    def test_cli_is_read_only_and_missing_parent_returns_an_explicit_error(self) -> None:
        self.write(CHILD, self.child_records(), parent=PARENT)
        before = {str(f.relative_to(self.root)): f.read_bytes() for f in self.root.rglob("*") if f.is_file()}
        result = subprocess.run([sys.executable, "-B", str(SCRIPTS / "trace_subagents.py"),
                                 "--project-root", str(self.project), "--parent-session", PARENT],
                                capture_output=True, text=True, encoding="utf-8", check=False)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertTrue(json.loads(result.stdout)["read_only"])
        after = {str(f.relative_to(self.root)): f.read_bytes() for f in self.root.rglob("*") if f.is_file()}
        self.assertEqual(before, after)
        with self.assertRaisesRegex(ValueError, "Parent session is absent"):
            trace.trace(self.project, OTHER_PM)


if __name__ == "__main__":
    unittest.main()
