# Coder Interface Pattern Playbook

> 코더용 제품 UI를 랜딩 페이지 문법으로 덮어쓰지 않기 위한 기능형 인터페이스 가이드입니다.
> 화면 유형을 먼저 판별한 뒤 정보 구조, 밀도, 상태, 모션 예산을 결정합니다.
>
> 조사 기준: 2026-07-17에 아래 공개 사이트와 공식 저장소를 확인했습니다. 외부 카피, 미디어,
> 컴포넌트 코드를 이 스킬에 복제하지 않고 관찰 가능한 구조와 선택 규칙만 새로 정리했습니다.

## 언제 읽는가

- 대시보드, 랭킹, 모니터링, 분석 도구를 디자인할 때
- 검색·필터·분류가 핵심인 디렉터리나 마켓플레이스를 만들 때
- 터미널, 에디터, 브라우저, 작업 큐가 공존하는 개발자 도구를 만들 때
- 로딩·실행 중·대기·완료 상태를 설계할 때
- React Bits 같은 효과 라이브러리를 실제 제품에 도입할지 판단할 때
- "예쁜 랜딩"보다 빠른 스캔, 비교, 조작, 상태 파악이 중요한 화면일 때

## 조사 소스와 흡수 경계

| 소스 | 관찰 유형 | 흡수할 것 | 그대로 가져오지 않을 것 |
|---|---|---|---|
| [TraceDR](https://tracedr.com/) | 데이터 도구 | 검색→핵심 지표→변동→랭킹의 짧은 정보 흐름, 숫자 정렬, sparkline, 24시간 갱신 표기 | 브랜드 카피·색상·도메인 데이터. 공개 소스 라이선스는 확인하지 못했으므로 시각 관찰만 |
| [API Finder](https://apifinder.io/) / [공식 저장소](https://github.com/venelinkochev/apifinder) | 검색 디렉터리 | 결과 수, 다중 필터, 인증/CORS/가격 메타데이터, 카테고리 수, 기여 흐름 | 균일 3열 카드를 모든 디렉터리의 기본값으로 사용, 주황 상태색을 브랜드 액센트로 확대 |
| [Orca](https://www.onorca.dev/) / [공식 저장소](https://github.com/stablyai/orca) | 에이전트 워크벤치 | 프로젝트·worktree·agent·terminal·editor·browser의 지속 문맥, 상태 우선순위, 데스크톱과 모바일의 역할 분리 | 마케팅 페이지의 중앙 대형 hero를 IDE 본체 레이아웃으로 오해 |
| [Colorion CSS Loaders](https://cssloaders.colorion.co/) / [공식 저장소](https://github.com/ckissi/colorion-css-loaders) | 상태 모션·프롬프트 | pure CSS, 단일 색 토큰, 정확한 마크업/모션 계약, reduced-motion, 99개 변형을 하나의 체계로 전시하는 방식 | 로더를 장식용 브랜드 마스코트처럼 남용, 기다림의 이유·진행률을 숨김 |
| [React Bits](https://reactbits.dev/) / [공식 저장소](https://github.com/DavidHDev/react-bits) | 창의적 컴포넌트·효과 | 효과를 bounded preview stage에 격리, Preview/Code/Customize 분리, 텍스트·배경·컴포넌트·상호작용 카테고리 | 보라/검정 사이트 팔레트, 여러 WebGL/커서/텍스트 효과의 동시 사용, 라이브러리가 디자인 방향을 대신하게 함 |

### 라이선스 경계

- API Finder, Orca, Colorion CSS Loaders는 조사 시점 공식 저장소에서 MIT로 표기되었습니다.
- React Bits는 `MIT + Commons Clause`입니다. 애플리케이션·웹사이트·제품 안에서의 사용은
  허용하지만 컴포넌트 자체의 판매·재배포에는 제한이 있습니다. 실제 채택 시 최신
  [LICENSE](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md)를 다시 확인하고
  저작권 고지를 보존합니다.
- 이 플레이북은 외부 코드를 배포물에 포함하지 않습니다. 구현 시에도 먼저 프로젝트의
  기존 컴포넌트와 CSS로 재현 가능한지 판단합니다.

---

## 1. 페이지 유형 게이트

스타일 이름보다 먼저 아래 다섯 유형 중 **주 유형 하나**를 고릅니다. 혼합 제품도 첫 화면의
주요 사용자 행동을 기준으로 하나를 선택하고, 나머지는 보조 모듈로 둡니다.

| 유형 | 사용자의 첫 행동 | 핵심 성공 기준 | 기본 모션 예산 |
|---|---|---|---|
| Data Instrument | 검색, 지표 확인, 순위·변동 비교 | 5초 안에 현재값과 변화 원인을 읽음 | 낮음 |
| Faceted Directory | 검색, 필터, 결과 비교, 상세 진입 | 필터 조건과 결과 수가 항상 명확함 | 낮음 |
| Agent Workbench | 작업 선택, agent 관찰·지시, 파일/터미널 전환 | 현재 문맥과 다음 조치가 끊기지 않음 | 낮음~중간 |
| Waiting State | 비동기 작업의 진행·대기·완료 파악 | 기다리는 이유와 취소·복구 방법을 앎 | 상태에 비례 |
| Effect Stage | 효과 탐색, 설정 변경, 코드 확인 | 효과와 콘텐츠가 분리되어 평가 가능 | 중간~높음, 격리 |

### 빠른 판별 질문

1. 화면의 가치가 숫자 변화와 비교에 있으면 `Data Instrument`.
2. 사용자가 후보군을 줄이는 일이 핵심이면 `Faceted Directory`.
3. 여러 작업 문맥을 동시에 유지해야 하면 `Agent Workbench`.
4. 화면이 다른 작업의 완료를 기다리기 위한 것이라면 `Waiting State`.
5. 효과 자체를 보고 조절하는 것이 목적일 때만 `Effect Stage`.

**실패 조건**: 제품의 주 행동이 검색·비교·조작인데 첫 뷰포트 절반 이상을 vague hero와
장식 모션이 차지하면 유형 판별이 잘못된 것입니다.

---

## 2. Data Instrument — 랭킹·모니터링·분석 도구

### 정보 구조

```text
Utility header
Primary query/action
Compact KPI strip
Fast movers / anomalies
Dense comparison table
Freshness + data provenance
```

- 첫 화면에 사용자가 직접 조작할 검색·조회 액션을 둡니다.
- KPI는 2~4개만. 총량, 평균, 변화, 이상치처럼 서로 다른 질문에 답해야 합니다.
- 요약 카드 다음에는 실제 비교 가능한 표나 정렬 리스트가 와야 합니다.
- `updated 2m ago`, `24h refresh`, 데이터 출처처럼 **신뢰 메타데이터**를 숨기지 않습니다.

### 구성

- 페이지 폭을 지배하는 가시적 그리드와 얇은 구분선으로 열 구조를 드러냅니다.
- 큰 카드 여러 장보다 KPI strip + 표의 대비가 데이터 위계를 더 잘 만듭니다.
- sparkline은 축을 대신하는 장식이 아니라 방향·급변·평탄함을 읽게 하는 보조 증거입니다.
- 표의 열 순서는 `정체성 → 추세 → 핵심값 → 변화 → 보조값`을 기본으로 합니다.

### 타입과 숫자

```css
.metric,
.data-table {
  font-variant-numeric: tabular-nums lining-nums;
}
```

- 숫자는 우측 정렬하고 단위·소수 자릿수를 열마다 통일합니다.
- 변화는 색만 쓰지 말고 `+`, `−`, 화살표, 텍스트를 함께 사용합니다.
- 라벨은 작아도 되지만 대비와 자간으로 정보가 사라지지 않게 합니다.

### 색과 모션

- 브랜드 액센트는 검색 CTA, 선택된 열, 핵심 sparkline 정도에만 사용합니다.
- 상승·하락·경고색은 **국소 semantic signal**입니다. 페이지 전체를 초록/빨강으로 물들이지 않습니다.
- 초기 숫자 카운트업은 정확한 비교를 늦추므로 기본 금지입니다.
- 허용 모션: 새 데이터 행 강조, 정렬 전환, sparkline 업데이트, 상태 점멸. 모두 150~300ms
  범위의 짧은 피드백으로 끝냅니다.

### Responsive

- 모바일에서는 KPI를 2열 또는 가로 스크롤 strip으로, 표는 핵심 열만 남기고 행 상세 drawer로 보냅니다.
- 열을 무작정 줄이지 말고 사용자가 비교하는 핵심값 2~3개를 먼저 고릅니다.
- sparkline과 변화값을 한 묶음으로 유지합니다.

### 금지

- 숫자마다 독립된 둥근 카드와 큰 그림자
- 상승을 초록 배경 전체로, 하락을 빨강 배경 전체로 표시
- 표를 카드 그리드로 바꿔 수평 비교를 깨뜨림
- freshness·출처·빈 상태를 생략

---

## 3. Faceted Directory — API·도구·자료 검색

### 정보 구조

```text
Title + total result count
Search
Primary facets
Active filter summary
Featured/sponsored boundary
Results
Pagination or load-more
Category overview / contribution path
```

- 검색어, 필터, 정렬, 페이지를 URL 상태로 보존할 수 있게 설계합니다.
- 필터 라벨에는 `Any`보다 사용자가 고르는 속성명을 먼저 보여줍니다.
- 활성 필터는 입력 컨트롤 안에서만 보이지 않게 하지 말고, 제거 가능한 요약으로 다시 노출합니다.
- 결과 수는 검색·필터 변화와 함께 즉시 갱신합니다.

### 카드와 리스트 선택

| 결과 특성 | 권장 표현 |
|---|---|
| 로고 + 짧은 설명 + 2~4개 badge | compact card 또는 list |
| 속성 비교가 핵심 | table/list |
| 이미지가 제품 선택을 좌우 | media card |
| 카테고리 수가 많고 설명이 짧음 | category index |

균일 3열 카드는 콘텐츠가 실제로 독립 단위일 때만 사용합니다. 인증, CORS, 가격, 카테고리처럼
같은 속성을 빠르게 비교해야 한다면 수평 정렬이 유지되는 list/table이 더 적합합니다.

### 필터 바

- 넓은 화면: 검색을 첫 줄 전체, 주요 facet을 둘째 줄에 배치하거나 검색+facet을 한 줄로 묶습니다.
- 좁은 화면: 검색은 고정 노출, 나머지는 `Filters (N)` sheet로 이동합니다.
- sticky filter를 쓰면 결과 제목과 첫 행을 가리지 않는 높이·offset을 명시합니다.
- theme toggle, GitHub, 제출 CTA 같은 보조 도구는 검색보다 시각 우선순위를 낮춥니다.

### 상태

- `loading`: 기존 결과를 전부 지우지 말고 opacity 또는 skeleton으로 문맥을 유지합니다.
- `zero results`: 적용 필터 요약 + 한 번에 초기화 + 검색어 수정 제안을 제공합니다.
- `error`: 재시도와 마지막 성공 결과 시점을 함께 보여줍니다.
- `featured`: 유료/추천 여부를 명확히 표시하고 일반 결과와 경계를 둡니다.

### 모션

- filter 적용, 결과 재배치, drawer 진입만 짧게 애니메이트합니다.
- 카드마다 서로 다른 hover 효과를 주지 않습니다.
- 결과가 바뀔 때 스크롤과 키보드 포커스를 예측 가능하게 유지합니다.

### 금지

- 필터보다 큰 마케팅 hero
- badge 색을 브랜드 팔레트처럼 확장
- featured와 일반 결과를 구분하지 않음
- 결과 100개 이상을 애니메이션 카드로 한 번에 마운트

---

## 4. Agent Workbench — IDE·오케스트레이터·운영 콘솔

### 공간 모델

```text
Global rail
Project / worktree navigator
Primary task or conversation pane
Terminal / editor / browser split
Context inspector
Persistent status line
Command palette overlay
```

- 화면을 "카드 모음"이 아니라 **지속되는 작업 공간**으로 봅니다.
- 좌측은 정체성·탐색, 중앙은 현재 작업, 우측/하단은 증거·도구로 역할을 고정합니다.
- terminal, editor, browser는 같은 계층의 탭 또는 split으로 전환하되 현재 worktree 문맥을 잃지 않습니다.
- command palette는 어디서든 worktree, 파일, agent, 명령으로 이동하는 빠른 탈출구입니다.

### 상태 위계

최소 상태 모델:

```text
running
waiting-for-input
permission-required
failed
completed
unread
disconnected
```

- 점 색상만으로 구분하지 말고 아이콘·라벨·최근 활동을 함께 표시합니다.
- `permission-required`, `failed`, `waiting-for-input`처럼 사용자의 개입이 필요한 상태를
  단순 `running`보다 위에 배치합니다.
- agent 수, 경과 시간, branch/worktree, 마지막 명령을 같은 문맥 블록에서 읽을 수 있게 합니다.

### 밀도와 계층

- 12~14px 정보 라벨, 14~16px 작업 텍스트, 20~28px 화면 제목처럼 좁은 타입 스케일을 씁니다.
- 모노 폰트는 코드·경로·시간·키 조합에만 사용하고 모든 UI 텍스트를 모노로 만들지 않습니다.
- 구분선, 배경 명도 차, 선택 상태로 pane을 나눕니다. 각 pane에 큰 그림자를 쓰지 않습니다.
- resize handle은 가시적 hover/focus 상태와 최소 hit area를 가집니다.

### 모션

- 허용: pane open/close, split resize 피드백, unread 도착, active task 전환, command palette.
- 기본 금지: 배경 파티클, 지속 글로우, terminal 위 커서 추적, 모든 상태점 pulse.
- activity pulse는 실제 진행 중인 항목 일부에만 사용하고 reduced-motion에서는 정적 점으로 바꿉니다.

### Mobile

데스크톱 IDE를 축소해 넣지 않습니다. 모바일은 다음 네 작업에 집중합니다.

1. agent 상태 확인
2. 질문·권한 요청 응답
3. 짧은 follow-up 전송
4. 알림에서 문제 작업으로 복귀

파일 편집·다중 terminal split 같은 정밀 작업은 데스크톱으로 넘깁니다.

### 금지

- 모든 pane을 같은 크기·같은 강조도로 배치
- 상태 색을 브랜드 색으로 재사용
- worktree/branch 문맥을 탭 전환 때 숨김
- 모바일에 데스크톱 3-pane을 그대로 축소

---

## 5. Waiting State — 로더는 기다림의 정보 설계

### 상태 사다리

| 예상 시간 | 기본 표현 | 추가 정보 |
|---|---|---|
| 0~300ms | 아무 로더도 표시하지 않음 | 깜빡임 방지 |
| 300ms~2s | 작은 inline spinner/dots | 짧은 동사형 라벨 |
| 2~10s | skeleton 또는 contextual loader | 무엇을 처리 중인지 |
| 측정 가능 | determinate progress | 퍼센트·단계·남은 항목 |
| 10s 이상 | 단계 목록·로그·백그라운드 실행 | 취소·재시도·알림 |

- 콘텐츠 형태를 이미 알면 spinner보다 skeleton이 낫습니다.
- 진행률을 알 수 있는데 무한 spinner를 쓰지 않습니다.
- 장기 작업은 "작동 중" 애니메이션보다 현재 단계와 다음 단계를 설명합니다.

### 프롬프트 문법

Colorion의 공개 loader prompt 구조에서 가져올 핵심은 효과 이름이 아니라 **구현 계약의 순서**입니다.

```text
RESULT
- 어떤 상태에 쓰는 어떤 크기의 로더인지

MECHANISM
- shape, transform, timing, easing, loop를 정확히 명명

MARKUP
- 최소 DOM과 class/ARIA 계약

TOKENS
- currentColor 또는 단일 --ink, size, duration

CONSTRAINTS
- CSS only 여부, 의존성, 허용 속성

ACCESSIBILITY
- visible label, aria-busy/status, reduced-motion

SUCCESS
- 크기·색 변경 후에도 형태와 의미가 유지되는지
```

구현 기본값은 [`technique-recipes.md`의 Accessible Loading State](technique-recipes.md#10-accessible-loading-state)를
사용합니다.

### 금지

- 200ms 요청에 full-screen loader
- 텍스트 없이 spinner만 표시
- 완료되지 않는 progress 99%
- 로더마다 다른 색·easing·형태
- reduced-motion에서 의미까지 사라짐

---

## 6. Effect Stage — React Bits류 효과를 제품에 넣는 법

React Bits 공식 저장소는 조사 시점 140개 이상의 텍스트 애니메이션, 배경, UI 컴포넌트를
제공했습니다. 중요한 학습은 효과의 수가 아니라 **효과를 격리하고 조절 가능하게 전시하는 구조**입니다.

### 효과 예산

| 화면 유형 | 허용 기본값 |
|---|---|
| Data Instrument | 장식 효과 0, 상태 피드백만 |
| Faceted Directory | 장식 효과 0~1, hero가 있으면 정적 |
| Agent Workbench | 장식 효과 0, pane/state 전환만 |
| Marketing landing | 첫 뷰포트 signature effect 1 |
| Component docs/showcase | bounded preview stage마다 효과 1 |

다음 셋을 동시에 쓰지 않습니다:

- 인터랙티브 배경
- 커서 추적 효과
- 왜곡·분해 텍스트

하나를 기억 장치로 고르고 나머지는 정적으로 둡니다.

### 채택 게이트

효과를 복사하기 전에 아래 질문이 모두 `예`여야 합니다.

1. 이 효과가 정보 위계, 브랜드 기억, 입력 피드백 중 하나를 실제로 개선하는가?
2. CSS나 기존 Motion 의존성으로 더 단순하게 만들 수 없는가?
3. SSR/hydration, mount/unmount cleanup이 명확한가?
4. `prefers-reduced-motion`, coarse pointer, keyboard에서 정상적인가?
5. 저사양 모바일에서 정적 폴백이 있는가?
6. Canvas/WebGL이면 DPR cap, resize cleanup, offscreen pause가 있는가?
7. 새 의존성의 크기와 라이선스를 확인했는가?
8. 효과를 제거해도 콘텐츠와 CTA가 완전히 읽히는가?

하나라도 `아니오`면 효과를 채택하지 않거나 CSS-only 대안으로 낮춥니다.

### 복잡도 단계

| 단계 | 구현 | 허용 조건 |
|---|---|---|
| A | CSS transform/opacity/gradient | 기본 선택 |
| B | Motion/GSAP DOM animation | 시퀀스·layout transition이 필요 |
| C | Canvas/OGL/Three.js | 제품 정체성의 핵심 장면 1곳 |

### Bounded Preview Stage

효과 문서·설정 화면은 다음 구성을 사용합니다.

```text
Category navigation
Effect title + Preview/Code
Bounded preview stage
Live controls
Props / implementation notes
Performance + accessibility notes
```

- 배경 효과도 문서 전체가 아니라 preview stage 안에서만 실행합니다.
- 실제 콘텐츠를 함께 넣어 대비·가독성을 시험합니다.
- 설정은 색, 속도, 크기, 반응 강도처럼 결과에 직접 영향을 주는 값만 노출합니다.

### 금지

- 컴포넌트 라이브러리의 데모 팔레트를 프로젝트 브랜드로 채택
- 한 페이지에 서로 다른 물리 법칙의 효과 혼합
- `will-change`를 모든 요소에 상시 적용
- cleanup 없는 pointermove/requestAnimationFrame
- 라이선스 확인 없이 컴포넌트 소스를 배포 라이브러리에 재포장

---

## 7. 기능형 프롬프트 컴파일러

기존 motion-first 컴파일러 앞에 아래 블록을 추가합니다.

```text
INTERFACE MODE
- Data Instrument / Faceted Directory / Agent Workbench / Waiting State / Effect Stage

PRIMARY ACTION
- 사용자가 첫 5초 안에 수행할 조작 1개

INFORMATION ARCHITECTURE
- 화면에 계속 남아야 하는 문맥
- 비교해야 하는 필드
- 상세로 숨겨도 되는 필드

DENSITY
- low / medium / controlled-high
- 행 높이, 패널 수, 기본 노출 항목 수

STATE MODEL
- loading / empty / error / permission / disconnected / stale / success 중 필요한 것

EFFECT BUDGET
- 장식 효과 수
- 상태 모션 수
- 가장 무거운 구현 단계 A/B/C
```

그 뒤 GOAL, CONCEPT, COMPOSITION, TYPE, COLOR, MATERIAL, MOTION, RESPONSIVE,
NEGATIVE, SUCCESS CHECK를 채웁니다.

## 8. 방향 카드 예시

### Data Instrument

```text
MODE — Data Instrument
PRIMARY — 도메인을 검색하고 현재 순위와 7일 변화를 비교
COMPOSITION — 검색 1행 → KPI strip → anomaly strip → 2열 표
DENSITY — controlled-high, 행 44px, tabular numerals
COLOR — 중립 표면 + cobalt interaction + semantic delta만 국소 사용
MOTION — 정렬/업데이트 180ms, 장식 모션 없음
NEGATIVE — KPI 카드 그림자, 전체 초록 테마, 카운트업, 중앙 vague hero
```

### Faceted Directory

```text
MODE — Faceted Directory
PRIMARY — 검색과 필터로 후보를 10개 이하로 축소
COMPOSITION — 결과 수 → 검색 → facet → active filters → compact list
DENSITY — medium, 메타데이터 4필드 고정
COLOR — paper/cobalt, badge는 semantic neutral
MOTION — filter drawer와 결과 교체만
NEGATIVE — 3열 카드 강제, featured 혼동, 필터보다 큰 hero
```

### Agent Workbench

```text
MODE — Agent Workbench
PRIMARY — 개입이 필요한 agent를 찾고 follow-up
COMPOSITION — project rail 240px / task 38% / terminal-editor flexible / status bar
DENSITY — controlled-high, resizable panes
STATE — running, input, permission, failed, complete, unread
COLOR — near-black neutral + 선택 액센트 1 + semantic state
MOTION — command palette, pane transition, unread만
NEGATIVE — 배경 파티클, 모든 상태 pulse, 모바일 3-pane 축소
```

### Waiting State

```text
MODE — Waiting State
PRIMARY — 현재 단계 확인 또는 취소
STATE — 300ms 전 숨김, 이후 label, 10초 이상 단계/로그
TOKEN — currentColor + size/duration variables
MOTION — CSS transform only, reduced-motion 정적
NEGATIVE — 텍스트 없는 spinner, 가짜 99%, 전면 로더 남용
```

### Effect Stage

```text
MODE — Effect Stage
PRIMARY — 효과를 보고 값을 조절한 뒤 구현 방식을 선택
COMPOSITION — nav / preview stage / controls / code / perf notes
EFFECT BUDGET — stage당 1, 페이지 배경은 정적
COMPLEXITY — A 우선, C는 DPR cap + static fallback
NEGATIVE — 데모 팔레트 복제, 커서+배경+텍스트 효과 동시 사용
```

## 9. 최종 QA

- 페이지 유형과 첫 행동을 한 문장으로 설명할 수 있는가?
- 시각 효과를 전부 꺼도 주요 작업이 더 빠르거나 최소한 동일하게 가능한가?
- 숫자·결과·agent 상태를 색 없이도 구분할 수 있는가?
- 로딩, 빈 상태, 오류, 오래된 데이터, 연결 끊김을 각각 설계했는가?
- 모바일에서 데스크톱을 축소한 것이 아니라 핵심 작업을 재우선순위화했는가?
- 외부 컴포넌트의 의존성, cleanup, reduced-motion, 라이선스를 확인했는가?
- 초록·주황·보라가 레퍼런스 사이트에 있었다는 이유만으로 선택되지 않았는가?
