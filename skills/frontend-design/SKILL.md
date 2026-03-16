---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
license: Anthropic (https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design)
auto_apply: true
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design System First

Before making aesthetic choices, check if the project already has a design system:

1. `design-system.md` (젭마인 산출물) — 디자인 토큰, 색상, 타이포그래피, 톤/무드 정의
2. `DESIGN.md` (Stitch 산출물) — 디자인 DNA, 토큰, 컴포넌트 규칙
3. `tailwind.config.*` / `theme.ts` / CSS 변수 — 기존 테마 설정

**있으면**: 해당 디자인 시스템의 토큰(색상, 폰트, 간격)을 기반으로 아래 미학을 적용. 시스템의 톤/무드를 존중하되, 더 대담하게 표현.
**없으면**: 아래 Design Thinking으로 자유롭게 방향을 결정.

## Design Style Presets

프론트엔드 생성/재디자인 시 **사용자에게 디자인 스타일을 질문**합니다.

AskUserQuestion:

```
question: "어떤 느낌으로 만들까요?"
header: "디자인 스타일"
options:
  - label: "깔끔하게"
    description: "정돈된 기업 사이트, 안정적인 레이아웃"
  - label: "럭셔리하게"
    description: "여백 많고 프리미엄한 느낌, 고급 브랜드"
  - label: "대담하게"
    description: "비대칭, 애니메이션, 눈에 띄는 디자인"
  - label: "미니멀하게"
    description: "차분하고 절제된, 군더더기 없는"
  - label: "대시보드"
    description: "데이터 중심, 빽빽하고 효율적"
  - label: "매거진"
    description: "에디토리얼, 사진 중심, 읽는 재미"
  - label: "직접 설정"
    description: "VARIANCE/MOTION/DENSITY 숫자로 직접 조정"
```

### 프리셋 → 파라미터 매핑

| 프리셋 | VARIANCE | MOTION | DENSITY | 느낌 |
|--------|----------|--------|---------|------|
| **깔끔하게** | 3 | 3 | 5 | 정돈된 그리드, 최소 애니메이션 |
| **럭셔리하게** | 5 | 5 | 2 | 넉넉한 여백, 프리미엄 타이포 |
| **대담하게** | 8 | 7 | 5 | 비대칭 레이아웃, 스크롤 트리거 |
| **미니멀하게** | 4 | 2 | 3 | 절제된 색상, 여유 있는 간격 |
| **대시보드** | 2 | 3 | 8 | 촘촘한 데이터, 모노스페이스 |
| **매거진** | 7 | 5 | 3 | 오프셋 이미지, 타이포 중심 |

### Tunable Parameters (직접 설정 시)

```
DESIGN_VARIANCE: 1~10  (1=완벽한 대칭 ↔ 10=비대칭 실험적)
MOTION_INTENSITY: 1~10  (1=정적 ↔ 10=시네마틱 물리)
VISUAL_DENSITY: 1~10    (1=갤러리/여유 ↔ 10=대시보드/빽빽)
```

| 파라미터 | 1~3 | 4~7 | 8~10 |
|----------|-----|-----|------|
| **DESIGN_VARIANCE** | 센터 정렬, 대칭 그리드, 균일 패딩 | 오프셋 마진, 비대칭 비율, 좌측 정렬 헤더 | 매소닉, CSS Grid fr, 거대한 빈 공간 |
| **MOTION_INTENSITY** | CSS `:hover`/`:active`만 | `transition: all 0.3s cubic-bezier(0.16,1,0.3,1)`, 캐스케이드 | Framer Motion, 스크롤 트리거, 패럴랙스 |
| **VISUAL_DENSITY** | 여유 여백, 큰 섹션 간격, 럭셔리 | 일반 웹앱 간격 | 촘촘한 패딩, 1px 구분선, 숫자엔 모노스페이스 |

> Credits: Tunable parameters inspired by [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT)

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

## Banned Patterns (AI Slop 방지)

**Typography:**
- `Inter` 금지 (프리미엄 디자인) → `Geist`, `Outfit`, `Cabinet Grotesk`, `Satoshi` 사용
- 대시보드/소프트웨어 UI에 Serif 금지
- 과도한 H1 크기 금지

