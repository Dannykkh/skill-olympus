# 아프로디테 UX 5계층 보강: 재사용 자산 탐색

2026-11-04 · Claude

사용자가 Garrett의 UX 5계층(Strategy·Scope·Structure·Skeleton·Surface)과 디자인 하네스 4단계를 아프로디테(`skills/design-plan`)에 대조해 달라고 했다. 4단계는 ① 요청 계층 판정 ② 해당·기반 계층 결정 로드 ③ 빈 결정 표시 ④ 계층 충돌 검사다. 대조해 보니 Scope의 비목표, 결정 출처 표시, 상시 로드되는 Strategy 요약이 약했다. 그래서 개선에 앞서 그 빈칸을 채울 기존 자산을 탐색했다. **이 문서는 탐색 결과일 뿐이며 결정이나 변경은 아직 없다.**

표의 `확인`은 메인이 원문을 직접 본 항목이고, `보고`는 읽기 전용 탐색 에이전트의 보고를 옮긴 항목이다.

## 결론

- 다섯 계층과 네 단계 모두에 재료가 있다. 문제는 자산이 없는 것이 아니다.
  1. 상류 산출물이 아프로디테로 넘어오지 않는다(끊긴 연결).
  2. 평균적인 화면이 기본값으로 박혀 있다.
  3. 검증기가 미결 표시를 막는다.
- 넷째 문제는 디자인 DB(CSV) 자체다. 깨진 행이 있고, 조회 키가 업종이며, 내용이 Surface에만 있다(7절).
- 주 작업은 연결, 어휘 통일, 기본값 수정이다. 본체가 없고 선례만 있는 것은 두 가지다. 요청을 계층으로 판정하는 단계, 그리고 Strategy↔Skeleton 충돌 검사.

## 1. 재사용 자산

### Strategy: 상시 요약의 재료

| 자산 | 내용 | 아프로디테 사용 | 근거 |
|---|---|---|---|
| `skills/zephermine/SKILL.md:331-334` | spec.md `### 공유 전제`: 목표, 범위 유형, 성공 기준 | spec.md를 열지만 역할 표만 읽음(`skills/design-plan/SKILL.md:180`) | 확인 |
| `skills/zephermine/references/persona-journey-guide.md:19-45` | `personas-and-journeys.md`: 역할, 목표, 불만, 빈도, 여정 | 안 읽음 | 보고 |
| `skills/biz-strategy/references/frameworks.md:77-83,110-123` | 비치헤드 타깃, 한 문장 가치 제안, 북극성 지표. `docs/hermes/{project}.md`에 저장 | 안 읽음 | 보고 |
| `skills/ceo/references/output-template.md:22-34` | GO / CONDITIONAL GO / NO-GO 판정. `docs/athena/{project}.md`에 저장 | 안 읽음 | 보고 |
| `skills/zephermine/SKILL.md:90` | `docs/domain-dictionary.md`: 기능별이 아닌 프로젝트 단일 파일의 선례 | 안 읽음 | 보고 |
| `skills/design-plan/references/korean-mobile-app.md:78-104` | 사람 카드, 핵심 사람, "사람 카드는 기능을 더하는 근거가 아니다"(:99) | 사용. 단 여러 화면 모바일 앱에서만 | 보고 |

spec.md는 기능마다 따로 생기고, 재실행하면 archive로 옮겨진다(`skills/zephermine/SKILL.md:67-72`). 그래서 상시 로드 대상으로는 맞지 않는다.

### Scope: 만들지 않을 것

| 자산 | 내용 | 아프로디테 사용 | 근거 |
|---|---|---|---|
| `skills/zephermine/references/interview-protocol.md:326-329,346` | S-5 "MVP 필수 vs 나중", Soft Gate 3 `MVP 범위: {포함/제외 기능}`. `interview.md`에만 기록됨 | 안 읽음 | 확인 |
| `skills/ceo/references/output-template.md:45-55` | 삭제 권고 기능 표(삭제 이유, **복구 시점**). 비목표와 reopen-when을 함께 담은 형태 | 안 읽음 | 확인 |
| `skills/design-plan/references/korean-mobile-app.md:310-329` | 여섯 질문으로 keep/lighten/cut/later 판정. 요구를 빼려면 사용자 확인 | 사용. 모바일에서만 | 보고 |
| `skills/stitch/references/loop-state.md:132-141` | sitemap(의도)과 실제 화면 비교: 선언됐는데 없는 화면, 고아 화면. "불필요한 페이지 지어내기 금지" | `--stitch`일 때만 | 보고 |
| `skills/orchestrator/commands/workpm.md:556,566` | 작업 지시문의 `범위 밖` 항목. 제품 단위가 아니라 작업 단위 | 안 읽음 | 보고 |

