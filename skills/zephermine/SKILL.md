---
name: zephermine
description: Creates detailed, sectionized implementation plans through research, stakeholder interviews, domain expert analysis, database schema design, and multi-LLM review. Use when planning features that need thorough pre-implementation analysis. /zephermine로 실행. Also known as 젭마인, 제퍼마인, 제퍼미네.
triggers:
  - "zephermine"
  - "젭마인"
  - "제퍼마인"
  - "제퍼미네"
auto_apply: false
---

# Zephermine

> **Zephyr**(제퍼: 산들바람/서풍, 부드럽고 빠른 흐름) + **Minerva**(미네르바: 지혜·전략·판단)의 합성어.
> 바람처럼 가볍고 빠르게 상황을 읽고, 미네르바처럼 논리적으로 설계해 실행 가능한 계획으로 만드는 능력을 뜻합니다.
> [softaworks/gepetto](https://github.com/softaworks/gepetto) 스킬을 벤치마킹하여 커스터마이징한 버전입니다.

Orchestrates a multi-step planning process: Research → Interview → Spec Synthesis → Team Analysis → Plan → External Review → Sections → Verify

## CRITICAL: First Actions

**BEFORE anything else**, do these in order:

### 1. Print Intro

간결하게 진행 순서만 출력:
```
젭마인(Zephermine) 시작
순서: Research → Interview → Spec → Team Review → Plan → External Review → DB Schema → API Spec → Flow Diagrams → Sections → Operation Scenarios → QA Scenarios → Skill Discovery
```

### 2. Resolve Spec File Path

**Check if user provided @file at invocation AND it's a spec file (ends with `.md`).**

**경로가 제공된 경우:** 그대로 사용

**경로가 없는 경우:** 사용자 대화에서 주제를 추론하여 자동 경로 생성 후 바로 진행:
1. 대화 컨텍스트에서 기능/프로젝트명 추출 (예: "UI 재설계" → `ui-redesign`)
2. 기본 경로 패턴: `docs/plan/{feature-name}/spec.md`
3. 사용자에게 경로만 간단히 확인:
   ```
   계획 경로: docs/plan/ui-redesign/spec.md
   이 경로로 진행합니다. (변경하려면 알려주세요)
   ```
4. **확인을 기다리지 않고 바로 다음 단계 진행** (사용자가 변경 요청하면 그때 수정)

**주제를 추론할 수 없는 경우에만** 간단히 질문:
```
어떤 기능을 계획할까요? (예: "로그인 리팩토링", "결제 시스템")
```

### 3. Setup Planning Session

Determine session state by checking existing files:

1. Set `planning_dir` = parent directory of the spec file
2. **If `planning_dir` doesn't exist, create it automatically**
3. Set `initial_file` = the spec file path
4. If spec file doesn't exist, create an empty template:
   ```markdown
   # Feature Spec

   ## Overview
   [Describe what you want to build]

   ## Requirements
   - [Requirement 1]
   - [Requirement 2]
   ```
5. Scan for existing planning files:
   - `research.md`
   - `interview.md`
   - `spec.md`
   - `team-review.md`
   - `plan.md`
   - `api-spec.md`
   - `db-schema.md`
   - `integration-notes.md`
   - `design-system.md`
   - `operation-scenarios.md`
   - `qa-scenarios.md`
   - `team-reviews/` directory (domain-research.md, 개별 분석 파일)
   - `reviews/` directory
   - `flow-diagrams/` directory (프로세스 공정 도면)
   - `sections/` directory

6. Determine mode and resume point:

| Files Found | Mode | Resume From |
|-------------|------|-------------|
| None | new | Step 4 |
| research only | resume | Step 6 (interview) |
| research + interview | resume | Step 8 (spec synthesis) |
| + spec | resume | Step 9 (persona) |
| + personas-and-journeys.md | resume | Step 10 (team analysis) |
| + team-review.md | resume | Step 12 (plan) |
| + plan | resume | Step 13 (external review) |
| + reviews | resume | Step 14 (integrate) |
| + integration-notes | resume | Step 15 (user review) |
| + db-schema.md | resume | Step 17 (API spec) |
| + api-spec.md | resume | Step 18 (flow diagrams) |
| + flow-diagrams/ | resume | Step 19 (section index) |
| + sections/index.md | resume | Step 20 (write sections) |
| all sections complete | resume | Step 22 (operation scenarios) |

7. Create TODO list with TodoWrite based on current state

Print status:
```
Planning directory: {planning_dir}
Mode: {mode}
```

If resuming:
```
Resuming from step {N}
To start fresh, delete the planning directory files.
```

---

## Logging Format

```
═══════════════════════════════════════════════════════════════
STEP {N}/24: {STEP_NAME}
═══════════════════════════════════════════════════════════════
{details}
Step {N} complete: {summary}
───────────────────────────────────────────────────────────────
```

---

## Workflow

### 4. Research Decision

See [research-protocol.md](references/research-protocol.md).

1. Read the spec file
2. Extract potential research topics (technologies, patterns, integrations)
3. Ask user about codebase research needs
4. Ask user about GitHub similar project search (reference implementations)
5. Ask user about web research needs (present derived topics as multi-select)
6. Ask user about academic paper/algorithm research (논문, 알고리즘, 구현 패턴)
7. Ask user about competitor analysis (경쟁사 기능, 메뉴, UX 패턴)
8. Record which research types to perform in step 5

### 5. Execute Research

See [research-protocol.md](references/research-protocol.md).

Based on decisions from step 4, launch research subagents:
- **Codebase research:** `Task(subagent_type=Explore)`
- **GitHub research:** `Task(subagent_type=Explore)` with WebSearch (`site:github.com`)
- **Web research:** `Task(subagent_type=Explore)` with WebSearch
- **Academic research:** `Task(subagent_type=Explore)` with WebSearch (논문, 알고리즘, 벤치마크)
- **Competitor analysis:** `Task(subagent_type=Explore)` with WebSearch + WebFetch (경쟁사 기능/메뉴/UX)

If multiple are needed, launch all Task tools in parallel (single message with multiple tool calls).

**Important:** Subagents return their findings - they do NOT write files directly. After collecting results from all subagents, combine them and write to `<planning_dir>/research.md`.

Skip this step entirely if user chose no research in step 4.

### 6. Detailed Interview

See [interview-protocol.md](references/interview-protocol.md)

Run in main context (AskUserQuestion requires it). The interview should be informed by:
- The initial spec
- Research findings (if any)

### 7. Save Interview Transcript

Write Q&A to `<planning_dir>/interview.md`

### 8. Write Initial Spec (Spec Synthesis)

Combine into `<planning_dir>/spec.md`:
- **Initial input** (the spec file)
- **Research findings** (if step 5 was done)
- **Interview answers** (from step 6)
- **Test Scenarios** (각 기능별 입출력 기대값)

This synthesizes the user's raw requirements into a complete specification.

**필수 포함: Risk Assessment 섹션** — 프로젝트 수준의 위험 요소 분석:

| 위험 요소 | 영향도 | 발생 확률 | 완화 전략 |
|-----------|--------|-----------|-----------|
| {기술적 위험} | High/Med/Low | High/Med/Low | {대응 방안} |
| {외부 의존성 위험} | ... | ... | ... |
| {일정/범위 위험} | ... | ... | ... |

> 각 섹션은 이 테이블을 참조하여 섹션별 Risk & Rollback을 구체화합니다.

**조건부 생성: Design System** — 인터뷰 Category B(디자인 비전)가 수집된 경우:

See [design-system-guide.md](references/design-system-guide.md)

`<planning_dir>/design-system.md` 생성. 인터뷰에서 수집한 톤/무드, 색상, 레이아웃, 벤치마킹, 안티 패턴을 **구현자가 바로 참조할 수 있는 디자인 규칙**으로 정리.
UI/프론트엔드가 없는 프로젝트(CLI, 라이브러리, 백엔드 API 전용)는 자동 건너뜀.

**필수 포함: Test Scenarios 섹션** — 각 주요 기능(API, 화면, 로직)마다:
- 정상 케이스: 입력 → 기대 출력
- 에러 케이스: 잘못된 입력 → 기대 에러
- 엣지 케이스: 경계값, 빈 값, 최대값 등

See [test-scenario-guide.md](references/test-scenario-guide.md)

### 9. User Persona & Journey Map

인터뷰와 리서치 결과를 기반으로 **사용자 페르소나**와 **여정맵**을 생성합니다.
UI/프론트엔드가 없는 프로젝트(CLI, 라이브러리, 백엔드 API 전용)는 자동 건너뜀.

**입력:**
- `interview.md` — 사용자 답변 (A. 심층 목표, D. UI/UX 상세)
- `research.md` — 경쟁사 분석 결과 (있는 경우)
- `spec.md` — 기능 요구사항

**출력:** `<planning_dir>/personas-and-journeys.md`

#### 페르소나 (Persona)

인터뷰의 산업군, 타겟 사용자, 사용 시나리오에서 추출. 2~4개 페르소나 생성.

```markdown
## Persona 1: {이름} ({역할})

| 항목 | 내용 |
|------|------|
| 역할 | {직책/사용자 유형} |
| 목표 | {이 서비스로 달성하려는 것} |
| 불만 | {현재 겪는 문제점} |
| 기술 수준 | {초보/중급/전문가} |
| 사용 빈도 | {매일/주 N회/월 N회} |
| 핵심 시나리오 | {가장 자주 하는 작업 1~3개} |
```

#### 여정맵 (Journey Map)

각 페르소나의 핵심 시나리오를 단계별로 매핑. Mermaid flowchart로 시각화.

```markdown
## Journey: {페르소나} — {시나리오}

| 단계 | 행동 | 감정 | 터치포인트 | 기회 |
|------|------|------|-----------|------|
| 인지 | {어떻게 알게 되는지} | {기대/불안} | {채널} | {개선 포인트} |
| 탐색 | {무엇을 찾아보는지} | ... | ... | ... |
| 사용 | {핵심 기능 사용} | ... | ... | ... |
| 반복 | {재방문 이유} | ... | ... | ... |
```

```mermaid
flowchart LR
    A([인지]) --> B([탐색]) --> C([가입/시작]) --> D([핵심 사용]) --> E([반복/추천])
```

**활용:**
- Step 10 팀 분석에서 UX Agent가 페르소나 기반으로 사용성 평가
- Section 분리 시 페르소나별 핵심 흐름이 한 섹션에 포함되도록 고려
- flow-diagrams 생성 시 여정맵의 단계를 노드로 활용

### 10. Multi-Agent Team Analysis

See [team-review-protocol.md](references/team-review-protocol.md)

**⚠️ CONTEXT MANAGEMENT**: This step spawns 6 agents (Phase A 4개 + Phase B 2개). To prevent context overflow:
1. **Before launching agents**: Consider running `/compact` if conversation is already long
2. **Agent return value**: Each agent MUST write full results to files and return ONLY a 2-3 line summary
3. **If context limit hit**: User can `/compact` or `/clear`, then resume from Step 10 (team-reviews/ files already saved)

**Phase A — 도메인 리서치 + 고정 에이전트 (4개 병렬):**
1. **UX Agent** (Claude) — 사용자 경험, 사용성, 접근성
2. **Architecture Agent** (Claude) — 확장성, 성능, 보안, 기술 부채
3. **Red Team Agent** (Claude) — 가정 검증, 실패 모드, 엣지 케이스, 누락 항목
4. **Domain Researcher** (Claude + WebSearch) — 산업별 기술/표준/솔루션 **검색**

**Phase B — 도메인 전문가 (리서치 결과 활용, 2개 병렬):**
5. **Domain Process Expert** — 업무 흐름표 작성 (기능별 왜/누가/CRUD 권한/입출력/예외)
6. **Domain Technical Expert** — 기술 스택 매핑 (기능별 필수 기술/연동/규제/기존 솔루션)

> Phase B는 Phase A 완료 후 실행 (domain-research.md 필요).
> 도메인 전문가는 리서치 결과를 기반으로 **실제 기술/솔루션을 참조하여** 분석합니다.
> **spec에 없는 업무도 제안**: 해당 산업에서 필수인데 빠진 업무/역할/규제를 제안합니다 (사용자 확인 후 채택).

| Codex | Gemini | 도메인 전문가 실행 (Phase B) |
|-------|--------|---------------------------|
| ✅ | ✅ | Process → Codex, Technical → Gemini |
| ✅ | ❌ | 둘 다 Codex |
| ❌ | ✅ | 둘 다 Gemini |
| ❌ | ❌ | 둘 다 Claude Explore |

도메인 전문가 프롬프트는 인터뷰의 `[Industry: {산업군}]` 태그를 기반으로 동적 생성.
외부 AI 실행 실패 시 해당 전문가만 Claude Explore로 폴백.

**CRITICAL — Agent return protocol:**
Each agent must end with ONLY this format (NO full analysis in return text):
```
✅ {filename}.md 작성 완료. Critical: N건, Important: N건, Nice-to-Have: N건
```
Full analysis goes ONLY to `<planning_dir>/team-reviews/{filename}.md` files.
This prevents the combined agent outputs from overflowing the main context.

Results → `<planning_dir>/team-reviews/` (개별 6개) + `<planning_dir>/team-review.md` (통합).

The synthesized team review feeds into Step 9.5 (user confirmation) and then Step 10 (plan generation) as additional input.

### 11. User Confirmation of Domain Expert Suggestions

도메인 전문가가 추가 제안한 "누락 사항"(누락 업무, 누락 역할, 업계 관행, 규제 등)을 사용자에게 보여주고 **선택적으로 채택**합니다.

**1) 제안 항목 추출:** `team-reviews/domain-process-analysis.md`와 `team-reviews/domain-technical-analysis.md`에서 우선순위 테이블(🔴/🟡/🟢) 항목을 추출합니다.

