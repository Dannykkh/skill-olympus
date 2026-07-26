# Hangeul Corporate (한글 기업)

A trustworthy Korean business theme in deep navy and steel blue, tuned for data-heavy enterprise and financial material.

## Color Palette

- **Deep Navy (감청)**: `#152a47` - Primary text, headings, and dark fills
- **Steel Blue (강청)**: `#3d6ea8` - Accent for charts, links, and key figures
- **Cloud (구름)**: `#f2f4f7` - Cool neutral background
- **Slate (석판)**: `#5a6473` - Secondary text, axis labels, and table rules

## Typography

- **Headers**: Gothic A1 Bold (fallback: Malgun Gothic Bold / Apple SD Gothic Neo Bold / Noto Sans CJK KR Bold)
- **Body Text**: IBM Plex Sans KR (fallback: Malgun Gothic / Apple SD Gothic Neo / Noto Sans CJK KR)

Gothic A1 is a modern Korean sans with 9 weights. IBM Plex Sans KR harmonizes Hangul with Latin and numerals, which keeps figures legible in tables and financial charts. Pair with IBM Plex Mono for code or ledger columns.

## Web Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;700&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet">
```

```css
--font-heading: "Gothic A1", "Malgun Gothic", sans-serif;
--font-body: "IBM Plex Sans KR", "Malgun Gothic", sans-serif;
```

## Accessibility

Verified against the Cloud background (WCAG AA, 4.5:1 minimum):

| Pair | Ratio |
|------|-------|
| Deep Navy on Cloud | 13.11:1 |
| Steel Blue on Cloud | 4.77:1 |
| Slate on Cloud | 5.44:1 |

Light-background theme. On inverted (Deep Navy) slides, use Cloud for text; Steel Blue clears only 2.75:1 against Deep Navy, so keep it to fills and chart series, never body copy.

## Best Used For

Korean enterprise decks, fintech and banking presentations, B2B SaaS pitches, government and public-sector reports, IR material, quarterly reviews, 한국어 기업 발표, 금융 보고서, 제안서.
