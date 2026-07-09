# 메시 그라데이션 다크 블루 (mesh-dark-blue)

> near-black 네이비 위에서 프로시저럴 블루 메시가 히어로를 구동하는 미래적·인프라적 시스템.
> Credits: MengTo/Skills(MIT) `mesh-gradient-dark-blue-clean` 이식 — 이 레포에서 가장 완성도 높은 스타일 레시피.

## 정체성 (경계 선언)

- **이것**: 메시 필드가 미니멀 시스템 셸 **안의 비주얼 엔진**. 크리스프한 타이포 + 얇은 레일 + 코너 마커 + 희소한 노드.
- **이것이 아님**: 에어리한 라이트 블루 페이지 아님. 제네릭 글래스모피즘 아님.

## 토큰

```css
:root {
  --mesh-bg: #030712;
  --mesh-bg-blue: #07111f;
  --mesh-shell: rgba(7, 13, 25, 0.82);
  --mesh-shell-inner: rgba(4, 9, 18, 0.72);
  --mesh-line: rgba(191, 219, 254, 0.14);
  --mesh-line-strong: rgba(226, 232, 240, 0.28);
  --mesh-text: #f8fafc;
  --mesh-copy: #9fb2ca;
  --mesh-muted: #64748b;
  --mesh-accent: #dbeafe;
  --mesh-cobalt: #1d4ed8;
  --mesh-indigo: #312e81;
  --mesh-steel: #385a7c;
}
```

## 폰트 (한·영 스택)

| 역할 | 스택 |
|------|------|
| Headline | `"Space Grotesk", "Pretendard", sans-serif` |
| Body | `"DM Sans", "Pretendard", sans-serif` |
| Data/Marker | `"JetBrains Mono", "IBM Plex Sans KR", monospace` |

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

## System Recipe (조립 순서)

1. Foundation: near-black 네이비 (플랫 블랙 금지).
2. Hero shell: 큰 라운드 컨테이너 + 화이트→투명 그라데이션 보더 + 더 어두운 내부 필.
3. Mesh field: 셸 안의 블루 주도 캔버스/WebGL 레이어.
4. Typography: 흰 헤드라인, 그레이-블루 카피, 절제된 액센트.
5. Navigation: 컴팩트 다크 반투명 pill + 라이트 엣지 그라데이션.
6. Nodes: 소수의 플로팅 글래스 pill + active 도트 + 작은 라벨 + 커넥터 라인.
7. Structure: 얇은 세로 레일, 코너 스퀘어, 숫자 마커, 프레임된 하부 섹션.
8. CTA: 밝은 솔리드 캡슐 1 + 고스트/글래스 캡슐 1.
9. Motion: 느린 메시 드리프트, 희소한 스캔 스트릭, 마스크드 텍스트 리빌.

## 핵심 CSS

```css
.mesh-page {
  min-height: 100dvh;
  color: var(--mesh-text);
  background:
    radial-gradient(circle at 50% 0%, rgba(29, 78, 216, 0.18), transparent 34rem),
    linear-gradient(180deg, var(--mesh-bg-blue), var(--mesh-bg) 48%, #01030a);
}

.mesh-shell {
  position: relative; overflow: hidden;
  border: 1px solid transparent; border-radius: 32px;
  background:
    linear-gradient(var(--mesh-shell), var(--mesh-shell)) padding-box,
    linear-gradient(145deg, rgba(255,255,255,0.46), rgba(147,197,253,0.18), rgba(255,255,255,0.04)) border-box;
  box-shadow: 0 40px 100px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10);
}
.mesh-shell__field { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.78; pointer-events: none; }
.mesh-shell__content {
  position: relative; z-index: 2;
  min-height: clamp(560px, 72vh, 820px);
  padding: clamp(28px, 6vw, 84px);
  background: linear-gradient(180deg, rgba(4,9,18,0.22), rgba(4,9,18,0.62)), var(--mesh-shell-inner);
}

.mesh-node {
  position: absolute; display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid rgba(191,219,254,0.18); border-radius: 999px; padding: 7px 10px;
  color: var(--mesh-copy); background: rgba(5,12,24,0.58); backdrop-filter: blur(14px); font-size: 12px;
}
.mesh-node::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: #bfdbfe; box-shadow: 0 0 18px rgba(147,197,253,0.72);
}
.mesh-rail { position: absolute; top: 0; bottom: 0; width: 1px; background: linear-gradient(180deg, transparent, var(--mesh-line), transparent); }
.mesh-corner { position: absolute; width: 6px; height: 6px; background: var(--mesh-line-strong); }

.mesh-cta-primary { color: #020617; background: #f8fafc; box-shadow: 0 16px 36px rgba(219,234,254,0.18); }
.mesh-cta-secondary {
  color: var(--mesh-text); border: 1px solid transparent;
  background:
    linear-gradient(rgba(5,12,24,0.62), rgba(5,12,24,0.62)) padding-box,
    linear-gradient(135deg, rgba(255,255,255,0.28), rgba(96,165,250,0.12), rgba(255,255,255,0.04)) border-box;
}
```

