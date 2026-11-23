"""아틀라스 작업 장부 — 묶음 계획과 근거 대조.

묶음은 TermSnap의 owners.json에서만 나온다. 지도의 glob을 여기서 풀지 않으므로, 계약이 낡았거나
지도가 없으면 계획을 세우지 않고 멈추는지가 첫 번째로 지킬 동작이다.
"""

import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import atlas_work as atlas


class AtlasWorkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / ".git").mkdir()
        self.generated = datetime.now().astimezone().replace(microsecond=0) - timedelta(hours=1)

    def write(self, path, text="x\n", when=None):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
        if when:
            os.utime(target, (when.timestamp(), when.timestamp()))
        return target

    def contract(self, owners, **extra):
        # 지도는 산출물보다 먼저 저장됐다 — 기본 상태는 "최신".
        self.write(atlas.COMPONENT_MAP, "{}", self.generated - timedelta(minutes=5))
        data = {"format": "termsnap-component-owners/1", "generatedAt": self.generated.isoformat(),
                "mapExists": True, "status": {"errors": 0}, "owners": owners, "uncovered": ["loose.txt"]}
        data.update(extra)
        self.write(atlas.COMPONENT_OWNERS, json.dumps(data))

    def source(self, owners, text="line one\nline two\nline three\n"):
        for name in owners:
            self.write(name, text)
        self.contract(owners)

    # ── 계획 ──

    def test_plan_groups_files_by_component_and_writes_ledger(self):
        self.source({"src/a.py": "app.core", "src/b.py": "app.core", "ui/c.js": "app.ui"})
        ledger = atlas.plan(self.root)
        self.assertEqual([b["id"] for b in ledger["batches"]], ["app.core#1", "app.ui#1"])
        self.assertEqual(ledger["batches"][0]["files"], ["src/a.py", "src/b.py"])
        self.assertEqual(ledger["uncovered"], 1)
        saved = json.loads((self.root / atlas.LEDGER).read_text(encoding="utf-8"))
        self.assertEqual(saved["format"], atlas.LEDGER_FORMAT)
        self.assertNotIn("notes", saved)

    def test_plan_splits_a_component_over_the_limits(self):
        self.source({f"src/f{n}.py": "app.core" for n in range(5)})
        by_count = atlas.plan(self.root, max_files=2)
        self.assertEqual([len(b["files"]) for b in by_count["batches"]], [2, 2, 1])
        # 줄바꿈이 OS마다 달라 크기를 재서 쓴다 — 상한은 파일 두 개 분량.
        one = (self.root / "src/f0.py").stat().st_size
        by_size = atlas.plan(self.root, max_bytes=one * 2)
        self.assertEqual([len(b["files"]) for b in by_size["batches"]], [2, 2, 1])

    def test_one_file_over_the_limit_gets_its_own_marked_batch(self):
        self.source({"src/big.py": "app.core", "src/small.py": "app.core"})
        self.write("src/big.py", "x" * 500)
        self.contract({"src/big.py": "app.core", "src/small.py": "app.core"})
        ledger = atlas.plan(self.root, max_bytes=100)
        big = [b for b in ledger["batches"] if b["files"] == ["src/big.py"]][0]
        self.assertTrue(big["oversize"])

    def test_only_and_skip_select_by_component_prefix(self):
        self.source({"a.py": "app.core.io", "b.py": "app.core", "c.py": "app.corex", "d.py": "app.ui"})
        only = atlas.plan(self.root, only=["app.core"])
        self.assertEqual({b["component"] for b in only["batches"]}, {"app.core", "app.core.io"})
        skipped = atlas.plan(self.root, skip=["app.core"], reset=True)
        self.assertEqual({b["component"] for b in skipped["batches"]}, {"app.corex", "app.ui"})
        # 부모를 고르고 그 아래 하나를 빼는 조합
        both = atlas.plan(self.root, only=["app.core"], skip=["app.core.io"], reset=True)
        self.assertEqual({b["component"] for b in both["batches"]}, {"app.core"})

    def test_replanning_without_arguments_keeps_the_last_scope_and_limits(self):
        # 다음 날 인자 없이 다시 부르면 지난 범위가 풀려 건너뛴 부품까지 읽히던 것을 막는다.
        self.source({"a.py": "app.core", "b.py": "app.core", "c.py": "app.docs", "d.py": "app.ui"})
        atlas.plan(self.root, only=["app.core"], skip=["app.docs"], no_open=["docs/research/"], max_files=1)
        again = atlas.plan(self.root)
        self.assertEqual([b["id"] for b in again["batches"]], ["app.core#1", "app.core#2"])
        self.assertTrue(again["notes"]["reused"])
        self.assertEqual(again["selection"], {"only": ["app.core"], "skip": ["app.docs"], "noOpen": ["docs/research/"]})
        self.assertIn("`docs/research/`", atlas.brief(self.root, "app.core#1"))
        fresh = atlas.plan(self.root, reset=True)
        self.assertEqual({b["component"] for b in fresh["batches"]}, {"app.core", "app.docs", "app.ui"})
        self.assertEqual(len(fresh["batches"]), 3)  # 상한도 기본으로 돌아가 app.core가 한 묶음이다
        self.assertFalse(fresh["notes"]["reused"])

    def test_replanning_keeps_status_until_a_file_changes(self):
        self.source({"src/a.py": "app.core", "ui/c.js": "app.ui"})
        atlas.plan(self.root)
        atlas.mark(self.root, "app.core#1", "merged")
        atlas.mark(self.root, "app.ui#1", "merged")
        self.write("ui/c.js", "changed\n")
        again = atlas.plan(self.root)
        states = {b["id"]: b["status"] for b in again["batches"]}
        self.assertEqual(states, {"app.core#1": "merged", "app.ui#1": "pending"})
        self.assertEqual(again["notes"]["changed"], ["app.ui#1"])

    def test_no_open_excludes_files_and_directory_contents_from_plan_and_brief(self):
        self.source({name: "app.core" for name in (
            "src/private/log.py", "src/private-copy/log.py", "src/key.py", "src/ok.py",
            "memory/entry.md", "MEMORY.md", "docs/handoffs/last.md")})
        atlas.plan(self.root, no_open=["./src/private/", r"src\key.py"])
        again = atlas.plan(self.root)
        self.assertEqual(again["batches"][0]["files"], ["src/ok.py", "src/private-copy/log.py"])
        brief = atlas.brief(self.root, "app.core#1")
        self.assertNotIn("src/private/log.py", brief)

    def test_brief_rejects_conflicts_with_a_batch_override_or_old_ledger(self):
        self.planned()
        with self.assertRaisesRegex(atlas.AtlasError, "plan"):
            atlas.brief(self.root, "app.core#1", ["src/a.py"])
        ledger = atlas.read_ledger(self.root)
        ledger["selection"]["noOpen"] = ["src/"]
        atlas.write_ledger(self.root, ledger)
        with self.assertRaisesRegex(atlas.AtlasError, "plan"):
            atlas.brief(self.root, "app.core#1")
        self.result()
        self.assertFalse(atlas.check(self.root, "app.core#1")["ok"])

    def test_missing_and_binary_files_are_left_out_and_reported(self):
        self.source({"src/a.py": "app.core"})
        (self.root / "src/blob.bin").write_bytes(b"\x00\x01\x02")
        self.contract({"src/a.py": "app.core", "src/gone.py": "app.core", "src/blob.bin": "app.core"})
        ledger = atlas.plan(self.root)
        self.assertEqual(ledger["batches"][0]["files"], ["src/a.py"])
        self.assertEqual(ledger["notes"]["missing"], ["src/gone.py"])
        self.assertEqual(ledger["notes"]["binary"], ["src/blob.bin"])

    # ── 계획을 세우지 않는 상태 ──

    def test_stops_without_termsnap_output(self):
        # 코드맵이 없는 프로젝트에서는 할 일이 없고, 폴더만 있으면 TermSnap 쪽을 가리킨다.
        with self.assertRaisesRegex(atlas.AtlasError, "할 일이 없다"):
            atlas.plan(self.root)
        self.write("codemap/index.md", "# Code Map\n")
        with self.assertRaisesRegex(atlas.AtlasError, "TermSnap을 갱신하거나"):
            atlas.plan(self.root)

    def test_stops_on_the_stub_written_before_any_map(self):
        # 스텁만 있고 지도가 없으면 뼈대부터, 지도를 쓴 뒤 다시 생성하지 않았으면 재생성을 말한다.
        self.contract({}, mapExists=False)
        with self.assertRaisesRegex(atlas.AtlasError, "스텁이다"):
            atlas.plan(self.root)
        (self.root / atlas.COMPONENT_MAP).unlink()
        with self.assertRaisesRegex(atlas.AtlasError, "뼈대"):
            atlas.plan(self.root)

    def test_stops_when_the_map_is_newer_than_the_output(self):
        self.source({"src/a.py": "app.core"})
        self.write(atlas.COMPONENT_MAP, "{}", self.generated + timedelta(minutes=10))
        with self.assertRaisesRegex(atlas.AtlasError, "오래됨"):
            atlas.plan(self.root)
        self.assertEqual(len(atlas.plan(self.root, allow_stale=True)["batches"]), 1)

    def test_stops_on_an_unknown_contract_format(self):
        self.write(atlas.COMPONENT_OWNERS, json.dumps({"format": "something-else/9"}))
        with self.assertRaisesRegex(atlas.AtlasError, "형식"):
            atlas.plan(self.root)

    # ── 근거 대조 ──

    def result(self, batch_id="app.core#1", **fields):
        data = {"component": "app.core", "responsibility": "주문 금액을 계산한다.",
                "co_changes": [{"claim": "a를 고치면 b도 고친다", "confidence": "verified",
                                "evidence": ["src/a.py:2", "src/b.py:1-2"]}],
                "files_read_fully": ["src/a.py", "src/b.py"], "files_read_partly": [],
                "files_not_opened": [], "unknowns": []}
        ledger = atlas.read_ledger(self.root)
        batch = [b for b in ledger["batches"] if b["id"] == batch_id][0]
        data["digest"] = batch["digest"]  # 지시문에 실려 간 지문을 작업자가 그대로 돌려준다
        data.update(fields)
        target = self.root / batch["result"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    def planned(self):
        self.source({"src/a.py": "app.core", "src/b.py": "app.core"})
        atlas.plan(self.root)

    def test_check_shows_the_cited_lines_and_marks_the_batch_checked(self):
        self.planned()
        self.result()
        report = atlas.check(self.root, "app.core#1")
        self.assertTrue(report["ok"])
        self.assertEqual(report["claims"][0]["evidence"], ["src/a.py:2 | line two", "src/b.py:1-2 | line one"])
        self.assertEqual(report["summary"]["readFully"], 2)
        self.assertEqual(atlas.read_ledger(self.root)["batches"][0]["status"], "checked")

    def test_check_rejects_citations_that_cannot_be_true(self):
        self.planned()
        self.result(co_changes=[{"claim": "틀린 근거", "confidence": "verified",
                                 "evidence": ["src/a.py:99", "src/none.py:1", "../outside.txt:1"]}])
        report = atlas.check(self.root, "app.core#1")
        self.assertFalse(report["ok"])
        self.assertEqual(report["summary"]["bad"], 3)
        joined = "\n".join(report["claims"][0]["evidence"])
        for expected in ("범위 밖", "파일 없음", "프로젝트 밖"):
            self.assertIn(expected, joined)
        self.assertEqual(atlas.read_ledger(self.root)["batches"][0]["status"], "needs-review")

    def test_check_reports_shape_problems(self):
        self.planned()
        self.result(responsibility=" ", co_changes=[
            {"claim": "근거 없음", "confidence": "verified", "evidence": []},
            {"claim": "확신 표시가 다름", "confidence": "sure", "evidence": ["src/a.py:1"]}])
        report = atlas.check(self.root, "app.core#1")
        self.assertFalse(report["ok"])
        self.assertEqual(len(report["problems"]), 3)

    def test_check_warns_without_failing(self):
        self.planned()
        claims = [{"claim": f"주장 {n}", "confidence": "inferred", "evidence": ["src/a.py:1"]} for n in range(6)]
        claims.append({"claim": "한 곳만 본 verified", "confidence": "verified", "evidence": ["src/a.py"]})
        self.result(co_changes=claims, files_read_fully=["src/a.py (전체)"])
        report = atlas.check(self.root, "app.core#1")
        self.assertTrue(report["ok"])
        text = "\n".join(report["warnings"])
        for expected in ("7건", "근거가 한 곳", "줄 번호가 없다", "밝히지 않은 파일 1개: src/b.py"):
            self.assertIn(expected, text)

    def test_check_survives_a_result_that_is_not_json(self):
        self.planned()
        ledger = atlas.read_ledger(self.root)
        target = self.root / ledger["batches"][0]["result"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("여기 결과입니다: {", encoding="utf-8")
        self.assertFalse(atlas.check(self.root, "app.core#1")["ok"])

    def test_check_needs_the_result_file(self):
        self.planned()
        with self.assertRaisesRegex(atlas.AtlasError, "결과를 아직"):
            atlas.check(self.root, "app.core#1")

    def test_a_result_read_before_the_files_changed_does_not_pass(self):
        # 묶음이 다시 읽을 것으로 돌아가도 옛 결과 파일은 남는다. 그 결과가 통과하면 바뀌기 전의 주장이 지도에 들어간다.
        self.planned()
        self.result()
        self.assertTrue(atlas.check(self.root, "app.core#1")["ok"])
        self.write("src/a.py", "rewritten\nline two\n")
        again = atlas.plan(self.root)
        self.assertEqual(again["batches"][0]["status"], "pending")
        report = atlas.check(self.root, "app.core#1")
        self.assertFalse(report["ok"])
        self.assertIn("digest", report["problems"][0])

    def test_a_checked_batch_is_rechecked_when_a_cited_outside_file_changes(self):
        # 근거는 묶음 밖 파일이어도 된다. 그 파일이 바뀌면 줄 번호는 맞아도 내용이 다르다.
        self.planned()
        self.write("tests/test_a.py", "assert price == 3\n")
        self.result(co_changes=[{"claim": "값을 테스트가 고정한다", "confidence": "verified",
                                 "evidence": ["src/a.py:1", "tests/test_a.py:1"]}])
        atlas.check(self.root, "app.core#1")
        self.assertEqual(atlas.plan(self.root)["notes"]["recheck"], [])
        self.write("tests/test_a.py", "assert price == 4\n")
        with self.assertRaisesRegex(atlas.AtlasError, "check"):
            atlas.mark(self.root, "app.core#1", "merged")
        again = atlas.plan(self.root)
        self.assertEqual(again["notes"]["recheck"], ["app.core#1"])
        self.assertEqual(again["batches"][0]["status"], "read")
        # 이미 지도에 넣은 묶음은 건드리지 않는다 — 그 뒤의 변화는 평소 유지(핸드오프)의 몫이다.
        atlas.check(self.root, "app.core#1")
        atlas.mark(self.root, "app.core#1", "merged")
        self.write("tests/test_a.py", "assert price == 5\n")
        self.assertEqual(atlas.plan(self.root)["batches"][0]["status"], "merged")

    def test_check_detects_live_changes_and_recovers_after_replan(self):
        self.planned()
        self.result()
        self.write("src/a.py", "changed\nline two\nline three\n")
        self.assertEqual(atlas.main(["--project-root", str(self.root), "check"]), 1)
        self.assertEqual(atlas.read_ledger(self.root)["batches"][0]["status"], "needs-review")
        atlas.plan(self.root)
        self.result()
        self.assertTrue(atlas.check(self.root, "app.core#1")["ok"])
        (self.root / "src/a.py").unlink()
        with self.assertRaisesRegex(atlas.AtlasError, "plan"):
            atlas.mark(self.root, "app.core#1", "merged")
        self.result(co_changes=[])
        self.assertFalse(atlas.check(self.root, "app.core#1")["ok"])

    def test_check_rejects_citations_from_a_closed_directory(self):
        self.planned()
        self.write("docs/private/notes.txt", "must stay private")
        atlas.plan(self.root, no_open=["docs/private"])
        self.result(defect_candidates=[{"note": "후보", "evidence": ["docs/private/notes.txt:1"]}])
        report = atlas.check(self.root, "app.core#1")
        self.assertFalse(report["ok"])
        self.assertNotIn("must stay private", str(report))
        self.assertNotIn("docs/private/notes.txt", report["citedFiles"])

    def test_each_defect_needs_its_own_cited_line(self):
        self.planned()
        supported = {"note": "근거 있는 후보", "evidence": ["src/b.py:2"]}
        for evidence in (None, [], "src/a.py:1", ["src/a.py"], [""]):
            with self.subTest(evidence=evidence):
                candidate = {"note": "다른 후보"}
                if evidence is not None:
                    candidate["evidence"] = evidence
                self.result(defect_candidates=[supported, candidate])
                self.assertFalse(atlas.check(self.root, "app.core#1")["ok"])
        for malformed in ({"note": "후보"}, ["후보"]):
            with self.subTest(malformed=malformed):
                self.result(defect_candidates=malformed)
                self.assertFalse(atlas.check(self.root, "app.core#1")["ok"])
        self.result(defect_candidates=[supported])
        self.assertTrue(atlas.check(self.root, "app.core#1")["ok"])

    def test_previous_validator_results_are_rechecked_before_merge(self):
        self.planned()
        self.result(defect_candidates=[{"note": "근거 누락", "evidence": []}])
        ledger = atlas.read_ledger(self.root)
        batch = ledger["batches"][0]
        batch.update(status="checked", checked={"bad": 0, "problems": 0})
        atlas.write_ledger(self.root, ledger)
        self.assertEqual(atlas.read_ledger(self.root)["batches"][0]["status"], "read")
        with self.assertRaisesRegex(atlas.AtlasError, "check"):
            atlas.mark(self.root, "app.core#1", "merged")
        self.assertEqual(atlas.main(["--project-root", str(self.root), "check"]), 1)
        batch["status"] = "merged"
        atlas.write_ledger(self.root, ledger)
        self.assertEqual(atlas.plan(self.root)["batches"][0]["status"], "merged")

    def test_check_verifies_defect_candidates_the_same_way(self):
        self.planned()
        self.result(defect_candidates=[
            {"note": "두 구현이 다르게 판정한다", "evidence": ["src/a.py:1", "src/b.py:99"]},
            {"note": " ", "evidence": ["src/a.py:1"]}])
        report = atlas.check(self.root, "app.core#1")
        self.assertEqual(len(report["defects"]), 1)
        self.assertEqual(report["defects"][0]["evidence"][0], "src/a.py:1 | line one")
        self.assertIn("줄 범위 밖", report["defects"][0]["evidence"][1])
        self.assertFalse(report["ok"])
        self.assertEqual(report["summary"]["defects"], 1)

    # ── 작업자 지시문 ──

    def test_brief_fills_the_shipped_template_from_the_ledger(self):
        self.planned()
        text = atlas.brief(self.root, "app.core#1", ["docs/research/", "vendor/"])
        result = str(self.root / atlas.read_ledger(self.root)["batches"][0]["result"])
        self.assertIn(f"저장소 `{self.root}`", text)
        self.assertEqual(text.count(result), 2)
        self.assertIn("- 이름: `app.core` (묶음 `app.core#1`)", text)
        self.assertIn("  - `src/a.py`\n  - `src/b.py`\n", text)
        self.assertIn("`conversations/`, `docs/research/`, `vendor/`.", text)
        self.assertIn('"batch": "app.core#1"', text)
        self.assertNotIn("<<", text)  # 채우지 못한 자리가 남으면 작업자가 그대로 받는다
        self.assertNotIn("\n\n\n", text)

    def test_brief_tells_the_reader_about_split_and_oversize_batches(self):
        self.source({"src/a.py": "app.core", "src/b.py": "app.core"})
        self.write("src/b.py", "x" * 900)
        self.contract({"src/a.py": "app.core", "src/b.py": "app.core"})
        atlas.plan(self.root, max_bytes=100)
        first = atlas.brief(self.root, "app.core#1")
        second = atlas.brief(self.root, "app.core#2")
        self.assertIn("묶음 2개로 나뉘어", first)
        self.assertNotIn("상한보다 큰 파일", first)
        self.assertIn("상한보다 큰 파일", second)

    def test_brief_without_extra_paths_ends_the_list_cleanly(self):
        self.planned()
        text = atlas.brief(self.root, "app.core#1")
        self.assertIn("`conversations/`.", text)
        self.assertNotIn("묶음 1개로", text)

    # ── 명령줄 ──

    def test_cli_reports_a_stop_with_exit_code_2(self):
        self.assertEqual(atlas.main(["--project-root", str(self.root), "plan"]), 2)

    def test_cli_check_without_arguments_takes_batches_that_have_results(self):
        self.planned()
        self.result()
        self.assertEqual(atlas.main(["--project-root", str(self.root), "check"]), 0)
        self.assertEqual(atlas.main(["--project-root", str(self.root), "status"]), 0)


if __name__ == "__main__":
    unittest.main()
