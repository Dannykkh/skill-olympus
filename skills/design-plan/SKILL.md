---
name: design-plan
description: >
  아프로디테 디자인 오케스트레이터. 사이트 벤치마크 해부, 사용자 과업·메시지·CTA·신뢰·모바일
  변환을 담은 Experience Contract, 실제 렌더 방향 탐색, DESIGN.md, 구현, 미학·UX·성능·접근성
  검증과 학습까지 프론트 디자인 전 과정을 수행합니다. /aphrodite, 아프로디테, 디자인 계획,
  프론트 디자인 요청에 사용합니다.
---

# Aphrodite — Experience-led Frontend Design

아프로디테는 색과 컴포넌트를 고르는 스킬이 아닙니다. 사용자가 이해하고 행동하고 신뢰하고
실패에서 회복하는 흐름을 아름다운 시각 언어로 구현하는 디자인 하네스입니다.

## Quick Start

```text
/aphrodite
/aphrodite --plan-only
/aphrodite --review-only
/aphrodite --benchmark <URL-or-file>
/aphrodite --stitch
```

## 성공 정의

다음 네 가지가 함께 통과해야 완료입니다.

1. **이해**: 첫 접촉에서 목적, 핵심 메시지, 다음 행동을 알 수 있음
2. **사용**: 주요 과업, 상태, 오류 회복, 모바일 흐름이 실제로 작동함
3. **아름다움**: 구도, 비례, 리듬, 타이포, 재질, 모션에 하나의 의도가 있음
4. **품질**: 접근성, 성능, 반응형, 구현 정합성이 기준을 충족함

금지 규칙을 지켰다는 사실만으로 아름답다고 판정하지 않습니다. 산출물을 모두 만들었다는 사실만으로
좋은 UX라고 판정하지 않습니다.

## 정본과 역할 경계

| 정본·담당 | 소유하는 결정 |
|---|---|
| `DESIGN.md` | 색, 타이포, 간격, 표면, 컴포넌트 외관, 모션 원칙 |
| Experience Contract | 과업, 메시지, CTA, 신뢰, 상태, 모바일 변환 |
| Layout Blueprint | 페이지별 블록 순서, 그리드, anatomy, 첫 뷰포트 |
| Aphrodite | UX 행동 명세, 상태 표현, 시각 구현, 렌더 비평 |
| 앱 구현 파이프라인 | 라우팅, 상태 관리, 데이터, API, 비즈니스 로직 |
| Stitch | 승인된 계약을 실행하는 선택적 생성 백엔드와 원격 상태 |

아프로디테는 비즈니스 로직을 직접 소유하지 않지만, 사용자가 보는 loading·empty·error·success,
행동 피드백, 오류 회복의 설계 책임은 가집니다. 구현 담당자는 이 계약을 실제 기능에 연결합니다.

## Phase Map

```text
Phase 0  Route        입력·기존 자산·벤치마크 유무 판별
Phase 1  Discover     사용자·과업·근거·레퍼런스 확보
Phase 2  Architect    IA + 과업 흐름 + 메시지·CTA·신뢰 + 상태
Phase 3  Explore      실제 렌더 3방향 탐색 + 시각 시스템 확정
Phase 4  Contract     레이아웃·모바일 변환·Experience Contract 고정
Phase 5  Build        계약 컴파일 → 구현 → 렌더 비평 → 구조/변형 수정
Phase 6  Validate     미학·과업·벤치마크·접근성·성능 검증
Phase 7  Evolve       성공·실패 근거 적립과 검증된 원리 승격
```

## Phase 0: Route

### 0-1. 기존 자산 확인

다음 순서로 확인합니다.

```text
DESIGN.md
docs/design-refs/*-experience-*.md
docs/design-refs/*-benchmark-*.md
docs/design-refs/*-direction-*.md
docs/design-refs/*-layout-*.md
design-system.md / design-tokens.json
tailwind.config.* / theme.* / CSS variables
```

`DESIGN.md`가 있다는 이유만으로 Phase 1~5를 건너뛰지 않습니다. 다음을 분류합니다.

- brief·과업·벤치마크·화면 구조가 같음: 변경 범위만 delta audit
- 위 항목 중 하나가 바뀜: 관련 Phase부터 재실행
- 기존 결과가 못생기거나 UX 문제가 있음: Phase 1의 가정과 Phase 3의 방향부터 재검토
- `--review-only`: Phase 6만 실행하되 필요한 정본이 없으면 신뢰도 제한을 보고

### 0-2. 입력 경로 선택

| 조건 | 경로 |
|---|---|
| URL·스크린샷·영상·HTML 벤치마크 있음 | reference-driven |
| 벤치마크 없음, 신규 디자인 | product-derived |
| 승인된 디자인의 국소 변경 | delta |
| Stitch 프로젝트 | 위 경로로 설계 확정 후 Stitch adapter |

