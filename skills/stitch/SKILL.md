---
name: stitch
description: >
  Stitch MCP 통합 스킬. 4가지 모드: (1) DESIGN.md 생성, (2) 프롬프트 최적화,
  (3) 멀티페이지 자율 생성 루프, (4) React/TypeScript 변환.
  "Stitch", "UI 생성", "디자인 to 코드", "멀티페이지", "DESIGN.md" 요청에 실행.
  /stitch로 실행.
triggers:
  - "stitch"
  - "UI 생성"
  - "디자인 to 코드"
  - "DESIGN.md 생성"
  - "디자인 시스템 분석"
  - "프롬프트 최적화"
  - "UI 프롬프트"
  - "멀티페이지 생성"
  - "사이트 빌드 루프"
  - "React 변환"
  - "HTML to React"
auto_apply: false
license: MIT
metadata:
  version: "2.0.0"
  merged_from:
    - stitch-design-md
    - stitch-enhance-prompt
    - stitch-loop
    - stitch-react
---

# Stitch — UI 생성 통합 스킬

> Stitch MCP로 UI를 생성하고, 분석하고, 변환하는 4가지 모드를 하나로.

## Quick Start

```
/stitch design      # Mode 1: 프로젝트 분석 → DESIGN.md 생성
/stitch prompt      # Mode 2: 모호한 아이디어 → Stitch 최적 프롬프트
/stitch loop        # Mode 3: 멀티페이지 자율 생성 (바톤 시스템)
/stitch react       # Mode 4: Stitch HTML → React/TypeScript 변환
/stitch             # 대화형: 상황에 맞는 모드 자동 선택
```

**공식 호출명:** `/stitch`

---

## Mode 1: Design — DESIGN.md 생성

기존 Stitch 프로젝트를 분석하여 디자인 시스템 문서를 생성합니다.
새 스크린 생성 시 기존 디자인 언어와의 일관성을 보장하는 source of truth.

### Workflow

1. **네임스페이스 탐색**: `list_projects`로 프로젝트 목록 조회
2. **스크린 조회**: `list_screens`로 전체 스크린 확인
3. **메타데이터 수집**: `get_screen_metadata` + `get_screen_html`
4. **에셋 다운로드**: `download_screen_asset`으로 이미지/폰트 수집
5. **분석 → DESIGN.md 생성**

### 분석 원칙

| 분석 영역 | 추출 항목 |
|-----------|----------|
| 프로젝트 아이덴티티 | 전체 분위기, 스타일 톤 |
| 색상 팔레트 | 설명적 이름 + Hex + 역할 (primary, accent 등) |
| 타이포그래피 | Heading/Body/Caption 체계, 폰트 패밀리 |
| 기하학 | border-radius, box-shadow 패턴 |
| 깊이 표현 | 그림자와 고도를 자연어로 설명 |

---

## Mode 2: Prompt — 프롬프트 최적화

모호한 UI 아이디어를 Stitch에 최적화된 상세 프롬프트로 변환합니다.

### Enhancement Process

1. **입력 분석**: 사용자 아이디어의 타입 파악, 누락 정보 식별
2. **컨텍스트 수집**: DESIGN.md 로드, 프로젝트 도메인 추론
3. **프롬프트 확장**: 아래 체크리스트로 구체화

| 항목 | 확인 |
|------|------|
| 페이지 목적 | 랜딩? 대시보드? 폼? |
| 대상 사용자 | B2B? B2C? 관리자? |
| 핵심 요소 | CTA 버튼, 차트, 테이블, 카드 등 |
| 레이아웃 | 그리드, 사이드바, 탭, 풀스크린 |
| 색상/타이포 | DESIGN.md 토큰 참조 |
| 상호작용 | 호버, 애니메이션, 드래그 |
| 반응형 | 모바일 우선? 데스크톱 우선? |

4. **구조화 출력**: 개요, 시각적 스타일, 레이아웃, 핵심 요소, 상호작용, 디자인 시스템 컨텍스트

---

## Mode 3: Loop — 멀티페이지 자율 생성

바톤(Baton) 시스템으로 멀티페이지 웹사이트를 자율 생성합니다.

### 핵심 메커니즘

```
[SITE.md 계획] → [바톤 읽기] → [Stitch 생성] → [통합] → [검증] → [바톤 전달] → 반복
```

`next-prompt.md` 파일이 각 반복 간 작업을 릴레이하는 바톤 역할.

### 1회 반복 흐름

1. **바톤 읽기**: `next-prompt.md`에서 페이지명, 경로, 프롬프트 추출
2. **컨텍스트 확인**: SITE.md (사이트맵) + DESIGN.md (디자인 시스템) 참조
3. **Stitch 생성**: `generate_screen_from_text(prompt, project_id)` → HTML + 스크린샷
4. **통합**: HTML을 `site/public/{경로}/index.html`로 저장, 네비게이션 링크 연결
5. **검증**: 시각적 확인, 링크 동작, 반응형 레이아웃

### SITE.md 구조

```markdown
# Site: {프로젝트명}

## Pages
| # | 페이지 | 경로 | 상태 |
|---|--------|------|------|
| 1 | 홈 | / | done |
| 2 | 소개 | /about | pending |
| 3 | 가격 | /pricing | pending |
```

---

## Mode 4: React — HTML → React/TypeScript 변환

Stitch에서 생성된 정적 HTML을 프로덕션 React/TypeScript 컴포넌트로 변환합니다.

### Workflow

1. **스크린 가져오기**: `get_screen_html`로 HTML 획득
2. **디자인 토큰 추출**: Tailwind 클래스 + 인라인 스타일 → CSS 변수
3. **컴포넌트 분해**: 시맨틱 구조 분석 후 계층 분리
4. **React 컴포넌트 생성**: TypeScript + Props 타입 정의
5. **검증**: `tsc --noEmit` + 린트

### 컴포넌트 분해 계층

| 계층 | 예시 | 기준 |
|------|------|------|
| `primitives/` | Button, Input, Badge | 단일 역할, 최소 단위 |
| `patterns/` | Card, FormField, Avatar | primitives 조합 |
| `blocks/` | Header, Hero, Footer | 섹션 단위 |
| `layouts/` | PageLayout, SidebarLayout | 페이지 구조 |

### 분해 규칙

- **단일 책임**: 1 컴포넌트 = 1 역할
- **재사용성**: props로 변형 가능하게
- **합성 가능**: children, slots 패턴 활용
- **시맨틱 HTML**: `<nav>`, `<main>`, `<section>` 우선

---

## 적용 조건

- Stitch MCP 서버가 활성화된 환경에서만 사용
- Stitch 없이 일반 UI 작업은 `frontend-design` 또는 `react-dev` 사용
- Mode 선택이 모호하면 대화형으로 물어보기

## Related Files

| 파일 | 역할 |
|------|------|
| `DESIGN.md` | 디자인 시스템 source of truth |
| `SITE.md` | 멀티페이지 사이트맵 + 로드맵 |
| `next-prompt.md` | 루프 바톤 (Mode 3) |
| `agents/stitch-developer.md` | Stitch 오케스트레이션 에이전트 |
