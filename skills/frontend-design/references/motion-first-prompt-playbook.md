# Motion-first Prompt Playbook

> 디자인 취향을 "예쁘게" 같은 형용사가 아니라 구현 가능한 장면, 구성, 색, 타이포, 모션 계약으로
> 바꾸는 프롬프트 문법입니다.
>
> 조사 기준: 2026-07-17에 [MotionSites](https://motionsites.ai/)의 공개 라이브러리와
> 무료로 복사 가능한 프롬프트 10개를 표본 분석했습니다. 아래 내용은 공통 구조를 새로 정리한
> 원본 가이드이며, 유료 프롬프트 문구·브랜드 카피·미디어 URL을 복제하지 않습니다.

## 언제 읽는가

- 사용자가 "디자인이 구리다", "맨날 비슷하다", "봐야 안다"고 말할 때
- 브랜드 가이드나 DESIGN.md 없이 새 방향을 잡을 때
- 색상이 초록·주황 또는 한 가지 익숙한 조합으로 반복될 때
- 서로 확실히 다른 정적 프로토타입 3개를 만들 때
- 디자인 레퍼런스 라이브러리에서 재사용 가능한 프롬프트 문법을 추출할 때

## 기능형 UI 선행 게이트

Motion-first는 랜딩 페이지를 만드는 스킬이 아니라 **결정을 구체화하는 문법**입니다. 구현 전에
화면의 주 행동을 판별하고, 데이터 도구·검색 디렉터리·에이전트 IDE·로딩 상태·효과 쇼케이스라면
[`coder-interface-pattern-playbook.md`](coder-interface-pattern-playbook.md)를 먼저 읽습니다.

- 랭킹·모니터링: 정보 밀도와 비교가 미학보다 우선
- 검색·디렉터리: 필터 상태와 결과 스캔이 hero보다 우선
- IDE·워크벤치: 지속 문맥과 개입 필요 상태가 장식보다 우선
- 로딩: 기다림의 이유·진행·취소가 spinner의 형태보다 우선
- 효과 쇼케이스: 효과는 bounded preview stage 안에 격리

이 유형들에도 아래 컴파일러를 쓰되, 장식 모션 예산을 먼저 정합니다. 데이터 도구와 워크벤치의
기본 장식 효과 수는 `0`입니다.

## 공개 샘플에서 확인한 강한 패턴

1. **첫 문장에 결과 계약**: 페이지 종류, 브랜드, 기술 스택, 섹션 수를 먼저 고정합니다.
2. **미학을 한 문장으로 선언**: 분위기뿐 아니라 조명, 재질, 화면 밀도까지 함께 적습니다.
3. **색과 폰트를 역할로 지정**: "파란색 사용"이 아니라 배경, 본문, 신호, CTA 역할을 구분합니다.
4. **섹션을 순서대로 해부**: 각 섹션의 목적, 그리드, 비율, 정렬, 미디어 초점을 따로 씁니다.
5. **모션 메커니즘을 명명**: fade, word pull-up, stagger, marquee, magnetic hover, scrub처럼 정확히 씁니다.
6. **반응형 변화를 명시**: 모바일에서 숨길 것, 쌓을 순서, 타입 축소 방식을 지시합니다.
7. **실패 조건을 둡니다**: 원치 않는 그라데이션, 중앙 정렬, 카드 반복, 장식 요소를 금지합니다.

좋은 프롬프트의 핵심은 길이가 아니라 **결정의 밀도**입니다. 모든 픽셀을 지시할 필요는 없지만,
첫 화면의 위계와 한 번만 기억될 시각적 장치는 모호하게 두지 않습니다.

## 가져오지 않을 것

공개 샘플에도 아프로디테의 품질 규칙과 충돌하는 선택이 있습니다. 아래 항목은 구조만 배우고
값은 그대로 가져오지 않습니다.

| 소스에서 보일 수 있는 패턴 | 아프로디테 변환 |
|---|---|
| 순수 `#000` 배경 | 의도된 잉크색 또는 near-black 토큰 |
| Inter를 기본 디스플레이 폰트로 사용 | 프로젝트 언어에 맞는 개성 폰트 + 실제 로드 검증 |
| `h-screen` | `min-height: 100dvh` 계열 |
| 모든 장면에 배경 영상 | 핵심 장면 1곳만 사용하고 정적 포스터 폴백 |
| JavaScript `requestAnimationFrame` 페이드 | CSS/미디어 이벤트로 충분한지 먼저 판단 |
| 거대한 `vw` 제목을 모바일까지 유지 | `clamp()`와 모바일 줄바꿈 규칙 |
| 글래스 pill을 내비·버튼·카드에 반복 | 대표 레이어 1곳에만 재질 언어 적용 |
| 외부 브랜드 카피·에셋 URL | 프로젝트 고유 카피와 소유 자산으로 교체 |

## 프롬프트 컴파일러

구현 지시는 아래 순서로 작성합니다. 비어 있는 항목을 "알아서"로 넘기지 말고, 중요하지 않으면
`없음` 또는 `정적`이라고 명시합니다.

```text
INTERFACE MODE
- Data Instrument / Faceted Directory / Agent Workbench / Waiting State / Effect Stage / Expressive Landing

PRIMARY ACTION
- 사용자가 첫 5초 안에 수행하거나 이해해야 할 조작 1개

INFORMATION + STATE
- 계속 남아야 하는 문맥과 비교 필드
- loading/empty/error/stale/permission/disconnected 중 필요한 상태

DENSITY + EFFECT BUDGET
- low / medium / controlled-high
- 장식 효과 수, 상태 모션 수, 허용 구현 복잡도

GOAL
- 누구를 위한 어떤 화면인지
- 첫 5초 안에 사용자가 이해해야 할 한 가지

CONCEPT
- 한 문장 미학: 시대/재질/조명/태도
- 기억 장치 1개: 거대 타이포, 3D 오브젝트, 하단 도크, 편집 그리드 등

COMPOSITION
- 첫 뷰포트 그리드, 정렬 축, 핵심 비율
- 섹션 순서와 각 섹션의 밀도 변화

TYPE
- heading/body/label의 실제 폰트 토큰
- 크기 대비, 줄 높이, 케이싱, 한글 폴백

COLOR
- 아래 색상 레인 1개
- 배경/전경/액센트/on-accent 역할
- success/warning/error/change 같은 semantic signal의 국소 사용
- 액센트가 필요한 이유와 사용 면적

MATERIAL
- 종이, 유리, 금속, 잉크, 필름 그레인, 무광 표면 중 1개
- 보더/그림자/텍스처 강도

MOTION
- 입장 시퀀스 1개
- 스크롤 연동 0~1개
- hover/active 피드백
- 상태 모션과 장식 모션을 분리
- duration/easing/reduced-motion 폴백

MEDIA
- 이미지/영상/3D의 초점과 크롭
- 에셋이 없을 때의 정적 폴백

RESPONSIVE
- 데스크톱→모바일 스택 순서
- 숨김/축소/줄바꿈 규칙

NEGATIVE
- 이 방향이 절대 되면 안 되는 것 3~5개

SUCCESS CHECK
- 첫 뷰포트, 스크롤 중, 모바일에서 관찰 가능한 통과 조건
```

## 색상 다양성 게이트

2026-07-17 현재 `color-palettes.csv` 감사에서 Accent 161개 중 주황 56개, 초록 43개로
두 계열이 99개(61.5%)였습니다. 데이터셋 순서대로 후보를 고르면 디자인이 이 두 색으로
수렴하는 것이 정상적인 결과입니다. 따라서 팔레트 추천 전에 아래 하드 게이트를 적용합니다.

1. CSV 행 순서는 추천 순위가 아닙니다.
2. 3개 후보는 서로 다른 **색상 계열**, **명도 모드**, **표면 재질**을 가져야 합니다.
3. 초록·주황 계열은 합쳐서 후보 3개 중 최대 1개만 허용합니다.
4. 초록·주황을 최종 선택하려면 브랜드색, 도메인 의미, 사용자 명시 중 하나를 근거로 적습니다.
5. 기존 DESIGN.md 또는 최근 디자인 레퍼런스와 같은 액센트 계열은 기본 후보에서 제외합니다.
6. 브랜드색이 없으면 `중립`, `차가운 색`, `따뜻한 비주황 색`의 3방향으로 시작합니다.

### 기본 색상 레인

아래 값은 DESIGN.md에 넣을 수 있는 HEX fallback seed입니다. 신규 CSS에서는 같은 색을
`oklch()` 우선 + HEX fallback으로 선언합니다. 대비는 배경/전경과 액센트/on-accent 모두
WCAG AA 본문 기준을 통과하도록 계산했습니다. 레인은 `primary/background`, `on-primary/foreground`,
`accent/on-accent`의 의미 코어만 제공합니다. surface/card/muted/border 스케일은 선택 뒤
DESIGN.md의 기존 토큰과 대비 규칙에서 파생합니다. 사용자가 디자인 시스템 scaffold를 명시적으로
요청했고 `MODULE_SKILL[design-system-starter]`가 해석된 경우에만 그 모듈을 직접 읽어 확장한 뒤
다시 대비를 확인합니다.

| 레인 | 배경 / 전경 | 액센트 / on-accent | 인상 | 대비 |
|---|---|---|---|---|
| Graphite / Oxblood | `#141414` / `#F2EEE8` | `#B43A3A` / `#FFFFFF` | 영화 포스터, 성숙함 | 15.94 / 5.82 |
| Paper / Cobalt | `#F5F4EF` / `#102033` | `#2556D8` / `#FFFFFF` | 명료한 편집, 기술 신뢰 | 14.94 / 6.17 |
| Midnight / Cyan | `#07131F` / `#E8F4F8` | `#5BD6E8` / `#07131F` | 정밀 장비, 차가운 빛 | 16.69 / 10.90 |
| Aubergine / Magenta | `#1B1020` / `#F7EAF2` | `#E05A9D` / `#1B1020` | 문화, 뷰티, 야간 무대 | 15.77 / 5.36 |
| Silver / Steel | `#E8EBEF` / `#18202A` | `#536A86` / `#FFFFFF` | 산업 제품, 촉각 UI | 13.73 / 5.56 |
| Cream / Vermilion | `#F7F2E8` / `#1C1917` | `#C9362B` / `#FFFFFF` | 출판, 전시, 강한 신호 | 15.67 / 5.19 |
| Sand / Plum | `#F3EDE3` / `#2A1D2E` | `#7C4D9E` / `#FFFFFF` | 공예, 웰니스, 조용한 개성 | 13.73 / 6.15 |
| Porcelain / Signal Yellow | `#FAFAF7` / `#191919` | `#E4B700` / `#191919` | 정보 디자인, 낙관적 기능성 | 16.81 / 9.27 |
| Deep Navy / Violet | `#080D24` / `#F3F5FF` | `#8B78FF` / `#080D24` | 우주, 공연, 디지털 깊이 | 17.67 / 5.70 |

### 조건부 레인

| 레인 | 배경 / 전경 | 액센트 / on-accent | 허용 조건 |
|---|---|---|---|
| Forest / Mint | `#07150F` / `#EFFAF3` | `#3CCB8B` / `#07150F` | 환경, 생명과학, 상태 모니터링, 명시적 브랜드색 |
| Parchment / Orange | `#FAF3EA` / `#21170F` | `#C54A16` / `#FFFFFF` | 산업 신호, 물류, 에너지, 명시적 브랜드색 |

## 표현형 방향 아키타입 8종

이 아키타입은 완성 레시피가 아니라 **구성과 모션을 고르는 출발점**입니다. 색·폰트의 정본은
선택한 레시피 또는 위 색상 레인을 DESIGN.md로 컴파일해 고정합니다.
Data Instrument, Faceted Directory, Agent Workbench, Waiting State에는 아래 표현형 아키타입을
그대로 씌우지 말고 coder-interface 플레이북의 기능형 방향 카드를 사용합니다.

| 방향 | 구성 | 기억 장치 | 권장 레인 | 모션 |
|---|---|---|---|---|
| Monumental Mono | 화면 가장자리에 걸리는 좌측 정렬 대형 타이포 | 서로 어긋난 3줄 제목 | Graphite / Oxblood | 짧은 단어 stagger |
| Lunar Alloy Portfolio | 중앙 오브젝트 + 양쪽 메타 + 가로 작업 밴드 | 자석처럼 반응하는 3D/제품 오브젝트 | Silver / Steel | magnetic hover + 느린 marquee |
| Editorial Cinema | 풀블리드 미디어 위 하단 8/4 그리드 | 화면 폭을 채우는 워드마크 | Cream / Vermilion | masked word pull-up |
| Daylight Epoch | 밝은 둥근 스테이지 + 하단 내비 도크 | 콘텐츠 아래에 떠 있는 도크 | Paper / Cobalt | fade-slide + 도크 진입 |
| Spectral Glass | 어두운 무대 + 하나의 반투명 셸 | 한 곳에만 집중된 glass material | Midnight / Cyan | blur-in + 미세 parallax |
| Brand Playground | 색·타입·버튼·카드를 편집 지면처럼 전개 | 실제 컴포넌트 상태를 전시 | Porcelain / Signal Yellow | tactile active + hover swap |
| Cosmic Loader | 짧은 로더 뒤 전체 화면 미디어 | 카운터 또는 단어 교대 로더 | Deep Navy / Violet | progress reveal + page transition |
| Quiet Tactile | 넓은 여백과 얕은 입체 표면 | 눌리는 컨트롤과 재질 그림자 | Sand / Plum 또는 Silver / Steel | press feedback만 |

## 서로 다른 3안 만드는 법

같은 카드 그리드에 색만 바꾼 것은 3안이 아닙니다. 다음 축 중 최소 4개가 달라야 합니다.

| 축 | A | B | C |
|---|---|---|---|
| 기본 모드 | 밝음 | 어두움 | 재질 중심 중간톤 |
| 구성 | 편집 그리드 | 풀블리드 장면 | 오브젝트 중심 |
| 타이포 | 산세리프 기하 | 세리프 대비 | 모노/유틸리티 |
| 색상 계열 | 차가운 색 | 따뜻한 비주황 색 | 중립 |
| 모션 | 정적/촉각 | 리빌 | 스크롤/마퀴 |
| 밀도 | 여유 | 중간 | 통제된 고밀도 |

후보 카드에는 반드시 `이 방향은 무엇이 아닌가`를 한 줄 씁니다. 사용자가 고른 뒤에는
전체 재생성하지 않고 레이아웃을 고정한 채 액센트, 표면, 모션 중 1~2개만 변형합니다.

## 구현 인계용 압축 카드

```text
DIRECTION — Daylight Epoch
MEMORY — 밝은 미디어 스테이지 아래 떠 있는 하단 도크
COMPOSITION — 12열, 좌 7열 제목/본문, 우 5열 미디어, 도크는 하단 중앙
TYPE — DESIGN.md heading/body/label 토큰
COLOR — Paper / Cobalt; 액센트 면적 8% 이하
MATERIAL — 무광 종이 + 얇은 유리 도크 1곳
MOTION — 본문 fade-slide 600ms, 도크 120ms 지연, reduced-motion은 즉시 표시
NEGATIVE — 중앙 hero, 주황/초록 기본값, 3열 카드, 장식 블롭, 전면 glass
SUCCESS — 첫 화면에서 제목·미디어·도크의 세 층이 즉시 구분됨
```
