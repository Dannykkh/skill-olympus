# Hangeul Minimal (한글 미니멀)

A quiet Korean theme built on a single family and a warm neutral ground, with a muted plum accent that stays out of the way.

## Color Palette

- **Charcoal (숯)**: `#22201e` - Primary text and headings
- **Plum (자주)**: `#6b4a6e` - Restrained accent for emphasis and active states
- **Bone (미색)**: `#faf8f5` - Warm off-white background
- **Warm Gray (회백)**: `#767068` - Secondary text and dividers

The plum accent replaces the blue and teal that dominate most Korean corporate decks; it reads as deliberate rather than defaulted.

## Typography

- **Headers**: Pretendard Variable, weight 600 (fallback: Malgun Gothic Bold / Apple SD Gothic Neo Bold / Noto Sans CJK KR Bold)
- **Body Text**: Pretendard Variable, weight 400 (fallback: Malgun Gothic / Apple SD Gothic Neo / Noto Sans CJK KR)

The CSS family name is exactly `Pretendard Variable` (the variable build declares `font-weight: 45 920`). For PPTX or other non-web rendering, install the static Pretendard family or let the fallback take over.

Pretendard is a single family covering Hangul, Latin, and numerals with matched proportions, so weight alone carries the hierarchy. It is not on Google Fonts — load it from the jsDelivr CDN below.

## Web Font Loading

Use the **dynamic-subset variable** build. The static build has no `unicode-range`, so every weight downloads the full Hangul glyph set; the subset build ships only the ranges the page actually uses.

```html
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
```

```css
--font-heading: "Pretendard Variable", "Pretendard", "Malgun Gothic", sans-serif;
--font-body: "Pretendard Variable", "Pretendard", "Malgun Gothic", sans-serif;
```

Headings use `font-weight: 600`, body `400`. The variable build covers the full range, so no separate weight files are needed.

## Accessibility

Verified against the Bone background (WCAG AA, 4.5:1 minimum):

| Pair | Ratio |
|------|-------|
| Charcoal on Bone | 15.32:1 |
| Plum on Bone | 7.00:1 |
| Warm Gray on Bone | 4.62:1 |

Light-background theme. Warm Gray sits just above the threshold — do not lighten it further for body copy. On inverted (Charcoal) slides, use Bone for text and keep Plum to shapes.

## Best Used For

Korean product documentation, internal reports and memos, research summaries, minimal brand decks, portfolio and case-study pages, 한국어 문서, 내부 보고서, 리서치 자료.
