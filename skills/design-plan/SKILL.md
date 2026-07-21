---
name: design-plan
description: >
  디자인 오케스트레이터. 프론트엔드 디자인 계획 수립부터 구현, 리뷰까지
  디자인 관련 스킬을 순서대로 호출하여 일관된 디자인 품질을 보장.
  /aphrodite로 실행.
triggers:
  - "aphrodite"
  - "아프로디테"
  - "design-plan"
  - "디자인 계획"
  - "디자인 플랜"
  - "프론트 디자인"
auto_apply: false
---

# Aphrodite (아프로디테) — 디자인 오케스트레이터

> **아프로디테(Aphrodite)**: 미(美)의 여신.
> 디자인 관련 스킬을 순서대로 호출하여 일관된 디자인 품질을 보장합니다.

## Quick Start

```
/aphrodite                          # 전체 디자인 파이프라인
/aphrodite --plan-only              # 계획 단계만 (Phase 1~4, 구현 전까지)
/aphrodite --review-only            # 리뷰만 (Phase 6)
```

**공식 호출명:** `/aphrodite` (별칭: `아프로디테`, `디자인 계획`, `프론트 디자인`)

## 왜 이 순서인가 (실제 웹디자이너 프로세스 기준)

Discovery → IA/사이트맵 → UX(플로우+와이어프레임) → UI(비주얼) → 구현 → QA — 에이전시 웹디자인
프로세스 문헌(Clique Studios, UXPin 등)과 교차 확인한 순서입니다. 와이어프레임은 UX 앞이나
뒤의 별도 단계가 아니라 **UX 설계의 산출물**이고, IA(정보구조·사이트맵·메뉴구성)는 스타일
결정보다 먼저 와야 합니다 — 뭘 만들지 모르는데 색부터 정하면 안 됩니다. 2026-07-22 감사에서
구버전(리서치가 스타일 결정 뒤에 오고, 사이트 단위 IA 단계 자체가 없던 구조)의 갭 2가지를
확인하고 재배열했습니다.

## 디자인 스킬 맵

```
/aphrodite가 오케스트레이션하는 스킬:

  Phase 1: Discovery · 레퍼런스 자산화  → 제품/오디언스/근거 확인 → 레퍼런스 → 섹션 해부 슈퍼프롬프트
           (references/reference-capture-guide.md)
  Phase 2: IA · 사이트맵 · 메뉴구성     → 페이지 목록 → 내비 구조 → 페이지 관계(사이트맵)
           (mermaid-diagrams 병행, 페이지 3개+일 때)
  Phase 3: 화면 유형 + 방향 컴파일      → 기능형/표현형 판별 → 구체 방향 3안 → 레시피/색상/폰트 → DESIGN.md
           (coder-interface-pattern-playbook + motion-first + style-recipes/ + CSV DB)
  Phase 4: 레이아웃 청사진             → 블록 시퀀스 + 블록별 anatomy 계약 + ASCII 와이어프레임
           (frontend-design/references/layout-block-anatomy.md)
  Phase 5: frontend-design (구현)     → DESIGN.md 토큰 + 청사진 + 슈퍼프롬프트 + technique-recipes 기반 코딩
  Phase 6: design.md lint             → 기계 검증 (broken-ref/orphan/대비 4.5:1)
           ui-ux-auditor              → 9영역 감사 + 시각 검증 (스크린샷 관찰)
           web-design-guidelines      → 가이드라인 준수 체크

  보조:
  - /stitch loop                     → Stitch MCP 멀티페이지 (선택)
  - /stitch react                    → HTML → React 변환 (선택)
  - seo-audit                        → SEO/AEO/GEO 감사 (선택)
```

---

## CRITICAL: First Actions

### 1. Print Intro

```
Aphrodite(아프로디테) — 미의 여신이 디자인을 이끕니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1 (Discovery) → Phase 2 (IA·사이트맵) → Phase 3 (디자인 시스템)
→ Phase 4 (레이아웃 청사진) → Phase 5 (구현) → Phase 6 (리뷰)
```

### 2. 기존 디자인 자산 확인

```
📂 디자인 자산 확인 (정본 우선순위):
  DESIGN.md:           {있음/없음} ★ 정본 (YAML 토큰 + 산문)
  design-tokens.json:  {있음/없음} (W3C DTCG — DESIGN.md로 흡수/파생)
  design-system.md:    {있음/없음} (구 산문 — DESIGN.md로 이관)
  tailwind.config.*:   {있음/없음} (export 파생물)
```

**DESIGN.md 있으면**: 그대로 정본 채택 → Phase 6 lint만 돌리고 Phase 1~5 건너뜀
**레거시(design-system.md/design-tokens.json)만 있으면**: DESIGN.md로 마이그레이션 후 진행
**없으면**: Phase 1부터 시작

> 마이그레이션·스키마·lint/export 상세: [`references/design-md-guide.md`](references/design-md-guide.md)

---

## Phase 1: Discovery · 레퍼런스 자산화

실제 웹디자인 프로세스의 Discovery 단계 — 스타일이나 색을 정하기 전에 "뭘, 누구를 위해
만드는지"부터 확인합니다.

### 1-0. 가벼운 제품 컨텍스트 확인

요구사항에 이미 명시돼 있으면 다시 묻지 않고 한 줄로 요약만 합니다. 불명확한 항목만 확인:

