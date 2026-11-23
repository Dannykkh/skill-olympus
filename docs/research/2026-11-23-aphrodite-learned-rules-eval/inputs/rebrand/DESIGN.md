---
name: 책방 재고 관리
colors:
  primary: "#1F5F4A"
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
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

## Overview
동네 서점 직원이 매장 컴퓨터에서 재고를 빠르게 확인하고 발주하는 업무 화면. 차분한 종이·잉크 톤의 미니멀 방향.

## Colors
- **Primary (#1F5F4A):** 발주·저장 같은 주 조작에만 쓴다. 짙은 녹색은 서점 간판 색에서 왔다.

## Typography
Pretendard 하나로 제목과 본문을 쓴다. 숫자는 tabular-nums.

## Layout
목록 중심. 한 화면에 재고 행을 최대한 많이 보인다.

## Components
- 행 조작 버튼은 행 끝에 모은다.

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
