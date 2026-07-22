# Code Scaffolds — 렌더 가능한 시작 코드

> `layout-block-anatomy.md`가 "어떤 요소가 있어야 하는지"를 **산문**으로 정의한다면,
> 이 디렉터리는 그 계약을 **실제로 브라우저에서 렌더되는 코드**로 내린 것입니다.
> Vercel v0/shadcn 레지스트리가 프롬프트만이 아니라 실제 설치 가능한 컴포넌트 코드를
> 모델의 근거로 쓰는 것과 같은 원리 — 프롬프트/스펙만으로 매번 새로 상상해서 짜는 것보다,
> 이미 구조가 맞는 코드에서 시작해 리스킨하는 쪽이 anatomy 누락 위험이 낮습니다.
>
> Credits: 구조는 [anelkabag/bag-ui](https://github.com/anelkabag/bag-ui) (MIT)의 실제 프로덕션
> 컴포넌트(hero1.tsx/navbar1.tsx/footer1.tsx/pricing1.tsx)를 읽고 검증한 뒤 **새로 작성**했습니다.
> bag-ui의 브랜드 카피·외부 이미지 URL·Framer Motion 안무는 프로젝트마다 다른 값(COPY/MOTION_INTENSITY)이라
> 그대로 가져오지 않고, DESIGN.md 토큰으로 리스킨 가능한 형태로 다시 짰습니다 — 코드 포크가 아니라
> "검증된 구조를 확인하고 처음부터 다시 쓴" 파생입니다.

## 원칙

1. **프레임워크 무관**: 순수 HTML + CSS 커스텀 프로퍼티. React/Vue/Svelte/Astro 어디든 그대로 마크업만
   옮기면 됩니다. JSX 변환이 필요하면 `className`→`class`, 반복 목록만 `.map()`으로 바꾸면 끝.
2. **DESIGN.md 토큰 바인딩**: 색·폰트·라운드는 전부 `var(--color-*)`/`var(--font-*)`/`var(--radius-*)`.
   실제 프로젝트에 적용할 때는 `:root`에 DESIGN.md 값을 채워 넣기만 하면 리스킨됩니다 — 아래 매핑표 참조.
3. **모션 없음(기본)**: 스캐폴드 자체엔 애니메이션을 넣지 않습니다. MOTION_INTENSITY는 프로젝트마다 다르므로,
   필요하면 [`../technique-recipes.md`](../technique-recipes.md)의 레시피(§6 Staggered Reveal, §7 Masked Reveal 등)를 얹으세요.
4. **카피는 명시적 placeholder**: 실제 렌더링되는 문구는 `{{headline}}`처럼 이중 중괄호로 표시해 "이건 채워야 할
   자리"임을 명확히 합니다. bag-ui의 실제 카피를 그대로 쓰지 않습니다.
5. **anatomy 계약 100% 커버**: 각 스캐폴드는 `layout-block-anatomy.md`의 해당 블록 §가 요구하는 요소를
   전부 포함합니다. 요소를 빼는 방향으로 커스터마이즈하지 마세요(추가는 자유).

## DESIGN.md → CSS 변수 매핑

```css
:root {
  --color-primary: {DESIGN.md colors.primary};
  --color-neutral: {DESIGN.md colors.neutral};
  --color-accent: {DESIGN.md colors.accent};
  --color-on-primary: {DESIGN.md colors.on-primary};
  --color-on-accent: {DESIGN.md colors.on-accent};
  --color-copy: {DESIGN.md colors.copy 또는 on-primary의 저채도 변형};
  --color-line: {구분선 — on-primary의 12~16% 알파};
  --font-heading: {DESIGN.md typography.h1.fontFamily};
  --font-body: {DESIGN.md typography.body-md.fontFamily};
  --font-mono: {DESIGN.md typography.label-mono.fontFamily, 없으면 --font-body};
  --radius-sm: {DESIGN.md rounded.sm};
  --radius-md: {DESIGN.md rounded.md};
  --radius-lg: {DESIGN.md rounded.lg};
}
```

## 카탈로그

| 파일 | 블록 | anatomy 출처 |
|------|------|--------------|
| [hero.html](hero.html) | Hero (eyebrow/헤드라인/서브/CTA쌍/소셜프루프/미디어) | layout-block-anatomy.md § Hero |
| [navbar.html](navbar.html) | Navbar (로고/링크/CTA/모바일 햄버거) | layout-block-anatomy.md § Navbar |
| [footer.html](footer.html) | Footer (브랜드 칼럼/링크 3칼럼/소셜/저작권) | layout-block-anatomy.md § Footer |
| [pricing.html](pricing.html) | Pricing (3카드, 강조 1개) | layout-block-anatomy.md § Pricing |

30종 전부가 아니라 4종만 우선 커버합니다(자주 쓰이는 순서). 나머지 블록은 여전히
`layout-block-anatomy.md`의 산문 스펙으로 구현하고, 사용 빈도가 확인되면 이 목록에 추가합니다.

## 사용법

1. Phase 4(레이아웃 청사진) 완료 후, 청사진의 블록이 이 카탈로그에 있으면 **처음부터 새로 짜지 말고 이 파일을 시작점으로** 복사.
2. `:root`의 CSS 변수를 프로젝트 DESIGN.md 값으로 채움.
3. `{{placeholder}}` 카피를 실제 문구로 교체 (COPY 필드 — placeholder 그대로 렌더 금지).
4. 레시피 선택했으면 style-recipes의 재질/패턴을 얹고, 방향 카드 골랐으면 MOTION_INTENSITY만큼 technique-recipes 모션 추가.
5. anatomy 요소를 빼지 않았는지 최종 확인 (layout-block-anatomy.md 해당 § 대조).
