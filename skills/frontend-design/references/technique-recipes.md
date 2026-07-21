# Technique Recipes — 복붙 가능한 구현 디테일 레시피

> 구현(Phase 3) 중 특정 디테일이 필요할 때 해당 섹션만 참조하는 레시피집입니다.
> 값(그림자·blur 단계·duration·easing·stagger)은 검증된 기본값이므로 그대로 쓰고,
> 색상만 프로젝트 DESIGN.md 토큰으로 치환하세요.
>
> Credits: [MengTo/Skills](https://github.com/MengTo/Skills) (MIT)에서 이식·각색.

## 목차

| # | 레시피 | 용도 |
|---|--------|------|
| 1 | 그림자 3단계 | 카드/패널/히어로의 정제된 중립 그림자 |
| 2 | Progressive Blur | 뷰포트 상/하단 단계별 blur 오버레이 |
| 3 | Border Gradient | 프리미엄 엣지 하이라이트 (glass/pricing/hero) |
| 4 | Alpha Masking 엣지 페이드 | 마퀴/캐러셀/리스트 가장자리 페이드 |
| 5 | Container Lines | 컨테이너 폭 가이드라인 + 코너 스퀘어 |
| 6 | Staggered Word Reveal | 단어 단위 에디토리얼 텍스트 등장 (JS만) |
| 7 | Masked Reveal (GSAP) | 마스크 뚫고 올라오는 텍스트 (ScrollTrigger) |
| 8 | Marquee Loop | 무한 로고/태그 루프 |
| 9 | GSAP + Lenis 시네마틱 모션 시스템 | 프리미엄 사이트 전체 모션 언어 |
| 10 | Accessible Loading State | 지연 시간에 맞는 로더·진행 상태 + 접근성 |
| 11 | Atmosphere: Grain / Mesh / Emphasis Break | flat 패널의 "AI적 딱딱함" 방지 — 질감 1곳 + 반복 요소 강조 이탈 |

---

## 1. 그림자 3단계 (Beautiful Shadows)

Tailwind 기본 `shadow-md/lg/xl` 대신 사용하는 레이어드 중립 그림자. 색 틴트 금지, 한 컴포넌트에 한 단계만.

**sm — 컴팩트 카드, 폼 컨트롤, pill:**

```txt
shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]
```

**md — 카드, 패널, 팝오버 (기본 elevated):**

```txt
shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_1px_-0.5px_rgba(0,0,0,0.06),0px_3px_3px_-1.5px_rgba(0,0,0,0.06),_0px_6px_6px_-3px_rgba(0,0,0,0.06),0px_12px_12px_-6px_rgba(0,0,0,0.06),0px_24px_24px_-12px_rgba(0,0,0,0.06)]
```

**lg — 히어로 미디어, 피처 콜아웃, 모달급:**

```txt
shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]
```

**규칙**: 기본 Tailwind 그림자 스케일과 혼용 금지 · lg를 촘촘한 리스트/작은 컨트롤에 금지 · 한 요소에 그림자 유틸 중첩 금지.

---

## 2. Progressive Blur (단계별 blur 오버레이)

뷰포트 가장자리에서 시작하는 6단계 backdrop-filter. 상단 버전이며, 하단은 `inset`을 `auto 0 0 0`으로, mask의 `to top`을 `to bottom`으로 뒤집으면 됩니다.

```html
<div class="gradient-blur">
  <div></div><div></div><div></div><div></div><div></div><div></div>
</div>
<style>
  .gradient-blur {
    position: fixed; z-index: 5; inset: 0 0 auto 0;
    height: 12%; pointer-events: none;
  }
  .gradient-blur > div, .gradient-blur::before, .gradient-blur::after {
    position: absolute; inset: 0;
  }
  .gradient-blur::before {
    content: ""; z-index: 1; backdrop-filter: blur(0.5px);
    mask: linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 12.5%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 37.5%);
  }
  .gradient-blur > div:nth-of-type(1) {
    z-index: 2; backdrop-filter: blur(1px);
    mask: linear-gradient(to top, rgba(0,0,0,0) 12.5%, rgba(0,0,0,1) 25%, rgba(0,0,0,1) 37.5%, rgba(0,0,0,0) 50%);
  }
  .gradient-blur > div:nth-of-type(2) {
    z-index: 3; backdrop-filter: blur(2px);
    mask: linear-gradient(to top, rgba(0,0,0,0) 25%, rgba(0,0,0,1) 37.5%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 62.5%);
  }
  .gradient-blur > div:nth-of-type(3) {
    z-index: 4; backdrop-filter: blur(4px);
    mask: linear-gradient(to top, rgba(0,0,0,0) 37.5%, rgba(0,0,0,1) 50%, rgba(0,0,0,1) 62.5%, rgba(0,0,0,0) 75%);
  }
  .gradient-blur > div:nth-of-type(4) {
    z-index: 5; backdrop-filter: blur(8px);
    mask: linear-gradient(to top, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 62.5%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 87.5%);
  }
  .gradient-blur > div:nth-of-type(5) {
    z-index: 6; backdrop-filter: blur(16px);
    mask: linear-gradient(to top, rgba(0,0,0,0) 62.5%, rgba(0,0,0,1) 75%, rgba(0,0,0,1) 87.5%, rgba(0,0,0,0) 100%);
  }
  .gradient-blur > div:nth-of-type(6) {
    z-index: 7; backdrop-filter: blur(32px);
    mask: linear-gradient(to top, rgba(0,0,0,0) 75%, rgba(0,0,0,1) 87.5%, rgba(0,0,0,1) 100%);
  }
  .gradient-blur::after {
    content: ""; z-index: 8; backdrop-filter: blur(64px);
    mask: linear-gradient(to top, rgba(0,0,0,0) 87.5%, rgba(0,0,0,1) 100%);
  }
</style>
```

**조절**: 높이 `12%`(상단 내비) ~ `65%`(하단 페이드) · blur 강도 0.5→64px · 레이어 수로 부드러움 조절.
**함정**: backdrop-filter는 뒤에 콘텐츠가 있어야 동작 · 고강도 blur는 GPU 부담(저사양은 레이어 축소) · `pointer-events: none` 유지 필수.

---

## 3. Border Gradient (프리미엄 엣지)

**기본값**: 두께 1px(대형 히어로/active만 2px) · 각도 `135deg`/`160deg` · 스톱은 중립 하이라이트 + 브랜드 액센트 1 + 중립 페이드 · 대부분의 스톱 opacity 0.4 미만.

**단순 패턴** (표면이 단색/반투명일 때):

```css
.gradient-border {
  --surface: rgba(10, 14, 24, 0.72);
  --border-a: rgba(255, 255, 255, 0.34);
  --border-b: rgba(125, 92, 255, 0.36);  /* 브랜드 액센트로 치환 */
  --border-c: rgba(255, 255, 255, 0.08);
  border: 1px solid transparent;
  border-radius: 20px;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    linear-gradient(135deg, var(--border-a), var(--border-b), var(--border-c)) border-box;
}
```

**마스크 패턴** (표면에 이미 복잡한 배경이 있을 때):

```css
.gradient-border-mask { position: relative; border-radius: 20px; }
.gradient-border-mask::before {
  content: ""; position: absolute; inset: 0;
  border-radius: inherit; padding: 1px;
  background: linear-gradient(145deg,
    rgba(255,255,255,0.34), rgba(125,92,255,0.36) 45%, rgba(255,255,255,0.08));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

**규칙**: 한 계층 레벨에만 적용(primary 카드, active 탭, 선택된 플랜, 히어로 패널) · 무지개/풀 채도 네온/기본 애니메이션 그라데이션 금지 · 보더는 콘텐츠보다 조용하게 · 기존 `border-color`와 이중 보더 안 나는지, radius 일치하는지 확인 · 라이트/다크 테마에서 alpha 별도 점검.

---

## 4. Alpha Masking 엣지 페이드

마퀴·가로 스크롤·긴 리스트의 가장자리를 자연스럽게 지우는 마스크. Safari용 `-webkit-` 병기 필수.

```css
/* 가로 (좌/우 페이드) */
mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
-webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);