벤치마크가 있으면 [site-benchmark-guide.md](references/site-benchmark-guide.md)의 Gate A~F를
통과하기 전 구현하지 않습니다. 모든 항목을 관찰하되 전부 복제하지 않고 Adopt·Adapt·Avoid로
판정합니다.

## Phase 1: Discover

### 1-1. 디자인 브리프

요구에 이미 있는 내용은 다시 묻지 않습니다. 빠진 것만 확인하고
`docs/design-refs/YYYY-MM-DD-brief-{slug}.md`에 저장합니다.

- 무엇을 만드는가
- 누가 어떤 상황에서 사용하는가
- 최우선 과업과 완료 조건은 무엇인가
- 사용자가 망설이거나 불신하는 지점은 어디인가
- 기술·콘텐츠·브랜드·접근성 제약은 무엇인가
- 관찰 가능한 성공 기준은 무엇인가

요구사항 자체가 불명확하면 `zephermine`에 인계합니다. 아프로디테는 디자인에 필요한 경험 가정을
확정합니다.

### 1-2. 벤치마크와 레퍼런스

레퍼런스가 있으면 다음 파일을 순서대로 읽습니다.

1. [reference-capture-guide.md](references/reference-capture-guide.md) — URL·스크린샷·영상·HTML 증거 확보
2. [site-benchmark-guide.md](references/site-benchmark-guide.md) — 구조·메시지·반응형·품질 해부

산출물은 `docs/design-refs/YYYY-MM-DD-benchmark-{slug}.md`입니다. 색·폰트만 기록한 분석은
실패입니다. 헤더, 핵심 메시지, 섹션 순서, CTA, 신뢰, 상태, 데스크톱→모바일 변환을 포함합니다.

레퍼런스가 없으면 제품 세계의 실물·도구·유물·어휘에서 색, 구조, 카피, 미디어의 근거를 유도합니다.
카테고리 클리셰를 제품 근거로 착각하지 않습니다.

## Phase 2: Architect the Experience

페이지보다 사용자 과업을 먼저 설계합니다.

### 2-1. 페이지·내비게이션

- 화면·페이지 목록과 각 페이지의 단일 임무
- 전역 내비게이션, 2차 내비게이션, 페이지 내 앵커
- primary action과 현재 위치 신호
- 페이지가 3개 이상이면 `mermaid-diagrams`로 사이트맵 생성

산출물: `docs/design-refs/YYYY-MM-DD-sitemap-{slug}.md`

### 2-2. 과업·메시지 흐름

기능형 화면은 `입력→처리→진행 상태→결과→오류 회복`, 표현형 화면은
`약속→설명→증거→신뢰→행동` 순서를 설계합니다.

- 정상 경로만이 아니라 loading·empty·error·success·permission·stale 상태를 정의
- CTA의 정확한 문구, 목적지, 등장·반복 시점 정의
- 사용자의 불안 직전에 검증 가능한 신뢰 근거 배치
- 근거 없는 고객 수치·후기·배지 생성 금지

### 2-3. Experience Contract 초안

[experience-contract-guide.md](references/experience-contract-guide.md)의 필수 템플릿으로
`docs/design-refs/YYYY-MM-DD-experience-{slug}.md`를 작성합니다. 벤치마크 모드면 근거 파일과
Adopt·Adapt·Avoid를 포함합니다.

## Phase 3: Explore Direction and System

### 3-1. Interface Mode

핵심 행동을 기준으로 다음 중 하나를 고릅니다.

| Mode | 우선 설계 |
|---|---|
| Data Instrument | 검색·KPI·변화·표·anomaly |
| Faceted Directory | 검색·필터·비교·결과 |
| Agent Workbench | 지속 pane·task·terminal·review 상태 |
| Waiting State | 단계·진행·취소·복구 |
| Effect Stage | bounded preview·설정·코드 |
| Expressive Landing | 메시지·신뢰·전환·signature 장면 |

기능형 5종은
[coder-interface-pattern-playbook.md](../frontend-design/references/coder-interface-pattern-playbook.md)를
읽고 정보 구조와 효과 예산을 먼저 고정합니다.

### 3-2. 실제 렌더 방향 탐색

[render-critique-loop.md](references/render-critique-loop.md)의 필수 조건에 해당하면 텍스트 카드만
제시하지 않고 서로 다른 실제 화면 3안을 렌더합니다.

- 동일한 실제 카피·데이터·상태 사용
- 구성·위계·명도·타입·재질·모션 중 최소 4축 차이
- 데스크톱 대표 화면 + 모바일 핵심 화면 포함
- 스크린샷만 먼저 보고 이해·구도·리듬·제품성·신뢰·모바일을 비평

