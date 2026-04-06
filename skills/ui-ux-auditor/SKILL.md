---
name: ui-ux-auditor
description: "웹 프로젝트 UI/UX 9영역 자동 감사 + 0-10 채점 + 코드 수정. 다크모드, 반응형, 접근성, 로딩상태, 폼UX, 네비게이션, 타이포그래피, 애니메이션, AI Slop 탐지. /ui-ux-auditor로 실행."
---

# UI/UX Auditor — 9영역 감사 + 0-10 채점 + 자동 수정

프로젝트의 UI/UX를 9개 카테고리로 스캔하고, 영역별 0-10 점수를 매긴 뒤, 발견된 문제를 우선순위별로 분류한 뒤 코드를 직접 수정합니다.

**상호보완 관계:**
- `ui-ux-designer` (에이전트): 디자인 **조언** — "이렇게 만들어라" (개발 중)
- `ui-ux-auditor` (이 스킬): UI/UX **점검 + 수정** — "이게 문제니까 고쳐라" (개발 후)

## 적용 시점

- `/ui-ux-auditor` 명시적 실행
- "UI 점검해줘", "UX 감사해줘", "접근성 검사", "반응형 확인" 요청 시

---

## Step 1: 프로젝트 스캔

프로젝트 구조를 파악합니다:

| 검사 대상 | 경로 패턴 |
|-----------|-----------|
| 페이지 라우트 | `src/app/`, `pages/`, `src/routes/` |
| 컴포넌트 | `src/components/`, `components/` |
| 스타일 시스템 | `globals.css`, `tailwind.config.*`, `*.module.css` |
| UI 의존성 | `package.json` → DaisyUI, shadcn, Radix, MUI, Chakra 등 |

**프레임워크 자동 감지:**

```
package.json → "next" → Next.js
package.json → "nuxt" → Nuxt
package.json → "@sveltejs/kit" → SvelteKit
package.json → "@remix-run" → Remix
package.json → "astro" → Astro
index.html + vite → Vite SPA
```

---

## Step 2: 8영역 UI/UX 감사

### 2-1. 다크/라이트 모드 호환성

**Grep 탐지 패턴:**
```
# 하드코딩 색상 (다크모드에서 깨지는 패턴)
text-white|text-black|bg-white|bg-black
bg-zinc-[0-9]|bg-gray-[0-9]|bg-slate-[0-9]
text-zinc-[0-9]|text-gray-[0-9]|text-slate-[0-9]
border-zinc-|border-gray-|border-slate-
```

| 검사 항목 | 기준 |
|-----------|------|
| 하드코딩 색상 | `text-white`, `bg-black` 등 → 시맨틱 토큰으로 변환 필요 |
| CSS 변수 충돌 | `:root` vs `[data-theme]` 우선순위 충돌 |
| 테마 전환 | `next-themes`, `data-theme` 속성 적용 여부 |
| 이미지/아이콘 | 다크모드에서 안 보이는 요소 (흰 배경 위 흰 아이콘 등) |

### 2-2. 반응형 디자인

**Grep 탐지 패턴:**
```
# 브레이크포인트 사용 여부
sm:|md:|lg:|xl:|2xl:
# 고정 너비 (반응형 깨지는 패턴)
w-\[[\d]+px\]|width:\s*[\d]+px
# 가로 스크롤 유발
overflow-x-auto|overflow-x-scroll
```

| 검사 항목 | 기준 |
|-----------|------|
| 브레이크포인트 누락 | `sm:`, `md:`, `lg:` 없이 고정 레이아웃 |
| 터치 타겟 크기 | 클릭 영역 최소 44×44px (WCAG 2.5.5) |
| 가로 스크롤 | 모바일에서 가로 스크롤 발생하는 요소 |
| 텍스트 오버플로우 | `truncate`, `line-clamp` 누락으로 텍스트가 넘침 |
| 고정 너비 | `w-[500px]` 같은 고정값 → 반응형 단위로 변환 |

### 2-3. 접근성 (a11y)

