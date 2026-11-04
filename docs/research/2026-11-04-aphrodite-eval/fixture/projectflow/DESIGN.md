---
name: 플로우보드
colors:
  primary: "#2F5D50"
  secondary: "#5B6B66"
  accent: "#C8553D"
  neutral: "#F6F5F1"
  on-primary: "#FFFFFF"
typography:
  h1:
    fontFamily: "Pretendard Variable, sans-serif"
    fontSize: 2rem
    fontWeight: 700
  body-md:
    fontFamily: "Pretendard Variable, sans-serif"
    fontSize: 1rem
rounded:
  md: 8px
spacing:
  md: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
---

## Overview
차분하고 실무적인 업무 도구. 장식보다 할 일과 다음 행동이 먼저 보인다.

## Colors
- **Primary (#2F5D50):** 주 행동과 현재 위치에만 쓴다.
- **Accent (#C8553D):** 마감 임박 같은 경고에만 제한적으로 쓴다.

## Typography
제목과 본문 모두 Pretendard Variable. 제목은 keep-all + balance.

## Layout
좌측 내비 + 본문 1열. 밀도는 중간.

## Components
버튼은 primary 1개만 강조하고 나머지는 보조 스타일.
