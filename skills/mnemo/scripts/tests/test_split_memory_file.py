"""Splitting must move memory, never rewrite it.

A 224KB detail file defeats progressive disclosure: reading one entry costs the whole
file. The fix is the layout gotchas/ and learned/ already use — one file per entry plus
an index. The risk is that a bulk move quietly loses entries, drops the '##' grouping,
or leaves MEMORY.md pointing at a path that no longer exists, so those are pinned here.
"""

import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
SCRIPT = SCRIPTS / "split_memory_file.py"


def entry(title, tags, date, body, section=None):
    text = f"## {section}\n\n" if section else ""
    return text + f"### {title}\n\n`tags: {tags}`\n`date: {date}`\n`source: claude`\n\n{body}\n\n"


class SplitMemoryFileTests(unittest.TestCase):
    def run_split(self, project, target, *args):
        return subprocess.run([sys.executable, str(SCRIPT), target,
                               "--project-root", str(project), *args],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=120)

    def make_project(self, temp, content, *, index_link=True):
        project = Path(temp) / "project"
        (project / "memory").mkdir(parents=True)
        subprocess.run(["git", "init", "-q"], cwd=project, check=True, timeout=30)
        (project / "memory" / "architecture.md").write_text(content, encoding="utf-8")
        if index_link:
            (project / "MEMORY.md").write_text(
                "# MEMORY\n\n- [아키텍처](memory/architecture.md)\n", encoding="utf-8")
        return project

    def sample(self):
        return (
            "# 아키텍처\n\n원본 머리말입니다.\n\n"
            + entry("wpf, dotnet", "wpf, dotnet", "2026-01-01", "스택 설명", section="Core Stack")
            + entry("ssh, sftp", "ssh, sftp", "2026-02-02", "연결 설명")
            + entry("chat-bridge ✅ CURRENT", "chat, bridge", "2026-03-03", "브리지 설명",
                    section="Chat & Discussion")
        )

    def test_dry_run_changes_nothing(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample())
            before = (project / "memory" / "architecture.md").read_bytes()
            result = self.run_split(project, "memory/architecture.md")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("DRY-RUN", result.stdout)
            self.assertEqual((project / "memory" / "architecture.md").read_bytes(), before)
            self.assertFalse((project / "memory" / "architecture").exists())

    def test_every_entry_survives_the_split(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample())
            result = self.run_split(project, "memory/architecture.md", "--apply")
            self.assertEqual(result.returncode, 0, result.stderr)
            out = project / "memory" / "architecture"
            files = sorted(p.name for p in out.glob("*.md") if p.name != "index.md")
            self.assertEqual(len(files), 3, files)
            merged = "\n".join((out / f).read_text(encoding="utf-8") for f in files)
            for needle in ("스택 설명", "연결 설명", "브리지 설명"):
                self.assertIn(needle, merged)

    def test_root_index_backup_is_byte_exact_for_rollback(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample())
            before = (project / 'MEMORY.md').read_bytes()
            result = self.run_split(project, 'memory/architecture.md', '--apply')
            self.assertEqual(result.returncode, 0, result.stderr)
            backups = list(project.glob('MEMORY.md.bak-*'))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_bytes(), before)

    def test_section_grouping_is_preserved_in_the_index(self):
        """섹션을 버리면 '기능별'이라는 묶음 자체가 사라진다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample())
            self.run_split(project, "memory/architecture.md", "--apply")
            index = (project / "memory" / "architecture" / "index.md").read_text(encoding="utf-8")
            self.assertIn("| Date | Section | Entry | Tags |", index)
            self.assertIn("Core Stack", index)
            self.assertIn("Chat & Discussion", index)
            self.assertIn("2026-03-03", index)
            self.assertIn("chat, bridge", index)

    def test_memory_index_link_is_rewired(self):
        """링크를 그대로 두면 MEMORY.md가 사라진 파일을 가리킨다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample())
            self.run_split(project, "memory/architecture.md", "--apply")
            index = (project / "MEMORY.md").read_text(encoding="utf-8")
            self.assertIn("memory/architecture/index.md", index)
            self.assertNotIn("(memory/architecture.md)", index)

    def test_non_link_references_are_reported_not_silently_left(self):
        """실제 MEMORY.md에는 `a=architecture.md` 같은 약어 범례가 있었다.

        링크만 고치면 그 범례를 쓰는 모든 행이 통째로 끊기는데, 형태를 미리 알 수 없어
        자동 수정은 위험하다. 대신 남은 언급을 반드시 보여준다.
        """
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample(), index_link=False)
            (project / "MEMORY.md").write_text(
                "# MEMORY\n\n> 코드: a=architecture.md p=patterns.md\n\n| 키워드 | a |\n",
                encoding="utf-8")
            result = self.run_split(project, "memory/architecture.md", "--apply")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("링크가 아닌 형태로", result.stdout)
            self.assertIn("a=architecture.md", result.stdout)

    def test_original_is_backed_up_and_removed(self):
        """분할본과 단일본이 함께 있으면 어느 쪽이 정본인지 알 수 없다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample())
            original = (project / "memory" / "architecture.md").read_bytes()
            self.run_split(project, "memory/architecture.md", "--apply")
            self.assertFalse((project / "memory" / "architecture.md").exists())
            backups = list((project / "memory").glob("architecture.md.bak-*"))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_bytes(), original)

    def test_preamble_is_not_discarded(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample())
            self.run_split(project, "memory/architecture.md", "--apply")
            index = (project / "memory" / "architecture" / "index.md").read_text(encoding="utf-8")
            self.assertIn("원본 머리말입니다", index)

    def test_status_marker_stays_in_the_body_but_not_the_filename(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample())
            self.run_split(project, "memory/architecture.md", "--apply")
            out = project / "memory" / "architecture"
            target = [p for p in out.glob("*.md") if "chat-bridge" in p.name]
            self.assertEqual(len(target), 1, [p.name for p in out.glob('*.md')])
            self.assertNotIn("✅", target[0].name)
            self.assertIn("✅ CURRENT", target[0].read_text(encoding="utf-8"))

    def test_refuses_to_split_into_a_populated_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, self.sample())
            existing = project / "memory" / "architecture"
            existing.mkdir()
            (existing / "001-already.md").write_text("### 기존\n", encoding="utf-8")
            result = self.run_split(project, "memory/architecture.md", "--apply")
            self.assertEqual(result.returncode, 2)
            self.assertTrue((project / "memory" / "architecture.md").exists())

    def test_file_without_entries_is_left_alone(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, "# 아키텍처\n\n항목이 없습니다.\n")
            result = self.run_split(project, "memory/architecture.md", "--apply")
            self.assertEqual(result.returncode, 0)
            self.assertIn("나눌 것이 없습니다", result.stdout)
            self.assertTrue((project / "memory" / "architecture.md").exists())

    def test_filenames_stay_readable_for_very_long_titles(self):
        with tempfile.TemporaryDirectory() as temp:
            long_title = ", ".join(f"tag{i}" for i in range(30))
            project = self.make_project(
                temp, "# 아키텍처\n\n" + entry(long_title, "a, b", "2026-01-01", "본문"))
            self.run_split(project, "memory/architecture.md", "--apply")
            files = [p for p in (project / "memory" / "architecture").glob("*.md")
                     if p.name != "index.md"]
            self.assertEqual(len(files), 1)
            self.assertLessEqual(len(files[0].stem), 56, files[0].name)
            self.assertTrue(re.match(r'^\d{3}-', files[0].name))

    def test_section_prose_and_fenced_headings_are_preserved(self):
        content = ('# Architecture\n## First\nfirst introduction\n### One\nbody\n'
                   '```markdown\n## not a section\n### not an entry\n```\nafter fence\n'
                   '## Second\nsecond introduction\n### Two\nsecond body\n'
                   '## Empty section\ntrailing prose\n')
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, content)
            result = self.run_split(project, 'memory/architecture.md', '--apply')
            self.assertEqual(result.returncode, 0, result.stderr)
            out = project / 'memory/architecture'
            self.assertEqual(len(list(out.glob('*.md'))), 3)
            index = (out / 'index.md').read_text(encoding='utf-8')
            for text in ('first introduction', 'second introduction', 'trailing prose', '## Empty section'):
                self.assertIn(text, index)
            first = (out / '001-one.md').read_text(encoding='utf-8')
            self.assertIn('```markdown\n## not a section\n### not an entry\n```\nafter fence', first)

    def test_links_are_rebased_and_entry_fragments_retargeted(self):
        content = ('# Architecture\n[shared]: ../docs/design.md "Design"\n'
                   '### Relay\n[other](patterns.md) [doc](../docs/design.md#api)\n'
                   '![image](images/chart.png) [ref][shared]\n'
                   '[next](#next) [self](architecture.md#relay)\n'
                   '[web](https://example.com/a) `[code](patterns.md)`\n'
                   '[space](../docs/my%20design.md)\n'
                   '### Next\nnext body\n')
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, content)
            (project / 'MEMORY.md').write_text(
                '[relay](memory/architecture.md#relay)\n'
                '[unknown](memory/architecture.md#obsolete)\n', encoding='utf-8')
            result = self.run_split(project, 'memory/architecture.md', '--apply')
            self.assertEqual(result.returncode, 0, result.stderr)
            first = (project / 'memory/architecture/001-relay.md').read_text(encoding='utf-8')
            for expected in ('(../patterns.md)', '(../../docs/design.md#api)',
                             '(../images/chart.png)', '[shared]: ../../docs/design.md "Design"',
                             '(002-next.md#next)', '(001-relay.md#relay)',
                             '(../../docs/my%20design.md)',
                             '(https://example.com/a)', '`[code](patterns.md)`'):
                self.assertIn(expected, first)
            index = (project / 'MEMORY.md').read_text(encoding='utf-8')
            self.assertIn('(memory/architecture/001-relay.md#relay)', index)
            self.assertIn('(memory/architecture/index.md)', index)
            self.assertNotIn('#obsolete', index)


if __name__ == "__main__":
    unittest.main()
