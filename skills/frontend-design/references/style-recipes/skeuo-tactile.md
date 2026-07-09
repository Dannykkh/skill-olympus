# 소프트 스큐어모피즘 / 택타일 (skeuo-tactile)

> 눌리고 새겨지고 돌출된 물리적 표면 — 레이어드 그라데이션 + 중첩 그림자 + 반사 엣지.
> Credits: MengTo/Skills(MIT) `skeuomorphic-ui` 이식 — 폰트 바인딩 추가.

## 정체성 (경계 선언)

- **이것**: 소프트 플라스틱/에나멜/세라믹/메탈의 프리미엄 하드웨어 감각. 컨트롤이 "만져질 것 같은" UI.
- **이것이 아님**: 광택 카툰 아님. 글래스모피즘·뉴모피즘과 같은 컴포넌트에 혼용 금지.

## 토큰

```css
:root {
  --sk-bg-top: #f8fafc;
  --sk-bg-mid: #e9eef5;
  --sk-bg-bottom: #cfd7e4;
  --sk-edge-top: rgba(255, 255, 255, 0.82);
  --sk-edge-bottom: rgba(79, 93, 122, 0.34);
  --sk-shadow: rgba(31, 41, 55, 0.18);
  --sk-shadow-deep: rgba(31, 41, 55, 0.28);
  --sk-highlight: rgba(255, 255, 255, 0.72);
  --sk-ink: #334155;
}
```

## 폰트 (한·영 스택)

| 역할 | 스택 |
|------|------|
| Heading/UI | `"Plus Jakarta Sans", "Pretendard", sans-serif` |
| Body | `"Pretendard", sans-serif` |

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

## Surface Recipe (조립 순서)

1. 라운드 형태 + 부드러운 수직 그라데이션: 위 밝고 아래 어둡게.
2. 1px 그라데이션 보더 랩으로 반사 엣지 시뮬레이션.
3. 외부 그림자(elevation) + inset 그림자(깊이) 스택.
4. 상단 엣지 하이라이트 + 하단 어두운 엣지.
5. 텍스트/아이콘 그림자는 절제해서 — 새김(embossed) 느낌.
6. 마이크로 디테일(도트·그레인·이음새)은 스케일이 허용할 때만.
7. transition `160ms`~`240ms`.

## 핵심 CSS

```css
/* 돌출(Raised) — 카드·패널·버튼·컨트롤 하우징 */
.sk-surface {
  position: relative;
  border: 1px solid transparent;
  border-radius: 22px;
  background:
    linear-gradient(180deg, var(--sk-bg-top), var(--sk-bg-mid) 48%, var(--sk-bg-bottom)) padding-box,
    linear-gradient(180deg, var(--sk-edge-top), rgba(255,255,255,0.22) 45%, var(--sk-edge-bottom)) border-box;
  box-shadow:
    0 18px 34px var(--sk-shadow),
    0 5px 12px rgba(31, 41, 55, 0.12),
    inset 0 1px 0 var(--sk-highlight),
    inset 0 -1px 0 rgba(79, 93, 122, 0.24);
  transition: box-shadow 200ms ease, transform 200ms ease, background 200ms ease;
}
.sk-surface::after {
  content: ""; position: absolute; inset: 1px 1px auto; height: 35%;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.42), transparent);
  pointer-events: none;
}

/* 눌림(Pressed) — active 버튼·토글·선택 탭·inset 웰 */
.sk-surface.is-pressed {
  transform: translateY(1px);
  background:
    linear-gradient(180deg, #d5dce8, #eef2f7 52%, #f8fafc) padding-box,
    linear-gradient(180deg, rgba(72,84,112,0.38), rgba(255,255,255,0.62)) border-box;
  box-shadow:
    inset 0 4px 10px rgba(31, 41, 55, 0.22),
    inset 0 -1px 0 rgba(255, 255, 255, 0.72),
    0 4px 10px rgba(31, 41, 55, 0.10);
}

/* 새김 텍스트/아이콘 */
.sk-label {
  color: var(--sk-ink);
  text-shadow: 0 1px 0 rgba(255,255,255,0.78), 0 -1px 0 rgba(31,41,55,0.12);
}
.sk-icon {
  filter: drop-shadow(0 1px 0 rgba(255,255,255,0.78)) drop-shadow(0 -1px 0 rgba(31,41,55,0.14));
}

/* 마이크로 텍스처 — 느껴지되 보이지 않게 */
.sk-texture {
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.34) 0 1px, transparent 1.5px),
    radial-gradient(circle at 70% 65%, rgba(31,41,55,0.08) 0 1px, transparent 1.5px);
  background-size: 18px 18px, 22px 22px;
}
```

## 모션 기본값

- 상태 전환 160~240ms ease. pressed는 `translateY(1px)` + inset 그림자 반전.
- hover는 elevation 소폭 상승. 스프링/바운스 금지 — 물리 버튼은 튀지 않는다.

## Tuning Knobs

- **재질**: 토큰 그라데이션을 브랜드 톤으로 틴트 (쿨 그레이 ↔ 웜 아이보리 ↔ 브랜드 페일톤).
- **깊이**: 외부 그림자 강도(가벼운 카드 ↔ 무거운 하우징).
- **텍스처**: 작은 컨트롤일수록 축소.

## Avoid

- 컴포넌트당 물리 재질 2개 이상 혼합.
- 순흑 그림자 — 틴트된 그레이/브랜드 다크로.
- 모든 표면에 pressed 이펙트 (인터랙티브 상태 전용).
- 광원 방향 붕괴 — 빛은 항상 위에서.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#334155"
  neutral: "#E9EEF5"
  accent: "#4F5D7A"
  on-primary: "#F8FAFC"
  on-neutral: "#334155"
typography:
  h1: { fontFamily: "Plus Jakarta Sans, Pretendard, sans-serif", fontSize: 3rem, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em" }
  body-md: { fontFamily: "Pretendard, sans-serif", fontSize: 1rem, lineHeight: 1.5 }
rounded: { md: 14px, lg: 22px }
```

프리셋 근사값: VARIANCE 4 · MOTION 3 · DENSITY 4 (깔끔/럭셔리 프리셋 계열)