**Color:**
- "AI Purple/Blue" 미학 금지 — 보라색 글로우, 네온 그라데이션 절대 금지
- 순수 검정(#000000) 금지 → Zinc-950 또는 Charcoal 사용
- 채도 80% 초과 액센트 금지
- 그라데이션 텍스트 남용 금지
- 액센트 색상은 **최대 1개**, 나머지는 Zinc/Slate 뉴트럴

**Layout:**
- `DESIGN_VARIANCE > 4`일 때 센터 정렬 Hero 섹션 금지 → 비대칭 강제
- 3열 카드 레이아웃 반복 금지 → 지그재그, 비대칭 그리드, 가로 스크롤 활용
- `h-screen` 금지 → `min-h-[100dvh]` 사용 (모바일 레이아웃 점프 방지)
- `VISUAL_DENSITY > 7`일 때 카드 남용 금지 → `border-t`, `divide-y`, 여백으로 대체

**Motion:**
- `transform`과 `opacity`만 애니메이트 — `top`, `left`, `width`, `height` 애니메이트 금지
- Spring Physics 기본: `type: "spring", stiffness: 100, damping: 20`
- 스크롤 컨테이너에 grain/noise 필터 금지 (성능)
- `z-index` 남발 금지 — 시스템 레이어(navbar, modal, overlay)에만

**Content (스타트업 슬럽 방지):**
- "John Doe", "Sarah Chan" 같은 제네릭 이름 금지
- 99.99%, 50% 같은 예측 가능한 숫자 금지
- "Elevate", "Seamless", "Unleash", "Next-Gen" 같은 AI 카피 금지
- 이모지 금지 → Radix Icons, Phosphor Icons, 또는 커스텀 SVG 사용

**Output 완성도:**
- placeholder 코드 금지 (`// TODO`, `...`, `/* implement later */`)
- 모든 상태 필수 구현: Loading, Empty, Error, 성공
- `:active` 상태에 `-translate-y-[1px]` 또는 `scale-[0.98]`로 촉각 피드백
- `shadcn/ui`는 커스터마이징 후에만 사용 (기본 상태 그대로 사용 금지)

NEVER use generic AI-generated aesthetics. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code. Minimalist designs need restraint and precision. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back.

## Design Skills Workflow (디자인 스킬 조합)

```
설계 단계 ──────────────────────────────────────────────
  /design-system-starter    → 디자인 토큰, 색상, 폰트, 간격 정의
  젭마인 Step 8             → design-system.md 자동 생성
  /stitch-design-md         → Stitch 프로젝트 DESIGN.md 생성

구현 단계 ──────────────────────────────────────────────
  frontend-design (이 스킬) → auto_apply로 미학 자동 적용
  /stitch-loop              → Stitch MCP로 멀티페이지 생성
  /stitch-react             → HTML → React 변환

리뷰 단계 ──────────────────────────────────────────────
  ui-ux-designer 에이전트   → "이 디자인 괜찮아?" 비평/조언
  /ui-ux-auditor            → 다크모드, 반응형, 접근성 등 8영역 감사
  /web-design-guidelines    → Web Interface Guidelines 준수 체크
```

**조합 예시:**
1. `/design-system-starter` → design-system.md 생성
2. 이 스킬(auto_apply)이 design-system.md를 감지 → 토큰 기반 미학 적용
3. 구현 완료 후 `/ui-ux-auditor` → 8영역 감사로 품질 검증

## Usage Patterns (3단계 활용법)

### 1단계: 기본 생성
먼저 기능에 집중하여 페이지/컴포넌트를 만든다. 디자인은 신경쓰지 않는다.

### 2단계: 스킬 적용 (레퍼런스 없이)
"use the frontend design skill to improve the design" — 이 스킬의 미학 가이드라인만으로 재디자인.

### 3단계: 레퍼런스 참조 재디자인 (최고 품질)
Dribbble, Behance, Awwwards 등에서 원하는 스타일의 스크린샷을 찾아 첨부:
"use the frontend design skill to improve the design following the attached screenshot"

> **3단계가 가장 효과적.** 레퍼런스 이미지가 있으면 톤/색상/레이아웃을 정확하게 매칭할 수 있다.
