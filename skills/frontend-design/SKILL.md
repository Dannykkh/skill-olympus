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

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

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