/* 세로 (상/하 페이드) */
mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
-webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
```

**조절**: 방향(`to right/left/bottom/top`) · 페이드 깊이(`15%`/`85%` 스톱) · `transparent`를 `rgba(0,0,0,0.2)`로 바꾸면 더 부드러운 페이드.

---

## 5. Container Lines (구조 가이드라인 + 코너 스퀘어)

컨테이너 폭을 드러내는 세로 가이드 + 교차점 미니 스퀘어. 페이지가 느슨할 때 구조적 긴장감을 줍니다.

```css
:root {
  --container-max: 1120px;
  --container-pad: clamp(20px, 4vw, 48px);
  --line-color: rgba(24, 24, 27, 0.14);   /* 다크 테마: 밝은색 low-opacity로 치환 */
  --line-strong: rgba(24, 24, 27, 0.28);
  --corner-size: 6px;
}
.container-lines { position: relative; isolation: isolate; }
.container-lines::before, .container-lines::after {
  content: ""; position: absolute; top: 0; bottom: 0; z-index: -1;
  width: 1px; background: var(--line-color); pointer-events: none;
}
.container-lines::before { left: max(var(--container-pad), calc((100vw - var(--container-max)) / 2)); }
.container-lines::after  { right: max(var(--container-pad), calc((100vw - var(--container-max)) / 2)); }

