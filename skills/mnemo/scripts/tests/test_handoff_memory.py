import contextlib
import io
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import create_handoff as handoff


class HandoffMemoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "memory").mkdir()

    def write(self, name, text):
        target = self.root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

    def test_absent_empty_and_metadata_only_are_not_memory(self):
        for body in ("", "# Architecture\n\n---\n", "# Decision\ntags: a,b,c\ndate: 2026-09-17\nsource: codex\n"):
            self.write("memory/architecture.md", body)
            self.assertFalse(handoff.architecture_memory_present(self.root))

    def test_monolith_and_split_entry_are_memory(self):
        self.write("memory/architecture.md", "# Architecture\nThe service stores events before publishing.\n")
        self.assertTrue(handoff.architecture_memory_present(self.root))
        self.write("memory/architecture.md", "# Architecture\n")
        self.write("memory/architecture/index.md", "# Index\n[Decision](001-events.md)\n")
        self.assertFalse(handoff.architecture_memory_present(self.root))
        self.write("memory/architecture/001-events.md", "# Events\nPersist before publish.\n")
        self.assertTrue(handoff.architecture_memory_present(self.root))

    def test_named_index_link_and_cycles(self):
        self.write("MEMORY.md", "[아키텍처 결정](memory/design.md)\n")
        self.write("memory/design.md", "# Design\n[loop](design.md)\n")
        self.assertFalse(handoff.architecture_memory_present(self.root))
        self.write("memory/design.md", "# Design\nStore events transactionally.\n")
        self.assertTrue(handoff.architecture_memory_present(self.root))

    def test_external_links_do_not_count(self):
        self.write("MEMORY.md", "[Architecture](../outside.md)\n[Architecture](https://example.org/design.md)\n")
        self.assertFalse(handoff.architecture_memory_present(self.root))

    def test_existing_memory_skips_process(self):
        self.write("memory/architecture.md", "# Design\nPersist before publish.\n")
        with patch.object(handoff.subprocess, "run") as run:
            self.assertIn("SKIPPED", handoff.memory_preflight(self.root))
        run.assert_not_called()

    def test_shipped_scaffold_and_backtick_metadata_are_empty(self):
        for body in (
            '# Architecture - 설계 결정\n\n> MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다.\n\n---\n',
            '# Architecture\n`tags: a,b,c`\n`date: 2026-09-17`\n`source: codex`\n',
        ):
            self.write('memory/architecture.md', body)
            self.assertFalse(handoff.architecture_memory_present(self.root))

    def test_table_decisions_are_memory(self):
        self.write('memory/architecture.md', '# Architecture\n| Decision | Reason |\n|---|---|\n| SQLite | Single writer |\n')
        self.assertTrue(handoff.architecture_memory_present(self.root))

    def test_unreadable_memory_does_not_abort_handoff(self):
        with patch.object(handoff, 'architecture_memory_present', side_effect=OSError('read failed')), contextlib.redirect_stdout(io.StringIO()):
            self.assertIn('ERROR', handoff.memory_preflight(self.root))

    def test_missing_memory_runs_once_readonly_and_preserves_files(self):
        self.write("memory/architecture.md", "# Architecture\n")
        before = {p: p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        result = subprocess.CompletedProcess([], 1, "FAIL: broken link", "")
        with patch.object(handoff.subprocess, "run", return_value=result) as run, contextlib.redirect_stdout(io.StringIO()):
            status = handoff.memory_preflight(self.root)
        self.assertIn("RAN", status)
        run.assert_called_once()
        args = run.call_args.args[0]
        self.assertNotIn("--fix", args)
        self.assertEqual(args[-1], str(self.root))
        self.assertEqual(before, {p: p.read_bytes() for p in self.root.rglob("*") if p.is_file()})

    def test_timeout_and_tool_failure_are_not_success(self):
        with contextlib.redirect_stdout(io.StringIO()):
            with patch.object(handoff.subprocess, "run", side_effect=subprocess.TimeoutExpired("doctor", 60)):
                self.assertIn("ERROR", handoff.memory_preflight(self.root))
            with patch.object(handoff.subprocess, "run", return_value=subprocess.CompletedProcess([], 2, "", "")):
                self.assertIn("ERROR", handoff.memory_preflight(self.root))


if __name__ == "__main__":
    unittest.main()
