"""파일에서 결정으로 되짚는 역색인.

기억은 의미로 색인되어 있다 — 제목, 태그, MEMORY.md. 그것은 "지난번에 이런 거 했던 것
같은데"에 답한다. 훨씬 흔한 시작인 "이 기능 오류났어, 고치자"에는 답하지 못한다.
그 요청에는 검색할 단어가 없고 대상만 있기 때문이다. 그래서 조회 키는 파일이어야 한다.

계약 적용 전 항목도 걸려야 한다 — 그래야 지금 당장 켤 수 있다.
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
BUILD = SCRIPTS / "build_anchor_index.py"


class AnchorIndexTests(unittest.TestCase):
    def project(self, temp):
        root = Path(temp)
        (root / ".mnemo-root").touch()
        (root / "memory" / "architecture").mkdir(parents=True)
        (root / "memory" / "gotchas").mkdir(parents=True)
        return root

    def entry(self, root, folder, name, body):
        path = root / "memory" / folder / name
        path.write_text(f"# {name[:-3]}\n\n`tags: a, b, c`\n`date: 2026-09-19`\n`source: claude`\n\n{body}\n",
                        encoding="utf-8")
        return path

    def index(self, root, *args, expected=0):
        result = subprocess.run([sys.executable, str(BUILD), "--project-root", str(root), *args],
                                capture_output=True, text=True, encoding="utf-8",
                                errors="replace", timeout=90)
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        return result.stdout + result.stderr

    def test_lookup_finds_entries_declared_in_a_files_line(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "architecture", "054-paths.md",
                       "`status: ✅ CURRENT`\n`files:` hooks/save-turn.sh, skills/mnemo/scripts/create_handoff.py")
            out = self.index(root, "--file", "hooks/save-turn.sh")
            self.assertIn("054-paths", out)
            self.assertIn("CURRENT", out)
            self.assertIn("기대는 결정 1건", out)

    def test_lookup_keeps_the_dot_of_dot_folders(self):
        """`./` 접두어만 뗀다 — 글자 집합으로 지우면 `.github/`가 `github/`가 되어 조회가 빗나간다."""
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "architecture", "061-ci.md", "`files:` .github/workflows/ci.yml")
            self.assertIn("061-ci", self.index(root, "--file", ".github/workflows/ci.yml"))
            self.assertIn("061-ci", self.index(root, "--file", "./.github/workflows/ci.yml"))

    def test_lookup_also_finds_entries_that_only_name_the_path_in_prose(self):
        """계약 적용 전 항목이 대부분이다. 그것들이 안 걸리면 조회를 지금 켤 수 없다."""
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "gotchas", "081-bat-ascii.md",
                       "- .bat 주석까지 ASCII만. 강제: scripts/tests/windows-script-encoding.test.js")
            out = self.index(root, "--file", "scripts/tests/windows-script-encoding.test.js")
            self.assertIn("081-bat-ascii", out)
            self.assertIn("gotchas", out)

    def test_memory_and_conversation_paths_are_not_anchors(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "architecture", "020-self.md", "- memory/architecture/index.md 를 갱신했다")
            out = self.index(root, "--file", "memory/architecture/index.md")
            self.assertIn("기대는 결정이 없습니다", out)

    def test_absence_is_a_result_not_a_failure(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "architecture", "010-x.md", "- skills/other/SKILL.md 에 대한 결정")
            out = self.index(root, "--file", "hooks/never-touched.sh")
            self.assertIn("새 줄기일 수 있습니다", out)

    def test_full_index_groups_entries_under_each_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "architecture", "054-a.md", "`files:` hooks/save-turn.sh")
            self.entry(root, "gotchas", "077-b.md", "`files:` hooks/save-turn.sh")
            self.index(root, "--out", "memory/.mnemo-anchor-index.md")
            text = (root / "memory" / ".mnemo-anchor-index.md").read_text(encoding="utf-8")
            self.assertIn("## hooks/save-turn.sh", text)
            self.assertIn("054-a", text)
            self.assertIn("077-b", text)
            # 파생 색인이다 — 원본을 고치지 않는다.
            self.assertIn("직접 편집하지 마세요", text)

    def test_derived_index_is_dot_prefixed_so_the_doctor_skips_it(self):
        """파생 색인이 기억 항목으로 오인되면 진단 수치가 오염된다(실제로 260→352로 튀었다)."""
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "architecture", "054-a.md", "`files:` hooks/save-turn.sh")
            out = self.index(root, "--out")
            self.assertIn(".mnemo-anchor-index.md", out)
            self.assertTrue((root / "memory" / ".mnemo-anchor-index.md").is_file())

    def test_removing_the_last_anchor_publishes_an_empty_index(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            entry = self.entry(root, "architecture", "054-a.md", "`files:` hooks/old.sh")
            target = root / "reports" / "앵커.md"
            self.index(root, "--out", str(target))
            self.assertIn("## hooks/old.sh", target.read_text(encoding="utf-8"))
            entry.unlink()
            self.index(root, "--out", "reports/앵커.md")
            text = target.read_text(encoding="utf-8")
            self.assertIn("파일 0개 · 항목 0개", text)
            self.assertNotIn("hooks/old.sh", text)

    def test_outside_output_is_rejected_even_when_index_is_empty(self):
        with tempfile.TemporaryDirectory() as temp:
            project_dir = Path(temp) / "project"
            project_dir.mkdir()
            root = self.project(project_dir)
            outside = Path(temp) / "other.md"
            outside.write_bytes(b"keep")
            for target in (str(outside), "../other.md", "../new-dir/report.md"):
                with self.subTest(target=target):
                    self.index(root, "--out", target, expected=2)
                    self.assertEqual(outside.read_bytes(), b"keep")
                    self.assertFalse((Path(temp) / "new-dir").exists())

    def test_output_links_cannot_escape_the_project(self):
        with tempfile.TemporaryDirectory() as temp:
            project_dir = Path(temp) / "project"
            project_dir.mkdir()
            root = self.project(project_dir)
            outside = Path(temp) / "other.md"
            outside.write_bytes(b"keep")
            try:
                (root / "linked-file").symlink_to(outside)
                (root / "linked-dir").symlink_to(outside.parent, target_is_directory=True)
            except (OSError, NotImplementedError) as err:
                self.skipTest(f"symlinks unavailable: {err}")
            for target in ("linked-file", "linked-dir/other.md"):
                with self.subTest(target=target):
                    self.index(root, "--out", target, expected=2)
                    self.assertEqual(outside.read_bytes(), b"keep")
            self.assertTrue((root / "linked-file").is_symlink())

    def test_declared_files_line_wins_over_prose(self):
        """구조 줄이 있으면 그것이 정본이다. 본문에 스친 경로까지 앵커로 세지 않는다."""
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "architecture", "060-scoped.md",
                       "`files:` hooks/real.sh\n- 참고로 skills/unrelated/SKILL.md 도 읽었다")
            self.assertIn("060-scoped", self.index(root, "--file", "hooks/real.sh"))
            self.assertIn("기대는 결정이 없습니다", self.index(root, "--file", "skills/unrelated/SKILL.md"))



class HandoffRefreshesIndexTests(unittest.TestCase):
    """색인을 갱신하는 주체가 Claude의 PostToolUse 훅뿐이면, 도구 단위 훅이 없는 CLI에서는
    색인이 영원히 낡는다. 핸드오프는 네 CLI가 모두 지나는 자리다."""

    CREATE = SCRIPTS / "create_handoff.py"

    def test_scaffold_rebuilds_the_index_for_every_cli(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / ".mnemo-root").touch()
            (root / "memory" / "architecture").mkdir(parents=True)
            (root / "memory" / "architecture" / "054-x.md").write_text(
                "# x\n\n`tags: a, b, c`\n`date: 2026-09-19`\n`source: claude`\n\n"
                "`files:` hooks/save-turn.sh\n", encoding="utf-8")
            result = subprocess.run([sys.executable, str(self.CREATE), "idx", "--project-root", str(root)],
                                    capture_output=True, text=True, encoding="utf-8",
                                    errors="replace", cwd=str(root), timeout=180)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            index = root / "memory" / ".mnemo-anchor-index.md"
            self.assertTrue(index.is_file(), "핸드오프가 색인을 만들지 않았습니다")
            self.assertIn("## hooks/save-turn.sh", index.read_text(encoding="utf-8"))
            handoff = sorted((root / "docs" / "handoffs").glob("*.md"))[-1].read_text(encoding="utf-8")
            self.assertIn("Anchor index: RAN", handoff)

    def test_scaffold_survives_when_there_is_nothing_to_index(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / ".mnemo-root").touch()
            (root / "memory").mkdir()
            result = subprocess.run([sys.executable, str(self.CREATE), "empty", "--project-root", str(root)],
                                    capture_output=True, text=True, encoding="utf-8",
                                    errors="replace", cwd=str(root), timeout=180)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            handoff = sorted((root / "docs" / "handoffs").glob("*.md"))[-1].read_text(encoding="utf-8")
            self.assertIn("Anchor index: SKIPPED", handoff)
            target = root / "memory" / ".mnemo-anchor-index.md"
            self.assertFalse(target.exists())
            target.write_text("# 앵커 역색인\n\n## hooks/old.sh\n", encoding="utf-8")
            result = subprocess.run([sys.executable, str(self.CREATE), "refresh", "--project-root", str(root)],
                                    capture_output=True, text=True, encoding="utf-8", cwd=root, timeout=180)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            refreshed = next((root / "docs" / "handoffs").glob("*-refresh.md")).read_text(encoding="utf-8")
            self.assertIn("Anchor index: RAN — 파일 0개", refreshed)
            self.assertNotIn("hooks/old.sh", target.read_text(encoding="utf-8"))

if __name__ == "__main__":
    unittest.main()