- **무엇을** 만드는가 (제품/페이지/컴포넌트 종류)
- **누구를 위해** (타깃 오디언스 — 톤·밀도·신뢰 신호에 영향)
- **핵심 행동 1개** (primary action — Phase 3-0 Interface Mode 판별의 입력이 됨)

이 단계는 가볍게: 이미 명확하면 3줄 요약하고 바로 레퍼런스 자산화로 넘어갑니다. 별도 인터뷰가
필요한 요구사항 발굴은 `zephermine`의 몫이며, 아프로디테는 디자인 방향에 필요한 최소 컨텍스트만
확인합니다.

> **저장 (필수)**: 확인한 3줄(무엇/누구/핵심 행동)을 즉시 `docs/design-refs/YYYY-MM-DD-brief-{slug}.md`로
> 저장합니다. 대화에만 남으면 세션이 끊겼을 때 다시 물어야 하고, Phase 2(IA)·Phase 3-0(Interface
> Mode)이 매번 재추론하게 됩니다 — 가벼운 내용이라도 파일화가 기본입니다.

### 1-1. 레퍼런스 자산화 (선택)

레퍼런스를 "첨부하고 끝"이 아니라 **재사용 가능한 슈퍼프롬프트 파일**로 변환합니다.
절차·템플릿 상세: [`references/reference-capture-guide.md`](references/reference-capture-guide.md)

현재 CLI의 질문 방식:

```
question: "참고할 디자인이 있나요?"
header: "레퍼런스"
options:
  - label: "스크린샷 첨부"
    description: "Dribbble, Behance, 실제 사이트 스크린샷"
  - label: "URL 입력"
    description: "참고 사이트 URL (라이브 캡처 후 분석)"
  - label: "영상/HTML"
    description: "화면 녹화 또는 HTML 소스"
  - label: "없음, AI에게 맡김"
    description: "이후 단계에서 선택한 조합으로 진행"
```

**레퍼런스가 있으면** (유형별 절차는 가이드 §1):

1. **증거 확보** — URL이면 Playwright MCP로 warm scroll → 뷰포트 단위 캡처(정지마다 2초 정착 대기). 영상이면 ffprobe/ffmpeg 프레임 추출. HTML이면 인터랙션 키워드 grep(소스가 진실).
2. **섹션 해부** — 모든 가시적 섹션을 순서대로 Purpose/Layout/Visual/Animation/Interaction/Scroll/Implementation notes로 분해. 모션 메커니즘은 정확히 명명(pinned/scrubbed/parallax/masked reveal 등).
3. **슈퍼프롬프트 저장** — `docs/design-refs/YYYY-MM-DD-{slug}.md` (가이드 §2 템플릿). 첫 줄에 **영감 각색 vs 정확 재현** 모드 명시.

라이브러리 URL이면 가이드 §1-E의 **공개 라이브러리 샘플링** 절차를 따릅니다. 프롬프트
라이브러리, 제품 UI, 컴포넌트 소스, 상태 패턴을 구분하고 각각 결정 문법, 정보 구조, 구현
게이트, 접근성 계약만 추출합니다. 무료/공개 항목만 표본화하며 문구·코드·미디어를 무단 복제하지 않습니다.

> **경계**: 레퍼런스에서 가져오는 것은 구조·위계·모션·페이싱. 색·폰트의 정본은 DESIGN.md 토큰
> (정확 재현 모드에서만 예외 — 이때 값을 DESIGN.md에 역반영).

**없으면**: 아래 Phase로 계속 진행 (스킵해도 파이프라인 정상)

---

## Phase 2: IA · 사이트맵 · 메뉴구성

실제 프로세스에선 스타일 결정보다 먼저 오는 단계지만, 이전 버전의 아프로디테엔 **이 Phase
자체가 없었습니다** — 페이지 안의 블록 순서(Phase 4)만 다뤘지, 사이트에 페이지가 몇 개고
내비게이션이 어떻게 구성되는지는 다루는 곳이 없었습니다. 랜딩 페이지 1개 같은 단일 화면
작업이면 아래를 1줄로 요약하고 넘어갑니다 — 매번 무겁게 만들지 않습니다.

### 2-1. 페이지 목록 확정

요구사항에서 필요한 화면/페이지를 나열합니다.

```
| # | 페이지 | 목적 | 페이지 유형(layout-block-anatomy 템플릿) |
|---|--------|------|------------------------------------------|
| 1 | 홈 | 제품 소개 + 전환 | SaaS 랜딩 |
| 2 | 가격 | 플랜 비교 | (홈에 통합 또는 별도) |
| 3 | 로그인 | 인증 | SignUp/Login |
```

단일 페이지/컴포넌트 작업이면: `페이지 1개 — {이름}, 별도 사이트맵 불필요` 한 줄로 종료.

### 2-2. 내비게이션 구조

1-0에서 확인한 **primary action**을 기준으로 메뉴 항목을 5~7개로 수렴합니다(그 이상은
`coder-interface-pattern-playbook.md`의 정보 과밀 경고 대상). 1차 메뉴(전역 nav) + 2차
메뉴(있으면) + 페이지 내 앵커를 구분합니다.

```
전역 nav: {항목1} · {항목2} · {항목3} · [CTA]
페이지 내 앵커(단일 페이지인 경우): #section1, #section2, ...
```

