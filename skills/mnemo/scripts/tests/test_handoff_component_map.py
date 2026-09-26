"""핸드오프의 부품 지도 점검 — owners.json 계약만 읽고 판정한다.

TermSnap 부품 지도는 LLM이 쓰고 코드가 검증한다. 코드는 "미분류다"까지만 알고 고치지 못하므로,
변경 맥락을 쥔 에이전트가 인계하는 순간에 상기시킨다. 스킬은 판정만 하고 지도를 고치지 않으며,
소스 판정 규칙(확장자·제외 폴더)을 복제하지 않는다.
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import create_handoff as creator
import validate_handoff as validator

NO_GIT = {"untracked_files": [], "renamed_files": []}


class ComponentMapCheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.generated = datetime.now().astimezone().replace(microsecond=0) - timedelta(hours=1)

    def touch(self, path, when=None, text="x"):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
        stamp = (when or datetime.now().astimezone()).timestamp()
        os.utime(target, (stamp, stamp))
        return target

    def contract(self, owners=None, uncovered=None, errors=0, **extra):
        # 지도 원본은 산출물보다 먼저 저장됐다 — 기본 상태는 "최신".
        self.touch(creator.COMPONENT_MAP, self.generated - timedelta(minutes=5), "{}")
        data = {"format": "termsnap-component-owners/1", "generatedAt": self.generated.isoformat(),
                "mapPath": creator.COMPONENT_MAP, "mapExists": True,
                "status": {"errors": errors, "warnings": 0},
                "owners": {p: "app.core" for p in (owners or [])}, "uncovered": list(uncovered or [])}
        data.update(extra)
        target = self.root / creator.COMPONENT_OWNERS
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(data), encoding="utf-8")

    def check(self, observed, git=NO_GIT):
        return creator.component_map_check(self.root, observed, git)

    def test_no_source_map_omits_line(self):
        self.touch("src/a.cs")
        self.assertIsNone(self.check(["src/a.cs"]))

    def test_map_without_owners_or_with_other_format_is_not_run(self):
        self.touch(creator.COMPONENT_MAP)
        self.assertTrue(self.check([]).startswith("NOT RUN — owners.json 없음"))
        self.contract(format="something-else/2")
        self.assertTrue(self.check([]).startswith("NOT RUN — owners.json 형식이 다름"))

    def test_map_newer_than_contract_needs_regeneration(self):
        self.contract(owners=["src/a.cs"])
        self.touch(creator.COMPONENT_MAP, self.generated + timedelta(minutes=1), "{}")
        line = self.check([])
        self.assertIn("산출물이 지도보다 오래됨", line)
        # 초 단위 generatedAt과 소수 초 mtime — 지도 저장 직후 재생성은 오래됨이 아니다.
        self.touch(creator.COMPONENT_MAP, self.generated + timedelta(milliseconds=600), "{}")
        self.assertTrue(self.check([]).startswith("RAN — OK"))

    def test_stub_generated_without_map_is_stale_not_all_unassigned(self):
        self.contract(uncovered=["src/a.cs"], mapExists=False)
        self.touch("src/a.cs")
        line = self.check(["src/a.cs"])
        self.assertIn("지도 없이 만든 스텁", line)
        self.assertNotIn("미배정", line)

    def test_session_file_in_uncovered_is_unassigned_with_path(self):
        self.contract(owners=["src/a.cs"], uncovered=["src/new.cs"])
        self.touch("src/a.cs")
        self.touch("src/new.cs")
        line = self.check(["src/a.cs", "src/new.cs"])
        self.assertIn("이번 세션 미배정 1 (src/new.cs)", line)
        self.assertIn("전체 미분류 1", line)

    def test_assigned_session_files_are_ok(self):
        self.contract(owners=["src/a.cs", "src/b.cs"], uncovered=["src/old.cs"])
        self.touch("src/a.cs")
        self.touch("src/b.cs")
        self.assertEqual(self.check(["src/a.cs", "src/b.cs"]),
                         "RAN — OK(이번 세션 소스 2개 모두 배정 · 지도 오류 0 · 전체 미분류 1)")
        self.assertIn("이번 세션 소스 변경 없음", self.check([]))

    def test_map_errors_are_reported_even_without_session_files(self):
        self.contract(owners=["src/a.cs"], errors=2)
        self.assertIn("지도 오류 2", self.check([]))

    def test_file_after_generation_needs_regeneration_but_older_is_ignored(self):
        self.contract(owners=["src/a.cs"])
        self.touch("src/fresh.cs")
        self.touch("src/before.cs", self.generated - timedelta(minutes=30))
        line = self.check(["src/fresh.cs", "src/before.cs"])
        self.assertIn("재생성 필요 1 (src/fresh.cs)", line)
        self.assertNotIn("before.cs", line)

    def test_handoff_records_and_unknown_folders_are_not_sources(self):
        """핸드오프 세션이 늘 고치는 기억·인계·지도 원본 때문에 매번 재생성 필요가 뜨면 경고가 소음이 된다."""
        self.contract(owners=["src/a.cs", "README.md"])
        for path in ("memory/architecture/060-x.md", "docs/handoffs/2026-09-27-000000-x.md",
                     "docs/guide.md", "src/notes.log", "src/new.cs"):
            self.touch(path)
        self.touch(creator.COMPONENT_MAP, self.generated - timedelta(minutes=5), "{}")
        line = self.check(["memory/architecture/060-x.md", "docs/handoffs/2026-09-27-000000-x.md",
                           creator.COMPONENT_MAP, "docs/guide.md", "src/notes.log", "src/new.cs"])
        self.assertIn("재생성 필요 1 (src/new.cs)", line)

    def test_paths_ignore_case_and_backslashes(self):
        self.contract(owners=["src/app.cs"], uncovered=["src/new.cs"])
        self.touch("src/App.cs")
        self.touch("src/New.cs")
        line = self.check(["src\\App.cs", "SRC/New.cs" if os.name == "nt" else "src/New.cs"])
        self.assertIn("이번 세션 미배정 1", line)
        self.assertNotIn("재생성 필요 1", line)

    def test_deleted_session_files_are_skipped(self):
        self.contract(owners=["src/a.cs"], uncovered=["src/gone.cs"])
        self.assertIn("이번 세션 소스 변경 없음", self.check(["src/gone.cs"]))

    def git(self, *args):
        subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", *args], cwd=self.root,
                       check=True, capture_output=True, timeout=30)

    def test_git_untracked_is_the_fallback_only_without_observations(self):
        self.git("init", "-q")
        self.contract(owners=["src/a.cs"], uncovered=["src/new.cs", "src/other.cs"])
        self.touch("src/new.cs")
        self.touch("src/other.cs")
        self.touch("src/a.cs")
        git_info = creator.get_git_info(str(self.root))
        line = self.check([], git_info)
        self.assertIn("이번 세션 미배정 2", line)
        self.assertIn("git 새 파일로 판정", line)
        # 관찰이 있으면 untracked(다른 세션 작업이 섞임)는 쓰지 않는다.
        line = self.check(["src/a.cs"], git_info)
        self.assertTrue(line.startswith("RAN — OK"), line)

    def test_git_rename_of_a_source_needs_regeneration_despite_old_mtime(self):
        """git mv는 mtime을 보존한다 — 옛 경로가 소스였는지로 판정한다."""
        self.git("init", "-q")
        self.touch("src/old.cs", self.generated - timedelta(minutes=30))
        self.git("add", "src/old.cs")
        self.git("commit", "-q", "-m", "init")
        self.git("mv", "src/old.cs", "src/renamed.cs")
        self.contract(owners=["src/old.cs"])
        git_info = creator.get_git_info(str(self.root))
        self.assertIn(("src/old.cs", "src/renamed.cs"), git_info["renamed_files"])
        line = self.check(["memory/x.md"], git_info)
        self.assertIn("재생성 필요 1 (src/renamed.cs)", line)


class ScaffoldComponentLineTests(unittest.TestCase):
    def scaffold(self, root):
        result = subprocess.run([sys.executable, str(SCRIPTS / "create_handoff.py"), "map",
                                 "--project-root", str(root)],
                                capture_output=True, text=True, encoding="utf-8",
                                errors="replace", cwd=str(root), timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result.stdout, sorted((root / "docs" / "handoffs").glob("*.md"))[-1].read_text(encoding="utf-8")

    def test_line_appears_only_for_projects_with_a_map(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / ".mnemo-root").touch()
            (root / "memory" / "architecture").mkdir(parents=True)
            _, text = self.scaffold(root)
            self.assertNotIn("Component map", text)

            (root / "codemap" / "components").mkdir(parents=True)
            (root / creator.COMPONENT_MAP).write_text("{}", encoding="utf-8")
            stdout, text = self.scaffold(root)
            self.assertIn("- Component map: NOT RUN — owners.json 없음", text)
            self.assertIn("[Mnemo] 부품 지도: NOT RUN", stdout)
            # 줄은 Session Memory Review 안, 앵커 색인 다음에 온다.
            review = text.split("## Session Memory Review", 1)[1].split("\n## ", 1)[0]
            self.assertLess(review.index("Anchor index"), review.index("Component map"))


class ComponentLineValidatorTests(unittest.TestCase):
    OPEN = "- Component map: RAN — 이번 세션 미배정 1 (src/new.cs) · 재생성 필요 0 · 전체 미분류 3 · 지도 오류 0 — 배정 후 MCP codemap_component_map으로 검증"

    def test_unresolved_findings_warn(self):
        notes = validator.check_component_map_line(f"## Session Memory Review\n\n{self.OPEN}\n")
        self.assertEqual(len(notes), 1)
        self.assertIn("미배정 1", notes[0])
        self.assertNotIn("지도 오류", notes[0])
        stale = "- Component map: RAN — 이번 세션 미배정 0 · 재생성 필요 2 (a, b) · 산출물이 지도보다 오래됨 · 전체 미분류 0 · 지도 오류 1 — 검증"
        notes = validator.check_component_map_line(stale)
        for item in ("재생성 필요 2", "지도 오류 1", "오래됨"):
            self.assertIn(item, notes[0])

    def test_assigned_deferred_or_not_run_pass(self):
        for tail in (" → 배정함: app.core", " → 보류: 소유 부품이 아직 없음"):
            self.assertEqual(validator.check_component_map_line(self.OPEN + tail), [])
        self.assertEqual(validator.check_component_map_line(self.OPEN + "\n  → 배정함: app.core\n"), [])
        self.assertEqual(validator.check_component_map_line(
            self.OPEN + " → 배정함: app.core; 검증 NOT RUN — MCP 없음"), [])
        self.assertEqual(validator.check_component_map_line(
            "- Component map: NOT RUN — owners.json 없음(TermSnap 구버전 또는 생성 전)"), [])

    def test_ok_or_absent_line_is_quiet(self):
        self.assertEqual(validator.check_component_map_line(
            "- Component map: RAN — OK(이번 세션 소스 2개 모두 배정 · 지도 오류 0 · 전체 미분류 5)"), [])
        self.assertEqual(validator.check_component_map_line("## Session Memory Review\n- Anchor index: RAN\n"), [])

    def test_next_bullet_is_not_a_continuation(self):
        text = self.OPEN + "\n- Memory/index updates: 배정함 없음\n"
        self.assertEqual(len(validator.check_component_map_line(text)), 1)


if __name__ == "__main__":
    unittest.main()
