#!/usr/bin/env python3
"""팩트 밀도 계측 — 영역 10(GEO)의 결정론적 근거 수집기.

이 스크립트는 **세기만** 합니다. 판단은 하지 않습니다.
"이 주장이 근거를 필요로 하는가", "이 출처가 권위 있는가"는 LLM이 리포트에서
manual_review로 판정합니다. 카운트를 맞추려고 통계나 출처를 지어내지 마세요.

한국어/영어 콘텐츠를 함께 처리합니다. 라이브 URL이 아니라 **로컬 코드베이스**의
콘텐츠 파일(html/md/mdx/jsx/tsx/vue/svelte/astro)을 대상으로 합니다.

사용법:
    python fact_density.py <경로> [--json] [--min-words N]
    python fact_density.py ./src/content --json
    python fact_density.py ./blog/post.mdx
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# 콘텐츠로 취급할 확장자
CONTENT_EXT = {".html", ".htm", ".md", ".mdx", ".jsx", ".tsx", ".vue", ".svelte", ".astro"}

# 탐색에서 제외할 디렉터리
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".nuxt", ".svelte-kit",
             "out", "coverage", ".venv", "__pycache__", "vendor", ".output"}

# --- 계측 패턴 -------------------------------------------------------------
# 수치 토큰: 한국어 단위 + 영어 단위 + 연도 + 통화
NUMERIC = re.compile(
    r"\d+(?:[.,]\d+)?\s*(?:%|퍼센트|배|만|억|조|천|명|건|개|원|달러|초|분|시간|일|주|개월|년|위|점|위권)"
    r"|\d+(?:[.,]\d+)?\s*(?:percent|x|k|m|bn|billion|million|thousand|ms|s|kb|mb|gb)\b"
    r"|[$₩€£]\s?\d+"
    r"|\b(?:19|20)\d{2}\s*년?\b",
    re.IGNORECASE,
)

# 자체 생산 데이터 신호 — 인용 확률을 크게 높이는 요소
ORIGINAL_DATA = re.compile(
    r"자체\s*(?:조사|분석|실험|측정|데이터|연구|설문|벤치마크|테스트)"
    r"|직접\s*(?:측정|테스트|분석|조사|수집)"
    r"|내부\s*데이터|1차\s*데이터|자사\s*데이터"
    r"|우리(?:가|는)?\s*(?:측정|분석|조사|실험|수집)"
    r"|our\s+(?:\w+\s+){0,2}(?:study|survey|data|research|analysis|test|benchmark|dataset)"
    r"|we\s+(?:analy[sz]ed|surveyed|tested|measured|collected|found that)"
    r"|internal data|proprietary data|first-party data",
    re.IGNORECASE,
)

# 근거 없는 과장/모호한 권위 — AI가 인용을 회피하는 신호
SUPERLATIVE = re.compile(
    r"최고의|최고\s*수준|업계\s*(?:1위|최고|선두|최상)|가장\s*(?:빠른|좋은|뛰어난|우수한)"
    r"|전문가들은|누구나\s*(?:아는|알고)|많은\s*사람들이|흔히\s*알려진"
    r"|혁신적인|압도적인|완벽한\s*솔루션"
    r"|the\s+(?:best|fastest|most|largest|leading|number one|#1)"
    r"|studies show|research shows|experts agree|everyone knows",
    re.IGNORECASE,
)

# 권위 있는 아웃바운드 호스트 (한국 공공/학술 포함)
AUTHORITY_HOST = re.compile(
    r"\.gov\b|\.edu\b|\.go\.kr|\.ac\.kr|\.re\.kr"
    r"|wikipedia\.org|namu\.wiki|nature\.com|sciencedirect|nih\.gov|who\.int"
    r"|oecd\.org|arxiv\.org|w3\.org|schema\.org|developer\.|docs\.|kostat\.go\.kr",
    re.IGNORECASE,
)

# 출처 표기 신호
CITATION = re.compile(
    r"출처\s*[:：]|참고\s*[:：]|자료\s*[:：]|에\s*따르면|기준\b"
    r"|according to|source\s*:|cited in|\(\s*(?:19|20)\d{2}\s*\)",
    re.IGNORECASE,
)

# 질문형 헤딩 — 한국어는 물음표 없이 끝나는 경우가 많아 어미까지 본다.
# 의문사는 문장 앞에 오므로 위치를 고정하지 않되, 뒤에 공백을 요구해
# "왜곡"이 "왜"로 잡히는 오탐을 막는다.
QUESTION_HEADING = re.compile(
    r"[?？]"
    r"|(?:^|\s)(?:왜|어떻게|언제|어디서|누가|얼마나)(?=\s)"
    r"|(?:란|이란|는\s*무엇|가\s*무엇|방법)\s*$"
    r"|(?:인가|한가|는가|일까|할까|을까|하나요|인가요|나요)\s*$",
)

HEADING_MD = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)
HEADING_HTML = re.compile(r"<h([1-6])[^>]*>(.*?)</h\1>", re.IGNORECASE | re.DOTALL)
LINK_HREF = re.compile(r"""href\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
LINK_MD = re.compile(r"\[[^\]]*\]\(([^)\s]+)")
TAG = re.compile(r"<[^>]+>")

# 본문에서 걷어낼 비콘텐츠 블록
STRIP_BLOCKS = re.compile(
    r"<script[\s\S]*?</script>|<style[\s\S]*?</style>"
    r"|<(nav|header|footer|aside)[\s\S]*?</\1>"
    r"|```[\s\S]*?```|~~~[\s\S]*?~~~",
    re.IGNORECASE,
)


