# 스위스 브루탈리스트 / 택티컬 터미널 (swiss-brutalist)

> 1960년대 스위스 인쇄 + 군용 터미널. 거대 타이포, 가시적 그리드, 90도 코너, 해저드 레드 1색.
> Credits: MengTo/Skills(MIT) `industrial-brutalist-ui` 각색 — 한글 디스플레이 폰트 바인딩 추가.

## 정체성 (경계 선언)

- **이것**: "기밀 해제된 블루프린트" — 기계적 정밀, 극단적 타입 스케일 대비, 데이터 밀도.
- **이것이 아님**: 네오브루탈리즘(스티커/도파민)이 아님 — 그건 `dopamine-bold` 레시피. 장식 없는 기능주의.
- **서브모드 중 하나만 선택** (혼용 절대 금지): ① Swiss Print(라이트) ② Tactical Terminal(다크).

## 토큰

```css
/* 모드 A: Swiss Industrial Print (라이트) */
:root {
  --sw-bg: #f4f4f0;            /* 무광 문서 용지 (#EAE8E3 대안) */
  --sw-ink: #0a0a0a;           /* 카본 잉크 (#050505~#111111) */
  --sw-line: rgba(10, 10, 10, 0.85);
  --sw-accent: #e61919;        /* Aviation Red — 유일한 액센트 (#FF2A2A 대안) */
  --sw-on-accent: #f4f4f0;
}

/* 모드 B: Tactical Telemetry (다크) */
:root {
  --tt-bg: #0a0a0a;            /* 꺼진 CRT (#121212 대안, 순수 #000 금지) */
  --tt-fg: #eaeaea;            /* 화이트 포스퍼 */
  --tt-accent: #e61919;        /* 같은 레드, 같은 규칙 */
  --tt-green: #4af626;         /* 선택: 단 하나의 상태 표시등에만. 일반 텍스트 금지 */
}
```

## 폰트 (한·영 스택)

| 역할 | 스택 | 파라미터 |
|------|------|----------|
| Macro (구조 헤더) | `"Archivo Black", "Black Han Sans", sans-serif` | `clamp(4rem, 10vw, 15rem)` · tracking `-0.03em`~`-0.06em` · leading `0.85`~`0.95` · 대문자 |
| Micro (데이터/텔레메트리) | `"JetBrains Mono", "IBM Plex Sans KR", monospace` | `10px`~`14px` · tracking `0.05em`~`0.1em` · 대문자 |
| 본문(필요시) | `"IBM Plex Sans KR", sans-serif` | 절제된 크기 (KR 패밀리가 라틴 글리프도 커버) |

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Black+Han+Sans&family=JetBrains+Mono:wght@400;500;700&family=IBM+Plex+Sans+KR:wght@400;500;700&display=swap');
```

한글 macro는 Black Han Sans(단일 웨이트) — 초대형 한글 헤드라인이 필요하면 Gothic A1 900도 후보.

## Visual Target

- 요소는 떠다니지 않는다 — 그리드 트랙과 교차점에 **정박**된다.
- 가시적 구획화: `1px`/`2px` 솔리드 보더, 컨테이너 전폭을 가로지르는 `<hr>`.
- 바이모달 밀도: 빽빽한 모노 메타데이터 클러스터 ↔ 거대 타이포를 감싸는 계산된 여백.
- **`border-radius` 절대 금지** — 모든 코너 90도.

## 권장 패턴

- **1px 그리드 라인**: `display: grid; gap: 1px;` + 부모/자식 배경색 대비로 면도날 구분선 생성.
- **ASCII 장식**: `[ DELIVERY SYSTEMS ]`, `< RE-IND >`, `>>>`, `///` 프레이밍.
- **인더스트리얼 마커**: `®` `©` `™`를 구조적 기하 요소로, 크로스헤어 `+`를 그리드 교차점에.
- **랜덤 스트링 데이터**: `REV 2.6`, `UNIT / D-01` — 기계 프로세스 시뮬레이션.
- **시맨틱 태그**: `<data>`, `<samp>`, `<kbd>`, `<output>`, `<dl>`.

## 텍스처 (아날로그 열화)

```css
/* CRT 스캔라인 (Tactical 모드) */
background-image: repeating-linear-gradient(0deg,
  transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px);
```

- 하프톤/1-bit 디더링: 연속톤 이미지·대형 세리프에 `mix-blend-mode: multiply` + SVG 도트 패턴.
- 전역 저opacity SVG 노이즈로 물리적 그레인.

## 모션 기본값

- 최소한으로: 커서 블링크, 스텝된(계단식) 카운터, 타자기 텍스트. 부드러운 easing보다 `steps()`.
- hover: 배경/전경 반전(잉크 ↔ 용지). transition 100~150ms 또는 즉시.

## Tuning Knobs

- **밀도**: 텔레메트리 데이터 양 (미니멀 포스터 ↔ 관제판).
- **열화 강도**: 스캔라인/노이즈/디더링 opacity.
- **레드 사용량**: 스트라이크스루·구조 분할선·경고 하이라이트에만.
- **레드 대비 한계(계산 확인)**: `#E61919`는 잉크와 4.3:1, 용지와 4.2:1 — **양방향 모두 본문 텍스트 기준(4.5:1) 미달**. 레드는 라인·블록·대형 디스플레이 타이포(3:1 기준은 통과)에만 쓰고, 레드 배경 위 본문 텍스트·레드 본문 텍스트는 금지.

## Avoid

- 그라데이션, 소프트 드롭섀도, 모던 반투명 — 전부 금지.
- `border-radius`, 파스텔, 이모지형 장식.
- 라이트/다크 서브스트레이트 혼용.
- Terminal Green을 일반 텍스트 색으로.

## DESIGN.md 컴파일 (Swiss Print 모드 기준)

```yaml
colors:
  primary: "#F4F4F0"
  neutral: "#EAE8E3"
  accent: "#E61919"           # 라인·블록·대형 디스플레이 전용 (본문 텍스트 4.5:1 미달 — Tuning Knobs 참조)
  on-primary: "#0A0A0A"
  on-accent: "#F4F4F0"        # 레드 블록 위 대형 타이포에만 (4.2:1 — 본문 금지)
typography:
  h1: { fontFamily: "Archivo Black, Black Han Sans, sans-serif", fontSize: "clamp(4rem, 10vw, 15rem)", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.04em" }
  body-md: { fontFamily: "IBM Plex Sans KR, IBM Plex Sans, sans-serif", fontSize: 1rem, lineHeight: 1.5 }
  label-mono: { fontFamily: "JetBrains Mono, IBM Plex Sans KR, monospace", fontSize: 0.75rem, letterSpacing: "0.08em" }
rounded: { none: 0px }
```

프리셋 근사값: VARIANCE 8 · MOTION 2 · DENSITY 7 (대담/대시보드 프리셋 계열)
