"""Claude 복구 스크립트는 값이 같은 색인을 다시 쓰지 않는다."""

import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import reconcile_conversations as reconciler
from mnemo_index import IndexErrorDuringRecovery


class IndexWriteTests(unittest.TestCase):
    def test_invalid_index_blocks_recovery_before_history_changes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / ".mnemo-root").touch()
            directory = root / "conversations"
            directory.mkdir()
            path = directory / reconciler.INDEX_FILENAME
            day = directory / "2026-11-23-claude.md"
            day.write_bytes(b"existing history")
            for damaged in (b'{"', b'\xff', b'null', b'{"claude":false}', b'{"codex":{"day":"id"}}',
                            b'{"codex_aborted":{"day":[null]}}', b'{"version":2}', b'{"claude":{},"claude":{}}',
                            b'{"extra":1e999}', b'{"extra":1.0000000000000000001}'):
                with self.subTest(damaged=damaged):
                    path.write_bytes(damaged)
                    with self.assertRaisesRegex(IndexErrorDuringRecovery, r"\.mnemo-index\.json"):
                        reconciler.reconcile(root, date_filter=None)
                    self.assertEqual(damaged, path.read_bytes())
                    self.assertEqual(b"existing history", day.read_bytes())

    def test_stale_recovery_cannot_replace_a_new_or_changed_index(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            path = directory / reconciler.INDEX_FILENAME
            for replacement in (b'{"claude":{"day":["from hook"]}}', b'{"truncated":'):
                with self.subTest(replacement=replacement):
                    before = reconciler.load_index(directory)
                    before["claude"]["day"] = ["from recovery"]
                    path.write_bytes(replacement)
                    with self.assertRaisesRegex(IndexErrorDuringRecovery, "changed during recovery"):
                        reconciler.save_index(directory, before)
                    self.assertEqual(replacement, path.read_bytes())
                    self.assertEqual([path], list(directory.iterdir()))

    def test_same_value_in_other_format_keeps_mtime(self):
        with tempfile.TemporaryDirectory() as temp:
            conv_dir = Path(temp)
            path = conv_dir / reconciler.INDEX_FILENAME
            # Codex 복구 스크립트처럼 키를 정렬하고 끝 줄바꿈을 붙인 형식으로 먼저 써 둔다.
            value = {"version": 1, "claude": {"2026-11-02": ["a", "b"]}, "codex": {"2026-02-07": ["t"]}}
            path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            old_ns = 1_000_000_000 * 1_000_000_000
            os.utime(path, ns=(old_ns, old_ns))

            reconciler.save_index(conv_dir, reconciler.load_index(conv_dir))
            self.assertEqual(old_ns, path.stat().st_mtime_ns)

            changed = reconciler.load_index(conv_dir)
            changed["claude"]["2026-11-02"].append("c")
            reconciler.save_index(conv_dir, changed)
            self.assertNotEqual(old_ns, path.stat().st_mtime_ns)
            self.assertEqual(["a", "b", "c"], json.loads(path.read_text(encoding="utf-8"))["claude"]["2026-11-02"])


if __name__ == "__main__":
    unittest.main()
