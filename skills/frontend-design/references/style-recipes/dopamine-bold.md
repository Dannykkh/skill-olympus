# 도파민 네오브루탈리즘 (dopamine-bold)

> 크림 캔버스 + 두꺼운 잉크 보더 + 하드 오프셋 섀도 + 고채도 스티커 컬러. 의도된 시끄러움.
> 자체 제작 레시피 — frontend-design 프리셋(대담) + font-pairings.csv #65(Neo Brutalism)·#76(Korean Bold Display) 바인딩.

## 정체성 (경계 선언)

- **이것**: Gen-Z/이벤트/크리에이티브의 "의도된 대담·고채도" — 2026 가드레일에서 명시적으로 허용된 컨셉 채도.
- **이것이 아님**: swiss-brutalist(기능주의 인쇄)가 아님 — 여기는 팝. 무심코 쓴 AI 퍼플 그라데이션도 아님 — 채도는 전부 의도적.

## 토큰

```css
:root {
  --dp-canvas: #fff8e7;        /* 크림 캔버스 */
  --dp-ink: #141414;           /* 보더·텍스트 잉크 */
  --dp-primary: #ff5d8f;       /* 지배 채도 1색 — 핑크 */
  --dp-support-a: #ffd23f;     /* 서포트 옐로 */
  --dp-support-b: #3a86ff;     /* 서포트 블루 */
  --dp-on-primary: #141414;
  --dp-border-w: 2.5px;
  --dp-shadow: 4px 4px 0 var(--dp-ink);       /* 하드 오프셋 — blur 없음 */
  --dp-shadow-lg: 7px 7px 0 var(--dp-ink);
}
```

지배색 1 + 서포트 2 구조 유지 — 서포트는 태그/스티커/하이라이트에만, 대면적은 지배색과 크림뿐.

## 폰트 (한·영 스택)

| 역할 | 스택 | 파라미터 |
|------|------|----------|
| Display | `"Space Grotesk", "Black Han Sans", sans-serif` | 700만 (Space Grotesk 최대 웨이트) — Regular 금지. 대문자. Black Han Sans는 단일 웨이트 |
| Body | `"Pretendard", sans-serif` | 500~700 (가벼운 웨이트 금지 — 밀도 유지) |
| Sticker/Tag | `"Space Grotesk", "Do Hyeon", sans-serif` | 대문자 + tracking 0.05em |

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Black+Han+Sans&family=Do+Hyeon&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

## 핵심 CSS

```css
.dp-card {
  background: #ffffff;
  border: var(--dp-border-w) solid var(--dp-ink);
  border-radius: 12px;         /* 0~12px — 큰 라운드 금지 */
  box-shadow: var(--dp-shadow);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.dp-card:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--dp-ink); }
.dp-card:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--dp-ink); }

.dp-btn {
  background: var(--dp-primary);
  color: var(--dp-on-primary);
  border: var(--dp-border-w) solid var(--dp-ink);
  border-radius: 10px;
  box-shadow: var(--dp-shadow);
  font-weight: 700;
}

.dp-sticker {
  display: inline-block;
  background: var(--dp-support-a);
  border: 2px solid var(--dp-ink);
  border-radius: 999px;
  padding: 4px 12px;
  transform: rotate(-2deg);    /* 스티커별 -3~3deg 랜덤 회전 */
  font-weight: 700;
}
```

## Visual Target

- 모든 면은 잉크 보더로 닫힌다 — 보더 없는 요소가 없다.
- 그림자는 전부 하드 오프셋(blur 0) — 종이 위 스티커의 물리감.
- 요소들이 살짝 회전(-3~3deg)·오버랩하며 콜라주 감각.
- 숫자·통계는 유기적으로(`47.2%`, `18 of 43`) — 99.99% 같은 AI 숫자 금지.

## 권장 패턴

- **히어로**: 초대형 디스플레이 타이포 + 회전된 스티커 뱃지 + 채도 블롭/패턴 배경.
- **카드**: 흰 배경 + 잉크 보더 + 하드 섀도 — hover에서 들리고 active에서 눌린다.
- **마퀴**: 잉크 배경 + 크림 텍스트 무한 루프 (→ technique-recipes §8).
- **구분**: 보더 자체가 구분 — 추가 디바이더 불필요.

## 모션 기본값

- hover/active의 translate+shadow 스냅(120ms) — 부드러운 easing보다 즉각적.
- 등장: pop-in(scale 0.9→1 + 살짝 오버슈트, 200ms), stagger 60ms.
- 마퀴 외 상시 루프 애니메이션 금지 — 시끄러움은 색이 담당, 모션까지 시끄러우면 소음.

## Tuning Knobs

- **지배색**: 핑크 ↔ 오렌지(#FF6B35) ↔ 그린(#06D6A0) — 1색만 교체.
- **보더 두께**: 2px(가벼움) ~ 3px(포스터).
- **회전량**: 0deg(정돈된 팝) ~ 3deg(콜라주).

## Avoid

- 그라데이션(특히 보라→파랑), 소프트 섀도, 글래스.
- 채도 3색 이상 대면적 동시 사용.
- 가벼운 폰트 웨이트, 좁은 자간의 긴 본문.
- 진지한 금융/의료 등 신뢰 최우선 도메인에 적용.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#FF5D8F"
  neutral: "#FFF8E7"
  accent: "#FFD23F"
  secondary: "#3A86FF"
  on-primary: "#141414"
  on-neutral: "#141414"
  ink: "#141414"
typography:
  h1: { fontFamily: "Space Grotesk, Black Han Sans, sans-serif", fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.02em" }
  body-md: { fontFamily: "Pretendard, sans-serif", fontSize: 1.0625rem, fontWeight: 500, lineHeight: 1.55 }
  label-caps: { fontFamily: "Space Grotesk, Do Hyeon, sans-serif", fontSize: 0.8125rem, letterSpacing: "0.05em" }
rounded: { sm: 6px, md: 10px, lg: 12px, pill: 999px }
components:
  button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", rounded: "{rounded.md}" }
  card: { backgroundColor: "#FFFFFF", rounded: "{rounded.lg}", padding: 24px }
```

프리셋 근사값: VARIANCE 8 · MOTION 5 · DENSITY 5 (대담 프리셋 계열)
