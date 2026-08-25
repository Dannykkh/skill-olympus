#!/usr/bin/env python3
"""두 축 점수 계산기 — 검색 SEO 점수와 AI 가시성 점수를 따로 낸다.

두 점수를 평균내지 않는 것이 핵심입니다. 순위는 좋은데 AI가 인용하지 못하는
사이트, 그 반대인 사이트가 실제로 존재하며, 하나로 뭉개면 그 사실이 사라집니다.

설계 규칙:
  - na(해당 없음)는 분자·분모 양쪽에서 제외 — 통과로도 감점으로도 치지 않는다.
    블로그가 Product 스키마 없다고 깎이면 안 되기 때문.
  - 판정 불가(unknown)도 제외하되 건수를 보고해 점수의 신뢰도를 밝힌다.
  - P0 fail이 하나라도 있으면 그 축을 40점(F)으로 상한 처리한다.
    기술적으로 망가진 사이트가 초록으로 표시되는 일을 막기 위함.

입력(JSON, stdin 또는 파일):
    {"findings": [
        {"id": "A1-2", "area": 1, "severity": "P0",
         "status": "fail", "axis": ["search", "ai"]}
    ]}

사용법:
    python score.py findings.json
    cat findings.json | python score.py -
"""

from __future__ import annotations

import argparse
import json
import sys

# 영역별 축 가중치. 같은 영역이라도 두 축에서 중요도가 다르다.
# 예: robots.txt의 AI 봇 정책(영역 8)은 AI축에서 결정적이지만 검색축에선 부차적.
AREA_WEIGHTS: dict[int, dict[str, int]] = {
    1:  {"name": "robots.txt",     "search": 18, "ai": 6},
    2:  {"name": "Sitemap",        "search": 10, "ai": 4},
    3:  {"name": "메타태그",        "search": 16, "ai": 6},
    4:  {"name": "구조화 데이터",    "search": 14, "ai": 18},
    5:  {"name": "이미지",          "search": 6,  "ai": 3},
    6:  {"name": "링크·내비게이션",  "search": 8,  "ai": 6},
    7:  {"name": "성능",            "search": 18, "ai": 8},
    8:  {"name": "AI 크롤러 접근성", "search": 4,  "ai": 22},
    9:  {"name": "AEO",            "search": 3,  "ai": 15},
    10: {"name": "GEO",            "search": 3,  "ai": 12},
}

# 심각도 → 가중치. P0이 P3의 5배 무게를 가진다.
SEVERITY_WEIGHT = {"P0": 5, "P1": 3, "P2": 2, "P3": 1}

# 상태 → 점수 계수. warn은 절반만 인정한다.
STATUS_FACTOR = {"pass": 1.0, "warn": 0.5, "fail": 0.0}

# 점수에서 제외되는 상태 (분자·분모 모두)
EXCLUDED_STATUS = {"na", "unknown"}

CAP_SCORE = 40.0
BANDS = [(90, "A"), (80, "B"), (70, "C"), (60, "D"), (0, "F")]


def band(score: float) -> str:
    for threshold, label in BANDS:
        if score >= threshold:
            return label
    return "F"


def area_value(findings: list[dict]) -> tuple[float | None, int]:
    """한 영역의 0~100 값과 제외 건수를 반환한다.

    점수 대상이 하나도 없으면 None — 이 영역은 분모에서 통째로 빠진다.
    """
    numerator = 0.0
    denominator = 0.0
    excluded = 0

    for f in findings:
        status = f.get("status", "unknown")
        if status in EXCLUDED_STATUS:
            excluded += 1
            continue
        sev = SEVERITY_WEIGHT.get(f.get("severity", "P2"), 2)
        numerator += STATUS_FACTOR.get(status, 0.0) * sev
        denominator += sev

    if denominator == 0:
        return None, excluded
    return 100.0 * numerator / denominator, excluded