### 결정 출처·미결 표시: 어휘 후보군

| 어휘 | 위치 | 성격 | 근거 |
|---|---|---|---|
| `[ZEUS-AUTO:mechanical\|taste]` + Decision Ledger(결정, 근거, 기각 대안, 되돌리는 법) | `skills/zeus/SKILL.md:50-57` | "누가 정했나"를 나누는 **유일한 선례**. `taste`는 "AI 권장안(미승인)"에 가장 가깝다 | 확인 |
| `[inferred]` + `unknowns.md`·Open Questions, "never invent the fact" | `skills/zephermine/SKILL.md:181-186` | 보수적 기본값을 쓰고 표시한 뒤 계속 진행. AI 권장안과 미검증 가정을 한 라벨로 묶는다 | 확인 |
| `answered / inferred` | `skills/zephermine/references/interview-protocol.md:384-388` | 역할 표의 출처 열 | 보고 |
| `accepted-by-default / deferred-by-default / inferred / inferred-skip` | `skills/zephermine/references/domain-confirmation-guide.md:78-90` | 도메인 확인 상태 | 보고 |
| `검증됨: <출처>` / `가정: <근거> → 검증: <방법·시점>` | `skills/zephermine/references/tripwire-guide.md:108-113` (a:085) | 수치 결정. "계획 없는 가정은 쓰지 않는다" | 보고 |
| `[빈칸: 무엇을 채워야 하는지]`, `[확인 필요: …]`, 문서 끝 "확정 전 채워야 할 항목" 체크리스트 | `skills/themis/SKILL.md:23-25,162` | "빈 결정은 추측하지 않고 표시"에 가장 가까운 형태 | 보고 |
| `[확인 필요]`, "추정" + 산출 근거 | `skills/biz-strategy/SKILL.md:113-118,145` | 수치 출처 | 보고 |
| `current/stale/unverified`, `verified/prototype/placeholder/hypothesis` | `skills/design-plan/references/experience-contract-guide.md:67,103` | 콘텐츠·사실에만 적용되고 결정에는 없음 | 확인 |
| "비어 있는 항목을 '알아서'로 넘기지 말고 `없음`·`정적`으로 명시" | `skills/frontend-design/references/motion-first-prompt-playbook.md:64-65` | 프롬프트 수준의 빈칸 금지 | 확인 |
| `CURRENT/SUPERSEDED`, `reopen-when`, `alternatives` | `skills/mnemo/templates/claude-md-rules.md:112-114`, `skills/mnemo/scripts/mnemo_doctor.py:1222` | 결정의 수명주기를 나타냄. "누가 정했나"는 담지 않음 | 확인 |

### 요청 계층 판정·선택 로드

| 자산 | 내용 | 근거 |
|---|---|---|
| `skills/design-plan/SKILL.md:190-195` | Phase 0-1의 네 갈래 변경 분류. "관련 Phase부터 재실행"이 사실상 계층 라우팅 역할 | 확인 |
| `skills/frontend-design/SKILL.md:54-69` | Interface-Type Gate: 화면 유형 판별 | 보고 |
| `skills/design-plan/references/korean-mobile-app.md:133-166` | 화면 유형 = "앱을 열자마자 하는 일"에 해당하는 주인공 하나 | 보고 |
| `skills/frontend-design/SKILL.md:48-49` | 우선순위: 과업·접근성 > Experience Contract > DESIGN.md > Blueprint > benchmark. 기반 계층 순서의 씨앗 | 보고 |
| `skills/mnemo/docs/memory-system.md:152-156,223`, `skills/mnemo/templates/claude-md-rules.md:109` | 3단 로딩(항상 / 필요 시 / 검색 시)과 Progressive Disclosure. 상시 로드 예산은 100줄·5KB | 보고 |
| `codemap/info.md` (CLAUDE.md의 Code Map 절) | 작업별 라우터. "요청 유형 → 읽을 파일"의 선례 | 보고 |
| a:057 `memory/architecture/057-*.md:15-28` | PostToolUse `additionalContext`로, 수정하는 파일에 걸린 결정을 주입. Claude에만 배선됨 | 확인 |
| a:018 `memory/architecture/018-design-md-integration-*.md` | DESIGN.md "먼저 읽기"를 Mnemo 템플릿으로 주입. 상시 로드 배선의 선례 | 보고 |