.corner-squares { position: relative; }
.corner-squares > .corner {
  position: absolute; width: var(--corner-size); height: var(--corner-size);
  background: var(--line-strong); pointer-events: none;
}
.corner.top-left { top: 0; left: 0; transform: translate(-50%, -50%); }
.corner.top-right { top: 0; right: 0; transform: translate(50%, -50%); }
.corner.bottom-left { bottom: 0; left: 0; transform: translate(-50%, 50%); }
.corner.bottom-right { right: 0; bottom: 0; transform: translate(50%, 50%); }

/* 콘텐츠 컨테이너는 라인과 같은 폭 공유 */
.content-container {
  width: min(100% - (var(--container-pad) * 2), var(--container-max));
  margin-inline: auto;
}
```

**규칙**: 라인은 장식이 아니라 구조 — 페이지/주요 섹션 레벨에만 · 스퀘어는 4~8px · 섹션마다 폭 바꾸지 말 것 · 클릭/호버/선택 안 막는지 확인.

---

## 6. Staggered Word Reveal (라이브러리 없이)

단어 단위 페이드+상승 등장. GSAP 불필요, IntersectionObserver 기반, 1회만 재생.

**모션 기본값**: `opacity 0→1`, `translateY(20px)→0`, duration `0.8s`, ease `cubic-bezier(0.16, 1, 0.3, 1)`, stagger `0.07s`(0.06~0.08), threshold `0.2`.

```html
<h1 class="word-reveal" data-word-reveal>차분하고 시네마틱하게 살아있는 인터페이스.</h1>
```

```css
.word-reveal { visibility: visible; }
html.js .word-reveal[data-word-reveal]:not(.is-ready) { opacity: 0; }
.word-reveal__word {
  display: inline-block; opacity: 0; transform: translate3d(0, 20px, 0);
  transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
  transition-delay: calc(var(--word-index) * 0.07s);
  will-change: opacity, transform;
}
.word-reveal.is-visible .word-reveal__word { opacity: 1; transform: translate3d(0, 0, 0); }
@media (prefers-reduced-motion: reduce) {
  html.js .word-reveal[data-word-reveal]:not(.is-ready), .word-reveal__word {
    opacity: 1; transform: none; transition: none;
  }
}
```

```js
document.documentElement.classList.add("js");

function splitWordReveal(element) {
  if (element.dataset.wordRevealReady === "true") return;
  const text = element.textContent || "";
  const parts = text.split(/(\s+)/);
  let wordIndex = 0;
  element.textContent = "";
  element.setAttribute("aria-label", text.trim());
  parts.forEach((part) => {
    if (!part.trim()) { element.appendChild(document.createTextNode(part)); return; }
    const word = document.createElement("span");
    word.className = "word-reveal__word";
    word.setAttribute("aria-hidden", "true");
    word.style.setProperty("--word-index", wordIndex);
    word.textContent = part;
    element.appendChild(word);
    wordIndex += 1;
  });
  element.dataset.wordRevealReady = "true";
  element.classList.add("is-ready");
}

function initWordReveals(selector = "[data-word-reveal]") {
  const elements = Array.from(document.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("is-ready", "is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, io) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -10% 0px" });
  elements.forEach((el) => { splitWordReveal(el); observer.observe(el); });
}