**Grep 탐지 패턴:**
```
# alt 속성 누락
<img(?![^>]*alt=)
# aria-label 없는 인터랙티브 요소
<button(?![^>]*aria-label)(?![^>]*>[\w가-힣])
# 포커스 아웃라인 제거 (접근성 위반)
outline-none|outline-0|focus:outline-none
```

| 검사 항목 | 기준 |
|-----------|------|
| 이미지 alt | 모든 `<img>`에 의미 있는 alt 텍스트 필수 |
| 색상 대비 | WCAG AA 기준 4.5:1 (본문), 3:1 (대형 텍스트) |
| aria 속성 | 아이콘 버튼에 `aria-label`, 모달에 `aria-modal` |
| 키보드 네비게이션 | Tab 순서, Enter/Space 동작, Esc 닫기 |
| 시맨틱 HTML | `<nav>`, `<main>`, `<article>`, `<section>` 사용 |
| 포커스 표시 | `outline-none` 제거 → `focus-visible:ring` 대체 |

### 2-4. 로딩 상태

**Grep 탐지 패턴:**
```
# loading 컴포넌트 존재 여부
loading\.tsx|loading\.jsx|Skeleton|skeleton
# 레이지 로딩
loading="lazy"|lazy\(\)|React\.lazy|dynamic\(
# 버튼 로딩 상태
isLoading|isPending|disabled.*loading
```

| 검사 항목 | 기준 |
|-----------|------|
| 페이지 loading.tsx | Next.js 라우트마다 `loading.tsx` 또는 Suspense 경계 |
| Skeleton UI | 데이터 페칭 구간에 Skeleton 표시 |
| 버튼 피드백 | 클릭 후 로딩 상태 (spinner, disabled) |
| 이미지 레이지 로딩 | 뷰포트 밖 이미지에 `loading="lazy"` |
| 빈 상태 | 데이터 없을 때 빈 상태 UI (Empty State) |

### 2-5. 폼 UX

**Grep 탐지 패턴:**
```
# 폼 관련 패턴
<form|useForm|handleSubmit|onSubmit
# 유효성 검사
required|pattern=|minLength|maxLength
# 에러 메시지 표시
error|formState\.errors|fieldState
```

| 검사 항목 | 기준 |
|-----------|------|
| 유효성 검사 피드백 | 에러 메시지 위치 (필드 바로 아래), 색상 (빨강 계열) |
| 포커스 스타일 | 입력 필드 포커스 시 시각적 구분 |
| 자동완성 | `autocomplete` 속성 (이메일, 비밀번호, 주소 등) |
| 자동 포커스 | 첫 입력 필드에 `autoFocus` |
| 제출 버튼 | 비활성화 상태, 로딩 상태, 중복 제출 방지 |

### 2-6. 네비게이션 일관성

**Grep 탐지 패턴:**
```
# 네비게이션 컴포넌트
<nav|<Nav|Navbar|Sidebar|Breadcrumb
# 활성 상태
active|isActive|pathname|usePathname|useRouter
# 링크 컴포넌트
<Link|<a\s
```

| 검사 항목 | 기준 |
|-----------|------|
| 활성 페이지 표시 | 현재 페이지 하이라이트 (active state) |
| 뒤로가기 동작 | 브라우저 뒤로가기 정상 동작 확인 |
| 브레드크럼 | 3단계 이상 깊이에서 경로 표시 |
| 일관된 위치 | 네비게이션이 모든 페이지에서 동일 위치 |

### 2-7. 타이포그래피 & 간격

**Grep 탐지 패턴:**
```
# 타이포그래피 계층
text-xs|text-sm|text-base|text-lg|text-xl|text-2xl|text-3xl|text-4xl
# 간격 패턴
gap-|space-|p-|px-|py-|m-|mx-|my-
# 줄 간격
leading-|line-height
```

