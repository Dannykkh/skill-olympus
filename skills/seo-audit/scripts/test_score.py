#!/usr/bin/env python3
"""score.py 검증 — 점수 모델의 핵심 규칙 4가지가 실제로 지켜지는지 확인한다."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from score import area_value, axis_score, band  # noqa: E402


def finding(fid, area, severity, status, axis):
    return {"id": fid, "area": area, "severity": severity, "status": status, "axis": axis}


class TestAreaValue(unittest.TestCase):
    def test_all_pass_is_100(self):
        value, excluded = area_value([
            finding("A1-1", 1, "P0", "pass", ["search"]),
            finding("A1-2", 1, "P1", "pass", ["search"]),
        ])
        self.assertEqual(value, 100.0)
        self.assertEqual(excluded, 0)

    def test_warn_counts_half(self):
        value, _ = area_value([finding("A1-1", 1, "P1", "warn", ["search"])])
        self.assertEqual(value, 50.0)

    def test_severity_is_weighted(self):
        """P0 fail + P3 pass는 P3의 무게가 작아 50점보다 낮아야 한다."""
        value, _ = area_value([
            finding("A1-1", 1, "P0", "fail", ["search"]),  # 무게 5, 0점
            finding("A1-2", 1, "P3", "pass", ["search"]),  # 무게 1, 만점
        ])
        self.assertAlmostEqual(value, 100.0 * 1 / 6, places=4)

    def test_na_excluded_from_both_sides(self):
        """na는 통과로도 감점으로도 치지 않는다 — 100점이 유지되어야 한다."""
        value, excluded = area_value([
            finding("A4-1", 4, "P1", "pass", ["search"]),
            finding("A4-2", 4, "P1", "na", ["search"]),
        ])
        self.assertEqual(value, 100.0)
        self.assertEqual(excluded, 1)

    def test_all_na_returns_none(self):
        value, excluded = area_value([finding("A4-1", 4, "P1", "na", ["search"])])
        self.assertIsNone(value)
        self.assertEqual(excluded, 1)


class TestAxisScore(unittest.TestCase):
    def test_axes_are_independent(self):
        """검색축은 만점, AI축은 0점 — 두 점수가 섞이지 않아야 한다."""
        findings = [
            finding("A3-1", 3, "P1", "pass", ["search"]),
            finding("A9-1", 9, "P1", "fail", ["ai"]),
        ]
        search = axis_score(findings, "search")
        ai = axis_score(findings, "ai")
        self.assertEqual(search["score"], 100.0)
        self.assertEqual(ai["score"], 0.0)

    def test_p0_fail_caps_axis_at_40(self):
        """다른 항목이 아무리 좋아도 P0 fail 하나면 40점 상한."""
        findings = [finding(f"A3-{i}", 3, "P3", "pass", ["search"]) for i in range(20)]
        findings.append(finding("A1-2", 1, "P0", "fail", ["search"]))
        result = axis_score(findings, "search")
        self.assertEqual(result["score"], 40.0)
        self.assertTrue(result["capped"])
        self.assertIn("A1-2", result["cap_reason"])

    def test_cap_does_not_raise_a_low_score(self):
        """캡은 상한이지 하한이 아니다 — 40점 미만은 그대로 둔다."""
        findings = [
            finding("A1-2", 1, "P0", "fail", ["search"]),
            finding("A3-1", 3, "P0", "fail", ["search"]),
        ]
        result = axis_score(findings, "search")
        self.assertEqual(result["score"], 0.0)
        self.assertFalse(result["capped"])

    def test_p0_fail_on_other_axis_does_not_cap(self):
        """AI축의 P0은 검색축을 깎지 않는다."""
        findings = [
            finding("A3-1", 3, "P1", "pass", ["search"]),
            finding("A8-1", 8, "P0", "fail", ["ai"]),
        ]
        self.assertFalse(axis_score(findings, "search")["capped"])
        self.assertTrue(axis_score(findings, "ai")["score"] == 0.0)

    def test_inactive_area_renormalizes(self):
        """전부 na인 영역은 분모에서 빠져, 남은 영역만으로 재정규화된다.

        블로그가 Product 스키마(영역 4)를 안 쓴다고 감점되면 안 된다.
        """
        findings = [
            finding("A3-1", 3, "P1", "pass", ["search"]),
            finding("A4-1", 4, "P1", "na", ["search"]),
        ]
        result = axis_score(findings, "search")
        self.assertEqual(result["score"], 100.0)
        area4 = next(b for b in result["breakdown"] if b["area"] == 4)
        self.assertIsNone(area4["value"])
        self.assertEqual(area4["weight"], 0)

    def test_area_weight_actually_applied(self):
        """영역 8은 AI축 가중치(22)가 검색축(4)보다 훨씬 크다."""
        findings = [
            finding("A8-1", 8, "P1", "fail", ["search", "ai"]),
            finding("A3-1", 3, "P1", "pass", ["search", "ai"]),
        ]
        search = axis_score(findings, "search")["score"]
        ai = axis_score(findings, "ai")["score"]
        # 같은 fail인데 AI축에서 더 크게 깎여야 한다
        self.assertGreater(search, ai)


class TestBand(unittest.TestCase):
    def test_boundaries(self):
        self.assertEqual(band(90), "A")
        self.assertEqual(band(89.9), "B")
        self.assertEqual(band(70), "C")
        self.assertEqual(band(59.9), "F")


if __name__ == "__main__":
    unittest.main(verbosity=2)
