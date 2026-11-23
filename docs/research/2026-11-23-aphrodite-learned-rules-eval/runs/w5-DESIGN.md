---
name: 책방 재고 관리
colors:
  primary: "#1E2F55"
  primary-hover: "#2A4478"
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
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
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
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

## Overview
동네 서점 직원이 매장 컴퓨터에서 재고를 빠르게 확인하고 발주하는 업무 화면. 방향은 미니멀이다.
따뜻한 종이색 바탕 위에 짙은 남색 잉크로 주 조작만 찍고, 나머지는 재고 행 데이터가 화면을 채운다.
장식 효과는 두지 않는다.

2026-11-23 브랜드 색을 짙은 녹색(#1F5F4A)에서 짙은 남색 계열로 바꿨다(사용자 결정). 종이·잉크 톤의
바탕과 업무 화면 구조는 유지하고 잉크 색만 바꾼 개편이다(AI 권장 — 남색은 잉크 색이라 기존 종이 바탕과
그대로 짝이 맞는다).

## Colors
- **Primary (#1E2F55):** 짙은 남색. 발주·저장 같은 주 조작 버튼의 면과 포커스 링에만 쓴다.
  남색 계열은 사용자 결정이고, 정확한 값은 AI 권장이다. 흰 글자 대비 13.18:1, `surface-2` 위 11.68:1.
  **남색을 글자색으로 쓰지 않는다** — 본문 `text`(#1D1B18)와 대비가 1.30:1이라 강조로 읽히지 않는다.
  글자 강조는 굵기로 한다.
- **Primary hover (#2A4478):** 주 조작 버튼의 hover 면 전용. 기본 남색보다 한 단계 밝아 눌릴 수 있음을
  알린다. 흰 글자 대비 9.56:1. AI 권장.
- **On-primary (#FFFFFF):** 남색 면 위 글자.
- **Surface (#FFFFFF) / Surface-2 (#F3F1EC):** 카드 표면과 페이지 바탕. 따뜻한 종이색 바탕을 유지해 남색
  잉크와 짝을 이룬다. 둘의 차이(1.13:1)가 카드 구분의 유일한 수단이다(아래 Learned Rules).
- **Border (#D9D4CA):** 보조 버튼 테두리. 카드 외곽에는 쓰지 않는다.
- **Text (#1D1B18):** 본문과 표 글자. `surface` 위 17.18:1, `surface-2` 위 15.22:1.
- **액센트 색은 두지 않는다**(AI 권장). 업무 화면에서 강조는 남색 하나로 충분하고, 두 번째 색은 주 조작과
  시선을 다툰다.

## Typography
Pretendard 하나로 제목과 본문을 쓴다. 구현 시 Pretendard 가변 CSS를 `<link>`로 실제 로드하고, 스택은
`"Pretendard Variable", Pretendard` 순서를 지킨다(가변 CSS가 선언하는 이름이 `Pretendard Variable`이다.
뒤의 `Pretendard`는 정적 폰트를 설치한 기기용 대체). 재고·가격 같은 숫자는 `tabular-nums`로 자릿수를
맞추고 오른쪽 정렬한다.

한글 줄바꿈은 자리별로 정한다.

| 자리 | 규칙 |
|---|---|
| 제목(`h1`·`h2`) | `word-break: keep-all` + `text-wrap: balance` |
| 본문·안내 문장 | `word-break: keep-all` + `text-wrap: pretty` |
| 표 칸·버튼·배지 | `keep-all`을 주지 않는다. 칸 폭을 확보하거나 말줄임한다. 끊기면 안 되는 짧은 묶음(가격·수량)만 `white-space: nowrap` |

`word-break: break-all`은 쓰지 않는다. 넘침은 위 자리별 규칙으로 푼다.

## Layout
목록 중심. 한 화면에 재고 행을 최대한 많이 보인다. 페이지 바탕은 `surface-2`, 상단 머리(화면 제목 +
발주하기)는 `surface`다. 페이지 여백과 카드 사이 간격은 `{spacing.lg}`(24px), 카드 안 여백은
`{spacing.md}`(16px)다.

## Components
- **주 버튼(`button-primary`):** 남색 면 + 흰 글자, `{rounded.md}`, 패딩 8px. 발주·저장 같은 주 조작에만 쓴다.
  hover는 `button-primary-hover`. 키보드 포커스는 `focus-visible`에서 2px `{colors.primary}` 외곽선을
  2px 띄워 그린다(바탕 대비 11.68:1 이상).
- **보조 버튼(`button-secondary`):** `surface` 면 + `text` 글자 + 1px `{colors.border}` 테두리. 수정·삭제·취소.
- **비활성 상태는 아직 정하지 않았다.** 비활성 버튼이 처음 필요해질 때 대비를 재서 정한다.
- **행 조작 버튼**은 행 끝에 모은다. 버튼 사이 간격은 아래 Learned Rules를 따른다.
- **카드(`card`):** `surface` 면, `{rounded.md}`, 안쪽 여백 `{spacing.md}`. 테두리와 그림자는 쓰지 않는다.
- **아이콘**은 단색 SVG만 쓰고 색은 `currentColor`로 주변 글자를 따른다.

## Learned Rules
아래는 사용자가 직접 지적해 쌓인 규칙이다. 2026-11-23 남색 개편 때 색과 무관한 규칙이라 그대로 유지했다.

- **카드 구분은 테두리가 아니라 `{colors.surface-2}` 배경 위 `{colors.surface}` 표면 색 차이로 한다.**
  Why: "카드 테두리 답답해 보여"
  <!-- 2026-11-20 · 대화 2026-11-20 11:45, styles.css:5 직접 수정 -->
- **행 조작 버튼 사이는 `{spacing.sm}`(8px) 이상 띄운다.**
  Why: "또 버튼이 붙어 있잖아" (두 번 지적)
  <!-- 2026-11-20 · 대화 2026-11-20 10:15, 11:30 -->
- **아이콘 자리에 이모지를 쓰지 않는다. 아이콘이 필요하면 단색 SVG를 쓴다.**
  Why: "아이콘 자리에 이모지 쓰지 마. 전에도 말했는데"
  <!-- 2026-11-21 · 대화 2026-11-21 12:00 -->
