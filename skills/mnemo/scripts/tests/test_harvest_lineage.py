"""Missing inputs must be a normal result, not a crash — that is the whole contract.

The harvester runs in projects that never had a design pipeline, that predate the
handoff template, and that record no decisions at all. Every one of those degrades
to an informative exit 0; only an unresolvable project root fails.
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
SCRIPT = SCRIPTS / "harvest_lineage.py"


class HarvestLineageTests(unittest.TestCase):
    def run_harvest(self, project, *args):
        return subprocess.run([sys.executable, str(SCRIPT), "--project-root", str(project), *args],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=60)

    def make_project(self, temp, handoffs=None):
        """핸드오프를 선택적으로 심은 Git 프로젝트를 만든다."""
        project = Path(temp) / "project"
        project.mkdir(parents=True)
        subprocess.run(["git", "init", "-q"], cwd=project, check=True, timeout=30)
        if handoffs is not None:
            directory = project / "docs" / "handoffs"
            directory.mkdir(parents=True)
            for name, body in handoffs.items():
                (directory / name).write_text(body, encoding="utf-8")
        return project

    def test_normalize_strips_only_a_leading_dot_slash(self):
        """lstrip('./')는 `.github/ci.yml`을 `github/ci.yml`로 만들었다 — 접두어만 뗀다."""
        sys.path.insert(0, str(SCRIPTS))
        import harvest_lineage
        for raw, expected in [(".github/ci.yml", ".github/ci.yml"), ("./src/a.py", "src/a.py"),
                              ("/src/a.py", "src/a.py"), ("src\\a.py:12", "src/a.py"),
                              ("../other/a.py", "../other/a.py")]:
            self.assertEqual(harvest_lineage.normalize_path(raw), expected, raw)

    def test_missing_handoff_directory_is_not_an_error(self):
        with tempfile.TemporaryDirectory() as temp:
            result = self.run_harvest(self.make_project(temp))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("핸드오프 디렉터리가 없습니다", result.stdout)
            self.assertIn("create_handoff.py", result.stdout)

    def test_handoffs_without_files_modified_section(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, {
                "2026-01-01-120000-old.md": "# Handoff: 옛 템플릿\n\n## Current State Summary\n조사만 함\n",
            })
            result = self.run_harvest(project)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("수확한 파일이 0개", result.stdout)
            self.assertIn("Files Modified", result.stdout)

    def test_changes_without_any_recorded_reason_fall_back_to_session_title(self):
        """계획도 결정도 없는 세션. 변경 사실은 지키고 이유는 추정임을 드러낸다."""
        with tempfile.TemporaryDirectory() as temp:
            table = "### Files Modified\n| File | Change |\n|---|---|\n| src/App.cs | {} |\n"
            project = self.make_project(temp, {
                "2026-02-02-090000-hotfix.md": "# Handoff: 급하게 고친 세션\n\n" + table.format("널 체크"),
                "2026-03-03-090000-logging.md": "# Handoff: 로깅 세션\n\n" + table.format("예외 로깅"),
            })
            result = self.run_harvest(project)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("src/App.cs", result.stdout)
            self.assertIn("[주제 추정]", result.stdout)       # 지어내지 않고 출처를 밝힌다
            self.assertIn("이유가 결정으로 기록되지 않은 변경", result.stdout)

    def test_recorded_decisions_are_used_verbatim_without_a_guess_marker(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, {
                "2026-04-04-090000-store.md": (
                    "# Handoff: 저장소 교체\n\n"
                    "### Files Modified\n| File | Change |\n|---|---|\n| src/Store.cs | SQLite 전환 |\n\n"
                    "### Decisions Made\n| Decision | Why |\n|---|---|\n"
                    "| 권위 저장소는 SQLite | 프로세스 재시작에도 살아남아야 함 |\n"
                ),
            })
            result = self.run_harvest(project, "--all")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("권위 저장소는 SQLite", result.stdout)
            self.assertNotIn("추정", result.stdout)
            self.assertNotIn("| Decision |", result.stdout)   # 헤더 행이 이유로 새면 안 된다

    def test_underscores_in_filenames_survive_markdown_stripping(self):
        """RELEASE_NOTES.md가 RELEASENOTES.md가 되면 조용히 틀린 기억이 남는다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, {
                "2026-07-07-090000-rel.md": (
                    "# Handoff: 릴리즈\n\n### Files Modified\n| File | Change |\n|---|---|\n"
                    "| `RELEASE_NOTES.md` | v1 섹션 |\n| `scripts/analyze_codemap_usage.py` | 신규 |\n"
                ),
            })
            result = self.run_harvest(project, "--all")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("RELEASE_NOTES.md", result.stdout)
            self.assertIn("scripts/analyze_codemap_usage.py", result.stdout)
            self.assertNotIn("RELEASENOTES.md", result.stdout)

    def test_multiple_files_in_one_cell_are_split(self):
        """한 칸에 묶어 쓴 기록을 통째로 버리면 변경 이력이 통째로 사라진다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, {
                "2026-08-08-090000-docs.md": (
                    "# Handoff: 문서\n\n### Files Modified\n| File | Change |\n|---|---|\n"
                    "| `README.md`, `README.ko.md` | 동기화 |\n"
                    "| src/A.cs / src/B.cs | 분리 |\n"
                ),
            })
            result = self.run_harvest(project, "--all")
            self.assertEqual(result.returncode, 0, result.stderr)
            for expected in ("README.md", "README.ko.md", "src/A.cs", "src/B.cs"):
                self.assertIn(expected, result.stdout)

    def test_brace_expansion_is_left_alone_rather_than_split_into_garbage(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, {
                "2026-09-09-090000-res.md": (
                    "# Handoff: 리소스\n\n### Files Modified\n| File | Change |\n|---|---|\n"
                    "| Resources/{layout-base,cose-base}.js | 추가 |\n"
                ),
            })
            result = self.run_harvest(project, "--all")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertNotIn("cose-base}.js", result.stdout)

    def test_origin_supplies_the_reason_when_no_decision_was_recorded(self):
        """Origin은 파일명에서 추론한 제목보다 언제나 나은 근거다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, {
                "2026-09-16-100000-login.md": (
                    "# Handoff: 로그인\n\n## Origin\n\n| 항목 | 내용 |\n|---|---|\n"
                    "| 요구 | 공유 계정 대신 개인 계정으로 로그인하게 해달라 |\n"
                    "| 출처 | 사용자 요청 |\n\n"
                    "### Files Modified\n| File | Change |\n|---|---|\n| src/Auth.cs | 진입점 추가 |\n"
                ),
            })
            result = self.run_harvest(project, "--all")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("[요구 추정] 공유 계정 대신", result.stdout)
            self.assertNotIn("[주제 추정]", result.stdout)

    def test_unfilled_origin_does_not_masquerade_as_a_reason(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, {
                "2026-09-16-110000-x.md": (
                    "# Handoff: 미기입 세션\n\n## Origin\n\n| 항목 | 내용 |\n|---|---|\n"
                    "| 요구 | [TODO: 요청받은 것] |\n\n"
                    "### Files Modified\n| File | Change |\n|---|---|\n| src/X.cs | 수정 |\n"
                ),
            })
            result = self.run_harvest(project, "--all")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("[주제 추정]", result.stdout)
            self.assertNotIn("TODO", result.stdout)

    def test_query_miss_reports_absence_without_failing(self):
        """'없음 확인'도 유효한 결과다. 착수 게이트를 막으면 안 된다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, {
                "2026-05-05-090000-x.md": "# Handoff: x\n\n### Files Modified\n| File | Change |\n|---|---|\n| src/A.cs | a |\n",
            })
            result = self.run_harvest(project, "--file", "NeverExisted.cs")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("변경 계보가 없습니다", result.stdout)
            self.assertIn("신규 파일", result.stdout)

    def test_unresolvable_project_root_is_the_only_failure(self):
        with tempfile.TemporaryDirectory() as temp:
            loose = Path(temp) / "not-a-project"
            loose.mkdir()
            result = self.run_harvest(loose)
            self.assertEqual(result.returncode, 2)
            self.assertIn("[ERROR]", result.stdout)

    def test_harvest_never_writes_unless_out_is_given(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, {
                "2026-06-06-090000-y.md": "# Handoff: y\n\n### Files Modified\n| File | Change |\n|---|---|\n| src/B.cs | b |\n",
            })
            before = sorted(p.relative_to(project).as_posix() for p in project.rglob("*") if p.is_file())
            self.run_harvest(project, "--all")
            after = sorted(p.relative_to(project).as_posix() for p in project.rglob("*") if p.is_file())
            self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