### 계층 충돌 검사

| 자산 | 내용 | 근거 |
|---|---|---|
| `skills/design-plan/SKILL.md:333-334`, `skills/design-plan/references/render-critique-loop.md:22-23` | 시안이 새 주 행동을 만들거나 정보 순서를 바꾸면 와이어프레임 게이트 재통과 (Surface→Structure 역류) | 확인 / 보고 |
| `skills/design-plan/references/render-critique-loop.md:66-72` | Baseline gate: Page Goal과 primary task가 첫 화면에 보여야 함 (Strategy↔Surface) | 보고 |
| `skills/mnemo/scripts/mnemo_doctor.py:1125,1195` | 뒤집힌 결정에 기대는 CURRENT를 검출. 의존 관계 충돌 검출의 선례 | 보고 |
| a:066 | 완료 기준끼리 모순되면 `contradicted` + PARK | 보고 |
| `skills/argos/SKILL.md:143-171` | CPS 추적(Problem→Solution). spec.md만 읽고 `docs/design-refs/`는 읽지 않음 | 보고 |
| `skills/clio/SKILL.md:259-287` | 라우트·페이지에서 실제 흐름을 역추출 + flow-verifier. Structure를 역으로 도출 | 보고 |

## 2. 원인 제공 자산: 고쳐야 할 기본값

| 자산 | 문제 | 근거 |
|---|---|---|
| `skills/frontend-design/references/layout-block-anatomy.md:108,170` | Dashboard 기본 구조가 "KPI 카드 행 4개 → 메인 차트 + 리스트"다. Onboarding(:128-130)은 단일 카드뿐이고, 대시보드의 첫 실행·빈 상태 변형이 없다. 글이 비판한 평균 화면이 그대로 기본값이다 | 확인 |
| `skills/design-plan/scripts/validate_experience_contract.py:92-95` | `{…}`·`todo`·`tbd`는 실패 처리한다. 반면 `[빈칸]`·`[inferred]`·`[확인 필요]`는 인식하지 못해 통과한다. 미결을 정상 상태로 둘 방법이 없어 모델이 빈칸을 채우는 쪽으로 기운다 | 확인 |
| `skills/mnemo/templates/claude-md-rules.md:82` | "UI 작업은 `DESIGN.md`를 먼저 읽고 토큰을 따른다"가 상시 로드 규칙의 정본이다(`~/.claude/CLAUDE.md`는 설치 결과). 그래서 상시 로드되는 디자인 정본이 Surface 하나뿐이다 | 확인 |

## 3. 끊긴 연결

- 젭마인 마지막 안내(`skills/zephermine/SKILL.md:722`)는 `/aphrodite <planning_dir>`이다. 그런데 `skills/design-plan/SKILL.md`에는 `planning_dir`이 0건이다. (확인)
- 젭마인 spec.md 필수 템플릿(`skills/zephermine/SKILL.md:329-375`)에 비목표 슬롯이 없다. 제외 목록은 `interview.md`의 Soft Gate 3에만 남는다. (보고)
- 사람 카드와 여섯 질문은 여러 화면 모바일 앱 조건에 묶여 있다(`skills/design-plan/SKILL.md:228,285`). 그래서 웹·대시보드·랜딩에는 Strategy와 Scope를 기록할 장치가 없다. (확인)
- 페르소나 형식이 3종이다: 젭마인 persona 표, `korean-mobile-app.md` 사람 카드, Experience Contract `Audience and Tasks`. (보고)
- 미결 어휘가 5종 넘게 섞여 있다(1절 표). 수요 등급도 두 체계다: 헤르메스 Validated…Unvalidated, 아테나 Strong…Unvalidated. (보고)
- 아르고스가 `docs/design-refs/`를 읽지 않아 Strategy↔UI 감리 경로가 없다. (보고)
- design-system.md 경로가 세 곳에서 다르게 다뤄진다. 젭마인은 `<planning_dir>/design-system.md`를 생성한다. `skills/design-plan/SKILL.md:178`은 경로 없이 이름만 적는다. `skills/design-plan/references/design-md-guide.md:172`는 이 파일을 deprecated로 둔다. (확인)
- 부수 발견: 젭마인 interview-protocol은 헤르메스 산출물을 `<planning_dir>/` 또는 루트에서 찾는다(:139-140). 실제 산출 경로는 `docs/hermes/{project}.md`다. (보고)

## 4. 실사용 근거

