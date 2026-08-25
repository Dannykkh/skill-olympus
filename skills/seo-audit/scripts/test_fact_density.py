#!/usr/bin/env python3
"""fact_density.py 검증 — 한국어 콘텐츠에서 실제로 동작하는지가 핵심이다.

원본이 된 영어권 구현들은 한국어 수치·과장·질문형 어미를 전부 놓친다.
이 테스트는 그 격차가 메워졌는지를 확인한다.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fact_density import (  # noqa: E402
    CITATION,
    NUMERIC,
    ORIGINAL_DATA,
    QUESTION_HEADING,
    SUPERLATIVE,
    collect_headings,
    count_words,
    strip_markup,
)


class TestKoreanNumeric(unittest.TestCase):
    def test_korean_units(self):
        for sample in ["35% 단축", "62.3퍼센트", "3배 빠름", "1200명", "5만 건",
                       "2024년", "300ms", "1억 원"]:
            with self.subTest(sample=sample):
                self.assertTrue(NUMERIC.search(sample), f"놓침: {sample}")

    def test_english_units_still_work(self):
        for sample in ["35% faster", "$1,200", "500 million", "2025"]:
            with self.subTest(sample=sample):
                self.assertTrue(NUMERIC.search(sample), f"놓침: {sample}")

    def test_bare_number_is_not_counted(self):
        """단위 없는 맨 숫자는 팩트로 치지 않는다 — 목록 번호와 구분하기 위함."""
        self.assertFalse(NUMERIC.search("항목 하나 둘"))


class TestKoreanSuperlative(unittest.TestCase):
    def test_korean_vague_authority(self):
        for sample in ["최고의 성능", "업계 1위", "전문가들은 말합니다",
                       "가장 빠른 방법", "많은 사람들이 사용"]:
            with self.subTest(sample=sample):
                self.assertTrue(SUPERLATIVE.search(sample), f"놓침: {sample}")

    def test_factual_sentence_is_clean(self):
        self.assertFalse(SUPERLATIVE.search("렌더링 시간이 35% 줄었습니다."))


class TestOriginalData(unittest.TestCase):
    def test_korean_signals(self):
        for sample in ["자체 조사 결과", "직접 측정한 값", "내부 데이터 기준",
                       "우리가 분석한 바로는"]:
            with self.subTest(sample=sample):
                self.assertTrue(ORIGINAL_DATA.search(sample), f"놓침: {sample}")

    def test_english_signals(self):
        self.assertTrue(ORIGINAL_DATA.search("our benchmark showed"))
        self.assertTrue(ORIGINAL_DATA.search("we measured latency"))


class TestCitation(unittest.TestCase):
    def test_korean_citation_markers(self):
        for sample in ["출처: 통계청", "Meta에 따르면", "2024년 기준", "참고: RFC 9110"]:
            with self.subTest(sample=sample):
                self.assertTrue(CITATION.search(sample), f"놓침: {sample}")


class TestQuestionHeading(unittest.TestCase):
    def test_korean_question_forms_without_question_mark(self):
        """한국어 헤딩은 물음표 없이 끝나는 경우가 많다."""
        for sample in ["SEO란", "Next.js에서 캐싱하는 방법",
                       "왜 CSR이 불리한가", "어떻게 최적화할까"]:
            with self.subTest(sample=sample):
                self.assertTrue(QUESTION_HEADING.search(sample), f"놓침: {sample}")

    def test_explicit_question_mark(self):
        self.assertTrue(QUESTION_HEADING.search("What is GEO?"))

    def test_plain_heading_is_not_a_question(self):
        self.assertFalse(QUESTION_HEADING.search("개요"))
        self.assertFalse(QUESTION_HEADING.search("Installation"))


class TestStripMarkup(unittest.TestCase):
    def test_code_block_is_removed(self):
        raw = "설명입니다.\n```js\nconst best = 1; // 최고의\n```\n끝."
        cleaned = strip_markup(raw)
        self.assertNotIn("최고의", cleaned)
        self.assertIn("설명입니다", cleaned)

    def test_html_tags_removed(self):
        self.assertNotIn("<p>", strip_markup("<p>본문</p>"))

    def test_frontmatter_removed(self):
        raw = "---\ntitle: 최고의 글\n---\n\n본문입니다."
        self.assertNotIn("title:", strip_markup(raw))

    def test_script_block_removed(self):
        raw = "<script>var x='업계 1위';</script><p>본문</p>"
        self.assertNotIn("업계", strip_markup(raw))


class TestHeadings(unittest.TestCase):
    def test_markdown_and_html_headings(self):
        raw = "# 제목1\n\n<h2>제목2</h2>\n\n## 제목3"
        heads = collect_headings(raw)
        self.assertIn("제목1", heads)
        self.assertIn("제목2", heads)
        self.assertIn("제목3", heads)


class TestWordCount(unittest.TestCase):
    def test_korean_counted_by_eojeol(self):
        self.assertEqual(count_words("한국어 어절 세기 테스트"), 4)


if __name__ == "__main__":
    unittest.main(verbosity=2)