| 검사 항목 | 기준 |
|-----------|------|
| 제목 크기 계층 | h1 > h2 > h3 순서로 크기 감소 (시각적 계층) |
| 줄 간격 | 본문 `leading-relaxed` (1.625) 이상 |
| 섹션 간격 | 일관된 간격 패턴 (예: 섹션 간 `py-12`, 카드 간 `gap-6`) |
| 폰트 일관성 | 같은 용도에 같은 크기/굵기 사용 |

### 2-8. 애니메이션 & 전환

**Grep 탐지 패턴:**
```
# 애니메이션 라이브러리
framer-motion|motion\.|animate-|transition-
# 호버 상태
hover:|group-hover:|focus:
# 페이지 전환
AnimatePresence|pageTransition|layout
```

| 검사 항목 | 기준 |
|-----------|------|
| 호버 상태 | 클릭 가능 요소에 호버 효과 (커서, 색상 변화) |
| 페이지 전환 | 화면 전환 시 부드러운 효과 (선택사항) |
| 과도한 애니메이션 | `prefers-reduced-motion` 미대응 시 경고 |
| 성능 영향 | 레이아웃 트리거 애니메이션 (`width`, `height`) 지양 → `transform`, `opacity` 사용 |

### 2-9. AI Slop 탐지

See [ai-slop-blacklist.md](../frontend-design/references/ai-slop-blacklist.md) — 공유 블랙리스트.

**시각 확인 항목 (코드 + 렌더링):**

| # | 탐지 대상 | Grep 힌트 |
|---|----------|----------|
| 1 | 보라/인디고 그라데이션 | `from-purple`, `from-indigo`, `bg-gradient`, `linear-gradient.*purple` |
| 2 | 3열 대칭 피처 그리드 | `grid-cols-3` + 내부 아이콘+제목+설명 반복 |
| 3 | 원형 배경 아이콘 | `rounded-full.*bg-` + `<svg` 또는 아이콘 컴포넌트 |
| 4 | 전부 가운데 정렬 | `text-center`가 3개 이상 연속 컨테이너에 적용 |
| 5 | 균일 둥근 모서리 | 같은 `rounded-*` 값이 카드/버튼/입력 모두에 적용 |
| 6 | 장식용 블롭/웨이브 SVG | `blob`, `wave`, `circle.*absolute`, 장식 목적 SVG |
| 7 | 과사용 폰트 | `font-family.*Inter`, `font-family.*Roboto` (프라이머리로 사용 시) |

**판정:** AI Slop 항목이 3개 이상 → P1, Hard Rejection 항목 발견 → P0

---

## Step 2.5: 영역별 0-10 채점

8+1개 영역을 각각 0-10으로 채점합니다.

**채점 기준:**
- **0-3**: 심각한 문제 다수 — 즉시 수정 필요
- **4-6**: 기본은 되지만 개선 필요
- **7-8**: 양호 — 마이너 이슈만 있음
- **9-10**: 우수 — 업계 수준 이상

**가중 총점:**

| 영역 | 가중치 |
|------|--------|
| 2-1. 다크/라이트 모드 | 10% |
| 2-2. 반응형 | 15% |
| 2-3. 접근성 | 15% |
| 2-4. 로딩 상태 | 10% |
| 2-5. 폼 UX | 10% |
| 2-6. 네비게이션 | 10% |
| 2-7. 타이포그래피 & 간격 | 15% |
| 2-8. 애니메이션 | 10% |
| 2-9. AI Slop | 5% |

**총점 → 등급:**

| 등급 | 점수 | 의미 |
|------|------|------|
| **A** | 9.0+ | 출시 가능, 업계 최고 수준 |
| **B** | 7.0-8.9 | 출시 가능, 소소한 개선 권장 |
| **C** | 5.0-6.9 | 출시 전 개선 필요 |
| **D** | 3.0-4.9 | 심각한 문제 — 대폭 수정 필요 |
| **F** | 0-2.9 | 출시 불가 |

**출력 형식:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UI/UX 감사 스코어카드

