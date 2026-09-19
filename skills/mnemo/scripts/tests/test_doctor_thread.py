"""줄기와 증거를 잇는 검사, 그리고 닥터의 진료 기록.

기억은 주장이고 대화는 증거인데, 둘을 잇는 링크를 아무도 검사하지 않았다. 그래서
열리지 않는 참조가 남고, 코드 앵커는 산문에만 있어 파일에서 결정으로 되짚을 수 없고,
바꾼 이유 없는 교체가 쌓이고, 어느 줄기에도 안 붙은 대화가 흙으로 남는다.

그리고 닥터는 매번 초진이었다. 진단을 남기지 않으니 두 번째 방문이 첫 방문보다
나을 수 없었다. 차트는 판단을 남기고, 다음 방문은 차이만 말한다.
"""

import json
import re
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
DOCTOR = SCRIPTS / "mnemo_doctor.py"
TODAY = datetime.now().strftime("%Y-%m-%d")

META = "`tags: a, b, c`\n`date: 2026-09-19`\n`source: claude`\n"


class DoctorThreadTests(unittest.TestCase):
    def project(self, temp):
        root = Path(temp)
        (root / ".mnemo-root").touch()
        (root / "memory" / "architecture").mkdir(parents=True)
        (root / "conversations").mkdir()
        (root / "docs" / "handoffs").mkdir(parents=True)
        (root / "MEMORY.md").write_text("# MEMORY\n\n- [색인](memory/architecture/index.md)\n", encoding="utf-8")
        (root / "memory" / "architecture" / "index.md").write_text("# Architecture Index\n", encoding="utf-8")
        return root

    def entry(self, root, name, body, meta=META):
        path = root / "memory" / "architecture" / name
        path.write_text(f"# {name[:-3]}\n\n{meta}\n{body}\n", encoding="utf-8")
        return path

    def run_doctor(self, root, *args):
        return subprocess.run([sys.executable, str(DOCTOR), "--project-root", str(root), *args],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=120).stdout

    def test_dead_evidence_link_fails_and_live_one_passes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            (root / "conversations" / "2026-09-01-claude.md").write_text("## [09:00] User\n\n하자\n", encoding="utf-8")
            self.entry(root, "010-live.md",
                       "`evidence:` [대화](../../conversations/2026-09-01-claude.md)\n`status: ✅ CURRENT`")
            out = self.run_doctor(root)
            self.assertIn("열리지 않는 링크 0", out)
            self.entry(root, "011-dead.md", "- **참조**: [옛 대화](../.claude/conversations/2026-01-31.md)")
            out = self.run_doctor(root)
            self.assertIn("[FAIL] 항목 증거", out)
            self.assertIn("011-dead.md", out)

    def test_prose_only_anchor_is_reported_and_promoted_on_request(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            (root / "hooks").mkdir()
            (root / "hooks" / "save-turn.sh").write_text("#!/bin/sh\n", encoding="utf-8")
            entry = self.entry(root, "012-anchor.md", "- 결정: 훅은 hooks/save-turn.sh 에서 저장한다")
            out = self.run_doctor(root)
            self.assertIn("앵커가 산문에만 1", out)

            self.run_doctor(root, "--promote-structure")
            text = entry.read_text(encoding="utf-8")
            self.assertIn("`files:` hooks/save-turn.sh", text)
            self.assertTrue(list(entry.parent.glob("012-anchor.md.bak-*")), "백업 없이 고쳤습니다")
            out = self.run_doctor(root)
            self.assertIn("앵커가 산문에만 0", out)

    def test_promotion_infers_current_but_never_guesses_a_body_supersede(self):
        """본문 중간의 SUPERSEDED는 하위 결정 하나일 수 있다. 항목 전체를 죽이면 안 된다."""
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            plain = self.entry(root, "013-plain.md", "- 결정: 네이티브 전용")
            mixed = self.entry(root, "014-mixed.md",
                               "- ❌ SUPERSEDED: 옛 하위 결정 → superseded-by: [[013-plain]] 이유: 경합 때문\n"
                               "- ✅ 현재: 네이티브 전용으로 간다")
            self.run_doctor(root, "--promote-structure")
            self.assertIn("`status: ✅ CURRENT`", plain.read_text(encoding="utf-8"))
            self.assertNotIn("`status:", mixed.read_text(encoding="utf-8"))

    def test_supersede_without_a_reason_is_flagged(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "020-new.md", "- 새 결정\n`status: ✅ CURRENT`")
            self.entry(root, "021-bare.md", "- SUPERSEDED — superseded-by: [[020-new]]\n`status: ❌ SUPERSEDED`")
            out = self.run_doctor(root)
            self.assertRegex(out, r"이유 없음 1")
            self.entry(root, "021-bare.md",
                       "- SUPERSEDED — superseded-by: [[020-new]] 이유: 동시 쓰기에서 데이터가 사라졌다\n"
                       "`status: ❌ SUPERSEDED`")
            out = self.run_doctor(root)
            self.assertRegex(out, r"이유 없음 0")

    def test_current_entry_depending_on_a_superseded_one_is_listed_for_review(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.entry(root, "030-base.md", "- 옛 기반\n`status: ❌ SUPERSEDED`")
            self.entry(root, "031-built.md", "`depends-on:` [[030-base]]\n`status: ✅ CURRENT`")
            out = self.run_doctor(root)
            self.assertIn("기대던 결정이 뒤집힌 CURRENT 1", out)
            self.assertIn("031-built.md → 030-base", out)

    def test_unattached_day_with_decision_words_is_listed_until_marked_irrelevant(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            noisy = "## [09:00] User\n\n" + ("이 결정을 폐기하고 대신 채택하자 " * 12) + "\n"
            (root / "conversations" / "2026-03-14-claude.md").write_text(noisy, encoding="utf-8")
            (root / "conversations" / "2026-03-15-claude.md").write_text(
                "## [09:00] User\n\n오타 고쳐줘\n", encoding="utf-8")
            out = self.run_doctor(root)
            self.assertIn("2026-03-14", out)
            self.assertNotIn("2026-03-15(", out)

            # 사람이 무관으로 판정하면 다시 묻지 않는다.
            (root / "memory" / ".mnemo-doctor-chart.md").write_text(
                "# Mnemo 진료 기록\n\n## 2026-09-19 10:00 · 진단만\n- 무관: 2026-03-14\n", encoding="utf-8")
            out = self.run_doctor(root)
            self.assertNotIn("2026-03-14(", out)
            self.assertIn("무관 판정 1일", out)

    def test_evidence_link_attaches_a_day_so_it_leaves_the_worklist(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            noisy = "## [09:00] User\n\n" + ("이 결정을 폐기하고 대신 채택하자 " * 12) + "\n"
            (root / "conversations" / "2026-03-14-claude.md").write_text(noisy, encoding="utf-8")
            out = self.run_doctor(root)
            self.assertIn("2026-03-14", out)
            self.entry(root, "040-attached.md",
                       "`evidence:` [대화](../../conversations/2026-03-14-claude.md) 09:00 턴\n`status: ✅ CURRENT`")
            out = self.run_doctor(root)
            self.assertIn("미부착 0일", out)

    def test_chart_records_the_visit_and_the_next_one_reports_only_the_difference(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            (root / "hooks").mkdir()
            (root / "hooks" / "a.sh").write_text("x\n", encoding="utf-8")
            self.entry(root, "050-one.md", "- 결정: hooks/a.sh 에서 한다")
            first = self.run_doctor(root, "--chart")
            self.assertIn("첫 방문", first)
            chart = root / "memory" / ".mnemo-doctor-chart.md"
            self.assertTrue(chart.is_file())
            self.assertIn("metrics", chart.read_text(encoding="utf-8"))

            self.entry(root, "051-two.md", "- 또 하나의 결정")
            second = self.run_doctor(root, "--chart")
            self.assertIn("지난 방문", second)
            self.assertIn("항목 1→2", second)
            # append-only — 첫 방문 기록이 남아 있어야 한다.
            self.assertEqual(2, len(re.findall(r'^## ', chart.read_text(encoding="utf-8"), re.M)))

    def test_diagnosis_alone_leaves_no_chart(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self.project(temp)
            self.run_doctor(root)
            self.assertFalse((root / "memory" / ".mnemo-doctor-chart.md").exists())


if __name__ == "__main__":
    unittest.main()
