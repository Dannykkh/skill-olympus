"""스캐폴드가 사람의 기억에 기대지 않고 채우는 칸들.

핸드오프에서 가장 비어 있던 칸은 Origin의 '요구'(37건 중 4건)와 '무엇을 대체하나'였다.
둘 다 쓰는 사람이 기억해내야 하는데, 쓰는 시점은 컨텍스트가 찬 세션 끝이다.
요구는 현재 CLI가 세션 문맥에서 명시적으로 전달하고, 바뀐 파일은 관찰 로그에서,
대체 후보는 그 파일을 근거로 삼는 기존 기억 항목에. 스캐폴드가 그것을 가져온다.

판정은 여전히 에이전트가 한다. 후보는 대체를 주장하지 않고, 미확인 요구는 빈칸으로 둔다.
"""

import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
CREATE = SCRIPTS / "create_handoff.py"
TODAY = datetime.now().strftime("%Y-%m-%d")


class HandoffAutofillTests(unittest.TestCase):
    def scaffold(self, root: Path, *args):
        result = subprocess.run([sys.executable, str(CREATE), *args, "--project-root", str(root)],
                                capture_output=True, text=True, encoding="utf-8",
                                errors="replace", cwd=str(root), timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        written = sorted((root / "docs" / "handoffs").glob("*.md"))
        self.assertTrue(written, "핸드오프가 생성되지 않았습니다")
        return written[-1].read_text(encoding="utf-8")

    def project(self, temp):
        root = Path(temp)
        (root / ".mnemo-root").touch()
        (root / "memory" / "architecture").mkdir(parents=True)
        (root / "conversations").mkdir()
        return root

    def test_unscoped_daily_requests_are_not_used_as_origin(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            for cli in ["claude", "codex"]:
                (root / "conversations" / f"{TODAY}-{cli}.md").write_text(
                    "## [09:12] User\n\nGenerate a concise, single-line task title\n"
                    "## [12:00] User\n\n다른 세션의 요청\n", encoding="utf-8")
            text = self.scaffold(root, "no-guess")
            self.assertIn("[TODO: 요청받은 것", text)
            self.assertNotIn("single-line task title", text)
            self.assertNotIn("다른 세션의 요청", text)

    def test_explicit_current_origin_wins_over_other_sessions(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            (root / "conversations" / f"{TODAY}-codex.md").write_text(
                "## [09:12] User\n\nGenerate a concise, single-line task title\n"
                "## [10:12] User\n\n이전 세션의 버그 수정\n", encoding="utf-8")
            text = self.scaffold(root, "current", "--origin", "현재 세션: Mnemo | 개선\n검증",
                                 "--origin-source", "session current-123, user request")
            self.assertIn("| 요구 | 현재 세션: Mnemo &#124; 개선 검증 |", text)
            self.assertIn("session current-123", text)
            self.assertNotIn("single-line task title", text)
            self.assertNotIn("이전 세션의 버그 수정", text)

    def test_latest_handoff_is_not_implicitly_the_origin(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            old = root / "docs/handoffs/2020-01-01-120000-unrelated.md"
            old.parent.mkdir(parents=True)
            old.write_text("# Handoff: unrelated\n", encoding="utf-8")
            text = self.scaffold(root, "new-task")
            self.assertNotIn("unrelated", text)
            self.assertIn("[TODO: 사용자 요청", text)

    def test_partial_or_blank_origin_fails_before_writes(self):
        for args in [("--origin", "request"), ("--origin-source", "session"),
                     ("--origin", " ", "--origin-source", "session")]:
            with self.subTest(args=args), tempfile.TemporaryDirectory() as temp:
                root = self.project(temp)
                result = subprocess.run([sys.executable, str(CREATE), "bad", "--project-root", str(root), *args],
                                        capture_output=True, text=True, encoding="utf-8", timeout=30)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((root / "docs/handoffs").exists())

    def test_requirement_stays_a_todo_when_no_conversation_exists(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            text = self.scaffold(root, "no-conversation")
            self.assertIn("[TODO: 요청받은 것", text)

    def test_observed_edits_fill_files_modified_without_git(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            log = root / "memory" / "gotchas"
            log.mkdir(parents=True)
            records = [
                {"tool": "Edit", "timestamp": f"{TODAY}T09:20:00", "session": "s1",
                 "input": json.dumps({"file_path": "skills/mnemo/scripts/create_handoff.py"})},
                # 절대경로로 남은 옛 기록도 루트 기준으로 정규화되어야 한다.
                {"tool": "Write", "timestamp": f"{TODAY}T09:25:00", "session": "s1",
                 "input": {"file_path": str(root / "hooks" / "save-turn.sh")}},
                # 어제 것은 이번 세션이 아니다.
                {"tool": "Edit", "timestamp": "2020-01-01T09:00:00", "session": "old",
                 "input": json.dumps({"file_path": "skills/old/thing.py"})},
                # 읽기는 기록되지 않지만, 섞여 들어와도 변경으로 세지 않는다.
                {"tool": "Read", "timestamp": f"{TODAY}T09:30:00", "session": "s1",
                 "input": json.dumps({"file_path": "skills/mnemo/SKILL.md"})},
            ]
            (log / "observations.jsonl").write_text(
                "\n".join(json.dumps(r, ensure_ascii=False) for r in records), encoding="utf-8")
            text = self.scaffold(root, "observed")
            self.assertIn("skills/mnemo/scripts/create_handoff.py", text)
            self.assertIn("hooks/save-turn.sh", text)
            self.assertNotIn("skills/old/thing.py", text)
            self.assertNotIn("skills/mnemo/SKILL.md", text)

    def test_entries_anchored_on_touched_files_are_offered_as_supersede_candidates(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            (root / "memory" / "architecture" / "007-daedalus-native-only.md").write_text(
                "# daedalus-native-only\n\n`status: ✅ CURRENT`\n\n"
                "- 결정: 네이티브 전용. 근거 파일 skills/workpm/SKILL.md\n", encoding="utf-8")
            (root / "memory" / "architecture" / "013-unrelated.md").write_text(
                "# unrelated\n\n- 이 항목은 다른 파일만 가리킨다: hooks/other.sh\n", encoding="utf-8")
            log = root / "memory" / "learned"
            log.mkdir(parents=True)
            (log / "observations.jsonl").write_text(json.dumps(
                {"tool": "Edit", "timestamp": f"{TODAY}T10:00:00", "session": "s2",
                 "input": json.dumps({"file_path": "skills/workpm/SKILL.md"})}, ensure_ascii=False),
                encoding="utf-8")
            text = self.scaffold(root, "supersede-candidate")
            self.assertIn("007-daedalus-native-only", text)
            self.assertNotIn("013-unrelated", text)
            # 후보는 대체를 주장하지 않는다.
            self.assertIn("무관하면 그대로 둡니다", text)
            # 결정 표에 대체 대상 칸이 있어야 후보를 적을 자리가 생긴다.
            self.assertIn("대체 대상", text)

    def test_memory_and_handoff_files_are_not_supersede_candidates(self):
        """기억·핸드오프 자신을 고친 것은 결정의 근거가 아니다 — 계보 수확기와 같은 기준."""
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            (root / "memory" / "architecture" / "020-self.md").write_text(
                "# self\n\n- memory/architecture/index.md 를 가리킨다\n", encoding="utf-8")
            log = root / "memory" / "learned"
            log.mkdir(parents=True)
            (log / "observations.jsonl").write_text(json.dumps(
                {"tool": "Edit", "timestamp": f"{TODAY}T10:00:00", "session": "s3",
                 "input": json.dumps({"file_path": "memory/architecture/index.md"})}, ensure_ascii=False),
                encoding="utf-8")
            text = self.scaffold(root, "memory-only")
            self.assertNotIn("020-self", text)



class DecisionReachesMemoryTests(unittest.TestCase):
    """이 세션의 결정이 기억까지 갔는가 — 검증기의 이번 세션 범위 점검.

    닥터는 프로젝트 전체 백로그를 본다. 인계하려는 사람 앞에 그것을 펼치면 읽지 않게 된다.
    핸드오프 순간에 맞는 것은 이번 핸드오프가 적은 결정뿐이다.
    """

    VALIDATE = SCRIPTS / "validate_handoff.py"

    BODY = """## Current State Summary

디지털 쓰레드 조회를 붙였고 다음 세션은 훅 배선을 이어가면 됩니다. 테스트까지 통과한 상태입니다.

## Feature/Flow/Decision Snapshot

### Implemented Features

| Feature/Change | Visible Behavior | Entry Point | Implementation Anchors | Verification |
|---|---|---|---|---|
| none — 탐색만 한 세션 | - | - | - | 기록 없음 |

## Work Completed

### Decisions Made

| Decision | Options Considered | Rationale | 대체 대상 |
|----------|-------------------|-----------|-----------|
| {decision} | 전체 닥터 / 세션 범위 | 백로그는 읽히지 않는다 | {supersedes} |

## Important Context

조회는 아직 규율 의존이고 훅 배선은 남아 있습니다. 다음 세션이 먼저 볼 것은 그 배선입니다.

## Immediate Next Steps

1. 훅 또는 코드맵에 조회를 배선한다
2. 되짚기 스크립트를 만든다
"""

    def handoff(self, root, *, decision, supersedes, day="2026-09-19"):
        directory = root / "docs" / "handoffs"
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / f"{day}-101010-scoped.md"
        path.write_text(f"# Handoff: scoped\n\n## Session Metadata\n- Created: {day} 10:10:10\n\n"
                        + self.BODY.format(decision=decision, supersedes=supersedes), encoding="utf-8")
        return path

    def validate(self, path):
        return subprocess.run([sys.executable, str(self.VALIDATE), str(path)],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=60)

    def project(self, temp):
        root = Path(temp)
        (root / ".mnemo-root").touch()
        (root / "memory" / "architecture").mkdir(parents=True)
        return root

    def test_missing_supersede_target_blocks_the_handoff(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            path = self.handoff(root, decision="세션 범위로 점검한다", supersedes="[[099-nonexistent]]")
            result = self.validate(path)
            self.assertIn("099-nonexistent", result.stdout)
            self.assertNotEqual(result.returncode, 0, "계보가 끊겼는데 통과시켰습니다")

    def test_existing_supersede_target_passes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            (root / "memory" / "architecture" / "040-old.md").write_text(
                "# old\n\n`tags: a, b, c`\n`date: 2026-09-01`\n`source: claude`\n\n- 옛 결정\n", encoding="utf-8")
            path = self.handoff(root, decision="세션 범위로 점검한다", supersedes="[[040-old]]")
            result = self.validate(path)
            self.assertNotIn("찾지 못했습니다", result.stdout)

    def test_decision_recorded_but_no_entry_touched_that_day_is_a_warning(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            path = self.handoff(root, decision="세션 범위로 점검한다", supersedes="none",
                                day=datetime.now().strftime("%Y-%m-%d"))
            result = self.validate(path)
            self.assertIn("기억으로 가지 않았습니다", result.stdout)

    def test_placeholder_rows_are_not_decisions(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            path = self.handoff(root, decision="[TODO: Document key decisions]", supersedes="none",
                                day=datetime.now().strftime("%Y-%m-%d"))
            result = self.validate(path)
            self.assertNotIn("기억으로 가지 않았습니다", result.stdout)


class PeriodicDoctorVisitTests(unittest.TestCase):
    """기억이 있는 프로젝트에서는 조건부 진단이 언제나 건너뛴다.

    그러면 닥터의 점검은 사람이 따로 기억해서 부를 때만 도는데, 그건 이 세션이 실패로
    측정한 규율 의존이다. 그래서 두 번째 방아쇠를 둔다 — 마지막 방문이 오래됐으면 본다.
    핸드오프는 사람이 프로젝트를 생각하고 있는 순간이고, 한 달에 한 번이면 의식이 되지 않는다.
    """

    def project(self, temp, *, with_memory=True):
        root = Path(temp)
        (root / ".mnemo-root").touch()
        (root / "memory" / "architecture").mkdir(parents=True)
        (root / "conversations").mkdir()
        if with_memory:
            (root / "memory" / "architecture" / "001-real.md").write_text(
                "# real\n\n`tags: a, b, c`\n`date: 2026-01-01`\n`source: claude`\n\n"
                "- 결정: 이 항목은 본문이 있는 진짜 아키텍처 기억이다\n", encoding="utf-8")
            (root / "MEMORY.md").write_text(
                "# MEMORY\n\n- [아키텍처](memory/architecture/001-real.md)\n", encoding="utf-8")
        return root

    def chart(self, root, day):
        (root / "memory" / ".mnemo-doctor-chart.md").write_text(
            f"# Mnemo 진료 기록\n\n## {day} 10:00 · 진단만\n- 수치: entries 1\n", encoding="utf-8")

    def scaffold(self, root, slug):
        result = subprocess.run([sys.executable, str(CREATE), slug, "--project-root", str(root)],
                                capture_output=True, text=True, encoding="utf-8",
                                errors="replace", cwd=str(root), timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        written = sorted((root / "docs" / "handoffs").glob("*.md"))
        return written[-1].read_text(encoding="utf-8")

    def test_recent_visit_skips_the_doctor(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.chart(root, datetime.now().strftime("%Y-%m-%d"))
            text = self.scaffold(root, "recent")
            self.assertIn("SKIPPED", text)
            self.assertIn("주기", text)

    def test_old_visit_triggers_the_doctor_even_when_memory_exists(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.chart(root, (datetime.now() - timedelta(days=40)).strftime("%Y-%m-%d"))
            text = self.scaffold(root, "overdue")
            self.assertIn("RAN", text)
            self.assertIn("40일 전", text)

    def test_never_visited_project_gets_one_visit_then_rests(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            first = self.scaffold(root, "first")
            self.assertIn("RAN", first)
            self.assertIn("방문 기록 없음", first)
            # 방문이 차트에 남았으므로 다음 핸드오프는 쉰다.
            self.assertTrue((root / "memory" / ".mnemo-doctor-chart.md").is_file())
            second = self.scaffold(root, "second")
            self.assertIn("SKIPPED", second)

    def test_missing_architecture_memory_still_triggers_regardless_of_the_timer(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp, with_memory=False)
            self.chart(root, datetime.now().strftime("%Y-%m-%d"))
            text = self.scaffold(root, "no-memory")
            self.assertIn("RAN", text)
            self.assertIn("아키텍처 기억 없음", text)


class RelativizeTests(unittest.TestCase):
    """관찰 로그의 경로를 프로젝트 루트 기준 상대경로로. Windows·macOS 표기 모두 같은 결과여야 한다."""

    def test_windows_and_mac_paths_keep_dot_folders(self):
        sys.path.insert(0, str(SCRIPTS))
        from create_handoff import _relativize
        cases = [
            (Path("D:/git/proj"), "D:\\git\\proj\\.github\\workflows\\ci.yml", ".github/workflows/ci.yml"),
            (Path("D:/git/proj"), "d:/git/proj/src/app.py", "src/app.py"),  # 드라이브 문자 대소문자
            (Path("/Users/me/proj"), "/Users/me/proj/.claude/settings.json", ".claude/settings.json"),
            (Path("/Users/me/proj"), "./src/app.py", "src/app.py"),
            (Path("/Users/me/proj"), "../other/app.py", None),  # 루트 밖을 루트의 파일로 만들지 않는다
        ]
        for root, raw, expected in cases:
            self.assertEqual(_relativize(raw, root), expected, raw)


if __name__ == "__main__":
    unittest.main()