**2) 사용자 확인:** AskUserQuestion(multiSelect)으로 제안 항목을 보여줍니다:

```
question: "도메인 전문가가 아래 항목을 추가 제안했습니다. 채택할 항목을 선택하세요. (🔴필수/🟡권장/🟢선택은 AI 판단이며, 최종 결정은 사용자입니다)"
header: "Domain"
multiSelect: true
options:
  - label: "🔴 {항목1}: {한줄요약}"
    description: "{근거}"
  - label: "🟡 {항목2}: {한줄요약}"
    description: "{근거}"
  - label: "🟢 {항목3}: {한줄요약}"
    description: "{근거}"
  ...
```

> 항목이 너무 많으면 (8개+) 🔴필수/🟡권장/🟢선택 그룹별로 나누어 2~3회 질문합니다.

**3) 채택 결과 기록:** `team-review.md`의 "Impact on Plan" 섹션에 사용자 채택 결과를 추가합니다:

```markdown
## User-Approved Domain Suggestions
- ✅ 채택: {항목명} — {이유}
- ❌ 미채택: {항목명} — 사용자 판단: {이유 또는 "불필요"}
```

**4) 미채택 항목은 Plan에 반영하지 않습니다.** Step 10은 채택된 항목만 반영합니다.

### 12. Generate Implementation Plan