선택 결과와 탈락 이유를 각각 `direction`과 `critique` 파일에 저장합니다. 실제 렌더를 만들지 않은
경우 생략 근거를 기록합니다.

### 3-3. 시각 시스템

`frontend-design`을 읽고 다음 순서로 확정합니다.

1. 선택된 방향과 제품 근거
2. 맞는 스타일 레시피 1개 또는 제품 유도 방향
3. 지배색 1 + 액센트 1, 실제 대비
4. 한글 글리프를 실제 로드하는 폰트 시스템
5. 밀도·간격·라운드·표면·모션 예산
6. 기억에 남을 signature 요소 정확히 1개

색·폰트 DB는 폴백이지 디자인의 출발점이 아닙니다. 값과 근거를
[design-md-guide.md](references/design-md-guide.md) 스키마의 루트 `DESIGN.md`에 저장합니다.

## Phase 4: Contract the Layout and Behavior

### 4-1. Layout Blueprint

[layout-block-anatomy.md](../frontend-design/references/layout-block-anatomy.md)를 사용해 페이지별로
다음을 고정합니다.

- 블록 순서와 각 블록이 답하는 사용자 질문
- 필수 요소, 잉크 위계, 강조 1개, CTA 문법
- 첫 뷰포트와 스크롤 중 밀도 변화
- 기능형 화면의 pane·표·필터·상태 위치
- 사용 가능한 scaffold와 적용 범위

산출물: `docs/design-refs/YYYY-MM-DD-layout-{slug}.md`

### 4-2. Responsive Transformation

데스크톱 요소마다 `retain/reorder/compress/collapse/defer/replace/sticky/remove` 중 하나와 이유를
Experience Contract에 기록합니다. `모바일은 1열 stack`만 있으면 실패입니다.

### 4-3. 계약 검증

Experience Contract를 완성하고 다음을 실행합니다.

```bash
python <DESIGN_PLAN_SKILL_DIR>/scripts/validate_experience_contract.py \
  docs/design-refs/YYYY-MM-DD-experience-{slug}.md
```

검증 실패 시 구현으로 넘어가지 않습니다. 이 스크립트는 완성도를 검사하며 아름다움과 사용성은
Phase 5~6의 실제 렌더로 검증합니다.

## Phase 5: Build and Critique

### 5-1. 구현 전 소비 게이트

코드를 쓰기 전에 존재하는 다음 파일을 모두 읽습니다.

1. 루트 `DESIGN.md` 전체
2. 최신 brief·benchmark·experience·sitemap·direction·critique·layout
3. 선택된 style recipe와 Interface Mode playbook

Experience Contract의 `Prompt Contract`를 구현 지시로 사용합니다. `예쁘게`, `모던하게` 같은
소원으로 대체하지 않습니다.

### 5-2. 구현 어댑터

- 로컬: `frontend-design`으로 기존 스택과 컴포넌트 규칙에 맞게 구현
- Stitch: `/stitch generate|edit|variants`로 같은 계약 실행
- Stitch loop: 사이트맵을 `.stitch/SITE.md` 실행 상태로 파생
- Stitch react: 결과를 기존 React 구조에 반영

Stitch는 디자인 정책을 다시 결정하지 않습니다. 루트 `DESIGN.md`와 `docs/design-refs/`가 정본이고
`.stitch/`는 원격 ID·다운로드·재개 상태만 소유합니다.

### 5-3. 구현 로그

페이지·작업당 하나의 `docs/design-refs/YYYY-MM-DD-impl-log-{slug}.md`에 실제 Prompt Contract,
변경 범위, 보존 영역, 구현 중 계약 변경을 누적합니다.

### 5-4. Baseline-worthiness gate

첫 결과에서 바로 레이아웃·위계·카피를 고정하지 않습니다.

- 구조·메시지·모바일 흐름이 좋음: 보존 영역 선언 후 변수 1~2개 variants
- 구조·메시지가 나쁨: 섹션 순서·레이아웃·카피·CTA·신뢰 위치까지 수정 후 재렌더

[render-critique-loop.md](references/render-critique-loop.md)를 따르고 실제 스크린샷을 봅니다.
HTML 정적 검사만으로 시각 충실도를 선언하지 않습니다.

## Phase 6: Validate the Experience

### 6-1. Benchmark conformance

벤치마크 모드면 [site-benchmark-guide.md](references/site-benchmark-guide.md)의 Gate E~F를 실행합니다.
픽셀 유사성이 아니라 Adopt·Adapt 결정, 데스크톱·모바일 변환, 제품 적용 근거를 대조합니다.

### 6-2. 미학 비평