### 2-3. 페이지 관계(사이트맵)

페이지가 3개 이상이면 `mermaid-diagrams` 스킬로 사이트맵 다이어그램을 생성합니다(부모-자식,
플로우 관계). 페이지 1~2개면 생략합니다.

### 2-4. 산출

`docs/design-refs/YYYY-MM-DD-sitemap-{slug}.md`에 2-1(표) + 2-2(메뉴) + 2-3(다이어그램, 있으면)을
저장합니다. Phase 4(레이아웃 청사진)가 "페이지 유형 → 블록 시퀀스"를 고를 때 이 표의 페이지
유형 컬럼을 그대로 씁니다.

---

## Phase 3: 디자인 시스템 수립

### 3-0. 화면 유형 판별

스타일을 묻기 전에 사용자의 핵심 행동을 판별합니다. Phase 1-0에서 확인한 primary action이
있으면 그것을 근거로 자동 선택하고 다시 묻지 않습니다.

| Interface Mode | 신호 | 기본 장식 효과 |
|---|---|---|
| Data Instrument | 랭킹, 모니터링, 지표, 변화 비교 | 0 |
| Faceted Directory | 검색, 필터, 카테고리, 후보 비교 | 0 |
| Agent Workbench | agent, terminal, editor, browser, task queue | 0 |
| Waiting State | 비동기 실행, 로딩, 진행, 장기 작업 | 상태에 비례 |
| Effect Stage | 효과 탐색, 설정, 코드 미리보기 | stage당 1 |
| Expressive Landing | 브랜드 소개, 캠페인, 포트폴리오 | 첫 화면 1 |

기능형 5종이면 [`frontend-design/references/coder-interface-pattern-playbook.md`](../frontend-design/references/coder-interface-pattern-playbook.md)를
읽고 정보 구조, 밀도, 상태 모델, 효과 예산을 먼저 고정합니다. 스타일 질문은 **표면과 타이포의 방향**을 고르는 보조 입력입니다.

### 3-1. 스타일 질문

`frontend-design` 스킬의 프리셋을 사용자에게 제시합니다.

> **옵션 4개 한도 가드 (필수)**: 프리셋은 7개지만 `AskUserQuestion`은 한 호출당 **옵션 2~4개**만 받습니다(초과 시 `Invalid tool parameters`). 구조화 도구를 쓸 땐 ① 대표 4개만 넣고 나머지는 자동 제공되는 "Other"로 받거나, ② **일반 텍스트 번호 목록(1~7)**으로 제시해 번호로 답을 받으세요. 아래 7개는 채워 넣을 **참조 목록**이지 한 번에 다 넣는 payload가 아닙니다. `header`는 12자 이내. 타입 질문(3-2)도 동일.

현재 CLI의 질문 방식:

```
question: "어떤 느낌으로 만들까요?"
header: "디자인 스타일"
options:
  - label: "깔끔하게"
    description: "정돈된 기업 사이트, 안정적인 레이아웃"
  - label: "럭셔리하게"
    description: "여백 많고 프리미엄한 느낌, 고급 브랜드"
  - label: "대담하게"
    description: "비대칭, 애니메이션, 눈에 띄는 디자인"
  - label: "미니멀하게"
    description: "차분하고 절제된, 군더더기 없는"
  - label: "대시보드"
    description: "데이터 중심, 빽빽하고 효율적"
  - label: "매거진"
    description: "에디토리얼, 사진 중심, 읽는 재미"
  - label: "직접 설정"
    description: "VARIANCE/MOTION/DENSITY 숫자로 직접 조정"
```

### 3-2. 산업/프로젝트 타입 확인

> 3-1과 동일하게 **옵션 4개 한도** 적용 — 대표 4개 + "Other" 또는 텍스트 번호 목록(아래 7개는 참조용).

현재 CLI의 질문 방식:

```
question: "어떤 종류의 서비스인가요?"
header: "프로젝트 타입"
options:
  - label: "SaaS"
  - label: "이커머스"
  - label: "대시보드/관리자"
  - label: "랜딩 페이지"
  - label: "포트폴리오/블로그"
  - label: "모바일 앱"
  - label: "기타 (직접 입력)"
```

### 3-3. 구체 방향 카드 + 스타일 레시피 제시

프리셋 선택 직후, 형용사만 다른 후보를 내지 말고
[`frontend-design/references/motion-first-prompt-playbook.md`](../frontend-design/references/motion-first-prompt-playbook.md)의
프롬프트 컴파일러로 **서로 다른 구체 방향 3안**을 만듭니다.

다음 상황에서는 이 단계가 필수입니다:

- 사용자가 "구리다", "뻔하다", "맨날 비슷하다", "봐야 안다"고 말함
- 브랜드 가이드·DESIGN.md·명확한 레퍼런스가 없음
- 이전 출력과 같은 색상이나 레이아웃으로 수렴할 위험이 있음

방향 3안은 구성, 베이스 명도, 액센트 색상 계열, 표면 재질, 모션 중 최소 4개가 달라야 합니다.
초록·주황 계열은 합쳐서 3안 중 최대 1개만 허용하며, 브랜드/도메인 근거가 없으면 제외합니다.