Create detailed plan → `<planning_dir>/plan.md`

**Inputs:**
- `<planning_dir>/spec.md`
- `<planning_dir>/team-review.md` (team analysis findings)
- `<planning_dir>/team-reviews/domain-process-analysis.md` (업무 흐름표 — CRUD 권한, 역할, 입출력)
- `<planning_dir>/team-reviews/domain-technical-analysis.md` (기술 스택 매핑 — 연동, 규제, 솔루션)

**IMPORTANT**: Address all "Critical Findings" from the team review.
도메인 전문가의 추가 제안 중 **Step 9.5에서 사용자가 채택한 항목만** plan에 반영합니다.
미채택 항목은 반영하지 않습니다.
Write for an unfamiliar reader. The plan must be fully self-contained - an engineer or LLM with no prior context should understand *what* we're building, *why*, and *how* just from reading this document.

### 13. External Review

See [external-review.md](references/external-review.md)

Launch TWO subagents in parallel to review the plan:
1. **Gemini** via Bash
2. **Codex** via Bash

Both receive the plan content and return their analysis. Write results to `<planning_dir>/reviews/`.

### 14. Integrate External Feedback

Analyze the suggestions in `<planning_dir>/reviews/`.

You are the authority on what to integrate or not. It's OK if you decide to not integrate anything.