def strip_markup(text: str) -> str:
    """태그와 코드블록을 제거해 사람이 읽는 텍스트만 남긴다."""
    text = STRIP_BLOCKS.sub(" ", text)
    text = TAG.sub(" ", text)
    text = re.sub(r"`[^`]*`", " ", text)          # 인라인 코드
    text = re.sub(r"^---[\s\S]*?^---", " ", text, flags=re.MULTILINE)  # frontmatter
    return re.sub(r"\s+", " ", text).strip()


def count_words(text: str) -> int:
    """한국어는 공백 분절이 영어와 달라, 어절 수로 센다."""
    return len([t for t in text.split() if t])


def collect_headings(raw: str) -> list[str]:
    heads = [m.group(2) for m in HEADING_MD.finditer(raw)]
    heads += [strip_markup(m.group(2)) for m in HEADING_HTML.finditer(raw)]
    return [h.strip() for h in heads if h.strip()]


def answer_lead_words(raw: str) -> list[int]:
    """각 헤딩 바로 뒤 첫 문단의 어절 수 — 40단어 규칙 근거."""
    leads: list[int] = []
    parts = HEADING_MD.split(raw)
    # split 결과: [pre, hashes, title, body, hashes, title, body, ...]
    for i in range(3, len(parts), 3):
        body = strip_markup(parts[i])
        first_para = body.split("  ")[0] if body else ""
        if first_para:
            leads.append(count_words(first_para))
    return leads


def analyze(path: Path, min_words: int) -> dict | None:
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return {"file": str(path), "error": str(exc)}

    text = strip_markup(raw)
    total = count_words(text)
    if total < min_words:
        return None  # 짧은 파일(컴포넌트 등)은 콘텐츠로 보지 않음

    hrefs = LINK_HREF.findall(raw) + LINK_MD.findall(raw)
    authority = sum(1 for h in hrefs if AUTHORITY_HOST.search(h))
    external = sum(1 for h in hrefs if h.startswith(("http://", "https://")))

    headings = collect_headings(raw)
    question_headings = sum(1 for h in headings if QUESTION_HEADING.search(h))
    leads = answer_lead_words(raw)

    numeric = len(NUMERIC.findall(text))

    return {
        "file": str(path),
        "content_words": total,
        "numeric_tokens": numeric,
        "numeric_density_per_100w": round(100 * numeric / total, 2) if total else 0.0,
        "original_data_signal": bool(ORIGINAL_DATA.search(text)),
        "citation_markers": len(CITATION.findall(text)),
        "superlative_or_vague_authority": len(SUPERLATIVE.findall(text)),
        "external_links": external,
        "authoritative_outbound_links": authority,
        "headings": len(headings),
        "question_headings": question_headings,
        "answer_leads_over_40w": sum(1 for w in leads if w > 40),
        "answer_leads_measured": len(leads),
    }


def iter_files(root: Path) -> list[Path]:
    if root.is_file():
        return [root]
    found: list[Path] = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in CONTENT_EXT:
            if not any(part in SKIP_DIRS for part in p.parts):
                found.append(p)
    return sorted(found)


NOTE = (
    "카운트 전용입니다. 어떤 주장이 출처를 필요로 하는지, 어떤 호스트가 권위 있는지는 "
    "manual_review 판단입니다. 이 수치를 채우려고 통계나 출처를 절대 지어내지 마세요."
)


def main() -> int:
    ap = argparse.ArgumentParser(description="팩트 밀도 계측 (영역 10 근거 수집)")
    ap.add_argument("path", help="콘텐츠 파일 또는 디렉터리")
    ap.add_argument("--json", action="store_true", help="JSON으로 출력")
    ap.add_argument("--min-words", type=int, default=80,
                    help="콘텐츠로 취급할 최소 어절 수 (기본 80)")
    args = ap.parse_args()

    root = Path(args.path)
    if not root.exists():
        print(f"경로를 찾을 수 없습니다: {root}", file=sys.stderr)
        return 1

    results = [r for r in (analyze(p, args.min_words) for p in iter_files(root)) if r]
    scored = [r for r in results if "error" not in r]

    summary = {
        "files_analyzed": len(scored),
        "total_words": sum(r["content_words"] for r in scored),
        "median_numeric_density": 0.0,
        "files_without_numbers": sum(1 for r in scored if r["numeric_tokens"] == 0),
        "files_with_original_data": sum(1 for r in scored if r["original_data_signal"]),
        "files_without_citation": sum(1 for r in scored if r["citation_markers"] == 0),
        "total_superlatives": sum(r["superlative_or_vague_authority"] for r in scored),
        "files_with_question_headings": sum(1 for r in scored if r["question_headings"] > 0),
    }
    if scored:
        densities = sorted(r["numeric_density_per_100w"] for r in scored)
        summary["median_numeric_density"] = densities[len(densities) // 2]

    payload = {"summary": summary, "files": results, "note": NOTE}

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print(f"분석 파일: {summary['files_analyzed']}개 / 총 {summary['total_words']}어절")
    print(f"수치 밀도 중앙값: {summary['median_numeric_density']}/100어절")
    print(f"수치 없는 파일: {summary['files_without_numbers']}개")
    print(f"자체 데이터 신호 있는 파일: {summary['files_with_original_data']}개")
    print(f"출처 표기 없는 파일: {summary['files_without_citation']}개")
    print(f"근거 없는 과장 표현: {summary['total_superlatives']}건")
    print(f"질문형 헤딩 있는 파일: {summary['files_with_question_headings']}개")
    print(f"\n{NOTE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
