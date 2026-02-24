---
name: web-preview-guide
description: |
  웹 프리뷰 모드 개발 가이드. 디자인 DNA(토큰) 먼저 → Frontend → Backend 순서 자동 적용.
  채팅 모드 + dev server + PreviewPanel 환경에서 활성화.
auto_apply: true
references:
  - agents/ui-ux-designer.md
  - agents/stitch-developer.md
  - skills/design-system-starter/SKILL.md
---

# Web Preview Mode Development Guide

웹 프리뷰 모드(채팅 모드 + dev server + PreviewPanel)에서 개발할 때 아래 순서를 따릅니다.
사용자가 다른 순서를 명시적으로 요청하면 그에 따릅니다.

---

## Phase 0: Design DNA (디자인 토큰 먼저)

> 100개 이상 화면에서 일관성을 유지하려면, 토큰 없이 바로 화면부터 시작하면 안 된다.
> 아토믹 단위의 디자인 DNA를 먼저 제작해야 한다.

**젭마인 연동**: `claude-interview.md`의 Category B(디자인 비전)에서 수집한 벤치마킹 URL, 톤/무드, 색상 선호가 있으면 그것을 입력으로 사용합니다. 젭마인은 "어떤 느낌을 원하는가"를 수집하고, 여기서는 그 레퍼런스의 **실제 시각 요소(색상, 간격, 그림자)를 추출**하여 토큰으로 만듭니다.

### Step 0. 디자인 방향성 잡기 (리서치)

프로젝트의 산업/목적에 맞는 디자인 방향성을 **검색해서** 결정합니다.

**0-1. 산업별 트렌드 검색**:
```
WebSearch로 "{산업} website design trends 2025" 검색
→ 해당 산업에서 어떤 스타일이 주류인지 파악
→ 예: "SaaS dashboard design trends" / "뷰티 스파 웹사이트 디자인"
```

**0-2. 경쟁사/벤치마킹 사이트 탐색**:
```
WebSearch로 "{산업} best website examples" 검색
→ top 3~5개 사이트 URL 확보
→ Playwright로 각 사이트에 접속해서 스크린샷 자동 캡처:

  browser_navigate → "{경쟁사 URL}"
  browser_take_screenshot → "competitor-1.png"
```

**0-3. 방향성 결정표 작성**:

|항목|리서치 방법|예시|
|---|---|---|
|UI 스타일|검색 트렌드 + 경쟁사 분석|Glassmorphism, Soft UI, Minimalism 등|
|컬러 무드|경쟁사 스크린샷에서 추출|SaaS → 블루/퍼플, 헬스케어 → 그린/화이트|
|타이포그래피|Google Fonts 트렌드 검색|Pretendard + Inter, Noto Sans KR + Roboto|
|레이아웃 패턴|경쟁사 공통 패턴 분석|Hero-Centric, Feature Showcase, Dashboard|
|안티패턴|산업별 부적절한 것|금융앱에 네온 컬러, AI 제품에 보라+핑크 그라디언트|

**참고**: `ui-ux-pro-max` 스킬이 설치되어 있으면 `--design-system` 옵션으로 산업별 100개 규칙 기반 자동 생성 가능.

### Step 1. 레퍼런스 수집 + 디자인 토큰 생성

**1-1. 레퍼런스 이미지 수집** (3가지 경로):

| 경로 | 방법 |
|------|------|
| **사용자 제공** | 리뉴얼 대상, 영감 이미지를 직접 전달 |
| **자동 캡처** | Step 0에서 찾은 경쟁사/벤치마킹 사이트를 Playwright로 스크린샷 |
| **디자인 갤러리 검색** | WebSearch로 Dribbble, Behance, Awwwards에서 "{산업} UI" 검색 → 상위 결과 참고 |

```
# 자동 캡처 예시 (Playwright MCP)
browser_navigate → "https://경쟁사1.com"
browser_take_screenshot → fullPage: true, filename: "ref-competitor-1.png"

browser_navigate → "https://레퍼런스사이트.com"
browser_take_screenshot → fullPage: true, filename: "ref-inspiration-1.png"
```

**1-2. 이미지 분석 → 토큰 생성**:

수집된 스크린샷을 Claude에게 전달하며 지시합니다:
```
Step 0의 디자인 방향성과 첨부된 레퍼런스 이미지들을 분석해서:
1. 공통으로 사용되는 색상 팔레트 추출
2. 간격/여백 패턴 분석 (4px vs 8px 베이스)
3. 그림자/둥근모서리 스타일 파악
4. shadcn/ui 호환 CSS variables 형태로 디자인 토큰 생성

대상: [웹/모바일/반응형]
```

**생성되는 토큰 구조** (shadcn/ui 호환):
```css
:root {
  /* 색상 */
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --muted: 240 4.8% 95.9%;
  --accent: 240 4.8% 95.9%;
  --destructive: 0 84.2% 60.2%;
  --border: 240 5.9% 90%;
  --ring: 240 5.9% 10%;

  /* 간격 (4px 또는 8px 베이스) */
  --radius: 0.5rem;
  --spacing-unit: 4px;

  /* 타이포그래피 */
  --font-sans: 'Pretendard', sans-serif;
  --font-heading: 'Pretendard', sans-serif;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... 다크모드 토큰 */
}
```