## Canvas Mesh Field (2D 폴백 — 최종 빌드는 WebGL/Three.js 가능)

```js
function initDarkBlueMesh(canvas) {
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0, height = 0, frame = 0, rafId = 0;
  const points = [
    { x: 0.18, y: 0.30, r: 0.45, color: "rgba(29, 78, 216, 0.55)" },
    { x: 0.68, y: 0.22, r: 0.38, color: "rgba(49, 46, 129, 0.58)" },
    { x: 0.78, y: 0.72, r: 0.52, color: "rgba(56, 90, 124, 0.48)" },
    { x: 0.42, y: 0.58, r: 0.34, color: "rgba(219, 234, 254, 0.18)" },
  ];
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw(time = 0) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#030712"; ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "screen";
    points.forEach((point, index) => {
      const drift = reduceMotion ? 0 : Math.sin(time * 0.00018 + index) * 24;
      const x = point.x * width + drift;
      const y = point.y * height + Math.cos(time * 0.00016 + index) * 18;
      const radius = Math.max(width, height) * point.r;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, point.color);
      gradient.addColorStop(1, "rgba(3, 7, 18, 0)");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
    for (let y = (frame % 28); y < height; y += 28) ctx.fillRect(0, y, width, 1);
    frame += 1;
    if (!reduceMotion) rafId = requestAnimationFrame(draw);
  }
  function handleResize() { cancelAnimationFrame(rafId); resize(); draw(); }
  resize(); draw();
  window.addEventListener("resize", handleResize);
  return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", handleResize); };
}
```

## 모션 기본값

- 메시 드리프트: 매우 느리게, 12s~28s 루프, 날카로운 easing 금지.
- 스캔 스트릭: 희소한 세로/가로 라인, 낮은 opacity.
- 텍스트: 히어로 헤드라인과 섹션 라벨에만 마스크드 리빌 (→ technique-recipes §7).
- 노드: 저강도 shimmer/pulse. 상시 깜빡임 금지.
- reduced-motion: 메시 정지, shimmer 제거, 레이아웃·대비 유지.

## Tuning Knobs

- **메시 가시성**: 무드가 읽힐 만큼만 opacity 상승 — 카피가 항상 주인공.
- **블루 휴**: 인디고↔네이비↔코발트↔스틸 (다크 베이스 유지).
- **네트워크 밀도**: 럭셔리 → 노드 축소 / 인프라 → 마커 증가.

## Avoid

- 메시 깊이 없는 플랫 CSS 그라데이션.
- 밝은 시안 과부하, 전방위 일렉트릭 글로우.
- 붐비는 대시보드, 떠다니는 위젯 과다, 경쟁하는 카드들.
- 가독성을 죽이는 과설계 셰이더.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#030712"
  neutral: "#07111F"
  accent: "#DBEAFE"
  secondary: "#1D4ED8"
  on-primary: "#F8FAFC"
  on-accent: "#020617"
  copy: "#9FB2CA"
typography:
  h1: { fontFamily: "Space Grotesk, Pretendard, sans-serif", fontSize: 3.75rem, fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.02em" }
  body-md: { fontFamily: "DM Sans, Pretendard, sans-serif", fontSize: 1rem, lineHeight: 1.6 }
  label-mono: { fontFamily: "JetBrains Mono, IBM Plex Sans KR, monospace", fontSize: 0.75rem, letterSpacing: "0.08em" }
rounded: { md: 12px, lg: 20px, shell: 32px, pill: 999px }
```

프리셋 근사값: VARIANCE 6 · MOTION 6 · DENSITY 4 (대담/깔끔 프리셋 계열)
