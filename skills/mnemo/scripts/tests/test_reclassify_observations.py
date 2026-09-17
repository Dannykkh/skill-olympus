"""Repairing memory must be reversible and must not invent failures it cannot prove.

The tool moves observations the old hook misfiled as failures. It runs on ONE project
(observations live in <project>/memory/), refuses to write without --apply, always
backs up first, keeps records it cannot parse, and preserves the distillation delta
so the repair does not look like a burst of new activity.
"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
SCRIPT = SCRIPTS / "reclassify_observations.py"


def obs(tool, output, event="tool_error", **evidence):
    return json.dumps({"event": event, "tool": tool, "output": output,
                       "timestamp": "2026-09-16T10:00:00", "session": "s1", **evidence}, ensure_ascii=False)


class ReclassifyTests(unittest.TestCase):
    def test_ambiguous_and_explicit_failures_remain_in_gotchas(self):
        with tempfile.TemporaryDirectory() as temp:
            records = [
                obs('Bash', 'Operation failed: file not found'),
                obs('Bash', 'Command exited with code 1'),
                obs('Bash', 'FAILED tests/test_api.py::test_login - AssertionError'),
                obs('Read', 'Error: permission denied'),
                obs('Write', 'unknown response'),
                obs('Edit', '@{newString=Failed(x)}'),
                obs('Bash', 'ordinary output'),
                obs('Bash', {'is_error': True, 'exit_code': 0}),
                obs('Bash', 'Command exited with code 1', is_error=False),
                obs('Edit', 'The file x.py has been updated successfully.', exit_code=1),
                obs({'bad': 'tool'}, 'ok', exit_code=0),
            ]
            project = self.make_project(temp, records + [obs('Bash', 'positive success', exit_code=0)])
            result = self.run_tool(project, '--apply')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(self.lines(project / 'memory/gotchas/observations.jsonl'), records)
            self.assertEqual(len(self.lines(project / 'memory/learned/observations.jsonl')), 1)

    def test_structured_and_specific_acknowledgements_are_positive_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            records = [obs('Bash', {'exit_code': 0, 'stdout': 'text'}),
                       obs('Edit', json.dumps({'is_error': False})),
                       obs('Write', 'File created successfully at: /tmp/file.py'),
                       obs('Edit', 'The file /tmp/file.py has been updated successfully.')]
            project = self.make_project(temp, records)
            result = self.run_tool(project, '--apply')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(self.lines(project / 'memory/gotchas/observations.jsonl'), [])
            self.assertEqual(len(self.lines(project / 'memory/learned/observations.jsonl')), 4)

    def test_invalid_json_values_and_bytes_are_preserved_exactly(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, [])
            gotchas = project / 'memory/gotchas/observations.jsonl'
            retained = b'null\r\n42\r\n[]\r\n"string"\r\n\r\n{broken\xff}\r\n'
            gotchas.write_bytes(retained + obs('Bash', 'ok', exit_code=0).encode('utf-8') + b'\n')
            result = self.run_tool(project, '--apply')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(gotchas.read_bytes(), retained)
            self.assertIn('파싱 못 해 그대로 두는 줄 5줄', result.stdout)

    def test_append_preserves_unterminated_learned_record(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, [obs('Bash', 'ok', exit_code=0)])
            learned = project / 'memory/learned/observations.jsonl'
            existing = obs('Bash', 'old', event='tool_success').encode('utf-8')
            learned.write_bytes(existing)
            result = self.run_tool(project, '--apply')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(learned.read_bytes().startswith(existing + b'\n'))
            self.assertEqual(len(self.lines(learned)), 2)

    def run_tool(self, project, *args):
        return subprocess.run([sys.executable, str(SCRIPT), "--project-root", str(project), *args],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=90)

    def make_project(self, temp, gotchas_lines, learned_lines=(), offset=None):
        project = Path(temp) / "project"
        (project / "memory" / "gotchas").mkdir(parents=True)
        (project / "memory" / "learned").mkdir(parents=True)
        subprocess.run(["git", "init", "-q"], cwd=project, check=True, timeout=30)
        (project / "memory" / "gotchas" / "observations.jsonl").write_text(
            "\n".join(gotchas_lines) + "\n", encoding="utf-8")
        (project / "memory" / "learned" / "observations.jsonl").write_text(
            ("\n".join(learned_lines) + "\n") if learned_lines else "", encoding="utf-8")
        if offset:
            (project / "memory" / ".mnemo-distill-offset").write_text(offset, encoding="utf-8")
        return project

    def lines(self, path):
        return [l for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]

    def test_dry_run_changes_nothing(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, [obs("Edit", "@{newString=Failed(x)}", is_error=False)])
            before = (project / "memory" / "gotchas" / "observations.jsonl").read_bytes()
            result = self.run_tool(project)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("DRY-RUN", result.stdout)
            self.assertEqual((project / "memory" / "gotchas" / "observations.jsonl").read_bytes(), before)
            self.assertEqual(self.lines(project / "memory" / "learned" / "observations.jsonl"), [])

    def test_apply_moves_only_the_misfiled_records(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, [
                obs("Edit", "@{newString=public const string ObservationFailed = 1;}", is_error=False),
                obs("Bash", "| [project-scope-fail-closed](033.md) |", exit_code=0),
                obs("Bash", "System.TimeoutException : Expected patch state None"),      # 진짜 실패
                obs("Bash", "그냥 정상 출력", event="turn_error"),                        # 다른 이벤트
            ])
            result = self.run_tool(project, "--apply")
            self.assertEqual(result.returncode, 0, result.stderr)

            kept = [json.loads(l) for l in self.lines(project / "memory" / "gotchas" / "observations.jsonl")]
            moved = [json.loads(l) for l in self.lines(project / "memory" / "learned" / "observations.jsonl")]
            self.assertEqual(len(moved), 2)
            self.assertEqual(len(kept), 2)
            self.assertTrue(all(r["event"] == "tool_success" for r in moved))
            self.assertTrue(all(r["reclassified_from"] == "tool_error" for r in moved))
            self.assertIn("TimeoutException", kept[0]["output"] + kept[1]["output"])
            # turn_error는 판단 대상이 아니므로 그대로 남는다.
            self.assertTrue(any(r["event"] == "turn_error" for r in kept))

    def test_apply_writes_a_restorable_backup(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, [obs("Edit", "@{newString=Failed(x)}", is_error=False)])
            original = (project / "memory" / "gotchas" / "observations.jsonl").read_bytes()
            self.run_tool(project, "--apply")
            backups = list((project / "memory" / "gotchas").glob("observations.jsonl.bak-*"))
            self.assertEqual(len(backups), 1, "백업이 만들어지지 않았습니다")
            self.assertEqual(backups[0].read_bytes(), original)
            # 백업이 *.jsonl 로 끝나면 수확·정제가 다시 읽는다.
            self.assertFalse(backups[0].name.endswith(".jsonl"))

    def test_existing_learned_content_is_preserved_byte_for_byte(self):
        with tempfile.TemporaryDirectory() as temp:
            existing = obs("Bash", "이미 있던 성공", event="tool_success")
            project = self.make_project(temp, [obs("Edit", "@{newString=Failed(x)}", is_error=False)], [existing])
            self.run_tool(project, "--apply")
            lines = self.lines(project / "memory" / "learned" / "observations.jsonl")
            self.assertEqual(lines[0], existing, "기존 learned 내용이 바뀌었습니다")
            self.assertEqual(len(lines), 2)

    def test_distillation_delta_is_unchanged_by_the_move(self):
        """이동은 두 파일 사이의 재배치다. 새 관찰이 쏟아진 것처럼 보이면 안 된다."""
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp,
                [obs("Edit", "@{newString=Failed(x)}", is_error=False), obs("Edit", "@{newString=Error e}", is_error=False)],
                [obs("Bash", "ok", event="tool_success")],
                offset="2 1 1789000000")
            self.run_tool(project, "--apply")
            parts = (project / "memory" / ".mnemo-distill-offset").read_text(encoding="utf-8").split()
            base_g, base_l = int(parts[0]), int(parts[1])
            now_g = len(self.lines(project / "memory" / "gotchas" / "observations.jsonl"))
            now_l = len(self.lines(project / "memory" / "learned" / "observations.jsonl"))
            self.assertEqual((now_g - base_g) + (now_l - base_l), 0,
                             "이동 후 delta가 0이 아닙니다 — 정제 임계가 잘못 울립니다")

    def test_unparsable_lines_are_kept_untouched(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(temp, ["{깨진 json", obs("Edit", "@{newString=Failed(x)}", is_error=False)])
            result = self.run_tool(project, "--apply")
            self.assertEqual(result.returncode, 0, result.stderr)
            kept = self.lines(project / "memory" / "gotchas" / "observations.jsonl")
            self.assertIn("{깨진 json", kept)

    def test_negative_rotation_offset_preserves_backlog(self):
        with tempfile.TemporaryDirectory() as temp:
            project = self.make_project(
                temp, [obs("Edit", "Failed(x)", is_error=False)], offset="-250 0 1789000000")
            result = self.run_tool(project, "--apply")
            self.assertEqual(result.returncode, 0, result.stderr)
            parts = (project / "memory" / ".mnemo-distill-offset").read_text(encoding="utf-8").split()
            self.assertEqual(parts, ["-251", "1", "1789000000"])
            self.assertEqual((0 - int(parts[0])) + (1 - int(parts[1])), 251)

    def test_project_without_observations_is_not_an_error(self):
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "project"
            project.mkdir()
            subprocess.run(["git", "init", "-q"], cwd=project, check=True, timeout=30)
            result = self.run_tool(project, "--apply")
            self.assertEqual(result.returncode, 0)
            self.assertIn("관찰 로그가 없습니다", result.stdout)


if __name__ == "__main__":
    unittest.main()