- `D:/git` 아래 `docs/design-refs/*experience-*.md`는 74개다(최상위 폴더 20곳). (확인, 직접 계수)
  - `EXCLUDE` 있음: 53개
  - 비목표 문구(`비목표`·`Non-goals`·`만들지 않`): 26개
  - 미결·추정 표식이 있는 파일: 3개. 그중 결정 표식은 2개뿐이다.
    - `robotdance` `2026-09-05-experience-motion-editor.md:37`: 주요 사용자에 `[inferred]`
    - `koreacontentsfesta` `2026-10-27-experience-creatorfesta.md:99`: 사용자 정정 자유 문장
- `EXCLUDE`는 구현 범위를 뺀 것이 대부분이고 전략 수준의 비목표가 아니다. 표본 3건으로 본 보고다.
- 아프로디테의 비용은 "산출물 7종의 컨텍스트 소비와 무익한 절차"다(`docs/research/2026-08-05-deep-research-impeccable.md:148`). 그러므로 상시 로드를 늘리기보다 작은 요약 + 선택 로드여야 한다. (확인)

## 5. 없는 것

- 요청을 계층으로 판정하는 단계. Phase 0-1, Interface-Type Gate, codemap 라우터 같은 선례만 있다.
- 사용자 결정 / AI 권장안 / 미결을 나누는 3분류 라벨. 상류 스킬에도 없다.
- Strategy↔Skeleton 충돌 검사 본체.
- `kind: ui` 레시피. `~/code-recipes`에는 infra 1건뿐이다.
- 과거 대화의 Garrett·5계층·Human Slop 논의. 오늘 대화가 처음이다.

## 6. 개선 착수 시 지킬 조건 (결정 아님)

- a:092 권장안 우선: 질문 수를 늘리지 않고 표시만 더한다.
- a:091, learned 031: 새 프레임워크는 이 레포의 착지 지점과 실제 평가로만 채택한다.
- 상시 로드 규칙을 바꾸려면 Mnemo 템플릿 정본(`skills/mnemo/templates/claude-md-rules.md`)을 고친 뒤 설치 경로로 반영한다. 4-CLI parity를 확인한다.
- 검증기를 바꾸면 `skills/design-plan/scripts/test_validate_experience_contract.py`도 함께 갱신한다.
- 기본값 수정(anatomy)은 frontend-design 소유이므로 design-plan과 함께 문서 동기화 체크리스트를 따른다.

## 7. 디자인 DB(CSV) 점검

사용자가 "정리돼 있는 엑셀도 문제 아니냐"고 물어 4개 CSV를 직접 확인했다. 모두 `확인` 항목이다.

| 파일 | 행 | 소비처 |
|---|---|---|
| `skills/frontend-design/references/design-styles.csv` | 84 | frontend-design Design Database, design-md-guide §4 |
| `skills/frontend-design/references/font-pairings.csv` | 47 | 같음 |
| `skills/frontend-design/references/color-palettes.csv` | 9 | 같음 + `skills/frontend-design/scripts/select-diverse-palettes.js:465` |
| `skills/ui-ux-auditor/references/ux-guidelines.csv` | 99 | ui-ux-auditor 9영역 감사 (외부 MIT 흡수본) |

### 데이터 품질

- **깨진 행 2개.** CSV 형식을 검사하는 테스트는 없다. `style-recipes`에는 `scripts/tests/style-recipes-contract.test.js`가 있다.
  - `design-styles.csv` 77행(Neo Brutalism Mobile): `Implementation Checklist`의 따옴표가 깨졌다. 그래서 22열 헤더에 31칸이 들어가고, 체크리스트가 9칸으로 쪼개졌으며, `Design System Variables`가 30번째 칸으로 밀렸다.
  - `font-pairings.csv` 34행: No 57 "Gen Z Brutal"과 "Bauhaus Geometric(Outfit)" 두 행이 한 줄로 붙어 11열 헤더에 21칸이 들어갔다. grep으로는 여전히 걸리지만, `Heading Font`나 `Google Fonts URL`을 열 위치로 읽으면 두 행 모두 엉뚱한 칸을 읽는다. 77행도 같은 방식으로 어긋난다.
