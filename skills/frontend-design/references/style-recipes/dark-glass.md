# 다크 글래스 클린 (dark-glass)

> 깊은 다크 위에 frosted 글래스 셸과 얇은 그라데이션 엣지. 조용하고 프리미엄한 다크 UI.
> Credits: MengTo/Skills(MIT) `dark-glass-clean-layout`+`css-border-gradient` 각색 — 토큰/폰트 바인딩 추가.

## 정체성 (경계 선언)

- **이것**: 다크 베이스 + frosted 카드 셸 + 1px 그라데이션 엣지 + 중앙 히어로 스테이지. 절제된 럭셔리 테크.
- **이것이 아님**: 파스텔 글래스모피즘 아님. 원형 게이지 가득한 sci-fi 계기판도 아님.

## 토큰

```css
:root {
  --dg-bg: #05070d;
  --dg-bg-deep: #02030a;
  --dg-glass: rgba(13, 18, 30, 0.55);
  --dg-glass-strong: rgba(13, 18, 30, 0.78);
  --dg-line: rgba(255, 255, 255, 0.14);
  --dg-text: #f8fafc;
  --dg-copy: #94a3b8;
  --dg-muted: #64748b;
  --dg-accent: #7dd3fc;        /* 절제된 스카이 — 브랜드 색으로 치환 가능 */
  --dg-on-accent: #05070d;
  --dg-blur: 18px;
}
```

**글래스 셸 기본형** (border gradient는 technique-recipes §3 참조):

```css
.dg-shell {
  border: 1px solid transparent;
  border-radius: 20px;
  background:
    linear-gradient(var(--dg-glass), var(--dg-glass)) padding-box,
    linear-gradient(135deg, rgba(255,255,255,0.34), rgba(125,211,252,0.28) 45%, rgba(255,255,255,0.06)) border-box;
  backdrop-filter: blur(var(--dg-blur));
}
```

## 폰트 (한·영 스택)

| 역할 | 스택 |
|------|------|
| Headline | `"Space Grotesk", "Pretendard", sans-serif` |
| Body | `"DM Sans", "Pretendard", sans-serif` |
| Label/Data | `"JetBrains Mono", "IBM Plex Sans KR", monospace` |

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

## Visual Target

- 배경은 깊은 다크(`--dg-bg` → `--dg-bg-deep` 세로 그라데이션) + 낮은 opacity의 앰비언트 글로우 1~2개.
- 글래스 표면은 "조용한 프리미엄" — 밝은 유리가 아니라 어두운 반투명 + 얇은 반사 엣지.
- 텍스트 위계: 흰 헤드라인 / 그레이-블루 카피 / 뮤트 메타.

## 권장 패턴

- **내비게이션**: pill 형태 톱바를 얇은 그라데이션 엣지로 감싸고 `backdrop-filter: blur(18px)`.
- **히어로**: 중앙 스테이지 + 좌우 frosted 카드 셸이 보조.
- **CTA 페어**: 밝은 솔리드 primary(`#f8fafc` 배경 + 다크 텍스트) + 글래스 secondary(그라데이션 보더).
- **구분**: 카드 남발 대신 `--dg-line` 1px 룰과 여백.

## 모션 기본값

- 앰비언트 글로우의 매우 느린 드리프트(20s+, opacity 0.03~0.06, `position: fixed; pointer-events: none` 레이어).
- hover: 엣지 그라데이션 밝아짐 + `translateY(-1px)`. 리빌은 fade-up (→ technique-recipes §9 프리셋).
- 글래스 표면 자체를 애니메이트하지 말 것 (backdrop-filter 재계산 비용).

## Tuning Knobs

- **글래스 강도**: `--dg-glass` alpha 0.45~0.8, blur 12~24px.
- **액센트 휴**: 스카이/인디고/민트 — 다크 베이스는 유지.
- **엣지 밝기**: 보더 그라데이션 스톱 alpha (0.2~0.4).
- **밀도**: 럭셔리로 갈수록 셸 수 축소.

## Avoid

- 파스텔/화이트 배경 글래스, 밝은 유리 과다.
- 무지개 보더, 풀 채도 네온 글로우.
- 글래스 셸 안에 글래스 셸 (한 계층만).
- 스크롤 컨테이너에 backdrop-filter 중첩 (성능).

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#05070D"
  neutral: "#0D121E"
  accent: "#7DD3FC"
  on-primary: "#F8FAFC"
  on-accent: "#05070D"
  copy: "#94A3B8"
typography:
  h1: { fontFamily: "Space Grotesk, Pretendard, sans-serif", fontSize: 3.5rem, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em" }
  body-md: { fontFamily: "DM Sans, Pretendard, sans-serif", fontSize: 1rem, lineHeight: 1.6 }
  label-mono: { fontFamily: "JetBrains Mono, IBM Plex Sans KR, monospace", fontSize: 0.75rem, letterSpacing: "0.06em" }
rounded: { sm: 8px, md: 14px, lg: 20px, pill: 999px }
```

프리셋 근사값: VARIANCE 5 · MOTION 5 · DENSITY 4 (럭셔리/깔끔 프리셋 계열)
