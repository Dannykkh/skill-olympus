"""Anchors turn silent memory rot into a visible problem — without touching the memory.

Git cannot watch memory/ (it is normally ignored), so an entry citing a file that was
renamed months ago keeps reading as true. These tests pin the judgement calls: line
numbers are never verified, a bare filename means "the file with that name" rather than
"root/<name>", CodeMap only supplies move candidates that the filesystem confirms, and
nothing on disk is ever modified.
"""

import subprocess
import sys
import tempfile
import unittest
import os
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
SCRIPT = SCRIPTS / "check_memory_anchors.py"


class MemoryAnchorTests(unittest.TestCase):
    def run_check(self, project, *args, env=None):
        return subprocess.run([sys.executable, str(SCRIPT), "--project-root", str(project), *args],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=90, env=env)

    def make_project(self, temp, *, memory=None, sources=(), codemap=None):
        project = Path(temp) / "project"
        project.mkdir(parents=True)
        subprocess.run(["git", "init", "-q"], cwd=project, check=True, timeout=30)
        for rel in sources:
            path = project / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("// 내용\n", encoding="utf-8")
        if memory is not None:
            memory_dir = project / "memory"
            memory_dir.mkdir(exist_ok=True)
            (memory_dir / "architecture.md").write_text(memory, encoding="utf-8")
        if codemap is not None:
            codemap_dir = project / "codemap"
            codemap_dir.mkdir(exist_ok=True)
            (codemap_dir / "files.md").write_text(codemap, encoding="utf-8")
        return project

    def test_live_anchor_passes(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                memory="### 릴레이 구조\n\n바인딩 기입은 `src/Relay.cs` 한 곳뿐이다.\n",
                sources=["src/Relay.cs"])
            result = self.run_check(project)
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("[PASS]", result.stdout)

    def test_missing_anchor_is_reported_with_its_entry_title(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                memory="### 릴레이 구조\n\n바인딩 기입은 `src/Gone.cs` 한 곳뿐이다.\n")
            result = self.run_check(project)
            self.assertEqual(result.returncode, 1)
            self.assertIn("[STALE]", result.stdout)
            self.assertIn("src/Gone.cs", result.stdout)
            self.assertIn("릴레이 구조", result.stdout)

    def test_line_numbers_are_never_verified(self):
        """라인은 늘 밀린다. 라인 불일치를 stale로 부르면 신호가 아니라 소음이 된다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                memory="### 앵커\n\n기입 지점은 `src/Relay.cs:9999` 이다.\n",
                sources=["src/Relay.cs"])
            result = self.run_check(project)
            self.assertEqual(result.returncode, 0, result.stdout)

    def test_bare_filename_resolves_anywhere_in_the_tree(self):
        """`GRAPH_REPORT.md`는 '루트의 그 파일'이 아니라 '그 이름의 파일'을 뜻한다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                memory="### 보고서\n\n그래프 품질은 `GRAPH_REPORT.md` 에 기록된다.\n",
                sources=["codemap/GRAPH_REPORT.md"])
            result = self.run_check(project)
            self.assertEqual(result.returncode, 0, result.stdout)

    def test_codemap_supplies_a_move_candidate_that_exists_on_disk(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                memory="### 이동\n\n설정은 `old/path/Config.cs` 에 있다.\n",
                sources=["src/new/Config.cs"],
                codemap="- `src/new/Config.cs`\n- `src/ghost/Config.cs`\n")
            result = self.run_check(project)
            self.assertEqual(result.returncode, 1)
            self.assertIn("이동 후보", result.stdout)
            self.assertIn("src/new/Config.cs", result.stdout)
            # CodeMap이 stale해서 남아 있는 경로는 제안하지 않는다.
            self.assertNotIn("src/ghost/Config.cs", result.stdout)

    def test_urls_and_globs_are_not_treated_as_anchors(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                memory="### 링크\n\n참고 `https://example.com/a.md` 와 `memory/gotchas/*.md` 범위.\n")
            result = self.run_check(project)
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("검사할 앵커가 없는", result.stdout)

    def test_project_without_memory_is_not_an_error(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            result = self.run_check(project)
            self.assertEqual(result.returncode, 0)
            self.assertIn("검사할 기억 파일이 없습니다", result.stdout)

    def test_home_path_resolves_real_global_file(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, memory="# 설정\n`~/.codex/config.toml`\n")
            fake_home = Path(temp) / "user"
            (fake_home / ".codex").mkdir(parents=True)
            (fake_home / ".codex/config.toml").write_text("", encoding="utf-8")
            result = self.run_check(project, env={**os.environ, "HOME": str(fake_home), "USERPROFILE": str(fake_home)})
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("앵커 1개", result.stdout)
            self.assertNotIn("[CONTEXT]", result.stdout)

    def test_missing_external_environment_is_explicitly_unverified(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, memory="# 설정\n`~/.codex/missing.toml`\n")
            result = self.run_check(project, env={**os.environ, "HOME": temp, "USERPROFILE": temp})
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("environment=1", result.stdout)
            self.assertNotIn("[PASS]", result.stdout)
            self.assertNotIn("[STALE]", result.stdout)

    def test_templates_packages_and_prohibitions_are_reported_separately(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, memory=(
                "# 설계\n`skills/<name>/SKILL.md`\n"
                "`docs/YYYY-MM-DD-plan.md`\n`.../sample.py`\n"
                "`@google/design.md`\n"
                "`sync-grok-assets.js` / `install-mcp-grok.js`를 만들지 말 것.\n"
                "현재 구현은 `src/missing.py`이다.\n"))
            result = self.run_check(project)
            self.assertEqual(result.returncode, 1, result.stdout)
            self.assertIn("template=3", result.stdout)
            self.assertIn("package=1", result.stdout)
            self.assertIn("prohibition=2", result.stdout)
            self.assertIn("실재하지 않는 앵커 1개", result.stdout)

    def test_prohibition_does_not_hide_other_clause(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, memory=(
                "# 설계\n`old.py`를 만들지 말 것; 현재 구현은 `src/missing.py`이다.\n"))
            result = self.run_check(project)
            self.assertIn("prohibition=1", result.stdout)
            self.assertIn("실재하지 않는 앵커 1개", result.stdout)

    def test_build_artifact_paths_are_context_not_stale(self):
        """설치 실패 gotcha가 인용한 dist/·node_modules/ 경로는 당시 산출물이지 썩은 기억이 아니다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, memory=(
                "# 설치\n`dist/index.js`가 비어 있었다.\n"
                "`node_modules/better-sqlite3/package.json` 버전을 확인했다.\n"))
            result = self.run_check(project)
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("artifact=2", result.stdout)
            self.assertNotIn("[STALE]", result.stdout)

    def test_cli_home_and_transient_basenames_are_not_repo_files(self):
        """`settings.json`·`config.toml`은 CLI 홈에 산다. 레포 안에 없는 것이 정상이다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, memory=(
                "# 설정\n`settings.json`에 훅을 등록하고 `config.toml`의 notify를 본다.\n"
                "`%USERPROFILE%/.gemini/AGENTS.md`도 홈 경로다.\n"
                "`.mnemo-status.md`는 delta가 임계 밑이면 지워진다. 경로로 적은 "
                "`memory/.mnemo-status.md`도 같은 파일이다.\n"))
            result = self.run_check(project)
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("environment=3", result.stdout)
            self.assertIn("transient=2", result.stdout)
            self.assertNotIn("[STALE]", result.stdout)

    def test_module_relative_path_resolves_when_codemap_suffix_is_unique(self):
        """스킬 안에서 쓴 `references/x.md`는 루트 기준으로는 없지만 그 파일은 살아 있다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                memory="# 채점\n규칙은 `references/scoring-model.md`에 있다.\n",
                sources=["skills/seo-audit/references/scoring-model.md"],
                codemap="- `skills/seo-audit/references/scoring-model.md`\n")
            result = self.run_check(project)
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("module-relative=1", result.stdout)
            self.assertIn("skills/seo-audit/references/scoring-model.md", result.stdout)
            self.assertNotIn("[STALE]", result.stdout)

    def test_module_relative_path_with_two_candidates_stays_stale(self):
        """접미가 둘에 맞으면 도구가 고르지 않는다. 후보를 보여 주고 사람이 고른다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                memory="# 규칙\n`references/core-rules.md`를 따른다.\n",
                sources=["skills/a/references/core-rules.md", "skills/b/references/core-rules.md"],
                codemap="- `skills/a/references/core-rules.md`\n- `skills/b/references/core-rules.md`\n")
            result = self.run_check(project)
            self.assertEqual(result.returncode, 1, result.stdout)
            self.assertIn("[STALE]", result.stdout)
            self.assertIn("이동 후보", result.stdout)
            self.assertNotIn("module-relative", result.stdout)

    def test_superseded_entry_is_historical_but_next_entry_is_checked(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, memory=(
                "# 기억\n## 과거\n`status: ❌ SUPERSEDED`\n`old/retired.py`\n"
                "## 현재\n`src/missing.py`\n"))
            result = self.run_check(project)
            self.assertEqual(result.returncode, 1, result.stdout)
            self.assertIn("historical=1", result.stdout)
            self.assertIn("실재하지 않는 앵커 1개", result.stdout)

    def test_partial_supersession_does_not_exempt_whole_entry(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, memory=(
                "# 기억\n## 현재\n- SUPERSEDED (위 런타임 범위만) `old/retired.py`\n"
                "현재 구현은 `src/missing.py`이다.\n"))
            result = self.run_check(project)
            self.assertIn("historical=1", result.stdout)
            self.assertIn("실재하지 않는 앵커 1개", result.stdout)

    def test_generic_basename_is_not_a_move_suggestion(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, memory="# 경로\n`old/SKILL.md`\n",
                                        sources=["skills/unrelated/SKILL.md"],
                                        codemap="- `skills/unrelated/SKILL.md`\n")
            result = self.run_check(project)
            self.assertEqual(result.returncode, 1, result.stdout)
            self.assertNotIn("skills/unrelated/SKILL.md", result.stdout)

    def test_collect_anchors_keeps_three_value_contract(self):
        sys.path.insert(0, str(SCRIPTS))
        try:
            from check_memory_anchors import collect_anchors
            with tempfile.TemporaryDirectory() as temp:
                project = self.make_project(temp, memory="# 앵커\n`src/missing.py`\n")
                stale, checked, unreadable = collect_anchors(project, [project / "memory/architecture.md"], {})
                self.assertEqual((len(stale), checked, unreadable), (1, 1, []))
        finally:
            sys.path.pop(0)

    def test_check_never_modifies_anything(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                memory="### 앵커\n\n사라진 `src/Gone.cs` 를 가리킨다.\n",
                sources=["src/Relay.cs"])
            before = {p.relative_to(project).as_posix(): p.read_bytes()
                      for p in project.rglob("*") if p.is_file() and ".git" not in p.parts}
            self.run_check(project)
            after = {p.relative_to(project).as_posix(): p.read_bytes()
                     for p in project.rglob("*") if p.is_file() and ".git" not in p.parts}
            self.assertEqual(before, after)

    def test_unresolvable_project_root_is_the_only_failure_mode(self):
        with tempfile.TemporaryDirectory() as temp:
            loose = Path(temp) / "loose"
            loose.mkdir()
            result = self.run_check(loose)
            self.assertEqual(result.returncode, 2)
            self.assertIn("[ERROR]", result.stdout)


if __name__ == "__main__":
    unittest.main()