### Step 2. 토큰 검증 (AI가 규칙, 사람이 감성)

"예쁜가"는 사람이 판단하고, "규칙을 지켰는가"는 AI가 판단합니다.

**자동 검증 체크리스트**:

|#|검증 항목|기준|
|---|---|---|
|1|색상 대비|primary/background 대비 4.5:1 이상 (WCAG AA)|
|2|spacing scale|일관적인가 (4px 또는 8px 베이스)|
|3|다크모드|`.dark` 변수가 정의되어 있는가|
|4|토큰 네이밍|shadcn 컨벤션과 맞는가 (--background, --foreground, --primary 등)|
|5|반응형|breakpoint 전략 정의 (375px, 768px, 1024px, 1440px)|
|6|터치 타겟|모바일: 최소 44x44px|
|7|포커스 상태|키보드 네비게이션용 focus ring 정의|
|8|모션|prefers-reduced-motion 존중|

**사람이 확인**: 프리뷰 패널에서 디자인 시스템 페이지를 열어 시각적으로 확인.

### Step 3. 컴포넌트 라이브러리 초기화

토큰이 검증되면 UI 라이브러리를 셋업합니다.

**shadcn/ui 사용 시**:
```
shadcn init을 수행한 후, 생성된 디자인 토큰으로 globals.css를 오버라이드해줘.
그리고 디자인 시스템을 확인할 수 있는 페이지를 만들어줘.
```

**다른 라이브러리**: MUI, Ant Design, Radix 등도 동일한 토큰 기반 접근 가능.

> UI 라이브러리를 명시해서 프론트엔드 개발의 규칙을 주도해야 합니다.

### 디자인 토큰 파일 구조 (Master + Overrides)

```
design-system/
  MASTER.md          # 글로벌 소스 오브 트루스 (색상, 타이포, 간격, 컴포넌트)
  pages/
    dashboard.md     # 페이지별 오버라이드 (Master와 다른 부분만)
    checkout.md
```

**계층 조회 규칙**:
1. `design-system/pages/{page-name}.md` 확인
2. 있으면 해당 규칙이 Master를 오버라이드
3. 없으면 `design-system/MASTER.md` 규칙만 적용

---

## Phase 1: Frontend → Backend (프리뷰 기반 개발)

디자인 DNA가 준비되면, 프리뷰 패널에서 실시간 확인하며 개발합니다.

|단계|작업|확인 방법|
|---|---|---|
|1. UI 구현|디자인 토큰 기반 컴포넌트/페이지 구현|dev server 실행 → 프리뷰 패널에서 즉시 확인|
|2. 인터랙션|Mock 데이터로 폼, 버튼, 페이지 전환 연결|프리뷰에서 클릭/입력 동작 확인|
|3. 백엔드 API|실제 API 엔드포인트 구현|프리뷰에서 실 데이터 연동 확인|
|4. 에러 처리|로딩 상태, 에러 UI, 유효성 검증|CDP 콘솔/네트워크 에러 자동 감지|

### 프리뷰 모드의 장점

- PreviewPanel(WebView2 + CDP)이 프론트엔드 변경을 실시간으로 보여줌
- Hot reload로 코드 수정 → 프리뷰 반영이 0초
- 브라우저 에러(JS, Network)가 CDP를 통해 자동 감지되어 즉시 수정 가능
- UI를 먼저 만들면 필요한 API 스펙이 자연스럽게 도출됨

---

## Phase 2: Pre-Delivery 검증

화면 완성 후 배포 전 최종 검증.

|#|검증 항목|도구|
|---|---|---|
|1|아이콘에 이모지 사용 금지|SVG 아이콘 (Lucide, Heroicons)|
|2|클릭 가능한 요소에 cursor-pointer|CSS 검사|
|3|hover 상태에 smooth transition (150-300ms)|프리뷰에서 확인|
|4|라이트모드 텍스트 대비 4.5:1|WCAG 검사|
|5|키보드 focus 상태 가시적|Tab 키로 확인|
|6|prefers-reduced-motion 존중|접근성 설정 변경 후 확인|
|7|반응형 확인|375px, 768px, 1024px, 1440px|

---

## 적용 조건

- 채팅 모드에서 웹 프리뷰가 활성화된 경우에만 적용
- 순수 백엔드/CLI 프로젝트에는 적용하지 않음
- 사용자가 "백엔드부터" 또는 다른 순서를 요청하면 그에 따름
- 디자인 토큰 없이 빠르게 프로토타이핑하고 싶다고 하면 Phase 0 건너뛰기 가능

## Stitch 연동

Stitch MCP가 활성화된 환경에서는:
1. Phase 0으로 디자인 토큰 확정
2. `stitch-enhance-prompt`로 프롬프트 최적화
3. `stitch-loop`로 페이지 생성
4. `stitch-react`로 React 컴포넌트 변환 시 디자인 토큰 적용
