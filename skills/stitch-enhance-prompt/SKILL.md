---
name: stitch-enhance-prompt
description: 모호한 UI 아이디어를 Stitch에 최적화된 상세 프롬프트로 변환. 구체성 향상, UI/UX 키워드 주입, 디자인 시스템 컨텍스트 통합. "프롬프트 최적화", "UI 프롬프트" 요청 시 사용.
---

# Stitch Prompt Enhancer

모호한 UI 아이디어를 Stitch에 최적화된 상세 프롬프트로 변환합니다.

## 핵심 기능

1. **구체성 향상**: 모호한 설명 → 상세 사양
2. **UI/UX 키워드 주입**: Stitch가 이해하는 디자인 용어 추가
3. **디자인 시스템 컨텍스트**: DESIGN.md에서 스타일 정보 통합
4. **구조화된 출력**: 최적의 생성 결과를 위한 프롬프트 구조화

## 프롬프트 품질 스펙트럼

```
❌ 약함: "로그인 페이지"

⚠️ 보통: "이메일과 비밀번호 필드가 있는 로그인 페이지"

✅ 좋음:
"Login page with centered card on light gray (#F5F5F5) background.
Card: white, rounded 12px, shadow level 2, max-width 400px.
Logo: centered top, 48x48px.
Email input: full-width, placeholder 'Enter email', border #E0E0E0.
Password input: full-width, show/hide toggle icon right.
Primary button: full-width, #4F46E5, white text, rounded 8px, hover darken 10%.
'Forgot password?' link below, #6B7280, underline on hover.
Social login divider 'or continue with'.
Google/GitHub OAuth buttons: outlined, icon left."
```

## 향상 프로세스 (4단계)

### 1단계: 입력 분석
- 사용자 아이디어의 타입 파악 (페이지/컴포넌트/섹션)
- 누락된 정보 식별

### 2단계: 컨텍스트 수집
- DESIGN.md 존재 시 스타일 정보 로드
- 프로젝트 도메인 추론 (SaaS, 이커머스, 블로그 등)

### 3단계: 프롬프트 확장
확장 체크리스트:
- [ ] 페이지 목적 정의됨
- [ ] 대상 사용자 명시됨
- [ ] 핵심 요소 나열됨
- [ ] 레이아웃 구조 설명됨
- [ ] 색상 hex 코드 포함됨
- [ ] 타이포그래피 명시됨
- [ ] 상호작용 상태 포함됨 (hover, active, disabled)
- [ ] 반응형 고려됨

### 4단계: 구조화된 출력

```markdown
## [페이지 유형]: [페이지 이름]

### 개요
{페이지의 목적과 사용자 컨텍스트}

### 시각적 스타일
{색상, 타이포그래피, 분위기}

### 레이아웃 구조
{그리드, 섹션 배치, 간격}

### 핵심 요소
{각 요소의 상세 스펙}

### 상호작용
{hover, click, transition 효과}

### 디자인 시스템 컨텍스트
{DESIGN.md에서 가져온 토큰/스타일 블록}
```

## UI/UX 키워드 사전

**레이아웃**: centered, grid, split-view, sidebar, sticky-header, card-layout, masonry, full-bleed

**스타일**: minimal, modern, clean, rounded-corners, soft-shadows, subtle-gradient, glassmorphism, neumorphism

**컴포넌트**: pill-button, avatar, badge, tooltip, dropdown, modal, toast, accordion, tabs, breadcrumb

**상태**: hover-effect, active-state, disabled, loading-skeleton, empty-state, error-state, success-feedback

## 피해야 할 표현

|❌ 모호|✅ 구체적|
|---|---|
|"예쁜 버튼"|"pill button, #4F46E5, white text 14px, padding 12px 24px, rounded 24px"|
|"큰 제목"|"heading 48px Inter Bold, #1A1A2E, margin-bottom 24px"|
|"어딘가에 로고"|"logo top-left, 32px height, margin 16px from edges"|
|"몇 개의 카드"|"3-column grid, gap 24px, card min-width 300px"|

## 사용법

```
/stitch-enhance-prompt "대시보드 페이지"
# 또는
"이 아이디어를 Stitch 프롬프트로 최적화해줘: 사용자 프로필 페이지"
```