**Step 1:** Write `<planning_dir>/integration-notes.md` documenting:
- What suggestions you're integrating and why
- What suggestions you're NOT integrating and why

**Step 2:** Update `<planning_dir>/plan.md` with the integrated changes.

### 15. User Review of Integrated Plan

Use AskUserQuestion:
```
The plan has been updated with external feedback. You can now review and edit plan.md.

If you want Claude's help editing the plan, open a separate Claude session - this session
is mid-workflow and can't assist with edits until the workflow completes.

When you're done reviewing, select "Done" to continue.
```

Options: "Done reviewing"

Wait for user confirmation before proceeding.

### 16. Generate Database Schema

See [schema-design-guide.md](references/schema-design-guide.md)

도메인 전문가의 업무 흐름표 + 기술 스택 매핑 + Plan에서 데이터 모델 추출 → `<planning_dir>/db-schema.md` 생성.

**Inputs:** `domain-process-analysis.md` + `domain-technical-analysis.md` + `plan.md`
**Output:** ERD (Mermaid) + DDL + Design Rationale + Index Strategy
**Process:** DB 감지 → 엔티티 추출 → 관계 분석 → DB 특성 반영 → 정규화 → ERD/DDL/인덱스

DB가 없는 프로젝트(CLI, 라이브러리, 정적사이트)는 자동 건너뜀.

