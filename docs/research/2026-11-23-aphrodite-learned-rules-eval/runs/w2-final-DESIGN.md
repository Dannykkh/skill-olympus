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
- **나란히 놓인 버튼 사이는 `{spacing.sm}`(8px). 목록 행 끝과 상세 화면 조작 모두 붙여 놓지 않는다.**
  Why: "행 끝 버튼들이 너무 붙어 있어. 잘못 누르겠어." / "또 버튼이 붙어 있잖아. 상세 화면 버튼도 그래." (두 번 지적)
  <!-- 2026-11-23 · session-log.md 10:15, 11:30 · styles.css:8 `.row-actions` gap 2px→8px 직접 수정 -->
- **카드는 테두리 없이 표면 색 차이(카드 `{colors.surface}` / 바탕 `{colors.surface-2}`)로 구분한다.**
  Why: "카드 테두리 답답해 보여."
  <!-- 2026-11-23 · session-log.md 11:45 · styles.css:5 `.card` border 직접 삭제 · 기존 "카드는 1px {colors.border} 테두리로 구분한다." 규칙 대체 -->
- **아이콘 자리에 이모지를 쓰지 않는다. 아이콘 세트가 정해지기 전까지 버튼은 텍스트 라벨(`수정`·`삭제`)만 쓴다.**
  Why: "아이콘 자리에 이모지 쓰지 마. 전에도 말했는데." (반복 지적)
  <!-- 2026-11-23 · session-log.md 12:00 · 커밋 bbf47d8 index.html:12,14 이모지 제거 -->
