# 콰이어트 럭셔리 (luxury-quiet)

> 넉넉한 여백, 고대비 세리프, 절제된 골드 라인 — 말하지 않고 보여주는 프리미엄.
> 자체 제작 레시피 — frontend-design 프리셋(럭셔리) + font-pairings.csv #12(Luxury Serif)·#74(Korean Elegant Serif) 바인딩.

## 정체성 (경계 선언)

- **이것**: 브랜드가 조용할수록 비싸 보인다 — 타이포와 여백이 전부인 하이엔드.
- **이것이 아님**: 골드 그라데이션 번쩍이는 "짝퉁 럭셔리" 아님. 장식은 헤어라인 1px까지만.

## 토큰

```css
/* 라이트(아이보리) 기본 — 다크 변형은 아래 */
:root {
  --lx-ivory: #f8f5f0;
  --lx-surface: #ffffff;
  --lx-ink: #1a1713;           /* 웜 니어블랙 */
  --lx-copy: #6b6257;
  --lx-line: rgba(26, 23, 19, 0.14);
  --lx-gold: #a8895a;          /* 절제된 골드 — 헤어라인·라벨·호버 디테일 전용. 아이보리 텍스트와 3.0:1이라 텍스트 배경 금지 */
  --lx-on-gold: #1a1713;       /* 골드 배경 위 텍스트가 불가피할 때는 잉크 (5.4:1) */
}

/* 다크 변형 */
/* --lx-bg: #171412; --lx-surface: #1f1b18; --lx-ink: #f0ece5; --lx-copy: #a89d8e; */
```

## 폰트 (한·영 스택)

| 역할 | 스택 | 파라미터 |
|------|------|----------|
| Display | `"Cormorant", "Noto Serif KR", serif` | 대형·라이트 웨이트(400~500), tracking 0 ~ +0.01em |
| Body | `"Jost", "Pretendard", sans-serif` | 가벼운 지오메트릭 |
| Label | `"Jost", "Pretendard", sans-serif` | 대문자 + tracking `0.14em`~`0.2em` — 럭셔리의 시그니처 |

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant:wght@400;500;600&family=Noto+Serif+KR:wght@400;500;600&family=Jost:wght@300;400;500&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
```

## Visual Target

- 여백이 지배 — 섹션 수직 패딩 `py-32`+, 히어로는 화면의 절반이 빈 공간이어도 좋다.
- 세리프 디스플레이는 크되 가볍게(웨이트 400~500) — 굵은 세리프는 올드해 보인다.
- 골드는 색이 아니라 디테일: 헤어라인 룰, 오버라인 라벨, hover 언더라인.
- 사진은 대형·저채도·시네마틱 크롭 — 텍스트와 겹칠 땐 어두운 스크림.

## 권장 패턴

- **내비게이션**: 극도로 희소 — 로고 + 링크 3~4개 + 햄버거. 배경 없이 지면 위에.
- **히어로**: 전폭 이미지 또는 순수 타이포 — 대문자 오버라인(`COLLECTION 2026`) + 대형 세리프 + 작은 CTA 텍스트 링크.
- **CTA**: 박스 버튼보다 언더라인 텍스트 링크(`자세히 보기 →`) — 필요하면 얇은 보더 고스트 버튼.
- **제품/갤러리**: 큰 이미지 + 최소 캡션, 비대칭 2단(4:6, 5:7 오프셋).
- **디테일**: 골드 헤어라인 룰이 섹션을 구분 — 그림자·카드 금지.

## 모션 기본값

- 느린 fade + 미세 상승(y 16px, 0.9s, power2.out) — 서두르지 않는다.
- 이미지 hover: scale 1→1.03 (0.8s) + 골드 캡션 등장.
- Ken Burns급 초저속 줌(20s+)은 히어로 1곳만 허용.

## Tuning Knobs

- **모드**: 아이보리 라이트 ↔ 웜 다크(`#171412` 베이스).
- **골드 온도**: `#A8895A`(브론즈) ↔ `#B99668`(샴페인) ↔ 골드 제거(순수 모노크롬).
- **사진 비중**: 타이포 온리 ↔ 풀블리드 갤러리.

## Avoid

- 골드 그라데이션·메탈릭 텍스처·반짝임 이펙트.
- 굵은 세리프 헤드라인, 좁은 여백, 촘촘한 카드 그리드.
- 원색 액센트·뱃지·이모지.
- "프리미엄", "럭셔리" 같은 자기 지칭 카피 — 보여주되 말하지 않는다.

## DESIGN.md 컴파일

```yaml
colors:
  primary: "#1A1713"
  neutral: "#F8F5F0"
  accent: "#A8895A"           # 헤어라인·라벨 디테일 전용 (아이보리와 3.0:1 — 텍스트 배경 금지)
  on-primary: "#F8F5F0"
  on-accent: "#1A1713"        # 골드 위 텍스트가 불가피할 때 잉크 (5.4:1)
  on-neutral: "#1A1713"
  copy: "#6B6257"
typography:
  h1: { fontFamily: "Cormorant, Noto Serif KR, serif", fontSize: "clamp(3rem, 6vw, 5.5rem)", fontWeight: 400, lineHeight: 1.15, letterSpacing: "0.005em" }
  body-md: { fontFamily: "Jost, Pretendard, sans-serif", fontSize: 1.0625rem, fontWeight: 300, lineHeight: 1.7 }
  label-caps: { fontFamily: "Jost, Pretendard, sans-serif", fontSize: 0.75rem, letterSpacing: "0.16em" }
rounded: { none: 0px, sm: 2px }
spacing: { section: 128px, block: 48px }
```

프리셋 근사값: VARIANCE 5 · MOTION 4 · DENSITY 2 (럭셔리 프리셋 계열)
