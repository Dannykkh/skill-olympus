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
- **본문과 보조 문단(히어로 설명처럼 `{colors.muted}`로 쓰는 문단 포함)은 `{typography.body-md}`(16px) 아래로 줄이지 않는다.**
  Why: "글씨가 너무 작아서 못 읽겠어" / "본문 글자 또 작아졌네. 전에 말했잖아." (두 번 지적)
  <!-- 2026-11-02 · 대화 2026-11-02 15:20 / 2026-11-23 적용 범위 수정 · session-log.md 15:40, styles.css:5 .hero p font-size:14px -->
- **버튼에 고정 `width`를 주지 않는다. 폭은 글자 + `{components.button-primary.padding}`으로 정해지고, 버튼 글자는 폰 폭 360px에서 한 줄이다. `keep-all`이나 버튼 전체 `nowrap`으로 막지 않는다.**
  Why: "폰에서 '무료 체험 신청하기' 버튼 글자가 두 줄로 꺾여." / "버튼 글자 또 꺾였어. 아래 결제 버튼도 그래." (두 번 지적)
  <!-- 2026-11-23 · session-log.md 14:20·15:20, styles.css:6 .cta width:140px -->
- **히어로 설명은 폰 폭에서 3줄 이내. 넘치면 문장을 덜어내고, 글자를 줄여 맞추지 않는다.**
  Why: "히어로 설명이 너무 길어. 세 줄이면 충분해."
  <!-- 2026-11-23 · session-log.md 14:50, git 작업 트리 diff index.html:7 직접 수정 -->
- **색은 `colors:` 토큰만 쓴다(CSS에서는 `var(--primary)` 등 변수로). 토큰에 없는 hex를 직접 쓰지 않는다.**
  Why: "색은 브랜드 색만 써."
  <!-- 2026-11-23 · session-log.md 15:50, git 작업 트리 diff styles.css:8 #3B82F6 → var(--primary) 직접 수정 -->