def axis_score(findings: list[dict], axis: str) -> dict:
    """한 축의 점수를 계산한다. 활성 영역만 분모에 넣어 재정규화한다."""
    by_area: dict[int, list[dict]] = {}
    for f in findings:
        if axis not in f.get("axis", []):
            continue
        by_area.setdefault(int(f.get("area", 0)), []).append(f)

    weighted_sum = 0.0
    active_weight = 0
    excluded_total = 0
    breakdown = []

    for area, area_findings in sorted(by_area.items()):
        meta = AREA_WEIGHTS.get(area)
        if not meta:
            continue
        weight = meta[axis]
        if weight == 0:
            continue

        value, excluded = area_value(area_findings)
        excluded_total += excluded
        if value is None:
            # 전부 na/unknown — 이 영역은 분모에서 제외(재정규화)
            breakdown.append({"area": area, "name": meta["name"],
                              "value": None, "weight": 0, "note": "전부 해당 없음 — 제외"})
            continue

        weighted_sum += value * weight
        active_weight += weight
        breakdown.append({"area": area, "name": meta["name"],
                          "value": round(value, 1), "weight": weight})

    if active_weight == 0:
        return {"score": None, "band": None, "capped": False,
                "excluded_findings": excluded_total, "breakdown": breakdown,
                "note": "점수 대상 항목이 없습니다."}

    score = weighted_sum / active_weight

    # P0 fail이 이 축에 하나라도 걸리면 상한을 씌운다
    p0_fails = [f for f in findings
                if axis in f.get("axis", [])
                and f.get("severity") == "P0"
                and f.get("status") == "fail"]
    capped = bool(p0_fails) and score > CAP_SCORE
    if capped:
        score = CAP_SCORE

    return {
        "score": round(score, 1),
        "band": band(score),
        "capped": capped,
        "cap_reason": [f.get("id") for f in p0_fails] if capped else [],
        "excluded_findings": excluded_total,
        "breakdown": breakdown,
    }


INTERPRETATION = {
    ("high", "low"): "검색 순위는 나오지만 AI가 인용하기 어렵습니다. 영역 8~10을 먼저 손보세요.",
    ("low", "high"): "AI 인용에는 유리하나 기본 검색 노출이 약합니다. 영역 1~7을 먼저 손보세요.",
    ("low", "low"): "기초 문제입니다. 크롤 접근성과 렌더링부터 해결하세요.",
    ("high", "high"): "두 축 모두 양호합니다. 콘텐츠 깊이와 권위 신호로 넘어가세요.",
}


def interpret(search: float | None, ai: float | None) -> str:
    if search is None or ai is None:
        return "한쪽 축의 점수 대상이 없어 해석을 생략합니다."
    key = ("high" if search >= 70 else "low", "high" if ai >= 70 else "low")
    return INTERPRETATION[key]


def main() -> int:
    ap = argparse.ArgumentParser(description="검색 SEO / AI 가시성 두 축 점수 계산")
    ap.add_argument("input", help="findings JSON 파일 경로 (stdin은 '-')")
    ap.add_argument("--json", action="store_true", help="JSON으로 출력")
    args = ap.parse_args()

    try:
        raw = sys.stdin.read() if args.input == "-" else open(args.input, encoding="utf-8").read()
        findings = json.loads(raw).get("findings", [])
    except (OSError, json.JSONDecodeError) as exc:
        print(f"입력을 읽지 못했습니다: {exc}", file=sys.stderr)
        return 1

    if not findings:
        print("findings가 비어 있습니다.", file=sys.stderr)
        return 1

    search = axis_score(findings, "search")
    ai = axis_score(findings, "ai")
    result = {
        "search_seo": search,
        "ai_visibility": ai,
        "interpretation": interpret(search["score"], ai["score"]),
        "note": "두 점수는 절대 평균내지 않습니다. 측정 대상이 다릅니다.",
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    for label, axis in (("검색 SEO", search), ("AI 가시성", ai)):
        cap = " (P0으로 상한 적용)" if axis["capped"] else ""
        print(f"{label} 점수: {axis['score']} [{axis['band']}]{cap}")
        if axis["excluded_findings"]:
            print(f"  └ 해당 없음/판정 불가로 제외: {axis['excluded_findings']}건")
    print(f"\n해석: {result['interpretation']}")
    print(result["note"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
