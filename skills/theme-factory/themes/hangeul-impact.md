# Hangeul Impact (한글 임팩트)

A high-contrast dark theme with heavy Korean display type and a magenta accent, built for headlines that have to carry a room.

## Color Palette

- **Jet (칠흑)**: `#141414` - Dominant background
- **Magenta (자홍)**: `#ff4d8d` - Accent for headlines, key numbers, and CTAs
- **White (백)**: `#ffffff` - Primary text on dark
- **Mid Gray (중회)**: `#b4b0ac` - Secondary text and captions on dark

This is a dark-first theme. The background is Jet, not white.

## Typography

- **Headers**: Black Han Sans (fallback: Malgun Gothic Bold / Apple SD Gothic Neo Bold / Noto Sans CJK KR Black)
- **Body Text**: Nanum Gothic (fallback: Malgun Gothic / Apple SD Gothic Neo / Noto Sans CJK KR)

Black Han Sans ships a single heavy weight and is built for large Korean headlines only — never use it below roughly 32pt or for body copy. Nanum Gothic carries the running text.

## Web Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Nanum+Gothic:wght@400;700&display=swap" rel="stylesheet">
```

```css
--font-heading: "Black Han Sans", "Malgun Gothic", sans-serif;
--font-body: "Nanum Gothic", "Malgun Gothic", sans-serif;
```

## Accessibility

Verified against the Jet background (WCAG AA, 4.5:1 minimum):

| Pair | Ratio |
|------|-------|
| White on Jet | 18.42:1 |
| Magenta on Jet | 5.88:1 |
| Mid Gray on Jet | 8.55:1 |

Dark-background theme. Magenta clears AA on Jet at any text size. If a light section is unavoidable, darken the accent before using it on white — `#ff4d8d` reads at only 2.7:1 there.

## Best Used For

Korean event and campaign decks, product launches, marketing posters, conference keynotes, youth and entertainment brands, 한국어 이벤트 페이지, 마케팅 자료, 런칭 발표.
