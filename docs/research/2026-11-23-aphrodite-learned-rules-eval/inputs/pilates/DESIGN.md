---
name: 숨 필라테스
colors:
  primary: "#B4532A"
  on-primary: "#FFFFFF"
  surface: "#FFFAF5"
  text: "#2B2118"
  muted: "#7A6A5C"
typography:
  display:
    fontFamily: "\"Pretendard Variable\", Pretendard, sans-serif"
    fontSize: 2.5rem
    fontWeight: 700
  body-md:
    fontFamily: "\"Pretendard Variable\", Pretendard, sans-serif"
    fontSize: 1rem
rounded:
  md: 12px
  pill: 999px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: 14px
---

## Overview
동네 필라테스 스튜디오의 체험 신청 랜딩. 따뜻한 테라코타 톤, 사진 한 장과 짧은 말로 신뢰를 준다.

## Colors
- **Primary (#B4532A):** 체험 신청 CTA와 가격 강조에만.

## Typography
Pretendard. 제목은 크게, 본문은 편하게 읽히게.

## Layout
모바일 우선 단일 열. 히어로 → 수업 소개 → 가격 → 위치.

## Components
- CTA는 알약 모양 버튼 하나만 강조한다.

## Learned Rules
- **본문은 `{typography.body-md}`(16px) 아래로 줄이지 않는다.**
  Why: "글씨가 너무 작아서 못 읽겠어"
  <!-- 2026-11-02 · 대화 2026-11-02 15:20 -->
