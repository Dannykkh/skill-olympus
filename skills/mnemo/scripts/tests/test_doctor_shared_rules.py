"""닥터와 회상이 같은 규칙 하나로 기억을 읽는가.

같은 규칙이 여러 곳에 조금씩 다르게 적혀 있으면 한 도구는 정상, 다른 도구는 결손이라 한다.
`- **Date**:` 머리는 메타 검사에서는 날짜가 있고 항목 경계에서는 머리가 없었다. 옛 `### NNN-slug`
제목 링크는 회상이 열고 닥터는 '대상 확인 실패'라 했다. 메타 줄(meta_line)과 이름(entry_names)을
mnemo_markdown 한 곳에 두고, 실제 프로젝트에서 나온 모양을 여기서 고정한다.
"""

import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import mnemo_doctor as doctor
import mnemo_markdown as markdown
import recall

META = "tags: a, b, c\ndate: 2026-01-01\nsource: claude\n"

LEGACY = """# Architecture

### 001-a-2026-01-01
tags: a, b, c
date: 2026-01-01
source: codex
status: SUPERSEDED
superseded-by: [[002-b-2026-01-02]] — 2026-01-02: 동시 쓰기에서 기록이 사라져 바꿨다
옛 결정.

### 002-b-2026-01-02
tags: a, b, c
date: 2026-01-02
source: codex
status: CURRENT
supersedes: [[001-a-2026-01-01]]
새 결정.
"""


class SharedRuleTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix="mnemo-shared-")
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        (self.root / ".mnemo-root").touch()
        (self.root / "memory" / "architecture").mkdir(parents=True)

    def write(self, relative, text, newline="\n"):
        path = self.root / "memory" / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(text.replace("\n", newline).encode("utf-8"))
        return path

    def blocks(self, path):
        return [block for p, block in markdown.iter_entry_blocks(self.root) if p == path]

    def run_check(self, check, **kwargs):
        report = doctor.Report()
        result = check(self.root, report, **kwargs)
        return report.rows[0], result

    # 1 ─ 굵은 메타 필드
    def test_bold_metadata_keeps_one_entry_with_its_status(self):
        path = self.write("architecture/999-title.md",
                          "# 999. 제목\n\n- **Date**: 2026-10-15\n- **Source**: claude\n- **Tags**: a, b, c\n"
                          "- **Status**: SUPERSEDED — superseded-by: [[998-next]] 이유: 동시 쓰기에서 기록이 사라졌다\n\n"
                          "## 맥락\n본문\n\n## 결정\n본문\n")
        self.write("architecture/998-next.md", f"# 998-next\n\n{META}status: CURRENT\n")
        blocks = self.blocks(path)
        self.assertEqual(len(blocks), 1)
        self.assertIn("**Date**", blocks[0])
        self.assertEqual(doctor.entry_status(blocks[0]), "SUPERSEDED")
        row, _ = self.run_check(doctor.check_entry_metadata)
        self.assertIn("tags 없음 0 · date 없음 0 · source 없음 0", row["detail"])
        result = recall.recall(self.root, ["arch:999"], limit=1)
        self.assertEqual([r["entry_id"] for r in result["results"]][:1], ["arch:999"])
        self.assertFalse([u for u in result["unresolved"] if u["target"] == "arch:999"])

    def test_unrecognized_korean_header_is_reported_not_accepted(self):
        """한국어 이름은 받지 않는다 — 회상과 다른 CLI가 못 읽으니 닥터만 정상으로 보이면 안 된다."""
        self.write("architecture/163-sandbox.md",
                   "# 163. 샌드박스\n\n- **작성일**: 2026-10-14\n- **작성자**: antigravity\n- **상태**: SUPERSEDED\n"
                   "- **태그**: #a #b\n\n## 결정 내용\n본문\n\n## 검증\n본문\n")
        row, _ = self.run_check(doctor.check_entry_metadata)
        self.assertEqual(row["level"], "WARN")
        self.assertIn("여러 항목으로 쪼개진 번호 파일 1개", row["detail"])
        self.assertIn("인식하지 못한 한국어 머리 줄 4개", row["detail"])
        self.assertIn("작성일→date", row["hint"])

    def test_bom_file_is_still_an_entry(self):
        path = self.root / "memory" / "architecture" / "044-keys.md"
        path.write_bytes(b"\xef\xbb\xbf" + f"# 044 - keys\n\n{META}status: CURRENT\n".encode("utf-8"))
        blocks = self.blocks(path)
        self.assertEqual(len(blocks), 1)
        self.assertTrue(blocks[0].startswith("# 044"))
        result = recall.recall(self.root, ["arch:044"], limit=1)
        self.assertEqual(result["results"][0]["entry_id"], "arch:044")

    # 2 ─ 옛 `###` 제목 링크
    def test_entry_names_are_exact_heading_tokens(self):
        self.assertEqual(markdown.entry_names(Path("architecture.md"), "### 012-a-b — 설명\n본문"),
                         {"architecture", "012-a-b"})
        self.assertEqual(markdown.entry_names(Path("x/013-c.md"), "# 013. 제목\n"), {"013-c"})

    def test_legacy_heading_lifecycle_links_resolve_and_unknown_names_do_not(self):
        self.write("architecture.md", LEGACY)
        row, _ = self.run_check(doctor.check_lifecycle_links)
        self.assertIn("대상 확인 실패 0개", row["detail"])
        self.write("architecture.md", LEGACY + "superseded-by: [[003-none]]\n")
        row, _ = self.run_check(doctor.check_lifecycle_links)
        self.assertIn("대상 확인 실패 1개", row["detail"])
        self.assertIn("003-none", row["hint"])

    def test_bold_lifecycle_field_and_trailing_particle_resolve(self):
        self.write("architecture.md", LEGACY.replace(
            "supersedes: [[001-a-2026-01-01]]", "- **supersedes**: [[001-a-2026-01-01]]의 저장 범위"))
        row, _ = self.run_check(doctor.check_lifecycle_links)
        self.assertIn("supersedes 1개", row["detail"])
        self.assertIn("대상 확인 실패 0개", row["detail"])

    def test_existing_document_target_resolves_and_missing_one_does_not(self):
        """기억 밖 문서의 원칙을 대체했다고 적은 경우 — 문서가 실재하면 이어진 것이다."""
        self.write("architecture.md", LEGACY.replace(
            "supersedes: [[001-a-2026-01-01]]", "supersedes: [[001-a-2026-01-01]]\n`supersedes:` docs/x.md의 원칙"))
        row, _ = self.run_check(doctor.check_lifecycle_links)
        self.assertIn("대상 확인 실패 1개", row["detail"])
        (self.root / "docs").mkdir()
        (self.root / "docs" / "x.md").write_text("# x\n", encoding="utf-8")
        row, _ = self.run_check(doctor.check_lifecycle_links)
        self.assertIn("대상 확인 실패 0개", row["detail"])

    # 3 ─ 대체 이유
    def superseded(self, name, body):
        self.write(f"architecture/{name}.md",
                   f"# {name}\n\n{META}status: SUPERSEDED\nsuperseded-by: [[100-next]]\n\n{body}\n")

    def test_reason_after_status_link_and_blank_line_counts(self):
        self.write("architecture/100-next.md", f"# 100-next\n\n{META}status: CURRENT\n")
        self.superseded("101-with-reason", "- 변경 이유: 동시 세션이 같은 번호를 골라 기록이 겹쳤다")
        self.superseded("102-dated", "2026-10-06: 자동 조회를 명시 범위로 대체했다. 비용이 컸다")
        self.superseded("103-old-body", "- 결정: " + "아주 긴 옛 본문이 이어진다 " * 10)
        self.write("architecture/104-inline.md",
                   f"# 104-inline\n\n{META}status: SUPERSEDED\n"
                   "superseded-by: [[100-next]] — 2026-10-16: 감리에서 값이 어디서도 읽히지 않았다\n")
        _, metrics = self.run_check(doctor.check_decision_reasons)
        self.assertEqual(metrics["supersede_total"], 4)
        self.assertEqual(metrics["supersede_no_reason"], 1)

    # 4 ─ 열리지 않는 depends-on
    def test_missing_dependency_target_is_counted_but_legacy_heading_is_not(self):
        self.write("architecture.md", LEGACY)
        self.write("architecture/120-built.md",
                   f"# 120-built\n\n{META}status: CURRENT\ndepends-on: [[777-none]], [[002-b-2026-01-02]]\n")
        row, metrics = self.run_check(doctor.check_decision_reasons)
        self.assertEqual(metrics["depends_missing"], 1)
        self.assertIn("120-built.md → 777-none", row["detail"])
        self.assertIn("추측", row["hint"])

    def test_existing_file_without_entry_structure_is_not_a_missing_target(self):
        """항목으로 못 읽힌 파일도 실재한다 — 파싱 실패가 '대상 없음' 오탐으로 번지면 안 된다."""
        self.write("architecture/150-plain.md", "제목 없이 쓴 메모\n")
        self.write("architecture/151-built.md",
                   f"# 151-built\n\n{META}status: CURRENT\ndepends-on: [[150-plain]]\nsupersedes: [[150-plain]]\n")
        _, metrics = self.run_check(doctor.check_decision_reasons)
        self.assertEqual((metrics["depends_missing"], metrics["stale_depends"]), (0, 0))
        row, _ = self.run_check(doctor.check_lifecycle_links)
        self.assertIn("대상 확인 실패 0개", row["detail"])

    # 5 ─ 다항목 파일 안의 상태와 자기 순환
    def test_superseded_heading_entry_shakes_dependents_and_self_cycle_is_named(self):
        self.write("architecture.md", LEGACY.replace(
            "supersedes: [[001-a-2026-01-01]]", "supersedes: [[001-a-2026-01-01]]\ndepends-on: [[001-a-2026-01-01]]"))
        self.write("architecture/130-font.md",
                   f"# 130-font\n\n{META}status: CURRENT\ndepends-on: [[001-a-2026-01-01]]\n")
        row, metrics = self.run_check(doctor.check_decision_reasons)
        self.assertEqual(metrics["stale_depends"], 2)
        self.assertEqual(metrics["depends_cycle"], 1)
        self.assertIn("architecture.md › 002-b-2026-01-02 → 001-a-2026-01-01", row["detail"])

    def test_partial_supersede_of_a_live_entry_is_not_a_cycle(self):
        self.write("architecture/140-base.md", f"# 140-base\n\n{META}status: CURRENT\n")
        self.write("architecture/141-part.md",
                   f"# 141-part\n\n{META}status: CURRENT\nsupersedes: [[140-base]]의 저장 범위\n"
                   "depends-on: [[140-base]]\n")
        _, metrics = self.run_check(doctor.check_decision_reasons)
        self.assertEqual((metrics["stale_depends"], metrics["depends_cycle"]), (0, 0))

    # 6·7 ─ 파생 파일과 다른 이름의 색인
    def test_derived_and_backup_files_are_not_split_candidates(self):
        self.write(".mnemo-anchor-index.md", "## a\n" + "x" * 60000)
        self.write(".meta-backup-1/big.md", "### 항목\n" + "x" * 60000)
        self.write("architecture.md", LEGACY + "x" * 60000)
        row, _ = self.run_check(doctor.check_detail_file_size)
        self.assertIn("architecture.md", row["detail"])
        self.assertNotIn(".mnemo-anchor-index", row["detail"] + (row["hint"] or ""))
        self.assertNotIn("big.md", row["detail"])

    def test_keyword_index_is_not_an_entry(self):
        self.write("keyword-index.md", "# Keyword index\n\n| Keyword | Read |\n|---|---|\n| a | [x](architecture.md) |\n")
        self.assertEqual(list(markdown.iter_entry_blocks(self.root)), [])

    # 8 ─ 원본 바이트 백업과 줄바꿈 보존
    def test_fix_backs_up_exact_bytes_and_keeps_crlf(self):
        old = self.write("architecture/040-old-decision.md",
                         f"# old-decision\n\n{META}\n- ❌ SUPERSEDED `superseded-by: #new-decision` 이유: 경합\n",
                         newline="\r\n")
        self.write("architecture/041-new-decision.md", f"# new-decision ✅ CURRENT\n\n{META}status: CURRENT\n",
                   newline="\r\n")
        before = old.read_bytes()
        row, _ = self.run_check(doctor.check_lifecycle_links, fix=True)
        self.assertIn("보정함 1개", row["detail"])
        backups = list(old.parent.glob("040-old-decision.md.bak-*"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_bytes(), before)
        after = old.read_bytes()
        self.assertEqual(after.count(b"\r\n"), before.count(b"\r\n"))
        changed = [(a, b) for a, b in zip(before.split(b"\r\n"), after.split(b"\r\n")) if a != b]
        self.assertEqual(len(changed), 1)
        self.assertIn(b"[[041-new-decision]]", changed[0][1])

    def test_promote_structure_keeps_crlf_and_exact_backup(self):
        (self.root / "hooks").mkdir()
        (self.root / "hooks" / "save.sh").write_text("#!/bin/sh\n", encoding="utf-8")
        entry = self.write("architecture/050-anchor.md",
                           f"# 050-anchor\n\n{META}\n- 결정: hooks/save.sh 에서 저장한다\n", newline="\r\n")
        before = entry.read_bytes()
        doctor.promote_structure(self.root, doctor.Report())
        after = entry.read_bytes()
        self.assertIn(b"`files:` hooks/save.sh\r\n", after)
        self.assertNotIn(b"\n", after.replace(b"\r\n", b""))
        self.assertEqual(list(entry.parent.glob("050-anchor.md.bak-*"))[0].read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