| 영역 | 점수 | 주요 이슈 |
|------|------|----------|
| 다크/라이트 모드 | 7/10 | 하드코딩 2건 |
| 반응형 | 5/10 | 브레이크포인트 누락 |
| 접근성 | 6/10 | alt 미작성 4건 |
| 로딩 상태 | 3/10 | Skeleton 없음 |
| 폼 UX | 8/10 | — |
| 네비게이션 | 9/10 | — |
| 타이포/간격 | 7/10 | 간격 불일관 |
| 애니메이션 | 6/10 | reduced-motion 미대응 |
| AI Slop | 8/10 | 3열 그리드 1건 |

총점: 6.4/10 (등급: C)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 3: 문제 분류 (P0~P3)

| 우선순위 | 기준 | 예시 |
|---------|------|------|
| **P0 (긴급)** | 사용 불가 또는 심각한 UX 결함 | 다크모드에서 글자 안 보임, 모바일에서 터치 안 됨 |
| **P1 (높음)** | 사용자 이탈에 영향 | 로딩 상태 없음, CTA 잘 안 보임, 폼 에러 피드백 없음 |
| **P2 (보통)** | 불편하지만 사용 가능 | 간격 불일관, 호버 상태 없음, 접근성 미흡 |
| **P3 (낮음)** | 있으면 좋은 개선 | 애니메이션 추가, 마이크로 인터랙션 |

---

## Step 4: 사용자 확인 후 수정

감사 결과를 보고하고 수정 범위를 확인합니다:

```
UI/UX 감사 완료

발견된 문제: {N}건
- P0 (긴급): {x}건
- P1 (높음): {y}건
- P2 (보통): {z}건
- P3 (낮음): {w}건

어떤 범위까지 수정할까요?
1. P0만 — 긴급한 것만 빠르게
2. P0 + P1 — 중요한 것까지 (권장)
3. 전부 — 모든 문제 수정
```

**수정 규칙:**
- 기존 코드 스타일/프레임워크에 맞춰 수정
- 관련 없는 코드는 건드리지 않음
- 한 파일씩 순차적으로 수정 (변경 추적 용이)

**공통 수정 패턴:**

| 문제 유형 | 수정 방법 |
|-----------|-----------|
| 하드코딩 색상 | CSS 변수 또는 시맨틱 토큰으로 변환 |
| 반응형 누락 | 모바일 퍼스트 브레이크포인트 추가 |
| alt 누락 | 컨텍스트에 맞는 alt 텍스트 작성 |
| 로딩 상태 없음 | Skeleton / Spinner / 로딩 UI 추가 |
| 포커스 아웃라인 제거 | `focus-visible:ring` 계열로 대체 |
| 터치 타겟 부족 | `min-h-[44px] min-w-[44px]` 적용 |

---

## Step 5: 수정 리포트

```
UI/UX 개선 완료

수정한 파일: {N}개
- P0: {x}건 수정
- P1: {y}건 수정
- P2: {z}건 수정

주요 변경:
| 파일 | 영역 | 변경 내용 |
|------|------|-----------|
| src/components/Header.tsx | 반응형 | 모바일 브레이크포인트 추가 |
| src/app/page.tsx | 접근성 | 이미지 alt 텍스트 추가 |
| ... | ... | ... |

남은 작업 (수동 확인 필요):
- ...
```

---

## 주의사항

- 수정 전 반드시 사용자 확인을 받습니다
- UI 라이브러리(DaisyUI, shadcn, MUI 등)에 맞는 수정 방법을 선택합니다
- 디자인 방향성 결정이 필요하면 `ui-ux-designer` 에이전트와 연계합니다
- 한 번에 너무 많이 바꾸지 않고 단계적으로 수정합니다

---

## 연관 리소스

| 리소스 | 역할 | 관계 |
|--------|------|------|
| `ui-ux-designer` (에이전트) | 디자인 조언, 피드백 | 설계 방향 → auditor가 점검 |
| `seo-audit` (스킬) | SEO 점검 | 릴리즈 전 SEO + UX 함께 점검 |
| `web-design-guidelines` (스킬) | 웹 디자인 원칙 | 감사 기준의 근거 |
