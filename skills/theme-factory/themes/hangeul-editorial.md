# Hangeul Editorial (한글 에디토리얼)

A refined Korean editorial theme pairing ink-black type with a vermilion seal accent, built for Korean-language publishing and long-form reading.

## Color Palette

- **Ink Black (먹)**: `#1a1717` - Primary text and headings
- **Vermilion (주홍)**: `#a83722` - Accent for emphasis, rules, and seals
- **Rice Paper (한지)**: `#f5f1e8` - Warm background
- **Ink Gray (담묵)**: `#6b6560` - Secondary text and captions

## Typography

- **Headers**: Hahmlet Bold (fallback: Malgun Gothic Bold / Apple SD Gothic Neo Bold / Noto Serif CJK KR)
- **Body Text**: Noto Sans KR (fallback: Malgun Gothic / Apple SD Gothic Neo / Noto Sans CJK KR)

Hahmlet is a variable Korean serif with 9 weights, giving editorial headlines fine typographic control. Both faces carry full Hangul and Latin glyph coverage, so mixed Korean-English text stays in one type system.

## Web Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
--font-heading: "Hahmlet", "Malgun Gothic", serif;
--font-body: "Noto Sans KR", "Malgun Gothic", sans-serif;
```

## Accessibility

Verified against the Rice Paper background (WCAG AA, 4.5:1 minimum):

| Pair | Ratio |
|------|-------|
| Ink Black on Rice Paper | 15.80:1 |
| Vermilion on Rice Paper | 5.76:1 |
| Ink Gray on Rice Paper | 5.10:1 |

Light-background theme. On inverted (Ink Black) slides, use Rice Paper for text and restrict Vermilion to shapes and rules — it does not clear 4.5:1 against Ink Black.

## Best Used For

Korean magazines and editorial decks, cultural and publishing content, book launches, long-form Korean reports, brand storytelling, 한국어 매거진, 출판 자료, 문화 콘텐츠.
