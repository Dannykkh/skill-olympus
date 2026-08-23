from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "reconcile_codex_conversations.py"
SPEC = importlib.util.spec_from_file_location("codex_mnemo_reconciler_under_test", SCRIPT_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Unable to import reconciler from {SCRIPT_PATH}")
reconciler = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = reconciler
SPEC.loader.exec_module(reconciler)


HISTORICAL_PROMPTS = (
    "잘읽어? 네이버블로그 같은건 iframe에 iframe로 되어있는 아주 복잡한 것들. 그리고 본문내용이나 잘 읽어오는지 성능은 괜찮은지 궁금하네.",
    "https://github.com/2lab-ai/llmux 이 깃허브를 깊이 탐색해보자",
    "리드미를 완전 업데이트 하는게 좋겠어. 이 프로그램은 뭐야? 페이블라이즈 루프하네스 엔지니어링 프로그램이야? 그러면 순서도나, 프로세스 이런건 리드미에 그림으로 표현도 해줘야 하고 기능도 알려줘야 하고, 하는거 아닌가?",
    "claude-api 스킬은 왜 전역에 있어? 이 프로그램 스킬로 들어가있어야 하는거 아니야?",
)


def session_meta(
    *,
    thread_id: str = "019f0000-0000-7000-8000-000000000000",
    cwd: str = "D:/git/claudecode",
    timestamp: str = "2026-07-01T00:00:00Z",
    **extra: object,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "id": thread_id,
        "session_id": thread_id,
        "cwd": cwd,
        "timestamp": timestamp,
        "source": "cli",
    }
    payload.update(extra)
    return {"timestamp": timestamp, "type": "session_meta", "payload": payload}


def event(timestamp: str, event_type: str, **payload: object) -> dict[str, object]:
    return {
        "timestamp": timestamp,
        "type": "event_msg",
        "payload": {"type": event_type, **payload},
    }


def response_message(
    timestamp: str,
    role: str,
    text: str,
    *,
    phase: str | None = None,
    message_id: str = "",
) -> dict[str, object]:
    payload: dict[str, object] = {
        "type": "message",
        "role": role,
        "content": [{"type": "output_text", "text": text}],
    }
    if phase is not None:
        payload["phase"] = phase
    if message_id:
        payload["id"] = message_id
    return {"timestamp": timestamp, "type": "response_item", "payload": payload}


def response_item(timestamp: str, item_type: str, **payload: object) -> dict[str, object]:
    return {
        "timestamp": timestamp,
        "type": "response_item",
        "payload": {"type": item_type, **payload},
    }


def write_synthetic_rollout(directory: Path, name: str, objects: list[dict[str, object]]) -> Path:
    path = directory / f"rollout-{name}.jsonl"
    encoded = "\n".join(json.dumps(item, ensure_ascii=False) for item in objects) + "\n"
    path.write_text(encoded, encoding="utf-8", newline="\n")
    return path


def extract_fixture(path: Path) -> tuple[reconciler.SessionMeta, reconciler.ScanResult, list[reconciler.CompletedTurn]]:
    counts: Counter[str] = Counter()
    meta = reconciler.read_session_meta(path, counts)
    if meta is None:
        raise AssertionError("synthetic fixture did not contain session_meta")
    result = reconciler.ScanResult(counts=counts)
    turns = reconciler.extract_completed_turns(path, meta, None, result)
    return meta, result, turns


def completed_turn(
    turn_id: str,
    started_at: str,
    completed_at: str,
    prompt: str,
    answer: str,
) -> reconciler.CompletedTurn:
    return reconciler.CompletedTurn(
        session_id="019f0000-0000-7000-8000-000000000000",
        turn_id=turn_id,
        started_at=started_at,
        completed_at=completed_at,
        user_messages=[reconciler.Message(started_at, prompt)],
        assistant=reconciler.Message(completed_at, answer),
        source_sha256="0" * 64,
    )


class LifecycleExtractionTests(unittest.TestCase):
    def test_lifecycle_excludes_developer_injected_commentary_and_tool_payloads(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = write_synthetic_rollout(
                Path(temp),
                "lifecycle",
                [
                    session_meta(),
                    event("2026-07-01T00:00:01Z", "task_started", turn_id="turn-root-1"),
                    response_message("2026-07-01T00:00:02Z", "developer", "developer-only instruction"),
                    event(
                        "2026-07-01T00:00:03Z",
                        "user_message",
                        message="# AGENTS.md instructions for D:/git/claudecode\nInjected instructions",
                    ),
                    response_message(
                        "2026-07-01T00:00:04Z",
                        "user",
                        "<environment_context>injected environment</environment_context>",
                    ),
                    event("2026-07-01T00:00:05Z", "user_message", message="keep this user request"),
                    response_message(
                        "2026-07-01T00:00:06Z",
                        "assistant",
                        "commentary must not be stored",
                        phase="commentary",
                    ),
                    response_item("2026-07-01T00:00:07Z", "reasoning", summary="internal reasoning"),
                    response_item("2026-07-01T00:00:08Z", "function_call", name="shell_command", arguments="secret tool payload"),
                    response_message(
                        "2026-07-01T00:00:09Z",
                        "assistant",
                        "the completed answer",
                        phase="final_answer",
                        message_id="answer-1",
                    ),
                    event(
                        "2026-07-01T00:00:10Z",
                        "task_complete",
                        turn_id="turn-root-1",
                        last_agent_message="the completed answer",
                    ),
                ],
            )

            _, result, turns = extract_fixture(fixture)

        self.assertEqual(1, len(turns))
        rendered = reconciler.render_turn(turns[0])
        self.assertIn("keep this user request", rendered)
        self.assertIn("the completed answer", rendered)
        for excluded in (
            "developer-only instruction",
            "AGENTS.md instructions",
            "injected environment",
            "commentary must not be stored",
            "internal reasoning",
            "secret tool payload",
        ):
            self.assertNotIn(excluded, rendered)
        self.assertEqual(1, result.counts["excluded_developer_messages"])
        self.assertEqual(1, result.counts["excluded_injected_user_messages"])
        self.assertEqual(1, result.counts["excluded_injected_response_users"])
        self.assertEqual(1, result.counts["excluded_assistant_commentary"])
        self.assertEqual(2, result.counts["excluded_tool_reasoning_items"])

    def test_multiple_user_events_are_grouped_and_last_final_matches_task_complete(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = write_synthetic_rollout(
                Path(temp),
                "multi-user",
                [
                    session_meta(),
                    event("2026-07-02T01:02:01Z", "task_started", turn_id="turn-root-2"),
                    event("2026-07-02T01:02:02Z", "user_message", message="initial request"),
                    response_message(
                        "2026-07-02T01:02:03Z",
                        "assistant",
                        "obsolete final draft",
                        phase="final_answer",
                    ),
                    event("2026-07-02T01:02:04Z", "user_message", message="follow-up correction"),
                    response_message(
                        "2026-07-02T01:02:05Z",
                        "assistant",
                        "authoritative final answer",
                        phase="final_answer",
                    ),
                    event(
                        "2026-07-02T01:02:06Z",
                        "task_complete",
                        turn_id="turn-root-2",
                        last_agent_message="authoritative final answer",
                    ),
                ],
            )

            _, _, turns = extract_fixture(fixture)

        self.assertEqual(1, len(turns))
        turn = turns[0]
        self.assertEqual(["initial request", "follow-up correction"], [item.text for item in turn.user_messages])
        self.assertEqual("authoritative final answer", turn.assistant.text)
        self.assertEqual(2, turn.final_answer_count)
        rendered_user = reconciler.render_user_body(turn)
        self.assertTrue(rendered_user.startswith("initial request"))
        self.assertIn("> Follow-up at ", rendered_user)
        self.assertIn("follow-up correction", rendered_user)
        self.assertNotIn("obsolete final draft", reconciler.render_turn(turn))

    def test_aborted_turn_is_not_eligible(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            fixture = write_synthetic_rollout(
                Path(temp),
                "aborted",
                [
                    session_meta(),
                    event("2026-07-03T00:00:01Z", "task_started", turn_id="turn-aborted"),
                    event("2026-07-03T00:00:02Z", "user_message", message="do not import this"),
                    response_message(
                        "2026-07-03T00:00:03Z",
                        "assistant",
                        "unfinished answer",
                        phase="final_answer",
                    ),
                    event("2026-07-03T00:00:04Z", "turn_aborted", turn_id="turn-aborted"),
                ],
            )

            _, result, turns = extract_fixture(fixture)

        self.assertEqual([], turns)
        self.assertEqual(1, result.counts["excluded_aborted_turns"])

    def test_subagent_owned_turn_id_is_collected_before_completeness_checks(self) -> None:
        child_thread_id = "019ff852-0000-7000-8000-000000000000"
        inherited_turn_id = "019ff851-ffff-7000-8000-000000000000"
        owned_turn_id = "019ff853-0000-7000-8000-000000000000"
        with tempfile.TemporaryDirectory() as temp:
            fixture = write_synthetic_rollout(
                Path(temp),
                "subagent",
                [
                    session_meta(
                        thread_id=child_thread_id,
                        session_id="019ff850-0000-7000-8000-000000000000",
                        parent_thread_id="019ff850-0000-7000-8000-000000000000",
                        agent_path="audit-child",
                        thread_source="subagent",
                    ),
                    event("2026-08-13T00:00:01Z", "task_started", turn_id=inherited_turn_id),
                    event(
                        "2026-08-13T00:00:02Z",
                        "task_complete",
                        turn_id=inherited_turn_id,
                        last_agent_message="",
                    ),
                    event("2026-08-13T00:00:03Z", "task_started", turn_id=owned_turn_id),
                    event(
                        "2026-08-13T00:00:04Z",
                        "user_message",
                        message="Message Type: NEW_TASK\nchild assignment envelope",
                    ),
                    event(
                        "2026-08-13T00:00:05Z",
                        "task_complete",
                        turn_id=owned_turn_id,
                        last_agent_message="",
                    ),
                ],
            )

            meta, result, turns = extract_fixture(fixture)

        self.assertTrue(meta.is_subagent)
        self.assertEqual([], turns)
        self.assertEqual({owned_turn_id}, result.subagent_turn_ids)
        self.assertEqual(1, result.counts["excluded_inherited_fork_turns"])
        self.assertEqual(1, result.counts["excluded_subagent_completed_turns"])
        self.assertEqual([], result.unresolved)

    def test_excluded_lineage_collects_child_completion_after_cutoff_and_removes_record(self) -> None:
        excluded_root_id = "019ff850-0000-7000-8000-000000000000"
        child_thread_id = "019ff852-0000-7000-8000-000000000000"
        child_turn_id = "019ff853-0000-7000-8000-000000000000"
        cutoff = datetime(2026, 8, 13, 0, 0, 2, tzinfo=timezone.utc)
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            project = base / "project"
            project.mkdir()
            (project / ".mnemo-root").write_text("canonical\n", encoding="utf-8")
            sessions = base / "sessions" / "2026" / "08" / "13"
            sessions.mkdir(parents=True)
            write_synthetic_rollout(
                sessions,
                "excluded-lineage-after-cutoff",
                [
                    session_meta(
                        thread_id=child_thread_id,
                        cwd=str(project),
                        session_id=excluded_root_id,
                        parent_thread_id=excluded_root_id,
                        agent_path="audit-child",
                        thread_source="subagent",
                    ),
                    event("2026-08-13T00:00:01Z", "task_started", turn_id=child_turn_id),
                    event(
                        "2026-08-13T00:00:05Z",
                        "task_complete",
                        turn_id=child_turn_id,
                        last_agent_message="child result must not be imported",
                    ),
                ],
            )
            output = base / "staging"
            output.mkdir()
            target = output / "2026-08-13-codex.md"
            target.write_text(
                reconciler.conversation_header("2026-08-13", "project")
                + "## [09:00:01] User\n\nchild assignment\n\n"
                + "## [09:00:05] Assistant\n\nchild result must not be imported\n"
                + f"<!-- turn:{child_turn_id} -->\n",
                encoding="utf-8",
                newline="\n",
            )

            with mock.patch.object(reconciler, "codex_sessions_root", return_value=base / "sessions"):
                result = reconciler.scan_rollouts(
                    project,
                    cutoff=cutoff,
                    cutoff_epoch=cutoff.timestamp(),
                    excluded_threads={excluded_root_id},
                )
            merge = reconciler.reconcile_to_directory(result, output, "project")
            staged = target.read_text(encoding="utf-8")

        self.assertEqual({child_turn_id}, result.subagent_turn_ids)
        self.assertNotIn(f"<!-- turn:{child_turn_id} -->", staged)
        self.assertEqual(child_turn_id, merge["proven_subagent_records_removed"][0]["turn_id"])

    def test_four_historical_prompt_fixtures_are_preserved_as_user_events(self) -> None:
        objects = [session_meta(timestamp="2026-06-25T00:00:00Z")]
        for index, prompt in enumerate(HISTORICAL_PROMPTS, start=1):
            minute = index * 3
            turn_id = f"historical-turn-{index}"
            answer = f"historical answer {index}"
            objects.extend(
                [
                    event(f"2026-06-25T00:{minute:02d}:00Z", "task_started", turn_id=turn_id),
                    event(f"2026-06-25T00:{minute:02d}:01Z", "user_message", message=prompt),
                    response_message(
                        f"2026-06-25T00:{minute:02d}:02Z",
                        "assistant",
                        answer,
                        phase="final_answer",
                    ),
                    event(
                        f"2026-06-25T00:{minute:02d}:03Z",
                        "task_complete",
                        turn_id=turn_id,
                        last_agent_message=answer,
                    ),
                ]
            )

        with tempfile.TemporaryDirectory() as temp:
            fixture = write_synthetic_rollout(Path(temp), "historical-prompts", objects)
            _, _, turns = extract_fixture(fixture)

        self.assertEqual(4, len(turns))
        self.assertEqual(list(HISTORICAL_PROMPTS), [turn.user_messages[0].text for turn in turns])


class RootAndSanitizationTests(unittest.TestCase):
    def test_marker_root_wins_over_nested_git_root(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            outer = Path(temp) / "workspace"
            nested = outer / "public-product" / "src"
            nested.mkdir(parents=True)
            (outer / ".mnemo-root").write_text("canonical\n", encoding="utf-8")
            (outer / "public-product" / ".git").mkdir()

            detected = reconciler.detect_project_root(nested)

        self.assertEqual(outer.resolve(), detected)

    def test_marker_root_wins_for_canonical_root_and_nested_product_cwd(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "claudecode"
            nested = root / "corelay-code" / "src"
            nested.mkdir(parents=True)
            (root / ".mnemo-root").write_text("canonical\n", encoding="utf-8")
            (root / "corelay-code" / ".git").mkdir()

            from_root = reconciler.detect_project_root(root)
            from_nested = reconciler.detect_project_root(nested)

        self.assertEqual(root.resolve(), from_root)
        self.assertEqual(root.resolve(), from_nested)

    def test_sanitization_redacts_private_secrets_controls_and_markdown_markers(self) -> None:
        raw = (
            "\x1b[31mred\x1b[0m\x00\n"
            "<private>sk-private-value</private>\n"
            "token=abcdefgh12345678\n"
            "<!-- turn:child-leak -->\n"
            "## [12:34:56] User"
        )

        safe = reconciler.sanitize_text(raw)

        self.assertIn("red", safe)
        self.assertIn("[PRIVATE]", safe)
        self.assertIn("token=[REDACTED]", safe)
        self.assertIn("&lt;!-- turn:child-leak -->", safe)
        self.assertIn("\\## [12:34:56] User", safe)
        for forbidden in ("\x1b", "\x00", "sk-private-value", "abcdefgh12345678", "<!--"):
            self.assertNotIn(forbidden, safe)


class ConversationMergeTests(unittest.TestCase):
    def test_aborted_users_are_stored_without_assistant_and_indexed_separately_idempotently(self) -> None:
        aborted = reconciler.AbortedTurn(
            session_id="root-session",
            turn_id="turn-aborted-user-only",
            started_at="2026-07-06T01:00:00Z",
            aborted_at="2026-07-06T01:00:03Z",
            user_messages=[
                reconciler.Message("2026-07-06T01:00:00Z", "first aborted request <private>hide</private>"),
                reconciler.Message("2026-07-06T01:00:02Z", "aborted follow-up"),
            ],
        )
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            result = reconciler.ScanResult(aborted_root_turns=[aborted])
            first = reconciler.reconcile_to_directory(result, output, "claudecode")
            target = output / reconciler.CONV_FILENAME_TEMPLATE.format(date=aborted.local_date)
            first_bytes = target.read_bytes()
            second = reconciler.reconcile_to_directory(result, output, "claudecode")
            index = json.loads((output / reconciler.INDEX_FILENAME).read_text(encoding="utf-8"))
            staged = target.read_text(encoding="utf-8")

        self.assertEqual(first_bytes, staged.encode("utf-8"))
        self.assertIn("first aborted request [PRIVATE]", staged)
        self.assertIn("> Follow-up at ", staged)
        self.assertIn("aborted follow-up", staged)
        self.assertIn("<!-- aborted-turn:turn-aborted-user-only -->", staged)
        self.assertNotIn("## [01:00:03] Assistant", staged)
        self.assertEqual(1, first["dispositions"]["added_aborted_user_turns"])
        self.assertEqual(2, first["dispositions"]["added_aborted_user_messages"])
        self.assertEqual(1, second["dispositions"]["existing_aborted_turns"])
        self.assertEqual({}, index["codex"])
        self.assertEqual(["turn-aborted-user-only"], index["codex_aborted"][aborted.local_date])
        self.assertTrue(first["chronological_validation"]["passed"])

    def test_exact_child_marker_record_is_removed_without_touching_root_record(self) -> None:
        child_id = "019ff852-0545-77d2-a9a8-75298857bb47"
        root_id = "019ff851-92d8-73e2-9dae-f4f749cc02db"
        markdown = (
            reconciler.conversation_header("2026-08-13", "claudecode")
            + "## [08:39:00] User\n\nroot request\n\n"
            + "## [08:39:35] Assistant\n\nroot answer\n"
            + f"<!-- turn:{root_id} -->\n\n"
            + "## [08:40:00] User\n\nchild assignment\n\n"
            + "## [08:40:14] Assistant\n\nchild answer\n"
            + f"<!-- turn:{child_id} -->\n"
        )
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            target = output / "2026-08-13-codex.md"
            target.write_text(markdown, encoding="utf-8", newline="\n")
            result = reconciler.ScanResult(subagent_turn_ids={child_id})

            merge = reconciler.reconcile_to_directory(result, output, "claudecode")
            staged = target.read_text(encoding="utf-8")

        self.assertIn(f"<!-- turn:{root_id} -->", staged)
        self.assertNotIn(f"<!-- turn:{child_id} -->", staged)
        self.assertIn("root request", staged)
        self.assertNotIn("child assignment", staged)
        self.assertEqual(
            [{"turn_id": child_id, "date": "2026-08-13", "reason": "proven-subagent-lineage"}],
            merge["proven_subagent_records_removed"],
        )

    def test_eligible_turns_are_written_in_chronological_order(self) -> None:
        early = completed_turn(
            "turn-early",
            "2026-07-06T01:00:00Z",
            "2026-07-06T01:00:02Z",
            "early request",
            "early answer",
        )
        late = completed_turn(
            "turn-late",
            "2026-07-06T02:00:00Z",
            "2026-07-06T02:00:02Z",
            "late request",
            "late answer",
        )
        self.assertEqual(early.local_date, late.local_date)
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            result = reconciler.ScanResult(root_turns=[late, early])

            merge = reconciler.reconcile_to_directory(result, output, "claudecode")
            target = output / reconciler.CONV_FILENAME_TEMPLATE.format(date=early.local_date)
            staged = target.read_text(encoding="utf-8")

        self.assertLess(staged.index("<!-- turn:turn-early -->"), staged.index("<!-- turn:turn-late -->"))
        self.assertTrue(merge["chronological_validation"]["passed"])
        self.assertEqual(0, merge["chronological_validation"]["inversion_count"])


if __name__ == "__main__":
    unittest.main()
