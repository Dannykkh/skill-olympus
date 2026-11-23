---
name: 책방 재고 관리
colors:
  primary: "#1B3168"
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  surface-2: "#F3F1EC"
  border: "#D9D4CA"
  text: "#1D1B18"
typography:
  heading:
    fontFamily: "\"Pretendard Variable\", Pretendard, sans-serif"
    fontSize: 1.5rem
    fontWeight: 700
  body-md:
    fontFamily: "\"Pretendard Variable\", Pretendard, sans-serif"
    fontSize: 1rem
rounded:
  sm: 4px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 8px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 8px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

<!-- 2026-11-23 · 브랜드 색을 짙은 녹색(#1F5F4A)에서 짙은 남색 계열로 바꾸기로 한 사용자 결정에 따라 전면 재작성. Learned Rules는 원문 그대로 옮김 -->

## Overview
동네 서점 직원이 매장 컴퓨터에서 재고를 빠르게 확인하고 발주하는 업무 화면. 방향은 미니멀이다.
따뜻한 종이색 바탕과 먹색 글자가 화면 대부분을 차지하고, 짙은 남색은 직원이 누를 주 조작에만 찍힌다.
남색이 보이는 자리가 곧 "여기서 일이 진행된다"는 신호다. 장식 효과와 장식 모션은 두지 않는다.

## Colors
- **Primary (#1B3168 · oklch(0.33 0.10 265)):** 발주·저장 같은 주 조작에만 쓴다. 브랜드를 짙은 남색 계열로
  바꾸기로 한 결정(사용자, 2026-11-23)을 따른다. 정확한 값은 AI가 고른 값이다 — 공식 브랜드 남색(로고·간판
  원본 값)이 정해지면 그 값으로 바꾸고 아래 대비를 다시 잰다.
  - 고른 기준: 흰 글자를 올려도 AAA를 넘고, 채도(C 0.10)가 있어 먹색 글자 옆에서도 검정이 아니라 남색으로 읽힌다.
    더 어두운 후보 `#14213D`는 본문 먹색과 명도 대비가 1.08:1이라 검정처럼 보여 탈락시켰다.
  - 남색과 본문 먹색은 명도 대비가 1.38:1뿐이다. 남색을 글자색(링크 등)으로 쓸 때는 색만으로 구분하지 말고 밑줄을 함께 쓴다.
- **On-primary (#FFFFFF):** primary 바탕 위 글자.
- **Surface (#FFFFFF) / Surface-2 (#F3F1EC):** 카드 표면과 그 아래 바탕. 종이 톤을 그대로 둔다. 이번에 바뀐 것은
  브랜드 색뿐이고, 카드 구분 규칙(Learned Rules 첫 항목)이 이 두 값의 차이에 기대고 있다.
- **Border (#D9D4CA):** 보조 버튼 외곽선. 카드에는 쓰지 않는다.
- **Text (#1D1B18):** 본문과 제목 글자.
- 액센트 색은 두지 않는다. 재고 부족·오류 같은 상태 색은 아직 정하지 않았다 — 필요해지면 남색과 헷갈리지 않는 값으로 따로 정한다.

실측 대비 (WCAG 2.x 상대 휘도, 2026-11-23 계산):

| 짝 | 대비 | 판정 |
|---|---|---|
| on-primary 글자 / primary 바탕 | 12.46:1 | AAA |
| primary / surface-2 (바탕 위 남색 요소) | 11.04:1 | 3:1 이상 |
| text / surface | 17.18:1 | AAA |
| text / surface-2 | 15.22:1 | AAA |

## Typography
Pretendard 하나로 제목과 본문을 쓴다. 재고·가격 같은 숫자는 `font-variant-numeric: tabular-nums`로 자릿수를 맞춘다.

- **로드:** Pretendard v1.3.9 가변 CSS
  `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`를
  `<link>`로 불러온다. 이 CSS가 선언하는 family 이름이 `Pretendard Variable`이므로 스택 첫 자리가 그 이름이다.
  뒤의 `Pretendard`는 정적판이 설치된 기기용 대체다. 이름만 적고 불러오지 않으면 한글이 시스템 고딕으로 그려진다.
- **자리별 줄바꿈:**
  - 제목: `word-break: keep-all` + `text-wrap: balance`
  - 본문·상세 설명: `word-break: keep-all` + `text-wrap: pretty`
  - 좁은 칸(표 칸·버튼·배지): `keep-all`을 주지 않는다. 칸 폭을 늘리거나 말줄임으로 푼다. 꺾이면 안 되는 짧은
    묶음만 `span` 단위로 `white-space: nowrap`
  - 코드·주소: `overflow-wrap: anywhere`
  - 한글에 `word-break: break-all`은 쓰지 않는다.

## Layout
목록 중심. 한 화면에 재고 행을 최대한 많이 보인다. `{colors.surface-2}` 바탕 위에 `{colors.surface}` 카드(목록·상세)를
놓는다. 화면 여백과 카드 사이는 `{spacing.lg}`(24px), 카드 안쪽은 `{spacing.md}`(16px).

## Components
- **button-primary:** 남색 바탕 + 흰 글자, `{rounded.md}`, 안쪽 8px. "발주하기", "저장" 같은 주 조작에만 쓴다.
- **button-secondary:** `{colors.surface}` 바탕 + `{colors.text}` 글자 + `{colors.border}` 1px 외곽선. 수정·삭제·취소 같은 보조 조작.
- **포커스:** 키보드 포커스는 `:focus-visible`에 `{colors.primary}` 2px 외곽선, 2px 띄움. 흰 바탕에서 12.46:1이라 남색 버튼 위에서도 테두리로 보인다.
- 행 조작 버튼은 행 끝에 모은다.
- **card:** `{colors.surface}` 바탕, `{rounded.md}`, 안쪽 `{spacing.md}`. 테두리 없음.

## Learned Rules
- **카드 구분은 테두리가 아니라 `{colors.surface-2}` 배경 위 `{colors.surface}` 표면 색 차이로 한다.**
  Why: "카드 테두리 답답해 보여"
  <!-- 2026-11-20 · 대화 2026-11-20 11:45, styles.css:5 직접 수정 -->
- **행 조작 버튼 사이는 `{spacing.sm}`(8px) 이상 띄운다.**
  Why: "또 버튼이 붙어 있잖아" (두 번 지적)
  <!-- 2026-11-20 · 대화 2026-11-20 10:15, 11:30 -->
- **아이콘 자리에 이모지를 쓰지 않는다. 아이콘이 필요하면 단색 SVG를 쓴다.**
  Why: "아이콘 자리에 이모지 쓰지 마. 전에도 말했는데"
  <!-- 2026-11-21 · 대화 2026-11-21 12:00 -->