document.addEventListener("DOMContentLoaded", () => initWordReveals());
```

**프레임워크 이식 토큰**: Framer Motion — `y: 20, opacity: 0`, duration `0.8`, ease `[0.16,1,0.3,1]`, stagger `0.06~0.08`, `once: true` / GSAP — `fromTo(words, {y:20,opacity:0}, {y:0,opacity:1,duration:0.8,ease:"expo.out",stagger:0.07})`.
**규칙**: 짧은 헤드라인/인용에만(긴 문단 금지) · 글자 말고 단어 단위 · 링크/버튼 포함 텍스트 분할 금지 · 줄바꿈이 중요하면 웹폰트 로드 후 초기화. **한글 주의**: 한글은 공백 분리 단어가 길어질 수 있으니 조사 단위로 어색하면 구(句) 단위 `<span>` 수동 분할.

---

## 7. Masked Reveal (GSAP ScrollTrigger)

overflow 마스크를 뚫고 단어가 올라오는 프리미엄 리빌. 유료 SplitText 불필요.

**모션 기본값**: trigger `top 82%` · duration `0.7~0.9s` · stagger `0.025~0.045s`(기본 0.035) · offset `yPercent: 110→0` · ease `power3.out`/`expo.out` · 1회만.

```css
.masked-reveal { visibility: visible; }
html.js .masked-reveal[data-masked-reveal] { visibility: hidden; }
html.js .masked-reveal.is-split { visibility: visible; }
.masked-reveal .word-mask { display: inline-block; overflow: hidden; vertical-align: top; }
.masked-reveal .word { display: inline-block; transform: translateY(110%); will-change: transform; }
@media (prefers-reduced-motion: reduce) {
  html.js .masked-reveal[data-masked-reveal] { visibility: visible; }
  .masked-reveal .word { transform: none; }
}
```

```js
document.documentElement.classList.add("js");
gsap.registerPlugin(ScrollTrigger);