기능형 Interface Mode에서는 세 방향이 **효과의 종류**가 아니라 정보 구조와 밀도에서 달라야 합니다.

- Data Instrument: 단일 넓은 표 / KPI+2열 비교 / anomaly-first layout
- Faceted Directory: compact list / comparison table / media-aware cards
- Agent Workbench: terminal 중심 / task 중심 / review 중심 pane hierarchy
- Waiting State: inline / skeleton / step-progress는 예상 시간과 측정 가능성으로 결정
- Effect Stage: CSS / DOM motion / Canvas-WebGL의 복잡도 단계로 분리

각 방향 카드는 아래 정보를 포함합니다:

```
DIRECTION — 이름
MODE — Interface Mode + primary action
COMPOSITION — 첫 뷰포트와 핵심 정보 흐름
COLOR / TYPE / MATERIAL — DESIGN.md 후보 토큰
MOTION — 상태 모션과 장식 효과 예산
RECIPE — 스타일 레시피 1개
NEGATIVE / SUCCESS — 실패 조건과 관찰 가능한 통과 기준
```

표현형 예시는 motion-first playbook, 기능형 예시는 coder-interface playbook의 방향 카드를 사용합니다.

> **방향 카드 저장 (필수)**: 사용자가 방향을 선택하면 선택된 카드 전문(MODE~NEGATIVE/SUCCESS)을
> `docs/design-refs/YYYY-MM-DD-direction-{slug}.md`로 저장합니다. 방향 카드가 대화에만 남으면
> Phase 5와 후속 세션이 소비할 수 없습니다 — 레퍼런스 없는 프로젝트도 컴파일된 프롬프트가
> 파일로 남아야 합니다.

그 다음 [`frontend-design/references/style-recipes/index.md`](../frontend-design/references/style-recipes/index.md)의
**프리셋 → 레시피 후보 풀**에서 각 방향에 맞는 레시피를 매칭합니다. 표의 나열 순서는 추천
순위가 아니며, 개별 레시피 파일은 사용자가 방향을 선택한 뒤 하나만 Read합니다.

**레시피 선택 시**: 해당 레시피 파일의 `## DESIGN.md 컴파일` 값을 정본의 기반으로 사용하고,
3-4의 CSV 매칭 또는 playbook 색상 레인은 **액센트/팔레트 변주 제안**으로 축소합니다
(무드·대비 구조는 레시피 유지).

**레시피 미선택 시**: playbook의 방향 아키타입 + 색상 레인을 기반으로 아래 3-4 DB 매칭을 진행합니다.

### 3-4. 디자인 DB 매칭

`frontend-design/references/`의 CSV 데이터에서 자동 매칭:

1. **select-diverse-palettes.js** → CSV + playbook 색상 레인을 hue family로 묶어 기계적으로 3개 shortlist
2. **color-palettes.csv** → 프로젝트 타입에 맞는 원본 팔레트 데이터
3. **font-pairings.csv** → 스타일 키워드에 맞는 폰트 페어링 3개 추천
4. **design-styles.csv** → 프리셋에 맞는 디자인 스타일 참조

색상 shortlist는 먼저 다음 명령으로 만듭니다:

```bash
node "<frontend-design skill dir>/scripts/select-diverse-palettes.js" \
  --type "{프로젝트 타입}" \
  --seed "{프로젝트 slug}"
```

레포 안에서 실행 중이면 `<frontend-design skill dir>`는 `skills/frontend-design`입니다. 전역 설치본이면
현재 읽은 `frontend-design/SKILL.md`의 부모 디렉터리를 사용합니다.

기본값은 초록/주황 후보 0개입니다. 브랜드색·도메인 신호 근거가 있을 때만
`--max-signal 1`을 명시합니다. JSON shortlist를 만든 뒤 아래 루브릭으로 최종 채점합니다.

```
📎 추천 디자인 조합:

  색상 팔레트 (3개 후보):
  1. Paper / Cobalt — 밝은 편집 지면 + 코발트 신호
  2. Aubergine / Magenta — 야간 무대 + 마젠타 액센트
  3. Graphite / Oxblood — 니어블랙 + 옥스블러드 신호

  폰트 페어링 (3개 후보):
  1. Korean Modern Variable — Hahmlet + Noto Sans KR
  2. Korean Tech Developer — IBM Plex Sans KR + IBM Plex Mono(code)
  3. Tech Startup — Space Grotesk + DM Sans (+ Pretendard 한글 폴백)

  디자인 스타일: 후보별 방향 카드에 개별 매칭
```

**색상 후보 구성 하드 게이트:**

1. CSV 행 순서를 추천 순위로 사용하지 않습니다.
2. Accent를 red/orange/yellow/green/cyan/blue/violet/pink/neutral 계열로 분류합니다.
3. 후보 3개는 서로 다른 계열이어야 하며, 초록·주황은 합쳐서 최대 1개입니다.
4. 밝음/어두움/중간톤 중 최소 2개 모드를 포함합니다.
5. 기존 DESIGN.md나 최근 `docs/design-refs/`와 같은 액센트 계열은 기본 후보에서 제외합니다.
6. 초록·주황이 최종 1위면 브랜드색, 도메인 의미, 사용자 명시 중 하나를 근거로 적습니다.