- **색 팔레트 9행이 남은 찌꺼기다.** 2026-08-05 정리 때 161행 중 152행을 지우고 남은 업종이 NFT, 사진관, 베이커리, 뉴스, 미술관, 보안, 양자컴퓨팅, 드론 관제, 공간 컴퓨팅이다. 9행 중 3행의 Primary가 네온 초록·시안(`#00FF41` ×2, `#00FFFF`)이다. 일반 제품에 해당하는 행은 없고, 남은 행도 업종 클리셰다.
- **학습이 DB로 돌아오지 않는다.** `Pretendard`가 폰트 DB에 0건이다. g:112는 `Pretendard Variable` family 이름까지 실측해서 레시피를 고쳤지만, CSV에는 반영되지 않았다.

### 구조 (5계층 관점)

- **조회 키가 업종·카테고리다.** 스타일 84행은 `Best For`의 업종 키로 매핑된다. "대시보드"로 찾으면 BI/Analytics 10행(No 28~37)이 나온다. 이 행들은 모두 현황을 보는 사람(경영진·영업·모니터링·재무)을 전제한다. 예를 들어 Executive Dashboard의 효과는 "KPI value animations (count-up)"이다. 첫 행동을 해야 하는 신규 사용자용 행은 없고, 사용자 단계·주 과업 같은 Strategy 열도 없다. Scope 성격의 열은 Surface 수준의 `Do Not Use For` 하나뿐이다.
- **DB가 모두 Surface이거나 실행 품질이다.** `ux-guidelines.csv` 99개 이슈는 접근성·폼·애니메이션·성능 등이다. 빈 상태는 1행(No 79), 온보딩도 1행(No 88)이다. "화면이 엉뚱한 사용자 단계를 위해 만들어졌다", "범위 밖 기능이 붙었다" 같은 Strategy·Scope 위반 범주가 없어서, 감사로는 글이 말한 실패를 잡지 못한다.
- **문서끼리 모순되고, 존재하지 않는 절차를 가리킨다.**
  - `skills/design-plan/references/design-md-guide.md:120`은 "DB 매칭 + 가중 루브릭 채점 결과를 그대로 DESIGN.md에 박습니다"라고 한다.
  - 반면 `skills/design-plan/SKILL.md:376`과 `skills/frontend-design/SKILL.md:147`은 "DB는 폴백"이라고 한다.
  - 그 "가중 루브릭"은 design-md-guide(:120, :126) 말고는 어디에도 정의가 없다. 오히려 `skills/design-plan/references/render-critique-loop.md:136`은 "숫자 미학 점수 하나로 승자를 정하지 않습니다"라고 한다.
  - 2026-08 실측에서는 그 루브릭이 Claude 편향 색(Cream/Vermilion)을 1위로 뽑았다(`docs/research/2026-08-05-deep-research-impeccable.md:147`).
- **Surface 출발점이 겹친다.** `skills/frontend-design/SKILL.md:124-152`의 DB 표에 시작점이 여럿 나열되어 있다: 스타일 레시피 13종, motion-first 방향 8종, 스타일 CSV 84행, 프리셋, 팔레트 CSV 9행, 팔레트 스크립트. 이 중 무엇을 고를지는 8단계 산문 사용법이 정한다. 자원은 많은데 고르는 장치가 약한 문제가 여기서도 되풀이된다.

### 처리 후보 (결정 아님)

- 작고 확실한 것:
  - 깨진 행 2개를 수리하고 CSV 열 수 검사 테스트를 추가한다.
  - design-md-guide §4의 문장을 "DB는 폴백" 원칙에 맞추고, 사라진 루브릭 언급을 지운다.
  - Pretendard 행을 추가할지 검토한다.
- 정리가 필요한 것:
  - `color-palettes.csv`: 삭제를 검토한다. 단 `select-diverse-palettes.js`가 이 파일에 의존하므로 함께 바꿔야 한다.
  - `design-styles.csv`: style-recipes와 겹치는 Surface 어휘집으로 강등하고, 시작점으로 쓰지 못하게 라우터에서 막는다. BI 행에는 "현황 확인자 전제"라고 표시한다.
- 외부 흡수본인 `ux-guidelines.csv`는 그대로 둔다. Strategy·Scope 점검은 아프로디테 라우터나 감사 본문 쪽에 더한다.

## 탐색 범위

- 읽기 전용 탐색 에이전트 3개(상류 기획, 디자인 모듈, 컨텍스트 인프라·기록)를 돌리고, 메인이 핵심 주장을 원문과 대조했다.
- CSV 4개는 형식(열 수), 범주 분포, 지목한 행까지 직접 확인했다. 모든 Do/Don't 칸을 읽지는 않았다.
- 보지 않은 것: `style-recipes` 개별 파일, 다른 프로젝트 Experience Contract 본문(표본 3건 외).
