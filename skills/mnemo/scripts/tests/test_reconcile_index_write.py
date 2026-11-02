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


class IndexWriteTests(unittest.TestCase):
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