각 색상/폰트 조합을 가중 루브릭으로 채점합니다:
명도대비(contrast) 30% · 브랜드 적합성(brand-fit) 30% · 접근성(accessibility) 25% ·
고유성(distinctiveness) 15%, 각 1~5점에 한 줄 근거. 후보별 가중 합계를 점수표로 제시합니다.

> 채점 없이 후보만 나열 금지 — 사용자가 감으로 고르도록 떠넘기지 말고 점수를 함께 보여줍니다. 최종 선택권은 사용자에게 있되, 점수와 추천을 근거로 제시합니다.

사용자가 선택하면 → 디자인 시스템 문서 생성.

### 3-5. DESIGN.md 생성 (정본)

Phase 3에서 **선택된** 레시피/팔레트/폰트를 [`references/design-md-guide.md`](references/design-md-guide.md) 스키마에 따라 `DESIGN.md`로 박습니다 (값을 지어내지 말고 레시피의 `## DESIGN.md 컴파일`, CSV, 또는 playbook 색상 레인에서 고른 값 그대로):

- 선택된 **색상 팔레트**(레시피, color-palettes.csv, 또는 motion-first playbook의 색상 레인) → `colors:` (Primary/Accent/Neutral + `on-*` 전경색 — 대비 짝꿍 명시해야 lint contrast 동작)
- 선택된 **폰트 페어링**(font-pairings.csv) → `typography:` (heading/body/label, `fontFamily`+`fontSize` 필수)
  - **한글 UI 폰트 (필수)**: ① **먼저 한글 전용 페어링을 픽한다** — `font-pairings.csv`의 한글 행(#74-82: Hahmlet/Noto Serif KR/Gowun Batang 헤딩 + Pretendard/Noto Sans KR/Nanum Gothic 본문 등)은 한글·라틴 글리프를 모두 가져 폴백 함정을 **구조적으로 회피**(권장 경로). ② 굳이 라틴 페어링(Space Grotesk 등)을 쓸 때만 **Pretendard를 정본 스택에 함께 박는다** — 라틴엔 한글 글리프가 없어 라틴 단일값만 적으면 Phase 5의 "토큰 그대로 사용"이 전파돼 한글이 시스템 폴백된다(gotcha 041). 이때 `fontFamily`는 **스택**으로 — 예: `"Space Grotesk, Pretendard, sans-serif"`(헤딩), `"Pretendard, DM Sans, sans-serif"`(본문). 개성 한글 폰트는 눈누(noonnu.cc). 라틴 전용 데모만 단일값 허용.
- 프리셋(VARIANCE/MOTION/DENSITY) + 간격/라운드 → `spacing:` / `rounded:`
- 핵심 컴포넌트(button/card/input) → `components:` (토큰 중괄호 참조 `"{colors.primary}"`)
- Phase 2 사이트맵의 메뉴 항목 → `navigation:`(선택) 또는 산문 섹션에 요약 — 구현 시 nav 마크업이 사이트맵과 어긋나지 않게
- 채점 근거·선택 이유 → 산문 `##` 섹션 (왜 이 값인지)

> 상세 스케일 토큰이 필요하면 `design-system-starter`의 `design-tokens.json`을 병행하되 **정본은 DESIGN.md** (DTCG는 `export --format dtcg`로도 파생).

**출력:** `DESIGN.md` (프로젝트 루트)

---

## Phase 4: 레이아웃 청사진 (블록 시퀀스 계약)

구현 전에 페이지 구조를 **블록 단위로 고정**합니다. 색·폰트가 아니라 "요소 누락·위계 붕괴"가
디자인 실패의 절반이므로, 그레이스케일 구조를 먼저 확정하고 스타일은 그 위에 얹습니다.

절차·블록별 해부 계약(30종)·시퀀스 템플릿:
[`frontend-design/references/layout-block-anatomy.md`](../frontend-design/references/layout-block-anatomy.md)

1. **페이지 유형 → 블록 시퀀스 선택** — Phase 2 사이트맵에 페이지가 여러 개면 각 페이지의 유형(2-1 표)마다 반복. 카탈로그의 템플릿(SaaS 랜딩/이커머스/대시보드 등)을 시작점으로, 프로젝트 신호에 맞게 가감
2. **블록별 anatomy 체크** — 각 블록의 필수 요소·잉크 위계·강조 규칙(블록당 정확히 1개)·CTA 문법 확인
3. **청사진 산출** — 블록 시퀀스 표 + ASCII 와이어프레임을 `docs/design-refs/YYYY-MM-DD-layout-{slug}.md`로 저장 (페이지가 여럿이면 페이지별로 구분)
4. **확인** — 인터랙티브 세션이면 사용자 승인 후 Phase 5 진행, 자동 파이프라인(zeus 등)이면 산출만 하고 계속

우선순위 규칙:

- **Phase 1 슈퍼프롬프트가 있으면**: 레퍼런스의 섹션 해부가 구조 정본 — anatomy 카탈로그는 누락 요소 점검용 보조
- **레퍼런스가 없으면**: anatomy 카탈로그가 구조 스펙 역할 (즉흥 구조 금지)
- **기능형 Interface Mode면**: `coder-interface-pattern-playbook.md`의 정보 구조 계약이 우선, anatomy는 pane 내부 체크리스트
- VARIANCE가 높으면 요소는 유지하되 배치·리듬을 변주 (ai-slop-blacklist #10과 충돌 아님)

---

## Phase 5: 구현 (외관 한정 — 디자이너의 경계)

`frontend-design` 스킬이 자동 적용(auto_apply)되어 구현합니다.

**아프로디테의 구현 범위는 "외관"입니다:**

| 담당 (아프로디테) | 범위 밖 (포세이돈/다이달로스 몫) |
|------------------|--------------------------------|
| 디자인 토큰, 레이아웃/마크업 | 상태 관리, 데이터 페칭 |
| 스타일 (Tailwind/CSS), 컴포넌트 외관 | API 연동, 비즈니스 로직 |
| 호버·트랜지션 등 비주얼 인터랙션 | 라우팅 설계, 백엔드 |

- **파이프라인 모드** (포세이돈 구현 후): 기존 기능 코드에 디자인 시스템을 입히고 정교화. **로직 변경 금지** — 스타일·마크업·비주얼 인터랙션만 수정
- **단독 모드** (처음부터 UI 생성): 정적 컴포넌트/페이지까지 생성하되, 데이터·로직이 필요한 부분은 mock + `TODO(기능)` 주석으로 남기고 포세이돈/다이달로스에 인계

**구현 전 필수 Read (프롬프트 소비 게이트)**: 코드를 쓰기 전에 아래를 실제로 Read합니다.
토큰만 읽고 구도를 즉흥 창작하는 것이 저품질의 주범입니다 — 산문 계약과 design-refs 프롬프트가
있는데 안 읽었다면 그 구현은 스펙 위반입니다.

1. `DESIGN.md` **전체** — YAML 토큰뿐 아니라 산문 계약(§Spatial Model, State Contracts, Motion, Component Anatomy, Copy Rules 등)까지
2. `docs/design-refs/`의 최신 자산 — brief(Phase 1-0), sitemap(Phase 2), direction 카드(Phase 3-3), 슈퍼프롬프트(Phase 1-1), 레이아웃 청사진(Phase 4) 중 존재하는 것 전부

이 Phase에서는:
- Phase 3에서 생성한 `DESIGN.md`의 토큰을 참조 (색·타이포·간격·라운드를 그대로 사용 — 새 값 발명 금지). 산문 계약은 구도·상태·카피의 스펙으로 동등하게 구속력 있음
- Phase 3에서 레시피를 골랐으면 해당 스타일 레시피 파일의 패턴/Avoid를 함께 참조
- Phase 3에서 방향 카드를 골랐으면 `motion-first-prompt-playbook.md`의 프롬프트 컴파일러와 색상 다양성 게이트를 함께 참조
- Phase 3에서 기능형 Interface Mode를 골랐으면 `coder-interface-pattern-playbook.md`의 정보 구조·상태·효과 예산을 구현 계약으로 사용
- 선택된 프리셋 파라미터 적용 (VARIANCE/MOTION/DENSITY)
- Phase 2 사이트맵(`docs/design-refs/*-sitemap-*.md`)의 페이지 목록·메뉴 구조를 nav 마크업의 스펙으로 사용 — 사이트맵에 없는 메뉴 항목 즉흥 추가 금지
- Phase 4 레이아웃 청사진(`docs/design-refs/*-layout-*.md`)의 블록 시퀀스·anatomy 계약을 **마크업 구조의 스펙**으로 사용 — 요소 누락 금지, 배치는 VARIANCE에 따라 변주
- Phase 1 슈퍼프롬프트(`docs/design-refs/*.md`)가 있으면 **구조·모션의 스펙**으로 사용 — 충돌 시 DESIGN.md 토큰이 우선
- 그림자·blur·보더 그라데이션·텍스트 리빌·로딩 상태 등 디테일은 [`frontend-design/references/technique-recipes.md`](../frontend-design/references/technique-recipes.md)의 검증된 값으로
- React Bits류 외부 효과는 목적·의존성·cleanup·reduced-motion·성능·라이선스 게이트를 모두 통과한 경우에만 도입
- `frontend-design`의 Banned Patterns(AI Slop 금지) 적용

**구현 지시 스켈레톤 (섹션/컴포넌트 단위 작업 지시 시):**

에이전트/서브태스크에 구현을 지시할 때는 소원("예쁘게")이 아니라 디자인 시스템처럼 지시합니다.
각 줄은 즉석에서 짓지 말고 **위 필수 Read 파일에서 인용해** 채웁니다 (COMPOSITION은 direction
카드/청사진에서, STATE는 DESIGN.md State Contracts에서, NEGATIVE는 레시피 Avoid에서).
서브에이전트 디스패치 시에는 파일 경로만 주지 말고 **채워진 스켈레톤 전문을 프롬프트에 포함**합니다
— 서브에이전트가 파일을 안 읽으면 게이트가 무력화됩니다:

```
MODE     — Interface Mode + primary action
GOAL     — 무엇을, 누구를 위해, 성공 기준
LAYOUT   — 그리드/배치/위계 (H1 → 서브 → 본문 → CTA) + 블록 anatomy 계약 (layout-block-anatomy.md 해당 블록 §)
DENSITY  — 기본 노출량, 행 높이, pane 수
STATE    — loading/empty/error/stale/permission/disconnected
TYPE     — DESIGN.md typography 토큰 지정
COLOR    — DESIGN.md colors 토큰 지정 (액센트 1개)
COPY     — 실제 렌더할 문구 그대로 (placeholder 금지)
CONSTRAINTS — 변경 금지 항목 명시
NEGATIVE — 하지 말 것 (레시피 Avoid + Banned Patterns에서)
```

> **로그 저장 (필수)**: 채워진 스켈레톤은 디스패치 프롬프트에만 쓰고 사라지게 두지 않습니다.
> 섹션을 디스패치하기 **직전에** `docs/design-refs/YYYY-MM-DD-impl-log-{slug}.md`에 순서대로
> append합니다(섹션마다 별도 파일 금지 — 페이지/작업 단위로 로그 파일 1개에 전부 누적, 파일
> 폭증 방지). 소스(DESIGN.md·design-refs)는 남아 있어도 "그때 정확히 어떤 LAYOUT/STATE/COPY를
> 지시했는지"는 다시 만들지 않으면 사라지므로, 구현 후 감사·재현·"이 섹션만 다시 만들어줘" 요청에
> 이 로그가 근거가 됩니다.

**반복 규율 (variants > rerolls)**: 첫 결과에서 레이아웃+위계+카피를 먼저 고정하고,
이후 수정은 **한 번에 변수 1~2개만** 바꿉니다(액센트/배경 톤/카드 배치/크롭). 전체 재생성 금지 —
"다른 건 바꾸지 마" / "히어로는 유지"를 지시에 명시해 이미 잘 된 부분의 파괴를 방지합니다.

**Stitch 프로젝트인 경우:**
- `/stitch loop` → 멀티페이지 생성
- `/stitch react` → React 컴포넌트 변환

---

## Phase 6: 디자인 리뷰

구현 완료 후 자동으로 lint 게이트 + 2개 리뷰를 실행합니다.

### 6-0. DESIGN.md lint (기계 검증 — 대화형 best-effort)

토큰 계약(참조 무결성·대비)을 기계로 검증합니다. **단 `@google/design.md@0.3.0`은 TTY 전용**이라 헤드리스(에이전트/CI)에선 무출력·exit 0으로 no-op됨(실측) — 사람이 터미널에서 돌릴 때만 신호를 줍니다.

```bash
npx @google/design.md lint DESIGN.md      # macOS/Linux
designmd lint DESIGN.md                    # Windows 별칭
```

- **broken-ref**(없는 토큰 참조) / **orphaned-tokens**(고아 색) / **contrast-ratio**(컴포넌트 bg/text 쌍 WCAG AA 4.5:1 미달)
- **graceful fallback (필수)**: npx/네트워크 실패 **또는 헤드리스 무출력** 시 lint를 **건너뛰고** 보고에 `lint: 건너뜀` 표기 — 파이프라인 안 막음. **헤드리스 자동 enforcement는 lint가 아니라 ui-ux-auditor의 대비/시각 검증이 담당** (상세·재평가 조건은 [`references/design-md-guide.md`](references/design-md-guide.md)).
- lint FAIL 항목(대화형에서 잡힌 경우)은 확인 없이 바로 DESIGN.md 토큰 수정 → 재실행.

**export (선택):** `npx @google/design.md export --format tailwind DESIGN.md` → Tailwind 테마, `--format dtcg` → `design-tokens.json`.

상세: [`references/design-md-guide.md`](references/design-md-guide.md)

### 6-1. UI/UX 감사

`ui-ux-auditor` 스킬 실행 — **9영역 자동 감사 + 시각 검증 + 0-10 채점**:

> **시각 검증 필수**: Grep 정적 스캔은 1차 신호일 뿐, dev server를 띄워 스크린샷
> (데스크톱/모바일 × 라이트/다크)을 찍고 **렌더링된 화면을 직접 보고** 채점합니다.
> 관찰과 코드 추정이 충돌하면 관찰이 이깁니다. 서버 구동 불가 시에만 정적 스캔으로
> 폴백하며 등급에 `*`(신뢰도 제한)를 표기합니다.
1. 다크모드
2. 반응형
3. 접근성
4. 로딩 상태 & 성능
5. 폼 UX
6. 네비게이션 — Phase 2 사이트맵과 실제 구현된 메뉴가 일치하는지도 함께 확인
7. 타이포그래피
8. 애니메이션
9. **AI Slop 탐지** (공유 블랙리스트 기반 — `frontend-design/references/ai-slop-blacklist.md`)

**채점**: 영역별 0-10 + 가중 총점 → A~F 등급

### 6-2. 가이드라인 준수

`web-design-guidelines` 스킬 실행 — Web Interface Guidelines 체크

### 6-3. 결과 보고

```
📊 디자인 리뷰 결과:

  UI/UX 감사:    총점 {X.X}/10 (등급: {A~F})
    다크모드: {N}/10 | 반응형: {N}/10 | 접근성: {N}/10
    로딩·성능: {N}/10 | 폼UX: {N}/10 | 네비: {N}/10
    타이포: {N}/10 | 애니: {N}/10 | AI Slop: {N}/10
  가이드라인:    {통과율}% ({통과}/{전체} 항목)

  ⚠️ 수정 필요:
  - {항목 1}: {문제} → {수정 방법}
  - {항목 2}: {문제} → {수정 방법}
```

**수정 필요한 항목이 있으면**: 확인 없이 바로 수정 → 재검증

---

## 완료 안내

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Aphrodite 완료! 미의 여신이 승인합니다.

📁 산출물:
  DESIGN.md           — 디자인 정본 (YAML 토큰 + 산문 근거)
  docs/design-refs/   — brief(Phase 1) + 슈퍼프롬프트(Phase 1) + 사이트맵(Phase 2) + direction(Phase 3)
                       + 레이아웃 청사진(Phase 4) + 구현 로그(Phase 5)
  구현 코드           — DESIGN.md 토큰 + 레시피/DB 매칭 적용
  리뷰 결과           — design.md lint + UI/UX 9영역 + 0-10 채점 + 가이드라인

📎 적용된 조합:
  화면 유형: {Interface Mode}
  페이지 수: {N개} (사이트맵: {있음/단일 페이지})
  효과 예산: {장식 효과 수 / 상태 모션 수 / 복잡도 단계}
  프리셋: {선택한 프리셋}
  레시피: {스타일 레시피명 또는 "CSV 매칭"}
  색상: {팔레트명}
  폰트: {Heading} + {Body}
  스타일: {디자인 스타일}

👉 다음 단계:
  /seo-audit           → SEO 감사 (웹 프로젝트)
  /clio              → 최종 산출물 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--plan-only` | Phase 1~4만 (Discovery + IA + 디자인 시스템 + 레이아웃 청사진, 구현 전까지) | false |
| `--review-only` | Phase 6만 (기존 코드 리뷰) | false |
| `--no-review` | Phase 6 건너뜀 | false |
| `--no-lint` | Phase 6의 design.md lint 건너뜀 | false |
| `--export` | DESIGN.md → Tailwind/DTCG export 생성 | false |
| `--stitch` | Stitch MCP 모드로 구현 | false |
| `--skip-ia` | Phase 2 생략 (단일 페이지/컴포넌트 작업 확정 시) | false — 단일 페이지도 2-1 한 줄 요약은 기본 수행 |

---

## 연관 스킬

| 스킬 | 역할 | Phase |
|------|------|-------|
| mermaid-diagrams | 사이트맵 다이어그램 (페이지 3개+) | 2 |
| design-system-starter | DESIGN.md 토큰층 보강 + DTCG 파생 | 3 |
| frontend-design | 미학 적용 + 레시피/DB 매칭 + 구현 (auto_apply) | 3~5 |
| design.md lint | DESIGN.md 토큰 계약 기계 검증 (broken-ref/orphan/대비) | 6 |
| ui-ux-auditor | 9영역 UI/UX 감사 + 시각 검증(스크린샷) | 6 |
| web-design-guidelines | Web Interface Guidelines 체크 | 6 |
| stitch (design 모드) | DESIGN.md ↔ Stitch 화면 양방향 (같은 스키마 공유) | 3·5 |
| stitch (loop 모드) | Stitch 멀티페이지 생성 (선택) | 5 |
| stitch (react 모드) | HTML → React 변환 (선택) | 5 |
| seo-audit | SEO/AEO/GEO 감사 (후행, 선택) | - |
| ui-ux-designer (에이전트) | 디자인 비평/조언 (필요 시) | - |

## Related Files

| 파일 | 역할 |
|------|------|
| `skills/frontend-design/SKILL.md` | 미학 가이드 + 프리셋 + Banned Patterns |
| `skills/frontend-design/references/style-recipes/index.md` | 스타일 레시피 12종 카탈로그 + 프리셋 매핑 (Phase 3) |
| `skills/frontend-design/references/motion-first-prompt-playbook.md` | 공개 프롬프트 패턴 합성 + 방향 아키타입 8종 + 색상 다양성 게이트 |
| `skills/frontend-design/references/coder-interface-pattern-playbook.md` | 데이터 도구·디렉터리·agent workbench·로딩·효과 stage 유형 게이트 |
| `skills/frontend-design/references/layout-block-anatomy.md` | 블록 해부 카탈로그 30종 + 시퀀스 템플릿 + 청사진 절차 (Phase 4) |
| `skills/frontend-design/scripts/select-diverse-palettes.js` | CSV/playbook 색상 레인을 hue family로 분산하는 JSON shortlist 도구 |
| `skills/frontend-design/references/technique-recipes.md` | 그림자/blur/보더/리빌/모션/로딩 복붙 레시피 (Phase 5) |
| `skills/frontend-design/references/color-palettes.csv` | 161개 색상 팔레트 |
| `skills/frontend-design/references/font-pairings.csv` | 84개 폰트 페어링 |
| `skills/frontend-design/references/design-styles.csv` | 84개 디자인 스타일 |
| `skills/design-plan/references/design-md-guide.md` | DESIGN.md 정본 스키마 + lint/export + 마이그레이션 |
| `skills/design-plan/references/reference-capture-guide.md` | 레퍼런스 자산화 절차 + 슈퍼프롬프트 템플릿 (Phase 1) |
| `skills/design-system-starter/SKILL.md` | 디자인 토큰 생성 (DTCG 파생) |
| `skills/ui-ux-auditor/SKILL.md` | UI/UX 9영역 감사 + 시각 검증 |
| `skills/web-design-guidelines/SKILL.md` | Web Interface Guidelines |
| `agents/ui-ux-designer.md` | 디자인 비평 에이전트 |
