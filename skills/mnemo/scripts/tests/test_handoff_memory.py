import contextlib
import io
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
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

    def test_existing_memory_and_recent_visit_skip_process(self):
        """기억이 있고 최근에 봤으면 프로세스를 띄우지 않는다.

        기억만으로 건너뛰던 옛 규칙은 기억이 있는 프로젝트에서 닥터를 영원히 재웠다.
        그러면 점검이 사람의 기억에만 의존한다 — 이 레포가 실패로 측정한 바로 그 의존이다.
        이제 주기 타이머가 두 번째 방아쇠이고, 최근 방문만이 프로세스를 아낀다.
        """
        self.write("memory/architecture.md", "# Design\nPersist before publish.\n")
        self.write("memory/.mnemo-doctor-chart.md",
                   f"# Mnemo 진료 기록\n\n## {datetime.now():%Y-%m-%d} 10:00 · 진단만\n")
        with patch.object(handoff.subprocess, "run") as run:
            self.assertIn("SKIPPED", handoff.memory_preflight(self.root))
        run.assert_not_called()

    def test_existing_memory_but_stale_visit_still_runs(self):
        self.write("memory/architecture.md", "# Design\nPersist before publish.\n")
        self.write("memory/.mnemo-doctor-chart.md",
                   f"# Mnemo 진료 기록\n\n## {datetime.now() - timedelta(days=40):%Y-%m-%d} 10:00 · 진단만\n")
        with patch.object(handoff.subprocess, "run",
                          return_value=subprocess.CompletedProcess([], 0, "", "")) as run, \
                contextlib.redirect_stdout(io.StringIO()):
            self.assertIn("RAN", handoff.memory_preflight(self.root))
        run.assert_called_once()

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

    def test_missing_memory_runs_once_without_fix_and_preserves_memory(self):
        self.write("memory/architecture.md", "# Architecture\n")
        before = {p: p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        result = subprocess.CompletedProcess([], 1, "FAIL: broken link", "")
        with patch.object(handoff.subprocess, "run", return_value=result) as run, contextlib.redirect_stdout(io.StringIO()):
            status = handoff.memory_preflight(self.root)
        self.assertIn("RAN", status)
        run.assert_called_once()
        args = run.call_args.args[0]
        self.assertNotIn("--fix", args)
        self.assertNotIn("--promote-structure", args)
        self.assertIn(str(self.root), args)
        # 방문을 차트에 남겨야 다음 핸드오프가 차이만 보고하고 주기 타이머가 다시 시작된다.
        self.assertIn("--chart", args)
        self.assertEqual(before, {p: p.read_bytes() for p in self.root.rglob("*") if p.is_file()})

    def test_timeout_and_tool_failure_are_not_success(self):
        with contextlib.redirect_stdout(io.StringIO()):
            with patch.object(handoff.subprocess, "run", side_effect=subprocess.TimeoutExpired("doctor", 60)):
                self.assertIn("ERROR", handoff.memory_preflight(self.root))
            with patch.object(handoff.subprocess, "run", return_value=subprocess.CompletedProcess([], 2, "", "")):
                self.assertIn("ERROR", handoff.memory_preflight(self.root))


if __name__ == "__main__":
    unittest.main()