function splitMaskedReveal(element) {
  if (element.dataset.maskedRevealReady === "true") return;
  const text = element.textContent.trim();
  element.setAttribute("aria-label", text);
  element.innerHTML = text.split(/(\s+)/).map((part) => {
    if (!part.trim()) return part;
    const safe = part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<span class="word-mask" aria-hidden="true"><span class="word">${safe}</span></span>`;
  }).join("");
  element.dataset.maskedRevealReady = "true";
  element.classList.add("is-split");
}

function initMaskedReveals(selector = "[data-masked-reveal]") {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll(selector).forEach((element) => {
    splitMaskedReveal(element);
    const words = element.querySelectorAll(".word");
    gsap.set(element, { autoAlpha: 1 });
    gsap.fromTo(words, { yPercent: 110 }, {
      yPercent: 0, duration: 0.8, ease: "power3.out", stagger: 0.035,
      scrollTrigger: { trigger: element, start: "top 82%", once: true },
    });
  });
}
initMaskedReveals();
```

**React 클린업**: `useLayoutEffect`에서 `gsap.context(() => initMaskedReveals(), rootRef)` 후 `return () => ctx.revert()`.
**규칙**: 늦게 로드되는 이미지/레이아웃 시프트 후 `ScrollTrigger.refresh()` · 스크린리더는 `aria-label`로 원문 접근 · SPA 라우트 전환 시 ScrollTrigger 정리.

---

## 8. Marquee Loop (무한 루프)

1. 아이템 시퀀스를 복제해 끝과 시작이 정확히 맞물리게 한다.
2. 트랙을 linear로 `translateX(0 → -50%)` 애니메이트.
3. 아이템 폭을 고정해 루프 점프 방지.
4. 섹션 경계에서는 §4 Alpha Masking으로 가장자리 페이드.
5. hover 일시정지는 상호작용이 유용할 때만.
6. `prefers-reduced-motion`: 정적 랩핑 또는 매우 느린 이동.

**금지**: 사용자가 꼼꼼히 읽어야 하는 고유 콘텐츠를 마퀴에 넣지 말 것 · 움직이는 모든 아이템에 무거운 그림자/필터 금지.

---

## 9. GSAP + Lenis 시네마틱 모션 시스템

럭셔리 에디토리얼/스튜디오 포트폴리오급 사이트에서 스크롤·리빌·호버·커서를 하나의 모션 언어로 묶을 때. 개별 효과 하나가 필요하면 §6~7로 충분합니다.

**Base Tokens (전체 시스템의 기준값):**

| 항목 | 값 |
|------|-----|
| Eases | `power3.out`, `power4.out`, `expo.out` |
| Scroll scrub | `0.8` ~ `1.4` (시네마틱 딜레이) |
| Reveals | `0.75s` ~ `1.1s` |
| Hover | `0.35s` ~ `0.6s` |
| Cursor lag | `0.25s` ~ `0.45s` |
| Text stagger | 단어 `0.035~0.07s`, 줄 `0.08~0.14s` |
| Card stagger | `0.06s` ~ `0.1s` |
| Reveal trigger | `start: "top 82%"` |
| Pin handoff | `anticipatePin: 1` |

**셋업** (Lenis RAF를 GSAP ticker로 구동해 ScrollTrigger와 동기화):

```js
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: "power3.out", duration: 0.85 });

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lenis;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.08, smoothWheel: true, wheelMultiplier: 0.9, anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
window.addEventListener("load", () => ScrollTrigger.refresh());
```

**리빌 프리셋 맵** (data-attribute 마크업 API로 재사용):

```js
const revealPresets = {
  "fade-up":   { from: { y: 32, autoAlpha: 0 }, to: { y: 0, autoAlpha: 1 } },
  "blur-in":   { from: { y: 18, autoAlpha: 0, filter: "blur(10px)" }, to: { y: 0, autoAlpha: 1, filter: "blur(0px)" } },
  "scale":     { from: { scale: 0.96, autoAlpha: 0 }, to: { scale: 1, autoAlpha: 1 } },
  "slide-left":  { from: { x: 48, autoAlpha: 0 }, to: { x: 0, autoAlpha: 1 } },
  "slide-right": { from: { x: -48, autoAlpha: 0 }, to: { x: 0, autoAlpha: 1 } },
};
// duration 0.9~0.95, ease power4.out, 그룹 stagger 0.075, start "top 82%", once: true
```

**패럴랙스** (극적 이동 대신 속도차):

```js
gsap.utils.toArray("[data-parallax-image], [data-parallax-layer]").forEach((layer) => {
  const speed = Number(layer.dataset.parallaxSpeed || 0.18);
  const section = layer.closest("[data-parallax-section]") || layer;
  gsap.to(layer, {
    y: () => window.innerHeight * speed * -1, ease: "none",
    scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1.2, invalidateOnRefresh: true },
  });
});
```

**마그네틱 호버** (`quickTo`로 이벤트마다 tween 재생성 방지):

```js
gsap.utils.toArray("[data-magnetic]").forEach((element) => {
  const strength = Number(element.dataset.magnetic || 0.18);
  const xTo = gsap.quickTo(element, "x", { duration: 0.45, ease: "power3.out" });
  const yTo = gsap.quickTo(element, "y", { duration: 0.45, ease: "power3.out" });
  element.addEventListener("pointermove", (event) => {
    const rect = element.getBoundingClientRect();
    xTo((event.clientX - rect.left - rect.width / 2) * strength);
    yTo((event.clientY - rect.top - rect.height / 2) * strength);
  });
  element.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
});
// 터치 기기 제외: if (window.matchMedia("(pointer: coarse)").matches) return;
```

**호버 레시피 기본값**: 마그네틱 버튼 scale 1.03 이하 · 카드 rotateX/Y 4deg 이하 · 이미지 줌 scale 1→1.06, 0.7s, power3.out · 화살표 이동 x 0→6px · 방향성 호버 이동 16px 이하.

**안무(Choreography) 규칙**:
- 히어로: 배경/미디어 → 헤드라인 줄 → 서포트 카피 → CTA 순.
- 섹션: 라벨 → 헤딩 → 미디어 → 카드/디테일 순.
- 핀 씬: 뷰포트당 아이디어 1개. 동시 트랜스폼 중첩 금지.
- 패럴랙스: 배경 느리게, 전경 약간 빠르게, 텍스트는 거의 고정.

**성능 규칙**:
- `transform`/`opacity`/짧은 `clip-path`만 애니메이트.
- `filter: blur()`는 텍스트나 작은 요소에만.
- `will-change`는 실제로 움직이는 요소에만.
- 이미지/폰트/레이아웃 시프트 후 `ScrollTrigger.refresh()`.
- React/SPA: `gsap.context()` + `ctx.revert()`, 라우트 전환 전 ScrollTrigger kill.

**QA 체크**: JS 꺼도 콘텐츠 보임 · reduced-motion에서 스무스 스크롤 하이재킹 없음 · 리빌은 1회 · 핀 섹션이 다음 섹션 안 덮음 · 터치에서 호버/커서 비활성 · 장식 모션을 다 빼도 페이지가 읽힘.

---

## 10. Accessible Loading State

로더는 장식이 아니라 기다림의 이유와 현재 상태를 전달하는 UI입니다. 2026-07-17에
[Colorion CSS Loaders](https://cssloaders.colorion.co/)의 공개 99개 pure-CSS 로더와 프롬프트
구조를 조사해, 단일 색 토큰·최소 마크업·reduced-motion 계약을 일반화했습니다. 아래 코드는
외부 스니펫을 복제하지 않은 프로젝트용 기본 구현입니다.

### 지연 시간별 선택

| 예상 시간 | 표현 |
|---|---|
| 0~300ms | 표시하지 않음 — 짧은 응답의 깜빡임 방지 |
| 300ms~2s | 작은 spinner + 짧은 동사형 라벨 |
| 2~10s | 콘텐츠 skeleton 또는 문맥형 라벨 |
| 측정 가능 | determinate progress + 현재 단계 |
| 10s 이상 | 단계 목록/로그 + 취소·백그라운드 실행 |

---

## 11. Atmosphere: Grain / Mesh / Emphasis Break

> **왜 이 §가 있는가**: SKILL.md Design Thinking은 "gradient mesh, noise texture, grain overlay로
> atmosphere를 만들라"고 지시하지만, 그림자·blur·보더와 달리 **검증된 값이 없어서 구현에서
> 가장 먼저 생략되는 항목**이었습니다(2026-07-20 확인). 결과는 규칙(대비·색상 다양성·금지 폰트)을
> 다 지켜도 "완전히 flat한 패널 + 완벽하게 균일한 반복 그리드"가 남는 것 — 이것이 사용자가
> 지적하는 "디자인적이지 않고 딱딱한 AI적 느낌"의 실체입니다. 색·폰트가 아니라 **질감의 부재와
> 반복의 무결절성**이 원인.

### 11-A. 그레인 오버레이 (CSS-only, 정적)

JS/이미지 자산 없이 SVG `feTurbulence`를 data URI로 인라인. 텍스처 1개 시그니처 장면에만
(motion-first playbook: "핵심 장면 1곳만 재질 언어 적용").

```css
.grain-surface {
  position: relative;
  isolation: isolate;
}
.grain-surface::after {
  content: "";
  position: absolute; inset: 0;
  pointer-events: none;
  opacity: 0.05; /* 0.03~0.07 — 이 이상은 무아레/성능 부담 */
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 120px 120px;
}
```

- GPU 부담 없음(정적 background-image, 애니메이트 안 함). 스크롤 컨테이너에 노이즈 필터 애니메이션 금지(Banned Patterns 기존 규칙과 동일 이유).
- 다크 배경엔 `mix-blend-mode: overlay`, 라이트 배경엔 `multiply`로 톤 유지.

### 11-B. 절제된 그라데이션 메시 (색상 침범 없이)

DESIGN.md 지배색 위에 **같은 hue family** 내에서만 명도 변주 — 새 색 발명이나 보라/파랑 디폴트 금지.

```css
.mesh-surface {
  background:
    radial-gradient(ellipse 60% 50% at 15% 0%, color-mix(in oklch, var(--accent) 14%, transparent), transparent 70%),
    radial-gradient(ellipse 50% 40% at 100% 100%, color-mix(in oklch, var(--accent) 8%, transparent), transparent 70%),
    var(--bg);
}
```

- 액센트 색만 극저채도로 확산 — "새 색"이 아니라 기존 토큰의 확장이므로 lint orphaned-tokens 안 걸림.
- 적용 면적은 히어로 배경 1곳. 카드마다 반복하면 §요약의 "장식 효과 예산" 초과.

### 11-C. 반복 요소 강조 이탈 (Emphasis Break)

`layout-block-anatomy.md`의 pricing 강조 카드 1개 규칙을 **모든 반복 블록**으로 일반화합니다.
동일 anatomy를 가진 행/카드가 3개 이상 반복되면, 그중 **정확히 1개**를 메시지상 근거 있는
이유로 이탈시킵니다(크기·배경·타이포 중 1축). 무근거 랜덤 강조 금지 — "이게 왜 다른지"를
카피나 제품 사실로 설명 가능해야 합니다.

```
예: 기능 목록 6행 중 "핵심/대표" 1개만 —
  - 배경을 surface 토큰으로 채우거나
  - 타이포를 1단계 키우거나
  - 카운터를 액센트 색으로
근거 예시: "이 항목이 나머지를 대체할 수 있는 all-in-one이라서" (실제 제품 사실)
```

이 규칙은 잉크 위계 3단계(공통 문법 #1)나 반복 요소 내부 구조 통일(공통 문법 #5)과 충돌하지
않습니다 — 내부 anatomy는 동일하게 유지하되, 딱 1개 행에만 강조 축 1개를 적용합니다.

### 11-D. 지속 비대칭 (Sustained Variance)

히어로에서만 비대칭 그리드를 쓰고 이후 섹션이 전부 균등 컬럼(예: `repeat(4, 1fr)`)으로
복귀하면, VARIANCE를 한 번 쓰고 포기한 것으로 읽힙니다. 히어로에서 확립한 그리드 비율
(예: 7:1:4)을 **최소 1개 이상의 후속 섹션에서 폭이 다른 컬럼으로 재사용**해 우연이 아니라
시스템임을 보입니다. 균등 그리드가 필요한 곳(Stats처럼 병렬 비교가 목적)은 컬럼 폭 대신
11-C의 강조 이탈로 리듬을 만듭니다.

### 11-E. 지루함 테스트 (Boring Test)

구현 직후 자가 점검: **레이아웃에서 제품명·카피만 다른 걸로 바꿔도 이 구조가 다른 SaaS
페이지에 그대로 쓰일 수 있는가?** 그렇다면 팔레트·폰트가 아무리 달라도 구조 자체가
제네릭입니다. 통과 기준은 최소 1개 섹션에 **그 제품이 아니면 나올 수 없는 근거 기반 배치**
(11-C 강조 이탈, 도메인 특화 시각화, 제품 사실을 반영한 리듬 변화)가 있는 것.

### Markup

```html
<section class="loading-region" aria-busy="true" aria-label="검색 결과">
  <div class="loading-state" role="status" aria-live="polite">
    <span class="loading-state__spinner" aria-hidden="true"></span>
    <span>검색 결과를 불러오는 중</span>
  </div>
</section>
```

### CSS

```css
.loading-state {
  --loader-size: 1.25rem;
  --loader-ink: currentColor;
  --loader-duration: 760ms;
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--text-muted);
}

.loading-state__spinner {
  inline-size: var(--loader-size);
  aspect-ratio: 1;
  border-radius: 50%;
  background: conic-gradient(
    from 30deg,
    color-mix(in oklch, var(--loader-ink) 16%, transparent) 0 72%,
    var(--loader-ink) 72% 100%
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0);
  mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0);
  animation: loading-spin var(--loader-duration) linear infinite;
}

@keyframes loading-spin {
  to { transform: rotate(1turn); }
}

@media (prefers-reduced-motion: reduce) {
  .loading-state__spinner {
    animation: none;
    background: var(--loader-ink);
    opacity: 0.55;
  }
}
```

### React 표시 지연

짧은 요청에 spinner가 번쩍이지 않게 300ms 이후에만 표시합니다. 요청이 끝나면 timer를 정리합니다.

```tsx
function useDelayedPending(pending: boolean, delay = 300) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [pending, delay]);

  return pending && visible;
}
```

### 규칙

- spinner는 `currentColor` 또는 DESIGN.md의 단일 semantic token을 사용합니다.
- region에는 `aria-busy`, 상태 문구에는 `role="status"`와 보이는 텍스트를 제공합니다.
- 작업이 끝나면 region의 `aria-busy`를 `false`로 되돌리고 상태 문구를 DOM에서 제거합니다.
- 콘텐츠 형태를 알면 skeleton, 진행률을 알면 progress를 우선합니다.
- 로더 색·속도·형태는 제품 안에서 한 계열로 통일합니다.
- full-screen loader는 앱 초기 부팅, 인증 복구처럼 화면 전체가 실제로 잠긴 경우에만 씁니다.
- 실패·시간 초과 시 spinner를 계속 돌리지 말고 오류, 재시도, 마지막 성공 시점을 표시합니다.
