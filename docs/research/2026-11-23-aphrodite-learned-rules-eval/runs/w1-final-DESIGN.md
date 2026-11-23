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
- 카드는 테두리 없이 배경 대비로 구분한다. 흰 카드(`{colors.surface}`)를 페이지 배경(`{colors.surface-2}`) 위에 놓는다.
  — 2026-11-23 사용자: "카드 테두리 답답해 보여." 후 직접 제거.
- 행 조작 버튼은 행 끝에 모은다.
- 나란히 놓인 버튼 사이는 최소 `{spacing.sm}`(8px). 목록 행 끝(수정·삭제)과 상세 화면(저장·취소)에 똑같이 적용한다.
  — 2026-11-23 사용자 2회 지적: "행 끝 버튼들이 너무 붙어 있어. 잘못 누르겠어." / "또 버튼이 붙어 있잖아. 상세 화면 버튼도 그래." 사용자가 `.row-actions` gap을 2px→8px로 직접 고침.
- 버튼·아이콘 자리에 이모지를 쓰지 않는다. 지금 버튼은 텍스트 라벨만 쓴다.
  — 2026-11-23 사용자: "아이콘 자리에 이모지 쓰지 마. 전에도 말했는데." (bbf47d8에서 제거)
