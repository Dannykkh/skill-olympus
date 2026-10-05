"""Recall must preserve context and disclose missing evidence, without writes."""

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import recall


class RecallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="mnemo-recall-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / ".mnemo-root").touch()

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def entry(self, number, slug, body, tags="기억, 대화, 결정", folder="architecture", status="CURRENT"):
        return self.write(f"memory/{folder}/{number:03}-{slug}.md",
                          f"# {slug}\n\ntags: {tags}\ndate: 2026-01-01\nsource: codex\n"
                          f"status: {status}\n\n{body}\n")

    def conversation(self, name="2026-01-01-codex.md", question="질문", answer="답변", tags="기억"):
        return self.write(f"conversations/{name}",
                          f"# 대화\n\n## [09:00:00] User\n\n{question}\n\n"
                          f"## [09:02:00] Assistant\n\n{answer}\n\n#tags: {tags}\n<!-- turn:one -->\n")

    def search(self, *terms, **kwargs):
        return recall.recall(self.root, list(terms), **kwargs)

    def test_complete_question_and_answer_are_returned_with_real_line_numbers(self):
        path = self.conversation(question="왜 기차로 가기로 했지?", answer="아이의 멀미 때문에요.", tags="기차, 가족여행")
        result = self.search("가족여행")["results"][0]
        self.assertIn("왜 기차로", result["content"])
        self.assertIn("아이의 멀미", result["content"])
        self.assertEqual(result["turn_id"], "one")
        lines = path.read_text(encoding="utf-8").splitlines()
        self.assertEqual(lines[result["line"] - 1], "## [09:00:00] User")
        self.assertIn("<!-- turn:one -->", "\n".join(lines[result["line"] - 1:result["end_line"]]))

    def test_multiple_user_messages_stay_with_the_answer_and_next_turn_is_separate(self):
        self.write("conversations/2026-01-01-claude.md", """# 대화
## [09:00] User
기차 여행을 고민해.
## [09:01] User
아이도 같이 가.
## [09:02:00] Assistant
가족여행은 기차로 결정했어요.
#tags: 가족여행
## [10:00] User
점심 메뉴는?
## [10:01:00] Assistant
국수요.
#tags: 점심
""")
        result = self.search("가족여행")["results"][0]
        self.assertIn("아이도 같이", result["content"])
        self.assertNotIn("점심 메뉴", result["content"])

    def test_grok_user_event_marker_does_not_sever_the_question_from_answer(self):
        self.write("conversations/2026-01-01-grok.md", """## [09:00:00] User
약속 시간을 바꿀까?
<!-- grok-event:user-id -->
## [09:00:10] Assistant
금요일 오후로 옮겼어요.
#tags: 약속
<!-- grok-event:assistant-id -->
""")
        results = self.search("약속")["results"]
        self.assertEqual(len(results), 1)
        self.assertIn("시간을 바꿀까", results[0]["content"])
        self.assertEqual(results[0]["turn_id"], "")

    def test_grok_prefix_markers_keep_all_answers_with_the_original_question(self):
        self.write("conversations/2026-01-01-grok.md", """<!-- grok-event:user -->
## [09:00] User
왜 기차로 가기로 했지?
<!-- grok-event:assistant-1 -->
## [09:01] Assistant
처음 조건입니다.
#tags: 예전조건
<!-- grok-event:assistant-2 -->
## [09:02] Assistant
아이가 동행할 때 적용하는 조건입니다.
#tags: 새조건
<!-- grok-event:next-user -->
## [10:00] User
다른 약속은?
<!-- grok-event:next-assistant -->
## [10:01] Assistant
내일입니다.
#tags: 약속
""")
        results = self.search("새조건")["results"]
        self.assertEqual(len(results), 1)
        self.assertIn("왜 기차로", results[0]["content"])
        self.assertIn("처음 조건", results[0]["content"])
        self.assertIn("아이가 동행", results[0]["content"])
        self.assertNotIn("다른 약속", results[0]["content"])
        self.assertEqual(results[0]["tags"], ["예전조건", "새조건"])
        self.assertEqual(results[0]["turn_id"], "")

    def test_reserved_tag_follows_a_memory_entry_and_its_timestamped_evidence(self):
        self.entry(1, "이동수단", "evidence: conversations/2025-12-01-claude.md 14:10", tags="이동, 결정, 조건")
        self.write("conversations/2025-12-01-claude.md", """## [14:10] User
버스는 아이가 멀미하니까 빼자.
## [14:11:00] Assistant
그 조건을 기억하겠습니다.
#tags: 조건
## [16:00] User
다른 약속은?
## [16:01] Assistant
내일이에요.
#tags: 약속
""")
        self.conversation(question="여행 교통수단을 기억해?", tags="여행 arch:001")
        results = self.search("여행", limit=1)["results"]
        evidence = next(r for r in results if r["via"] == "evidence")
        self.assertIn("아이가 멀미", evidence["content"])
        self.assertNotIn("다른 약속", evidence["content"])
        self.assertTrue(any(r["entry_id"] == "arch:001" for r in results))

    def test_superseded_entry_brings_replacement_and_its_original_conditions(self):
        self.entry(1, "여행예산", "superseded-by: [[002-새예산]]\n종전 상한은 50만원.", tags="여행예산", status="SUPERSEDED")
        self.entry(2, "새예산", "supersedes: [[001-여행예산]]\nevidence: conversations/2026-02-01-codex.md 09:00\n새 상한은 80만원.", tags="새상한")
        self.conversation(name="2026-02-01-codex.md", question="엄마가 동행할 때만 80만원으로 올려.",
                          answer="혼자 가면 기존 상한을 유지하겠습니다.", tags="동행")
        results = self.search("여행예산", limit=1)["results"]
        self.assertEqual(results[0]["status"], "SUPERSEDED")
        replacement = next(r for r in results if r["entry_id"] == "arch:002")
        self.assertEqual(replacement["status"], "CURRENT")
        self.assertIn("엄마가 동행할 때만", next(r for r in results if r["via"] == "evidence")["content"])

    def test_legacy_multi_entry_memory_and_exact_reserved_ids(self):
        self.write("memory/architecture.md", """# Architecture
## 001-말투
tags: 말투, 선호, 대화
date: 2026-01-01
source: codex
존댓말을 사용한다.
## 010-다른선호
tags: 다른선호
date: 2026-01-01
source: codex
다른 내용.
""")
        self.entry(1, "교훈", "다른 분류의 번호.", folder="learned", tags="교훈")
        results = self.search("arch:001")["results"]
        self.assertEqual(len(results), 1)
        self.assertIn("존댓말", results[0]["content"])
        self.assertNotIn("다른 내용", results[0]["content"])

    def test_legacy_heading_links_follow_replacement_and_dependency_entries(self):
        self.write("memory/architecture.md", """# Architecture
## 001-old
tags: old
source: codex
status: SUPERSEDED
superseded-by: [[002-new]]
예전 조건.
## 002-new
tags: new
source: codex
status: CURRENT
depends-on: [[003-condition]]
새 조건.
## 003-condition
tags: condition
source: codex
엄마가 동행할 때만 적용한다.
""")
        result = self.search("arch:001", limit=1)
        self.assertEqual({r["entry_id"] for r in result["results"]}, {"arch:001", "arch:002", "arch:003"})
        self.assertTrue(any(r["status"] == "CURRENT" for r in result["results"]))
        self.assertIn("엄마가 동행", result["results"][-1]["content"])
        self.assertEqual(result["unresolved"], [])

    def test_status_prefixed_lifecycle_metadata_keeps_the_existing_wiki_link(self):
        self.entry(1, "old", "- ❌ SUPERSEDED `superseded-by: [[002-new]]` 설명.",
                   tags="old", status="SUPERSEDED")
        self.entry(2, "new", "엄마가 동행할 때만 적용한다.", tags="new")
        result = self.search("arch:001", limit=1)
        self.assertEqual({r["entry_id"] for r in result["results"]}, {"arch:001", "arch:002"})
        self.assertEqual(result["unresolved"], [])

    def test_duplicate_reserved_ids_are_disclosed_even_when_limit_is_one(self):
        self.entry(1, "mnemo", "맥락 회상.", tags="mnemo")
        self.entry(1, "recipe", "다른 세션의 기록.", tags="recipe")
        result = self.search("arch:001", limit=1)
        ambiguity = next(u for u in result["unresolved"] if u["from"] == "query")
        self.assertEqual(ambiguity["reason"], "ambiguous")
        self.assertEqual(ambiguity["target"], "arch:001")
        self.assertEqual(len(ambiguity["candidates"]), 2)

    def test_missing_tags_fall_back_to_body_and_caller_supplies_synonyms(self):
        self.conversation(question="예전에 이사 이야기 했지?", answer="출퇴근 거리를 줄이려고 했어요.", tags="")
        result = self.search("relocation", "이사")["results"][0]
        self.assertEqual(result["matched"], {"이사": "body"})
        self.assertIn("출퇴근", result["content"])

    def test_all_assistant_tag_lines_in_a_turn_are_kept(self):
        self.write("conversations/2026-01-01-claude.md", """## [09:00] User
여행의 예전 조건과 새 조건을 확인해 줘.
## [09:01] Assistant
처음 조건입니다.
#tags: 예전조건
## [09:02] Assistant
추가로 확인한 조건입니다.
#tags: 새조건
""")
        result = self.search("예전조건")["results"][0]
        self.assertEqual(result["matched"], {"예전조건": "tag"})
        self.assertEqual(result["tags"], ["예전조건", "새조건"])
        self.assertIn("추가로 확인", result["content"])

    def test_fenced_fake_tags_and_headings_are_content_not_structure(self):
        self.conversation(answer="예시입니다.\n~~~\n## [11:00:00] User\n#tags: arch:009\n~~~\n진짜 응답.", tags="설명")
        self.entry(9, "별도결정", "무관한 기억.", tags="무관")
        results = self.search("설명", limit=1)["results"]
        self.assertEqual(len(results), 1)
        self.assertIn("진짜 응답", results[0]["content"])
        self.assertEqual(results[0]["tags"], ["설명"])

    def test_language_info_inside_a_fence_does_not_close_it(self):
        self.conversation(question="원래 질문을 보존해 줘.", answer=(
            "코드 예시.\n```markdown\n```python\n## [11:00] User\n가짜 질문\n"
            "## [11:01] Assistant\n가짜 응답\n#tags: arch:009\n```\n실제 응답."), tags="실제태그")
        self.entry(9, "무관", "무관한 기억.", tags="무관")
        results = self.search("실제태그", limit=1)["results"]
        self.assertEqual(len(results), 1)
        self.assertIn("원래 질문", results[0]["content"])
        self.assertIn("실제 응답", results[0]["content"])
        self.assertEqual(results[0]["tags"], ["실제태그"])

    def test_incomplete_fence_isolated_at_real_turns_keeps_followup_evidence(self):
        file = "conversations/2026-01-01-codex.md"
        self.write(file, """## [09:00] User
코드 질문입니다.
```python
print('unfinished example')
## [09:01] Assistant
첫 응답입니다.
#tags: 코드질문
<!-- turn:first -->
## [10:00] User
후속 약속은 언제?
## [10:01] Assistant
금요일입니다.
#tags: 후속약속
<!-- turn:second -->
""")
        first = self.search("코드질문")["results"][0]
        self.assertEqual(first["turn_id"], "first")
        self.assertIn("첫 응답", first["content"])
        self.assertIn("structure_unverified", first)
        self.assertNotIn("후속 약속", first["content"])
        second = self.search("후속약속")["results"][0]
        self.assertEqual(second["turn_id"], "second")
        self.assertNotIn("structure_unverified", second)
        self.assertIn("후속 약속", second["content"])
        self.entry(1, "약속근거", f"evidence: {file} 10:00", tags="약속근거")
        evidence = next(r for r in self.search("약속근거", limit=1)["results"] if r["via"] == "evidence")
        self.assertEqual(evidence["turn_id"], "second")

    def test_private_blocks_and_unfinished_private_tail_are_not_searchable(self):
        self.conversation(question="일정은 언제?", answer="금요일.\n<private>secret-needle</private>\n공개 내용.", tags="일정")
        self.assertEqual(self.search("secret-needle")["results"], [])
        self.assertNotIn("secret-needle", json.dumps(self.search("일정"), ensure_ascii=False))
        self.write("conversations/2026-01-02-codex.md", "## [12:00:00] User\n공개 질문\n<private>\n비밀꼬리")
        self.assertEqual(self.search("비밀꼬리")["results"], [])

    def test_private_legacy_headings_cannot_become_searchable_entries(self):
        path = self.write("memory/architecture.md", """# Architecture
## 001-public
tags: public
source: codex
<private>
## 002-sensitive
tags: private-only
source: codex
sensitive-needle
</private>
## 003-public
tags: followup
source: codex
공개 후속 조건.
""")
        self.assertEqual(self.search("sensitive-needle")["results"], [])
        self.assertEqual(self.search("private-only")["results"], [])
        public = self.search("followup")["results"][0]
        self.assertIn("공개 후속 조건", public["content"])
        self.assertEqual(path.read_text(encoding="utf-8").splitlines()[public["line"] - 1], "## 003-public")
        self.assertNotIn("sensitive-needle", recall.serialized(self.search("public")))
        self.write("memory/architecture.md", "<private>\n## 001-sensitive\ntags: private-only\n"
                   "source: codex\nsensitive-needle\n")
        self.assertEqual(self.search("sensitive-needle")["results"], [])

    def test_external_source_file_aliases_are_rejected_before_reading(self):
        with tempfile.TemporaryDirectory(prefix="mnemo-recall-external-") as external:
            source = Path(external) / "private.md"
            source.write_text("# External\ntags: outside-needle\nsource: codex\n", encoding="utf-8")
            for name in ("memory/architecture/001-external.md", "conversations/2026-01-01-codex.md"):
                with self.subTest(name=name):
                    link = self.root / name
                    link.parent.mkdir(parents=True, exist_ok=True)
                    try:
                        link.symlink_to(source)
                    except OSError as error:
                        self.skipTest(f"symlink creation unavailable: {type(error).__name__}")
                    try:
                        with self.assertRaisesRegex(ValueError, "outside-project Mnemo source"):
                            self.search("outside-needle")
                    finally:
                        link.unlink()

    def test_external_source_directory_aliases_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix="mnemo-recall-external-") as external:
            Path(external, "001-external.md").write_text("# External\ntags: outside-needle\n", encoding="utf-8")
            for name in ("memory", "conversations"):
                with self.subTest(name=name):
                    link = self.root / name
                    try:
                        link.symlink_to(external, target_is_directory=True)
                    except OSError as error:
                        self.skipTest(f"symlink creation unavailable: {type(error).__name__}")
                    try:
                        with self.assertRaisesRegex(ValueError, "outside-project Mnemo source"):
                            self.search("outside-needle")
                    finally:
                        link.unlink()

    def test_broken_and_escaping_evidence_is_reported_without_guessing_a_turn(self):
        self.entry(1, "약속", "evidence: conversations/2025-01-01-codex.md 09:00\n"
                   "../../../conversations/2026-01-01-codex.md 09:00", tags="약속")
        result = self.search("약속", limit=1)
        self.assertEqual(len(result["results"]), 1)
        self.assertEqual({i["reason"] for i in result["unresolved"]}, {"missing", "outside-project"})

    def test_ambiguous_memory_links_are_reported_instead_of_selecting_a_folder(self):
        self.entry(1, "동명이름", "한 기억.", tags="별개")
        self.entry(1, "동명이름", "다른 기억.", tags="별개", folder="learned")
        self.entry(2, "약속", "depends-on: [[001-동명이름]]", tags="약속")
        result = self.search("약속", limit=1)
        self.assertEqual(len(result["results"]), 1)
        self.assertEqual(result["unresolved"][0]["reason"], "ambiguous")

    def test_evidence_limit_applies_to_a_file_across_references_and_entries(self):
        file = "conversations/2026-01-01-codex.md"
        self.write(file, "\n".join(
            f"## [{hour:02}:00] User\n시간별 조건 {hour}\n## [{hour:02}:01] Assistant\n"
            f"조건 응답 {hour}\n<!-- turn:t{hour} -->" for hour in range(9, 14)))
        self.entry(1, "many", "evidence: " + "\n".join(f"{file} {hour:02}:00" for hour in range(9, 13))
                   + "\ndepends-on: [[002-additional]]", tags="many")
        self.entry(2, "additional", f"evidence: {file} 13:00", tags="additional")
        result = self.search("many", limit=1, max_chars=30000)
        evidence = [r for r in result["results"] if r["via"] == "evidence"]
        self.assertEqual(len(evidence), 3)
        self.assertTrue(any(i["reason"] == "more-evidence-turns" for i in result["unresolved"]))

    def test_explicit_evidence_selector_is_not_overridden_by_timestamps_in_prose(self):
        file = "conversations/2026-01-01-codex.md"
        self.write(file, """## [09:00] User
원래 조건은?
## [09:01] Assistant
첫 조건입니다.
<!-- turn:first -->
## [10:00] User
다른 조건은?
## [10:01] Assistant
무관한 조건입니다.
<!-- turn:other -->
""")
        for selector in ("#L1", ":1", " 09:00", ":09:00"):
            with self.subTest(selector=selector):
                self.entry(1, "선택자", f"evidence: {file}{selector} (설명에 10:00이 있음)", tags="선택자")
                evidence = [r for r in self.search("선택자", limit=1)["results"] if r["via"] == "evidence"]
                self.assertEqual(len(evidence), 1)
                self.assertEqual(evidence[0]["turn_id"], "first")
                self.assertNotIn("무관한 조건", evidence[0]["content"])

    def test_cli_stdout_bytes_respect_character_budget_on_windows(self):
        links = " ".join(f"[[{number:03}-child]]" for number in range(2, 33))
        self.entry(1, "byte-budget", f"depends-on: {links}", tags="byte-budget")
        for number in range(2, 33):
            self.entry(number, "child", "근거 본문입니다.\n" * 8, tags="child")
        run = subprocess.run([sys.executable, "-B", str(SCRIPTS / "recall.py"), "--project-root", str(self.root),
                              "--term", "byte-budget", "--limit", "1", "--max-chars", "16000"],
                             capture_output=True, timeout=20)
        self.assertEqual(run.returncode, 0, run.stderr.decode("utf-8", errors="replace"))
        decoded = run.stdout.decode("utf-8")
        self.assertLessEqual(len(decoded), 16000)
        self.assertNotIn(b"\r\n", run.stdout)
        self.assertTrue(json.loads(decoded)["results"])

    def test_cyclic_links_and_large_fanout_are_bounded_and_omissions_disclosed(self):
        links = " ".join(f"[[{number:03}-child]]" for number in range(2, 73))
        self.entry(1, "bounded", f"depends-on: {links}", tags="bounded")
        for number in range(2, 73):
            self.entry(number, "child", "depends-on: [[001-bounded]]", tags="child")
        result = self.search("bounded", limit=1, max_chars=100000)
        self.assertEqual(len(result["results"]), 60)
        self.assertGreater(result["stats"]["records_omitted"], 0)
        self.assertEqual(len({(r["path"], r["line"]) for r in result["results"]}), 60)

    def test_budget_omits_whole_content_and_keeps_source_pointer(self):
        self.conversation(question="길게 이야기한 여행 기억?", answer="긴 설명." * 5000, tags="여행")
        result = self.search("여행", max_chars=2500)
        self.assertLessEqual(len(recall.serialized(result)), 2500)
        item = result["results"][0]
        self.assertNotIn("content", item)
        self.assertIn("content_omitted", item)
        self.assertTrue(item["line"] < item["end_line"])

    def test_repeated_utterances_at_different_times_are_not_content_deduplicated(self):
        self.write("conversations/2026-01-01-codex.md", """## [09:00:00] User
약속 시간 알려줘.
## [09:01:00] Assistant
금요일 오후예요.
#tags: 약속
<!-- turn:one -->
## [10:00:00] User
약속 시간 알려줘.
## [10:01:00] Assistant
금요일 오후예요.
#tags: 약속
<!-- turn:two -->
""")
        self.assertEqual({r["turn_id"] for r in self.search("약속")["results"]}, {"one", "two"})

    def test_neighbors_are_explicitly_unverified_and_scope_only_limits_seeds(self):
        self.entry(1, "약속", "기억 상세.", tags="상세")
        self.conversation(tags="약속 arch:001")
        with (self.root / "conversations/2026-01-01-codex.md").open("a", encoding="utf-8") as stream:
            stream.write("## [17:00:00] User\n다른 주제.\n## [17:01:00] Assistant\n무관한 응답.\n")
        result = self.search("약속", scope="conversations", neighbors=1)
        self.assertTrue(any(r["via"] == "adjacent-unverified" for r in result["results"]))
        self.assertTrue(any(r["kind"] == "memory" for r in result["results"]))

    def test_cli_is_read_only_and_does_not_create_empty_memory_files(self):
        self.conversation(tags="약속")
        def snapshot():
            return {p.relative_to(self.root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in self.root.rglob("*") if p.is_file()}
        before = snapshot()
        run = subprocess.run([sys.executable, "-B", str(SCRIPTS / "recall.py"),
                              "--project-root", str(self.root), "--term", "약속"],
                             capture_output=True, encoding="utf-8", timeout=20)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(len(json.loads(run.stdout)["results"]), 1)
        self.assertEqual(snapshot(), before)
        self.assertFalse((self.root / "MEMORY.md").exists())

    def test_empty_store_and_literal_regex_characters(self):
        self.assertEqual(self.search("약속")["stats"]["files"], 0)
        self.conversation(question="정규식 .* 설명해", tags="정규식")
        self.assertEqual(len(self.search(".*")["results"]), 1)
        self.assertEqual(self.search("없는말.*")["results"], [])

    def test_refined_memory_wins_a_keyword_tie_and_still_brings_its_evidence(self):
        self.entry(1, "가족여행", "evidence: conversations/2026-01-01-codex.md 09:00", tags="가족여행")
        self.conversation(question="이번 여행 조건을 기억해?", tags="가족여행")
        results = self.search("가족여행", limit=1)["results"]
        self.assertEqual(results[0]["kind"], "memory")
        self.assertIn("이번 여행 조건", next(r for r in results if r["via"] == "evidence")["content"])

    def test_recency_breaks_conversation_ties_without_cutting_off_old_history(self):
        self.conversation(name="2020-01-01-codex.md", answer="예전에는 오전.", tags="약속")
        self.conversation(name="2026-01-01-codex.md", answer="이번에는 오후.", tags="약속")
        result = self.search("약속", scope="conversations", limit=1)["results"][0]
        self.assertIn("이번에는 오후", result["content"])
        self.assertEqual(len(self.search("약속", scope="conversations")["results"]), 2)


if __name__ == "__main__":
    unittest.main()
