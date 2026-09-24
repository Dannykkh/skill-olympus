import json
import os
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import validate_handoff as validator


DAY = "2026-05-01"
HANDOFF = f"# Handoff\n\n- Created: {DAY} 10:00:00\n"


class TagReservedFieldTests(unittest.TestCase):
    """그날 건드린 기억 항목이 태그 줄 예약 필드로 이어졌는지 — 경고만 낸다."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def write(self, name, text, day=DAY, clock="12:00:00"):
        target = self.root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
        stamp = datetime.strptime(f"{day} {clock}", "%Y-%m-%d %H:%M:%S").timestamp()
        os.utime(target, (stamp, stamp))

    def tags(self, *lines):
        body = "".join(f"## [10:00:00] Assistant\n\n답변\n\n{line}\n\n" for line in lines)
        self.write(f"conversations/{DAY}-claude.md", body)

    def notes(self):
        return validator.check_tag_reserved_fields(HANDOFF, self.root)

    def test_touched_entry_without_field_warns_with_exit(self):
        self.write("memory/gotchas/091-x.md", "# x\n`date: 2026-04-01`\n")
        self.tags("#tags: mnemo, handoff, origin")
        notes = self.notes()
        self.assertEqual(len(notes), 1)
        self.assertIn("gotcha:091", notes[0])
        self.assertIn("인계 응답", notes[0])

    def test_carried_field_is_quiet(self):
        self.write("memory/gotchas/091-x.md", "# x\n")
        self.write("memory/architecture/055-y.md", "# y\n")
        self.tags("#tags: mnemo, handoff, gotcha:091", "#tags: mnemo, thread, arch:055")
        self.assertEqual(self.notes(), [])

    def test_hyphen_and_short_forms_are_not_reserved_fields(self):
        self.write("memory/learned/032-z.md", "# z\n")
        self.tags("#tags: mnemo, learned-032, arch-057-confirmation, g:083")
        notes = self.notes()
        self.assertTrue(any("learned:032" in n and "태그 줄에 없습니다" in n for n in notes))
        loose = next(n for n in notes if "읽히지 않는 표기" in n)
        for pair in ("learned-032 → learned:032", "arch-057 → arch:057", "g:083 → gotcha:083"):
            self.assertIn(pair, loose)

    def test_superseding_entry_needs_supersedes_field(self):
        self.write("memory/architecture/059-new.md",
                   f"# new\n`date: {DAY}`\n`supersedes: [[058-old]]`\n")
        self.tags("#tags: mnemo, 전용기능, arch:059")
        notes = self.notes()
        self.assertEqual(len(notes), 1)
        self.assertIn("supersedes:#slug", notes[0])
        self.tags("#tags: mnemo, 전용기능, arch:059, supersedes:#058-old")
        self.assertEqual(self.notes(), [])

    def test_entries_from_other_days_and_non_entries_are_ignored(self):
        self.write("memory/gotchas/080-old.md", "# old\n", day="2026-04-30")
        self.write("memory/gotchas/index.md", "# index\n")
        self.write("memory/architecture/mnemo-unnumbered.md", "# unnumbered\n")
        self.tags("#tags: mnemo, handoff")
        self.assertEqual(self.notes(), [])

    def observe(self, session, clock, path):
        record = {"tool": "Edit", "timestamp": f"{DAY}T{clock}+09:00", "session": session,
                  "input": json.dumps({"file_path": str(self.root / path)})}
        log = self.root / "memory" / "learned" / "observations.jsonl"
        log.parent.mkdir(parents=True, exist_ok=True)
        with log.open("a", encoding="utf-8") as out:
            out.write(json.dumps(record) + "\n")

    def test_handoff_judges_only_its_own_session(self):
        """같은 날 두 세션: A의 핸드오프는 A가 고친 항목과 A의 시간대 태그 줄만 본다 (gotcha 091)."""
        a, b = "aaaaaaaa-0000-4000-8000-000000000001", "bbbbbbbb-0000-4000-8000-000000000002"
        self.write("memory/gotchas/091-x.md", "# x\n")
        self.write("memory/architecture/055-y.md", "# y\n")
        self.observe(a, "10:05:00", "memory/gotchas/091-x.md")
        self.observe(b, "14:05:00", "memory/architecture/055-y.md")
        self.write(f"conversations/{DAY}-claude.md",
                   "## [10:00] User\n\n요청\n\n## [10:10:00] Assistant\n\n답\n\n#tags: mnemo, handoff\n\n"
                   "## [14:00] User\n\n다른 요청\n\n## [14:10:00] Assistant\n\n답\n\n"
                   "#tags: mnemo, arch:055, gotcha:091, learned-032\n")
        # 이전 핸드오프의 세션을 인용한 줄이 Origin보다 앞에 있어도 이 핸드오프의 세션을 잡는다.
        handoff = (f"# Handoff\n\n- Created: {DAY} 10:30:00\n- Continues from: 이전 session {b}\n\n"
                   f"## Origin\n\n| 출처 | session {a}, user turns 10:00 |\n")
        notes = validator.check_tag_reserved_fields(handoff, self.root)
        self.assertEqual(len(notes), 1, notes)
        self.assertIn("gotcha:091", notes[0])       # B의 태그 줄이 A의 누락을 가리지 않는다
        self.assertNotIn("arch:055", notes[0])      # B가 고친 항목은 A의 누락이 아니다
        self.assertNotIn("하루 전체", notes[0])
        self.assertFalse(any("learned-032" in n for n in notes))  # B의 표기 오류도 A 몫이 아니다

    def test_handoff_reply_after_creation_counts_for_the_session(self):
        """경고가 붙이라고 하는 인계 응답은 핸드오프 생성 뒤에 저장된다 — 그 응답도 세션 창 안이다."""
        a = "aaaaaaaa-0000-4000-8000-000000000001"
        self.write("memory/gotchas/091-x.md", "# x\n")
        self.observe(a, "10:05:00", "memory/gotchas/091-x.md")
        self.write(f"conversations/{DAY}-claude.md",
                   "## [10:00] User\n\n요청\n\n## [10:40:00] Assistant\n\n인계\n\n#tags: handoff, gotcha:091\n")
        handoff = (f"# Handoff\n\n- Created: {DAY} 10:30:00\n\n| 출처 | session {a}, user turns 10:00 |\n")
        self.assertEqual(validator.check_tag_reserved_fields(handoff, self.root), [])

    def test_entry_edited_outside_edit_tool_is_caught_by_session_window(self):
        """Bash·스크립트로 고친 항목은 관찰 로그에 없다 — 세션 시간 창 안의 mtime으로 잡는다."""
        a = "aaaaaaaa-0000-4000-8000-000000000001"
        self.write("memory/architecture/055-y.md", "# y\n", clock="10:02:00")
        self.write("memory/gotchas/091-x.md", "# x\n", clock="10:20:00")  # python으로 덧붙임 (관찰 없음)
        self.write("memory/gotchas/080-z.md", "# z\n", clock="14:00:00")  # 다른 세션 시간대
        self.observe(a, "10:02:00", "memory/architecture/055-y.md")
        self.write(f"conversations/{DAY}-claude.md",
                   "## [10:00] User\n\n요청\n\n## [10:25:00] Assistant\n\n답\n\n#tags: mnemo, arch:055\n")
        handoff = (f"# Handoff\n\n- Created: {DAY} 10:30:00\n\n| 출처 | session {a}, user turns 10:00 |\n")
        notes = validator.check_tag_reserved_fields(handoff, self.root)
        self.assertEqual(len(notes), 1, notes)
        self.assertIn("gotcha:091", notes[0])
        self.assertNotIn("gotcha:080", notes[0])

    def test_session_without_observations_falls_back_and_says_so(self):
        self.write("memory/gotchas/091-x.md", "# x\n")
        self.tags("#tags: mnemo, handoff")
        handoff = HANDOFF + "| 출처 | session cccccccc-0000-4000-8000-000000000003 |\n"
        notes = validator.check_tag_reserved_fields(handoff, self.root)
        self.assertEqual(len(notes), 1)
        self.assertIn("관찰 기록이 없어", notes[0])
        self.assertIn("gotcha:091", notes[0])
        # 메타데이터 표기 `Session ID: <uuid>`(Codex 핸드오프)도 세션으로 읽는다.
        handoff = HANDOFF + "- Session ID: cccccccc-0000-4000-8000-000000000003\n"
        self.assertIn("관찰 기록이 없어", validator.check_tag_reserved_fields(handoff, self.root)[0])

    def test_no_conversation_or_created_date_means_no_judgement(self):
        self.write("memory/gotchas/091-x.md", "# x\n")
        self.assertEqual(self.notes(), [])
        self.write(f"conversations/{DAY}-toollog.md", "#tags: mnemo\n")
        self.assertEqual(self.notes(), [])
        self.tags("#tags: mnemo")
        self.assertEqual(validator.check_tag_reserved_fields("# Handoff\n", self.root), [])


if __name__ == "__main__":
    unittest.main()
