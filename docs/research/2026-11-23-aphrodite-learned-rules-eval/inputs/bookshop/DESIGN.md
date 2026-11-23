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
- 카드는 1px `{colors.border}` 테두리로 구분한다.
- 행 조작 버튼은 행 끝에 모은다.