### 17. Generate API Specification

See [api-spec-guide.md](references/api-spec-guide.md)

`plan.md` + `db-schema.md`에서 API 엔드포인트 추출 → `<planning_dir>/api-spec.md` 생성.

각 엔드포인트: Method + Path, Request/Response 스키마, Auth, Frontend Caller 포함.
**구현 중 새 API 추가 시 반드시 이 문서에도 추가** (drift 방지).
API 없는 프로젝트(정적사이트, CLI)는 자동 건너뜀.

### 18. Generate Process Flow Diagrams (공정 도면) — MANDATORY

> **⚠️ 이 단계는 건너뛸 수 없습니다.** 공정 도면이 없으면 다이달로스(workpm)가 기준선 없이 시공하게 됩니다.
> 설계사는 시방서(sections) 전에 공정 흐름도를 먼저 그린다.

`plan.md` + `api-spec.md` + `team-reviews/domain-process-analysis.md`에서 핵심 프로세스 흐름을 추출하여 Mermaid flowchart로 작성합니다.

**절차:**

1. **핵심 프로세스 식별**: Plan에서 독립적인 비즈니스/기술 프로세스 추출
   - 예: 사용자 인증, 주문 처리, 결제 프로세스, 데이터 동기화
   - 기준: "사용자 또는 시스템이 시작~종료까지 거치는 완결된 흐름" 1개 = 다이어그램 1개
   - 프로세스 수: 핵심 3~8개 (너무 많으면 상위 레벨로 통합)
   - **단일 프로세스 프로젝트(CLI, 라이브러리)라도 최소 1개의 메인 흐름도를 생성**

2. **서브에이전트 위임**: 각 프로세스별 다이어그램 생성
   ```
   Task(subagent_type=Explore, prompt="""
   skills/flow-verifier/SKILL.md의 plan 모드와 skills/mermaid-diagrams/SKILL.md를 읽고 참조하세요.

   다음 프로세스의 Mermaid flowchart를 작성하세요:
   프로세스: {process_name}
   컨텍스트: {plan에서 추출한 해당 프로세스 설명}
   API 엔드포인트: {관련 API 목록}

   규칙:
   - 노드 ID: 영문 camelCase
   - 분기(decision): 모든 경로(Yes/No, 에러) 포함
   - 정상 경로(happy path) + 에러 경로 + 엣지 케이스
   - 노드 20개 이하
   - 각 노드에 관련 API 엔드포인트 또는 함수명 주석

   결과만 반환하세요 (파일 작성 금지).
   """)
   ```

3. **파일 저장**: 서브에이전트 결과를 수집하여 `<planning_dir>/flow-diagrams/` 에 저장
   - 파일명: `{process-name}.mmd` (kebab-case)
   - 인덱스: `<planning_dir>/flow-diagrams/index.md` 생성

**인덱스 파일 형식** (`flow-diagrams/index.md`):

