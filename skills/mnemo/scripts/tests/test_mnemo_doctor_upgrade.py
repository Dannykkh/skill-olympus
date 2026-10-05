"""Real legacy records are upgraded without resetting their meaning or provenance."""

import sys
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import mnemo_doctor as doctor
from recall import recall

ENTRY = "# 선호\ntags: 선호, 여행, 조건\ndate: 2026-01-01\nsource: claude\n\n기차를 선호하는 이유와 동행 조건.\n"


class DoctorUpgradeTests(unittest.TestCase):
    def project(self, base, entry=ENTRY):
        root = Path(base) / "project"
        (root / "memory" / "architecture").mkdir(parents=True)
        (root / "conversations").mkdir()
        path = root / "memory" / "architecture" / "001-preference.md"
        path.write_text(entry, encoding="utf-8")
        conversation = root / "conversations" / "2026-01-01-claude.md"
        conversation.write_text("## [09:00:00] User\n기차 선호와 동행 조건\n\n## [09:00:01] Assistant\n선호 근거를 기록합니다.\n", encoding="utf-8")
        return root, path, conversation

    def upgrade(self, root, fix=False):
        report = doctor.Report()
        doctor.upgrade_memory_format(root, report, fix)
        return report.rows[0]

    def test_diagnosis_previews_real_repairs_without_writing(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, _ = self.project(base, ENTRY + "- **참조**: [대화](conversations/2026-01-01-claude.md)\n")
            before = {p: p.read_bytes() for p in root.rglob("*") if p.is_file()}
            row = self.upgrade(root)
            self.assertEqual(row["level"], "WARN")
            self.assertIn("evidence 승격 1개", row["detail"])
            self.assertIn("--upgrade-memory", row["hint"])
            self.assertEqual(before, {p: p.read_bytes() for p in root.rglob("*") if p.is_file()})

    def test_fix_keeps_exact_backup_crlf_provenance_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, _ = self.project(base)
            original = (ENTRY + "- **참조**: [대화](conversations/2026-01-01-claude.md#L1)\n").replace("\n", "\r\n").encode("utf-8")
            path.write_bytes(original)
            row = self.upgrade(root, True)
            self.assertEqual(row["level"], "OK", row)
            self.assertIn("보정함 1개", row["detail"])
            changed = path.read_bytes()
            self.assertIn(b"evidence: conversations/2026-01-01-claude.md#L1\r\n", changed)
            self.assertIn(b"../../conversations/2026-01-01-claude.md#L1", changed)
            self.assertIn(b"date: 2026-01-01\r\nsource: claude\r\n", changed)
            self.assertNotIn(b"status:", changed)
            self.assertEqual(list(path.parent.glob("*.bak-*"))[0].read_bytes(), original)
            row = self.upgrade(root, True)
            self.assertIn("대상 파일 0개", row["detail"])
            self.assertEqual(path.read_bytes(), changed)
            self.assertEqual(len(list(path.parent.glob("*.bak-*"))), 1)
            result = recall(root, ["arch:001"], scope="memory")
            self.assertTrue(any(r["via"] == "evidence" and "기차" in r["content"] for r in result["results"]))
            self.assertEqual(result["stats"]["unresolved"], 0)

    def test_old_claude_folder_alias_uses_only_the_exact_existing_filename(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, _ = self.project(base, ENTRY + "- **참조**: [대화](../.claude/conversations/2026-01-01-claude.md)\n")
            self.upgrade(root, True)
            text = path.read_text(encoding="utf-8")
            self.assertIn("evidence: conversations/2026-01-01-claude.md", text)
            self.assertIn("../../conversations/2026-01-01-claude.md", text)

    def test_missing_legacy_filename_is_not_guessed_from_a_date_or_other_cli(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, _ = self.project(base, ENTRY + "- **참조**: [대화](../.claude/conversations/2026-01-01.md)\n")
            original = path.read_bytes()
            row = self.upgrade(root, True)
            self.assertIn("missing", row["hint"])
            self.assertEqual(path.read_bytes(), original)
            self.assertNotIn("evidence:", path.read_text(encoding="utf-8"))

    def test_ambiguous_document_and_root_paths_are_not_chosen(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, _ = self.project(base, ENTRY + "- **참조**: [대화](conversations/2026-01-01-claude.md)\n")
            local = path.parent / "conversations" / "2026-01-01-claude.md"
            local.parent.mkdir()
            local.write_text("다른 맥락", encoding="utf-8")
            original = path.read_bytes()
            row = self.upgrade(root, True)
            self.assertIn("ambiguous", row["hint"])
            self.assertEqual(path.read_bytes(), original)

    def test_private_and_fenced_reference_examples_are_not_promoted_or_rewritten(self):
        with tempfile.TemporaryDirectory() as base:
            reference = "- **참조**: [대화](conversations/2026-01-01-claude.md)\n"
            entry = ENTRY + "~~~md\n" + reference + "~~~\n<private>\n" + reference + "</private>\n"
            root, path, _ = self.project(base, entry)
            original = path.read_bytes()
            row = self.upgrade(root, True)
            self.assertEqual(row["level"], "OK", row)
            self.assertEqual(path.read_bytes(), original)
            self.assertFalse(list(path.parent.glob("*.bak-*")))

    def test_external_evidence_alias_is_not_read_or_promoted(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, conversation = self.project(base, ENTRY + "- **참조**: [대화](../../conversations/2026-01-01-claude.md)\n")
            outside = Path(base) / "outside.md"
            outside.write_text("외부 본문", encoding="utf-8")
            conversation.unlink()
            try:
                conversation.symlink_to(outside)
            except OSError as error:
                self.skipTest(f"symlink unavailable: {error}")
            original = path.read_bytes()
            row = self.upgrade(root, True)
            self.assertIn("outside-project", row["hint"])
            self.assertEqual(path.read_bytes(), original)

    def test_legacy_monolithic_entries_keep_separate_evidence_and_conditions(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, _ = self.project(base)
            path.unlink()
            path = root / "memory" / "architecture.md"
            entry = ENTRY.replace("# 선호", "### 001-first")
            reference = "- **참조**: [대화](conversations/2026-01-01-claude.md#L1)\n"
            second = ENTRY.replace("# 선호", "### 002-second")
            path.write_text("# Memory\n" + entry + reference + second + reference, encoding="utf-8")
            self.upgrade(root, True)
            text = path.read_text(encoding="utf-8")
            self.assertEqual(text.count("evidence: conversations/2026-01-01-claude.md#L1"), 2)
            self.assertEqual(text.count("동행 조건"), 2)
            self.assertEqual(text.count("date: 2026-01-01"), 2)
            self.assertIn("대상 파일 0개", self.upgrade(root, True)["detail"])

    def test_existing_evidence_and_decision_fields_are_preserved(self):
        with tempfile.TemporaryDirectory() as base:
            decision = "status: SUPERSEDED\nsuperseded-by: [[002-new]]\nreopen-when: 동행 조건 변경\nevidence: conversations/2026-01-01-claude.md 09:00:00\n"
            root, path, _ = self.project(base, ENTRY + decision + "- **참조**: [대화](../../conversations/2026-01-01-claude.md)\n")
            original = path.read_bytes()
            self.upgrade(root, True)
            self.assertEqual(path.read_bytes(), original)

    def test_concurrent_change_is_preserved_and_temporary_file_is_cleaned(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, _ = self.project(base)
            original = path.read_bytes()
            edited = original + "사용자 동시 수정\n".encode("utf-8")
            calls = 0
            def read_bytes(_):
                nonlocal calls
                calls += 1
                if calls == 2:
                    path.write_bytes(edited)
                    return edited
                return original
            with patch.object(Path, "read_bytes", read_bytes):
                self.assertFalse(doctor.replace_memory_file(root, path, original, "새 형식"))
            self.assertEqual(path.read_bytes(), edited)
            self.assertEqual(list(path.parent.glob("*.bak-*"))[0].read_bytes(), original)
            self.assertFalse(list(path.parent.glob(".mnemo-upgrade-*")))

    def test_duplicate_file_numbers_are_reported_without_renumbering(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, _ = self.project(base)
            other = path.with_name("001-other.md")
            other.write_text(ENTRY.replace("# 선호", "# 다른 주제"), encoding="utf-8")
            before = {path: path.read_bytes(), other: other.read_bytes()}
            report = doctor.Report()
            doctor.check_entry_metadata(root, report)
            self.assertEqual(report.rows[0]["level"], "WARN")
            self.assertIn("파일번호 중복 1묶음", report.rows[0]["detail"])
            self.assertEqual(before, {p: p.read_bytes() for p in before})

    def test_cli_requires_explicit_upgrade_flag_and_preserves_the_fix_contract(self):
        with tempfile.TemporaryDirectory() as base:
            root, path, _ = self.project(base, ENTRY + "- **참조**: [대화](conversations/2026-01-01-claude.md#L1)\n")
            (root / ".mnemo-root").touch()
            original = path.read_bytes()
            command = [sys.executable, "-B", str(Path(doctor.__file__)), "--project-root", str(root)]
            diagnosed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", timeout=60)
            self.assertIn("--upgrade-memory", diagnosed.stdout)
            self.assertEqual(path.read_bytes(), original)
            fixed = subprocess.run(command + ["--fix"], capture_output=True, text=True, encoding="utf-8", timeout=60)
            self.assertEqual(path.read_bytes(), original, fixed.stdout)
            upgraded = subprocess.run(command + ["--upgrade-memory"], capture_output=True, text=True, encoding="utf-8", timeout=60)
            self.assertEqual(upgraded.returncode, 0, upgraded.stdout + upgraded.stderr)
            self.assertIn("보정함 1개", upgraded.stdout)
            self.assertIn("evidence: conversations/", path.read_text(encoding="utf-8"))
            self.assertTrue((root / "memory" / ".mnemo-doctor-chart.md").is_file())
            chart = (root / "memory" / ".mnemo-doctor-chart.md").read_text(encoding="utf-8")
            self.assertRegex(chart, r"## [^\n]+ · --upgrade-memory")
            self.assertIn("- 고친 것: 기억 형식 갱신: 대상 파일 1개", chart)
            self.assertIn("evidence 승격 1개 / 보정함 1개", chart)


if __name__ == "__main__":
    unittest.main()