`ui-ux-designer`를 필수 비평 단계로 사용합니다. 다음을 실제 렌더로 평가합니다.

- 시각 논지와 제품 고유성
- 메시지·CTA·신뢰의 위계
- 구도·비례·여백·밀도·리듬
- 타이포·색·재질·모션의 일관성
- signature 장면과 주변 요소의 절제
- 모바일에서의 재구성 품질

AI Slop이 없다는 것만으로 통과시키지 않습니다.

### 6-3. 과업·상태 검증

주 과업을 시작→진행→완료와 실패→복구 두 경로로 실행합니다. 사이트맵, Experience Contract,
실제 내비게이션과 상태가 일치해야 합니다.

### 6-4. 품질 검증

1. `ui-ux-auditor` — 반응형, 다크모드, 접근성, 성능, 폼, 내비, 타이포, 모션, AI Slop
2. `web-design-guidelines` — Web Interface Guidelines
3. 데스크톱·모바일 × 지원 테마 스크린샷 관찰
4. 키보드·포커스·레이블·상태 알림·reduced-motion 확인
5. 실제 이미지·폰트·영상·스크립트로 성능 측정
6. `DESIGN.md` lint는 대화형일 때만 보조 신호로 사용. 헤드리스 무출력은 통과로 간주하지 않음

자동 수정→재검증은 최대 2라운드입니다. 남은 문제는 숨기지 않고 잔여 이슈로 보고합니다.

## Phase 7: Evolve

프로젝트 결과는 다음 실행의 근거가 되지만 한 번의 성공으로 전역 규칙을 바꾸지 않습니다.

1. `critique`와 구현 로그에 성공·실패·사용자 피드백·측정 결과 기록
2. 재사용 가능한 후보를 Adopt·Adapt·Avoid와 함께 분리
3. 서로 다른 과제에서 반복된 원리만 승격 후보로 표시
4. 전역 스킬 변경은 `skill-evolve`가 gotcha/learned를 체크리스트로 만들고 사용자의 승인을 받은 뒤
   `autoresearch`로 한 번에 하나씩 비교
5. 기준점보다 나빠지면 변경을 승격하지 않음

아프로디테가 자기 결과를 보고 즉시 자기 규칙을 수정하게 하지 않습니다. 관찰, 비교, 사용자 승인,
회귀 방지가 진화의 하네스입니다.

## Completion Evidence

완료를 보고하려면 적용 가능한 항목이 모두 있어야 합니다.

- brief와 Source Mode
- 벤치마크가 있으면 캡처 근거와 Adopt·Adapt·Avoid
- Experience Contract 검증 통과
- 선택된 방향의 실제 렌더 또는 생략 근거
- `DESIGN.md`와 Layout Blueprint
- 데스크톱·모바일 구현 스크린샷
- 미학 비평과 주 과업 검증
- 접근성·성능·가이드라인 결과
- 잔여 이슈와 다음 진화 후보

## Options

| 옵션 | 동작 |
|---|---|
| `--plan-only` | Phase 0~4 실행 |
| `--review-only` | Phase 6 실행 |
| `--benchmark <source>` | reference-driven 경로 강제 |
| `--stitch` | 승인된 계약을 Stitch adapter로 실행 |
| `--no-review` | Phase 6 생략. 결과에 검증 미완료 표시 |
| `--no-lint` | DESIGN.md 보조 lint만 생략 |
| `--export` | DESIGN.md를 Tailwind/DTCG로 파생 |
| `--skip-ia` | 단일 컴포넌트일 때 사이트맵만 생략. 과업·상태·계약은 유지 |

## Direct References

| 파일 | 읽는 시점 |
|---|---|
| [reference-capture-guide.md](references/reference-capture-guide.md) | URL·스크린샷·영상·HTML 증거 확보 |
| [site-benchmark-guide.md](references/site-benchmark-guide.md) | 벤치마크 사이트가 있을 때 필수 |
| [experience-contract-guide.md](references/experience-contract-guide.md) | 모든 신규·재설계 작업의 경험 계약 |
| [render-critique-loop.md](references/render-critique-loop.md) | 방향 탐색과 첫 구현 비평 |
| [design-md-guide.md](references/design-md-guide.md) | DESIGN.md 생성·마이그레이션·export |
| [frontend-design/SKILL.md](../frontend-design/SKILL.md) | Phase 3·5 시각 방향과 구현 |
| [layout-block-anatomy.md](../frontend-design/references/layout-block-anatomy.md) | Phase 4 구조 계약 |
| [coder-interface-pattern-playbook.md](../frontend-design/references/coder-interface-pattern-playbook.md) | 기능형 Interface Mode |
| [motion-first-prompt-playbook.md](../frontend-design/references/motion-first-prompt-playbook.md) | 표현형 방향과 모션 문법 |