```markdown
# Process Flow Diagrams

| 프로세스 | 파일 | 노드 수 | 관련 섹션 |
|----------|------|---------|-----------|
| 사용자 인증 | user-auth.mmd | 12 | section-02 |
| 주문 처리 | order-process.mmd | 15 | section-03, section-04 |
| 결제 프로세스 | payment.mmd | 10 | section-05 |

## 의존성
user-auth → order-process → payment
```

**workpm 연계**: 이 도면들은 workpm의 공정 기준선이 됩니다:
- workpm Phase 2: 이 도면을 읽어서 추가/수정 여부 판단
- workpm Phase 2: 각 Worker에게 담당 다이어그램 노드 배분
- workpm Phase 4: 구현 후 이 도면과 코드를 대조 검증

### 19. Create Section Index

**⚠️ GATE CHECK — 이 단계 진입 전 반드시 확인:**
- `<planning_dir>/flow-diagrams/index.md` 파일이 존재하는가?
- 존재하지 않으면 → **Step 16으로 돌아가서 공정 도면을 먼저 생성**
- 존재하면 → 진행

See [section-index.md](references/section-index.md)

Read `plan.md`. Identify natural section boundaries and create `<planning_dir>/sections/index.md`.

**CRITICAL:** index.md MUST start with a SECTION_MANIFEST block. See the reference for format requirements.

Write `index.md` before proceeding to section file creation.

### 20. Write Section Files — Parallel Subagents

See [section-splitting.md](references/section-splitting.md)

1. Parse `sections/index.md`의 SECTION_MANIFEST
2. 각 섹션마다 Task 1개씩, **모든 Task를 한 메시지에서 병렬 실행**
3. 각 섹션 파일은 **완전 자립형** (Background, Requirements, Dependencies, Reference Libraries, Implementation, Test Scenarios, Implementation Strategy, Quality Gate, Risk & Rollback, Acceptance Criteria, Files 포함)
4. 구현자가 다른 문서를 참조하지 않아도 되어야 함

Wait for ALL subagents to complete before proceeding.

### 21. Generate Operation Scenarios — Subagent

운영 시나리오를 정의하여 `<planning_dir>/operation-scenarios.md` 생성.
QA 시나리오의 근거가 되는 문서 — 운영 시나리오 없이 QA 시나리오는 만들 수 없음.

**Inputs:** `spec.md` + `plan.md` + `api-spec.md` + `sections/section-*.md` + `team-reviews/domain-process-analysis.md`

**구조:**

```markdown
# 운영 시나리오

## 1. 역할 정의
| 역할 | 설명 | 주요 권한 |
|------|------|-----------|

## 2. 메뉴별 시나리오
### 메뉴: {메뉴명}
- **접근 역할**: 관리자, 일반 사용자
- **화면 구성**: 목록 → 상세 → 편집
- **정상 흐름**: 1. ... → 2. ... → 3. ...
- **예외 흐름**: 권한 없음, 데이터 없음, 입력 오류

## 3. 업무 시나리오 (End-to-End)
### 시나리오: {업무명} (예: 신규 주문 처리)
- **역할**: 고객 → 관리자
- **선행 조건**: 로그인 완료, 상품 존재
- **흐름**: 1. 상품 검색 → 2. 장바구니 → 3. 결제 → 4. 주문 확인
- **예외**: 재고 부족, 결제 실패, 쿠폰 만료
- **후행 조건**: 주문 생성, 재고 차감, 알림 발송

## 4. 화면 흐름도
(Mermaid flowchart — 주요 페이지 간 이동 경로)
```

**규칙:**
- 메뉴/페이지가 있는 프로젝트: 메뉴별 시나리오 필수
- CLI/라이브러리: 명령어별 사용 시나리오로 대체
- API only: 엔드포인트 그룹별 호출 시나리오로 대체
- 도메인 프로세스 분석(team-reviews)의 업무 흐름표를 적극 활용
- spec에 없지만 유사 프로젝트(research.md)에서 발견된 공통 기능 → 💡 누락 후보로 표시

### 22. Generate QA Scenarios Document — Subagent

**운영 시나리오를 기반으로** QA 테스트 케이스를 생성하여 `<planning_dir>/qa-scenarios.md` 작성.

