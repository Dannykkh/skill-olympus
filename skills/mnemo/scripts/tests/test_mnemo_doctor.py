"""The doctor reports everything and repairs almost nothing — that split is the design.

Memory rot is invisible in a diff because memory/ sits outside version control, so the
value is in surfacing it. But most of what rots needs a person: whether a moved anchor
means "fix the path" or "this decision is SUPERSEDED" is a judgement, not arithmetic.
Only the distillation baseline is purely mechanical, so only it is touched by --fix.
"""

import json
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
SCRIPT = SCRIPTS / "mnemo_doctor.py"
sys.path.insert(0, str(SCRIPTS))
import mnemo_doctor as doctor
import check_memory_anchors as anchors

ENTRY = """### 릴레이 구조

tags: relay, binding, architecture
date: 2026-09-16
source: claude

바인딩 기입은 `src/Relay.cs` 한 곳뿐이다.
"""


class MnemoDoctorTests(unittest.TestCase):
    def test_contextual_only_anchors_are_not_reported_as_all_verified(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            output = '[INFO] 코드 앵커 0개를 확인했습니다.\n[CONTEXT] 현재 파일 존재 검증에서 분리한 참조 2개\n'
            with patch.object(doctor, 'run_sibling', return_value=(0, output)):
                report = doctor.Report()
                doctor.check_anchors(project, report)
            self.assertEqual(report.rows[0]['level'], 'WARN')
            self.assertIn('별도 문맥 확인 2개', report.rows[0]['detail'])
            self.assertNotIn('전부 실재', report.rows[0]['detail'])

    def test_category_indexes_are_not_entries_or_duplicate_bodies(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            memory = project / 'memory'
            (memory / 'gotchas').mkdir(exist_ok=True)
            (memory / 'gotchas' / 'index.md').write_text('# Index\n', encoding='utf-8')
            (memory / 'gotchas.md').write_text('# Gotchas (카테고리 인덱스)\n## Category\n[Entry](gotchas/001.md)\n', encoding='utf-8')
            (memory / 'old-index.md').write_text('# 기존 전체 색인\ntags: old, index, archive\ndate: 2026-01-01\nsource: codex\n# MEMORY.md\n[Entry](gotchas/001.md)\n### Managed index timestamp\n`date: 2026-01-01`\n', encoding='utf-8')
            self.assertEqual(len(list(doctor.iter_entry_blocks(project))), 1)
            report = doctor.Report()
            doctor.check_detail_file_size(project, report)
            self.assertEqual(report.rows[0]['level'], 'OK')
            (memory / 'gotchas.md').write_text(ENTRY, encoding='utf-8')
            report = doctor.Report()
            doctor.check_detail_file_size(project, report)
            self.assertEqual(report.rows[0]['level'], 'WARN')

    def test_metadata_after_long_provenance_is_detected_but_examples_are_not(self):
        with tempfile.TemporaryDirectory() as temp:
            entry = ENTRY.replace('tags:', '이전 결정의 설명. ' * 100 + '\n\n#tags:')
            project = self.make_project(temp, entry=entry)
            report = doctor.Report()
            doctor.check_entry_metadata(project, report)
            self.assertEqual(report.rows[0]['level'], 'OK')
            (project / 'memory' / 'architecture.md').write_text('# Entry\n```md\ntags: a\ndate: 2026\nsource: codex\n```\nActual body\n', encoding='utf-8')
            report = doctor.Report()
            doctor.check_entry_metadata(project, report)
            self.assertEqual(report.rows[0]['level'], 'WARN')

    def test_lifecycle_backticks_punctuation_and_inline_definition(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, entry=ENTRY + '\n- `superseded-by: #next`. 설명\n- CURRENT #next: 새 결정\n')
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report)
            self.assertEqual(report.rows[0]['level'], 'OK')
            # A ref's trailing prose must not become its target or resolve itself.
            (project / 'memory' / 'architecture.md').write_text(ENTRY + '\n`superseded-by: #missing`의 설명\n', encoding='utf-8')
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report)
            self.assertEqual(report.rows[0]['hint'], '가리키는 대상을 찾지 못한 링크: #missing')

    def test_lifecycle_examples_do_not_create_links(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, entry=ENTRY + '\n```md\nsupersedes: #missing\n```\n')
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report)
            self.assertEqual(report.rows[0]['level'], 'OK')

    def test_missing_date_does_not_crash(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, entry=ENTRY.replace('date: 2026-09-16\n', ''))
            report = doctor.Report()
            doctor.check_entry_metadata(project, report)
            self.assertEqual(report.rows[0]['level'], 'WARN')
            self.assertIn('date 없음 1', report.rows[0]['detail'])

    def test_split_entry_subheadings_and_fences_are_not_entries(self):
        with tempfile.TemporaryDirectory() as temp:
            entry = ENTRY.replace('### 릴레이 구조', '# 릴레이 구조')
            entry += '\n## Details\nText\n```md\n# Example\n```\n### Nested\nText\n'
            project = self.make_project(temp, entry=entry)
            (project / 'memory' / 'index.md').write_text('# Index\n## Category\n', encoding='utf-8')
            blocks = list(doctor.iter_entry_blocks(project))
            self.assertEqual(len(blocks), 1)
            self.assertIn('### Nested', blocks[0][1])

    def test_legacy_backtick_metadata_selects_entry_not_category(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, entry='# Memory\n## Category\n### First\n`tags: a, b, c`\n`date: 2026-09-17`\n`source: codex`\n#### Detail\ntext\n### Missing metadata\ntext\n')
            blocks = list(doctor.iter_entry_blocks(project))
            self.assertEqual(len(blocks), 2)
            self.assertTrue(blocks[0][1].startswith('### First'))

    def test_hidden_parent_and_absolute_anchors_resolve_real_files(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, sources=('.github/workflows/test.yml',))
            parent_file = Path(temp) / 'outside.py'
            parent_file.write_text('# source', encoding='utf-8')
            memory = project / 'memory' / 'architecture.md'
            memory.write_text(f'# Entry\n`.github/workflows/test.yml:12`\n`../outside.py:1`\n`{parent_file.as_posix()}:1`\n', encoding='utf-8')
            stale, checked, unreadable = anchors.collect_anchors(project, [memory], {})
            self.assertEqual(checked, 3)
            self.assertEqual(stale, [])
            self.assertEqual(unreadable, [])

    def test_nested_size_checks_exclude_both_archive_spellings(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            for directory in ('architecture', 'archive', '.archive'):
                path = project / 'memory' / directory
                path.mkdir()
                (path / 'large.md').write_text('x' * 60000, encoding='utf-8')
            report = doctor.Report()
            doctor.check_detail_file_size(project, report)
            self.assertIn('architecture/large.md', report.rows[0]['detail'])
            self.assertNotIn('archive/', report.rows[0]['detail'])

    def test_equal_number_of_nonexistent_lifecycle_targets_warns(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, entry=ENTRY + '\nsuperseded-by: #missing\nsupersedes: #also-missing\n')
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report)
            self.assertEqual(report.rows[0]['level'], 'WARN')
            self.assertIn('missing', report.rows[0]['hint'])

    def test_actual_lifecycle_file_and_heading_targets_resolve(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, entry=ENTRY + '\nsuperseded-by: [new](new.md#new)\n')
            (project / 'memory' / 'new.md').write_text('# New\ntags: a, b, c\ndate: 2026-09-17\nsource: codex\nsupersedes: architecture.md#릴레이-구조\n', encoding='utf-8')
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report)
            self.assertEqual(report.rows[0]['level'], 'OK')

    def test_failed_helpers_never_report_ok(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            self.write_handoffs(project, 3, chained=True)
            for check in (doctor.check_anchors, doctor.check_observation_classification,
                          doctor.check_history_recoverability):
                for code in (None, 2, -1):
                    with self.subTest(check=check.__name__, code=code), patch.object(doctor, 'run_sibling', return_value=(code, 'broken')):
                        report = doctor.Report()
                        check(project, report)
                        self.assertNotEqual(report.rows[0]['level'], 'OK')

    def test_helper_timeouts_are_diagnosed(self):
        with patch.object(doctor.subprocess, 'run', side_effect=subprocess.TimeoutExpired('helper', 300)):
            code, detail = doctor.run_sibling('check_memory_anchors.py', Path('.'))
        self.assertEqual(code, 2)
        self.assertIn('실행 실패', detail)

    def test_anchor_normalization_preserves_path_semantics(self):
        for raw, expected in (('.github/workflows/test.yml:12', '.github/workflows/test.yml'),
                              ('../src/test.py:2', '../src/test.py'),
                              ('/tmp/test.py:3', '/tmp/test.py'),
                              ('./src/test.py', 'src/test.py'),
                              ('C:\\src\\test.py:4', 'C:/src/test.py')):
            self.assertEqual(anchors.normalize_anchor(raw), expected)

    def run_doctor(self, project, *args):
        return subprocess.run([sys.executable, str(SCRIPT), "--project-root", str(project), *args],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=300)

    def make_project(self, temp, *, index=None, entry=ENTRY, sources=("src/Relay.cs",),
                     offset=None, observations=None):
        project = Path(temp) / "project"
        project.mkdir(parents=True)
        subprocess.run(["git", "init", "-q"], cwd=project, check=True, timeout=30)
        (project / "memory").mkdir()
        (project / "conversations").mkdir()
        (project / "docs" / "handoffs").mkdir(parents=True)
        if entry:
            (project / "memory" / "architecture.md").write_text(entry, encoding="utf-8")
        (project / "MEMORY.md").write_text(
            index if index is not None else "# MEMORY\n\n- [아키텍처](memory/architecture.md)\n",
            encoding="utf-8")
        for rel in sources:
            path = project / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("// 내용\n", encoding="utf-8")
        if observations is not None:
            for kind, lines in observations.items():
                directory = project / "memory" / kind
                directory.mkdir(exist_ok=True)
                (directory / "observations.jsonl").write_text(
                    "".join(line + "\n" for line in lines), encoding="utf-8")
        if offset:
            (project / "memory" / ".mnemo-distill-offset").write_text(offset, encoding="utf-8")
        return project

    def test_healthy_project_reports_no_failure(self):
        with tempfile.TemporaryDirectory() as temp:
            result = self.run_doctor(self.make_project(temp))
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("저장 구조", result.stdout)
            self.assertNotIn("[FAIL]", result.stdout)

    def test_broken_index_link_is_a_failure(self):
        """인덱스 링크가 끊기면 과거 검색 1~2단계가 통째로 막힌다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, index="# MEMORY\n\n- [없음](memory/gone.md)\n")
            result = self.run_doctor(project)
            self.assertEqual(result.returncode, 1)
            self.assertIn("인덱스 링크", result.stdout)
            self.assertIn("memory/gone.md", result.stdout)

    def test_oversized_index_is_warned_not_failed(self):
        with tempfile.TemporaryDirectory() as temp:
            big = "# MEMORY\n\n" + "\n".join(f"- 항목 {i}" for i in range(200))
            result = self.run_doctor(self.make_project(temp, index=big))
            self.assertIn("인덱스 예산", result.stdout)
            self.assertIn("[WARN]", result.stdout)
            self.assertEqual(result.returncode, 0, "예산 초과는 실패가 아니라 경고여야 합니다")

    def test_missing_entry_metadata_is_reported(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, entry="### 태그 없는 항목\n\n본문만 있습니다.\n")
            result = self.run_doctor(project)
            self.assertIn("항목 메타데이터", result.stdout)
            self.assertIn("tags 없음 1", result.stdout)

    def test_stale_anchor_is_surfaced_but_not_repaired(self):
        """경로 수정인지 SUPERSEDED인지는 도구가 정할 수 없다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, sources=())      # Relay.cs를 만들지 않는다
            before = (project / "memory" / "architecture.md").read_bytes()
            result = self.run_doctor(project, "--fix")
            self.assertIn("코드 앵커", result.stdout)
            self.assertIn("찾지 못한 파일 참조", result.stdout)
            self.assertEqual((project / "memory" / "architecture.md").read_bytes(), before,
                             "--fix가 기억 본문을 건드렸습니다")

    def test_rotated_observation_log_leaves_a_stale_baseline(self):
        """회전하면 파일이 비는데 기준값은 옛 줄 수로 남아 delta가 음수가 된다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                observations={"gotchas": ['{"event":"turn_error"}'], "learned": []},
                offset="1 5000 1789000000")
            result = self.run_doctor(project)
            self.assertEqual(result.returncode, 1)
            self.assertIn("정제 기준값", result.stdout)
            self.assertIn("delta -", result.stdout)

    # ── lifecycle --fix: 태그 이름(#slug) 링크를 항목 번호([[NNN-slug]])로 ──
    # 태그는 검색용이라 바뀌고 유일하지 않다. 번호는 안 바뀐다. 바꾸는 조건은 같은 디렉터리에서
    # 제목 slug 또는 파일명(번호 뗀 것)이 정확히 하나와 일치할 때뿐이다. 추측은 없다.

    def split_dir(self, temp, files):
        """memory/architecture/ 분할 디렉터리를 만든다. files = {파일명: 본문}."""
        project = self.make_project(temp, entry=None)
        directory = project / "memory" / "architecture"
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "index.md").write_text("# Architecture Index\n", encoding="utf-8")
        for name, body in files.items():
            (directory / name).write_text(body, encoding="utf-8")
        return project, directory

    # 실제로 끊기는 형태: 옛 분할기가 제목에 상태 접미(✅ CURRENT)를 남겨 제목 slug는 어긋나고
    # 파일명(번호 뗀 것)만 참조와 맞는다. 제목이 깨끗하면 기존 판정기가 이미 풀어 --fix 대상이 아니다.

    def test_tag_link_to_unique_entry_is_reported_as_fixable_but_untouched_without_fix(self):
        with tempfile.TemporaryDirectory() as temp:
            project, directory = self.split_dir(temp, {
                "040-old-decision.md": "# old-decision ❌ SUPERSEDED\n\ntags: a\ndate: 2026-01-01\nsource: claude\n\n"
                                       "- ❌ SUPERSEDED `superseded-by: #new-decision`\n",
                "041-new-decision.md": "# new-decision ✅ CURRENT\n\ntags: a\ndate: 2026-02-02\nsource: claude\n\n- CURRENT\n",
            })
            before = (directory / "040-old-decision.md").read_bytes()
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report)
            row = report.rows[0]
            self.assertEqual(row["level"], "WARN")
            self.assertIn("--fix", row["hint"])
            self.assertIn("1개는 같은 디렉터리", row["hint"])
            self.assertEqual((directory / "040-old-decision.md").read_bytes(), before)

    def test_fix_rewrites_tag_link_to_numbered_wiki_link_with_backup(self):
        with tempfile.TemporaryDirectory() as temp:
            project, directory = self.split_dir(temp, {
                "040-old-decision.md": "# old-decision ❌ SUPERSEDED\n\ntags: a\ndate: 2026-01-01\nsource: claude\n\n"
                                       "- ❌ SUPERSEDED `superseded-by: #new-decision` 설명이 이어진다\n",
                "041-new-decision.md": "# new-decision ✅ CURRENT\n\ntags: a\ndate: 2026-02-02\nsource: claude\n\n"
                                       "- ✅ CURRENT `supersedes: #old-decision`\n",
            })
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report, fix=True)
            self.assertIn("보정함 2개", report.rows[0]["detail"])
            old = (directory / "040-old-decision.md").read_text(encoding="utf-8")
            new = (directory / "041-new-decision.md").read_text(encoding="utf-8")
            self.assertIn("`superseded-by: [[041-new-decision]]` 설명이 이어진다", old)
            self.assertIn("`supersedes: [[040-old-decision]]`", new)
            self.assertEqual(len(list(directory.glob("*.bak-*"))), 2, "파일마다 백업이 남아야 한다")
            # 바꾼 뒤 다시 검사하면 번호 링크가 실재 파일로 풀린다.
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report)
            self.assertEqual(report.rows[0]["level"], "OK", report.rows[0])

    # "둘 이상에 맞는 경우" 테스트는 이 규칙 아래서 구성할 수 없다 — 파일명 stem은 한 디렉터리에서
    # 유일하고, 제목 slug가 정확히 같은 파일은 기존 판정기가 먼저 풀어 끊긴 링크로 오지 않는다.
    # 그래서 "추측 금지"는 아래 축약 참조 거부 테스트가 지킨다.

    def test_fix_refuses_abbreviated_reference(self):
        """`#video-maker`가 `video-maker-engine-router, remotion`의 앞부분이어도 잇지 않는다."""
        with tempfile.TemporaryDirectory() as temp:
            project, directory = self.split_dir(temp, {
                "040-old.md": "# old\n\n- `superseded-by: #video-maker`\n",
                "041-video-maker-engine-router-remotion.md": "# video-maker-engine-router, remotion\n\n- CURRENT\n",
            })
            before = (directory / "040-old.md").read_bytes()
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report, fix=True)
            self.assertEqual((directory / "040-old.md").read_bytes(), before)
            self.assertIn("#video-maker", report.rows[0]["hint"])

    def test_fix_skips_examples_inside_code_fences(self):
        with tempfile.TemporaryDirectory() as temp:
            project, directory = self.split_dir(temp, {
                "040-old.md": "# old ❌ SUPERSEDED\n\n- `superseded-by: #new`\n\n```md\nsuperseded-by: #new\n```\n",
                "041-new.md": "# new ✅ CURRENT\n\n- CURRENT\n",
            })
            report = doctor.Report()
            doctor.check_lifecycle_links(project, report, fix=True)
            text = (directory / "040-old.md").read_text(encoding="utf-8")
            self.assertIn("- `superseded-by: [[041-new]]`", text)
            self.assertIn("```md\nsuperseded-by: #new\n```", text, "펜스 안 예시는 그대로여야 한다")

    def test_fix_repairs_only_the_baseline(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                observations={"gotchas": ['{"event":"turn_error"}'], "learned": []},
                offset="1 5000 1789000000")
            entry_before = (project / "memory" / "architecture.md").read_bytes()
            result = self.run_doctor(project, "--fix")
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("보정함", result.stdout)
            parts = (project / "memory" / ".mnemo-distill-offset").read_text(encoding="utf-8").split()
            self.assertEqual(parts[0], "1")
            self.assertEqual(parts[1], "0")
            self.assertEqual(parts[2], "1789000000", "기준 시각은 보존되어야 합니다")
            self.assertEqual((project / "memory" / "architecture.md").read_bytes(), entry_before)

    def test_diagnosis_alone_never_writes(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                observations={"gotchas": ['{"event":"turn_error"}'], "learned": []},
                offset="1 5000 1789000000")
            snapshot = {p.relative_to(project).as_posix(): p.read_bytes()
                        for p in project.rglob("*") if p.is_file() and ".git" not in p.parts}
            self.run_doctor(project)
            after = {p.relative_to(project).as_posix(): p.read_bytes()
                     for p in project.rglob("*") if p.is_file() and ".git" not in p.parts}
            self.assertEqual(snapshot, after)

    def make_records_project(self, temp):
        """절대경로가 남은 옛 기록: 핸드오프 헤더, 도구 로그, 관찰 로그, 기억 본문.

        old_root는 다른 위치(분리된 저장소·전신 프로젝트·워크트리처럼 이 루트가 아닌 곳),
        outside는 루트 밖 파일이다. 둘 다 그대로 남아야 한다.
        """
        project = self.make_project(temp)
        old_root = Path(temp) / "old-location"
        outside = Path(temp).parent / "outside" / "settings.json"
        handoffs = project / "docs" / "handoffs"
        (handoffs / "2026-01-01-000000-a.md").write_text(
            "# Handoff: a\n\n## Session Metadata\n- Created: 2026-01-01 00:00:00\n"
            f"- Project: {project}\n- Branch: main\n", encoding="utf-8")
        (handoffs / "2026-02-01-000000-b.md").write_text(
            f"# Handoff: b\n\n## Session Metadata\n- Project: `{old_root}` (skill-olympus)\n", encoding="utf-8")
        (handoffs / "2026-03-01-000000-c.md").write_text(
            f"# Handoff: c\n\n## Session Metadata\n- Project: `{project}` (개발 PC) → 서버로 이관\n", encoding="utf-8")
        (handoffs / "2026-04-01-000000-d.md").write_text(
            f"# Handoff: d\n\n## Session Metadata\n- Project: {project / 'nested' / 'repo'}\n", encoding="utf-8")
        (project / "conversations" / "2026-01-01-toollog.md").write_text(
            "---\ntype: tool-log\n---\n"
            f"- `[10:00:00]` **Edit** {project / 'src' / 'Relay.cs'}\n"
            f"- `[10:00:01]` **Write** {old_root / 'docs' / 'a.md'}\n"
            f"- `[10:00:02]` **Edit** {outside}\n"
            f"- `[10:00:03]` **Bash** cat {project / 'src' / 'Relay.cs'}\n"
            "- `[10:00:04]` **Edit** src/already.cs\n", encoding="utf-8")
        learned = project / "memory" / "learned"
        learned.mkdir()
        rows = [
            {"timestamp": "t", "event": "tool_success", "tool": "Edit", "session": "s", "output": "",
             "input": json.dumps({"file_path": str(project / "src" / "Relay.cs"), "content": "x"})},
            {"timestamp": "t", "event": "tool_success", "tool": "Write", "session": "s", "output": "",
             "input": json.dumps({"file_path": str(outside)})},
            {"timestamp": "t", "event": "tool_success", "tool": "Bash", "session": "s", "output": "",
             "input": json.dumps({"command": f"cat {project / 'x'}"})},
        ]
        (learned / "observations.jsonl").write_text(
            "".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
        (project / "memory" / "architecture.md").write_text(
            ENTRY + f"\n예시: `{project / 'src' / 'Relay.cs'}` 를 연다.\n", encoding="utf-8")
        return project, old_root, outside

    def snapshot(self, project):
        return {p: p.read_bytes() for p in project.rglob("*") if p.is_file() and ".git" not in p.parts}

    def test_absolute_record_paths_are_reported_but_untouched_without_fix(self):
        with tempfile.TemporaryDirectory() as temp:
            project, _, _ = self.make_records_project(temp)
            before = self.snapshot(project)
            report = doctor.Report()
            doctor.check_record_paths(project, report)
            row = report.rows[0]
            self.assertEqual(row["level"], "WARN")
            for expected in ("핸드오프 헤더 2개", "도구 로그 1줄", "관찰 로그 1줄", "기억 본문 1줄",
                             "다른 위치를 가리키는 헤더 2개"):
                self.assertIn(expected, row["detail"])
            self.assertIn("--fix", row["hint"])
            self.assertEqual(before, self.snapshot(project), "진단만으로는 아무것도 쓰지 않는다")

    def test_fix_relativizes_records_with_backups_and_preserves_line_counts(self):
        with tempfile.TemporaryDirectory() as temp:
            project, old_root, outside = self.make_records_project(temp)
            prose_before = (project / "memory" / "architecture.md").read_bytes()
            b_before = (project / "docs" / "handoffs" / "2026-02-01-000000-b.md").read_bytes()
            d_before = (project / "docs" / "handoffs" / "2026-04-01-000000-d.md").read_bytes()
            result = self.run_doctor(project, "--fix")
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("보정함: 핸드오프 헤더 2개 / 도구 로그 1줄 / 관찰 로그 1줄", result.stdout)
            handoffs = project / "docs" / "handoffs"
            self.assertIn("- Project: project\n", (handoffs / "2026-01-01-000000-a.md").read_text(encoding="utf-8"))
            self.assertEqual((handoffs / "2026-02-01-000000-b.md").read_bytes(), b_before,
                             "다른 위치를 가리키는 헤더는 분리된 프로젝트의 흔적일 수 있어 그대로 둔다")
            self.assertIn("- Project: project (개발 PC) → 서버로 이관\n",
                          (handoffs / "2026-03-01-000000-c.md").read_text(encoding="utf-8"),
                          "루트 뒤에 붙은 설명은 보존한다")
            self.assertEqual((handoffs / "2026-04-01-000000-d.md").read_bytes(), d_before,
                             "루트의 하위 경로는 중첩 프로젝트 선언이라 그대로 둔다")
            toollog = (project / "conversations" / "2026-01-01-toollog.md").read_text(encoding="utf-8")
            self.assertIn("**Edit** src/Relay.cs\n", toollog)
            self.assertIn(f"**Write** {old_root / 'docs' / 'a.md'}\n", toollog, "다른 위치의 경로는 그대로")
            self.assertIn(f"**Edit** {outside}\n", toollog, "루트 밖 경로는 그대로")
            self.assertIn(f"**Bash** cat {project / 'src' / 'Relay.cs'}\n", toollog, "명령 본문은 그대로")
            lines = (project / "memory" / "learned" / "observations.jsonl").read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), 3, "관찰 로그 줄 수는 정제 기준값의 근거라 보존한다")
            records = [json.loads(line) for line in lines]
            self.assertEqual(json.loads(records[0]["input"])["file_path"], "src/Relay.cs")
            self.assertEqual(json.loads(records[1]["input"])["file_path"], str(outside))
            self.assertEqual(json.loads(records[2]["input"])["command"], f"cat {project / 'x'}")
            self.assertEqual((project / "memory" / "architecture.md").read_bytes(), prose_before, "기억 본문은 보고만")
            backups = [p for p in project.rglob("*.bak-*") if ".git" not in p.parts]
            self.assertEqual(len(backups), 4, "바뀐 파일마다 백업이 남는다")
            # 두 번째 실행은 고칠 것이 없고 백업도 늘지 않는다.
            again = self.run_doctor(project, "--fix")
            self.assertEqual(again.returncode, 0, again.stdout)
            self.assertNotIn("보정함: 핸드오프", again.stdout)
            self.assertEqual(len([p for p in project.rglob("*.bak-*") if ".git" not in p.parts]), 4)

    def write_handoffs(self, project, count, *, chained=False, with_changes=True):
        """날짜가 다른 핸드오프를 만든다. chained면 앞 문서를 가리키는 체인을 잇는다."""
        directory = project / "docs" / "handoffs"
        previous = None
        for i in range(count):
            name = f"2026-0{(i % 9) + 1}-1{i % 9}-1200{i:02d}-task{i}.md"
            body = f"# Handoff: 작업 {i}\n\n"
            if chained and previous:
                body += f"## Handoff Chain\n\n- **Continues from**: [{previous}](./{previous})\n\n"
            if with_changes:
                body += "### Files Modified\n| File | Change |\n|---|---|\n| src/Relay.cs | 수정 |\n"
            (directory / name).write_text(body, encoding="utf-8")
            previous = name

    def test_project_without_handoffs_says_history_cannot_be_recovered(self):
        """구조만 멀쩡하다고 보고하면, 역사가 통째로 없다는 사실이 가려진다."""
        with tempfile.TemporaryDirectory() as temp:
            result = self.run_doctor(self.make_project(temp))
            self.assertIn("역사 복원", result.stdout)
            self.assertIn("되살릴 수 없습니다", result.stdout)

    def test_weak_handoff_chain_points_at_file_lineage_instead(self):
        """체인이 끊겨 있어도 파일 계보로 인과는 따라갈 수 있다 — 그 경로를 알려야 한다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            self.write_handoffs(project, 10, chained=False)
            result = self.run_doctor(project)
            self.assertIn("역사 복원", result.stdout)
            self.assertIn("체인 연결 0/10", result.stdout)
            self.assertIn("harvest_lineage.py", result.stdout)

    def test_connected_chain_is_not_flagged(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            self.write_handoffs(project, 10, chained=True)
            result = self.run_doctor(project)
            history = [l for l in result.stdout.splitlines() if "역사 복원" in l]
            self.assertTrue(history and "[OK" in history[0],
                            f"체인이 이어졌는데 경고했습니다: {history}")
            self.assertIn("기록 범위", result.stdout)

    def commit_at(self, project, date, message, filename="a.txt"):
        path = project / filename
        path.write_text(path.read_text(encoding="utf-8") + date + "\n" if path.exists() else date + "\n",
                        encoding="utf-8")
        env = {"GIT_AUTHOR_DATE": f"{date}T10:00:00", "GIT_COMMITTER_DATE": f"{date}T10:00:00"}
        subprocess.run(["git", "add", "-A"], cwd=project, check=True, timeout=30)
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t",
                        "commit", "-q", "-m", message],
                       cwd=project, check=True, timeout=30,
                       env={**__import__("os").environ, **env})

    def test_records_starting_long_after_the_project_are_flagged(self):
        """기억은 도입 시점부터 시작한다. 그 앞 구간이 비어 있다는 사실을 말해야 한다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            self.commit_at(project, "2026-01-01", "feat: initial")
            self.commit_at(project, "2026-06-01", "fix: later")
            (project / "docs" / "handoffs" / "2026-06-01-120000-late.md").write_text(
                "# Handoff: 늦은 시작\n", encoding="utf-8")
            result = self.run_doctor(project)
            self.assertIn("기록 커버리지", result.stdout)
            self.assertIn("프로젝트 시작 2026-01-01", result.stdout)
            self.assertIn("공백", result.stdout)
            self.assertIn("git 커밋 메시지로만", result.stdout)

    def test_coverage_reports_commit_message_quality_for_the_gap(self):
        """공백을 메우는 것이 커밋뿐이라면, 그 커밋이 읽을 만한지도 알려야 한다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            self.commit_at(project, "2026-01-01", "feat: 규격을 정했다")
            self.commit_at(project, "2026-06-01", "fix: 버그를 고쳤다")
            (project / "docs" / "handoffs" / "2026-06-01-120000-late.md").write_text(
                "# Handoff\n", encoding="utf-8")
            result = self.run_doctor(project)
            self.assertIn("conventional 100%", result.stdout)

    def test_coverage_without_git_does_not_crash(self):
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "plain"
            (project / "memory").mkdir(parents=True)
            (project / "MEMORY.md").write_text("# MEMORY\n", encoding="utf-8")
            (project / ".mnemo-root").touch()
            result = self.run_doctor(project)
            self.assertIn(result.returncode, (0, 1), result.stdout)
            self.assertIn("기록 커버리지", result.stdout)

    def test_oversized_detail_file_points_at_the_existing_split_pattern(self):
        """인덱스에만 예산이 있고 상세 파일에는 상한이 없다 — 그래서 조용히 커진다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            body = "# 아키텍처\n\n"
            for section in range(5):
                body += f"## 영역 {section}\n\n"
                for entry in range(20):
                    body += (f"### 항목 {section}-{entry}\n\ntags: a, b, c\ndate: 2026-09-16\n"
                             f"source: claude\n\n{'설명 ' * 200}\n\n")
            (project / "memory" / "architecture.md").write_text(body, encoding="utf-8")
            result = self.run_doctor(project)
            self.assertIn("상세 파일 크기", result.stdout)
            self.assertIn("architecture.md", result.stdout)
            self.assertIn("## 섹션 5개", result.stdout)
            self.assertIn("index.md", result.stdout)

    def test_split_directory_alongside_monolithic_file_is_flagged(self):
        """gotchas/ 와 gotchas.md 가 같이 있으면 어느 쪽이 정본인지 알 수 없다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp)
            split = project / "memory" / "gotchas"
            split.mkdir()
            (split / "index.md").write_text("# 인덱스\n", encoding="utf-8")
            (split / "001-first.md").write_text("### 항목\n", encoding="utf-8")
            (project / "memory" / "gotchas.md").write_text("### 옛 단일본\n", encoding="utf-8")
            result = self.run_doctor(project)
            self.assertIn("분할본과 단일본이 함께 있음", result.stdout)
            self.assertIn("gotchas.md", result.stdout)

    def test_small_memory_files_are_not_flagged(self):
        with tempfile.TemporaryDirectory() as temp:
            result = self.run_doctor(self.make_project(temp))
            size_rows = [l for l in result.stdout.splitlines() if "상세 파일 크기" in l]
            self.assertTrue(size_rows and "[OK" in size_rows[0], f"작은 파일을 경고했습니다: {size_rows}")

    def test_unresolvable_project_root_is_the_only_hard_failure(self):
        with tempfile.TemporaryDirectory() as temp:
            loose = Path(temp) / "loose"
            loose.mkdir()
            result = self.run_doctor(loose)
            self.assertEqual(result.returncode, 2)
            self.assertIn("[ERROR]", result.stdout)


if __name__ == "__main__":
    unittest.main()