**Inputs:** `operation-scenarios.md` + `spec.md` + `api-spec.md` + `sections/section-*.md`

**구조:**
- 메뉴별 테스트 시나리오 (운영 시나리오의 메뉴별 정상/예외 흐름 → 테스트 케이스)
- 업무 시나리오별 E2E 테스트 (End-to-End 흐름 → 통합 테스트)
- Frontend ↔ Backend 통합 테스트 (api-spec 기반)
- Summary (총 테스트/단위/통합/에러 케이스 건수)

**매핑 규칙:** 운영 시나리오 1개 → QA 테스트 케이스 N개 (정상 1 + 예외 N-1)

### 23. Final Status

Verify all files were created successfully:
- All section files from SECTION_MANIFEST
- `flow-diagrams/*.mmd` + `flow-diagrams/index.md` (**필수** — 없으면 Step 16 미실행)
- `api-spec.md` (API가 있는 프로젝트)
- `db-schema.md` (DB가 있는 프로젝트)
- `design-system.md` (UI가 있는 프로젝트)
- `personas-and-journeys.md` (UI가 있는 프로젝트)
- `operation-scenarios.md`
- `qa-scenarios.md`
- `team-reviews/domain-research.md` (도메인 리서치)
- `team-reviews/domain-process-analysis.md` (업무 흐름표)
- `team-reviews/domain-technical-analysis.md` (기술 스택 매핑)

### 24. Output Summary

Print generated files list and implementation options:
```
ZEPHERMINE: Planning Complete

Generated: research/interview/spec/personas-and-journeys/team-review/plan/
           api-spec/db-schema/design-system/integration-notes/
           operation-scenarios/qa-scenarios.md
           + team-reviews/ + reviews/ + flow-diagrams/ + sections/

Implementation options:
  A. /agent-team <planning_dir> → 섹션 기반 병렬 구현 (권장)
  B. /chronos <planning_dir>    → 자율 반복 구현 루프
  C. Manual: sections/index.md  → 순서대로 수동 구현
  D. /argos <planning_dir>      → 감리 (설계 대비 구현 검증)

Other options:
  /estimate <planning_dir>      → 개발 견적서 (비용 산정이 필요한 경우)
```

### 25. Discover Implementation Skills

구현 시작 전, 프로젝트에 도움될 외부 스킬을 탐색합니다.

**1) 키워드 추출:** `plan.md`와 `sections/section-*.md`를 읽고 기술 스택 키워드 추출 (예: React, Docker, PostgreSQL, Spring Boot, Playwright)

**2) 로컬 스킬 확인:** `Glob("skills/*/SKILL.md")`로 이미 설치된 스킬 목록 수집, 키워드와 매칭

**3) 외부 스킬 검색:** 매칭되지 않은 주요 키워드(최대 5개)로 Bash `npx skills find "{keyword}"` 실행

**4) 결과 표시:** 이미 설치된 관련 스킬 + 새로 설치 가능한 스킬 목록 출력

**5) 선택적 설치:** AskUserQuestion(multiSelect)으로 설치할 스킬 선택. "건너뛰기" 옵션 포함. 선택 시 `npx skills add {package} -g -y` 실행.

> 검색 결과가 없거나 모든 관련 스킬이 설치되어 있으면 자동 건너뛰기.

### 26. 감리 안내

설계가 완료되면 사용자에게 감리(검증) 단계를 안내합니다:

```
✅ 젭마인 설계 완료!

📐 구현 후 감리가 필요하면:
  /argos <planning_dir>    → 아르고스 감리 (설계 대비 준공검사)
```

> **참고:** 검증(감리)은 이전에는 zephermine에 포함되어 있었으나, 설계사와 감리의 역할 분리 원칙에 따라 `/argos`로 독립되었습니다.

---

## 다음 단계 안내

설계가 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ 젭마인 설계 완료!

📦 산출물: operation-scenarios.md, qa-scenarios.md, sections/

👉 다음 단계 (선택):
  /agent-team          → 섹션 기반 병렬 구현 (Codex에서는 agent-team-codex로 해석, 권장)
  /chronos             → 자율 반복 구현 루프
  수동 구현             → 직접 코딩

📎 참고: docs/workflow-guide.md
```
