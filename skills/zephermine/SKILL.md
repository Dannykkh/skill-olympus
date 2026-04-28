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
순서: Research → Interview → Spec → Team Review → Domain Dictionary → Plan → External Review → DB Schema → API Spec → Flow Diagrams → Sections → Operation Scenarios → QA Scenarios → Skill Discovery
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
3. **Archive 기존 산출물** — `planning_dir`이 이미 존재하고 **spec.md가 있는 완료된 계획**이면:
   ```
   a. {planning_dir}/archive/ 디렉토리 생성 (없으면)
   b. 기존 파일 전체 → {planning_dir}/archive/{YYYY-MM-DD-HHMM}/ 로 이동 (Bash mv)
      - archive/ 폴더 자체는 이동하지 않음
   c. planning_dir을 클린 상태로 시작
   ```
   **resume 모드일 때는 archive 하지 않음** — 이어서 작업할 때는 기존 파일을 유지.
   사용자가 "새로 시작"이라고 명시하거나, 모든 단계가 완료된 상태에서 재실행할 때만 archive.
4. Set `initial_file` = the spec file path
4. If spec file doesn't exist, create an empty template:
   ```markdown
   # Feature Spec

   ## Overview
   [Describe what you want to build]

   ## Requirements
   - [Requirement 1]
   - [Requirement 2]
   ```
5. Scan for existing planning files (research.md, interview.md, spec.md, team-review.md, domain-dictionary-delta.md, plan.md, api-spec.md, db-schema.md, integration-notes.md, design-system.md, operation-scenarios.md, qa-scenarios.md, team-reviews/, reviews/, flow-diagrams/, sections/)

   > 마스터 사전(`docs/domain-dictionary.md`)은 프로젝트 단일이므로 planning_dir 스캔에서 제외. planning_dir에는 변경 이력 델타만 보관.

6. **Import upstream artifacts** — 사전 파이프라인 산출물이 있으면 컨텍스트로 로드:
   - `docs/athena/*.md` (excluding archive/) → Athena Go/No-Go 판정, 스코프 조정, MVP 범위
   - `docs/hermes/*.md` (excluding archive/) → Hermes 사업 분석 (BMC, TAM/SAM, GTM)
   - 있으면: interview-protocol.md Phase C의 기정 사실(given context)로 활용, 사업 관련 질문 생략
   - 없으면: 무시하고 정상 진행

7. Determine mode and resume point:

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

**도메인사전 Resume 보정 규칙** (위 테이블과 별도, Resume 시 항상 점검):

| 조건 | 처리 |
|------|------|
| spec.md 있고 `docs/domain-dictionary.md` 없음 | Step 8 끝부산물(사전 v1 생성)을 먼저 실행한 후 정해진 Resume Step으로 진행 |
| team-review.md 있고 사전이 v1에 머무름 (Dictionary Updates 미반영) | Step 10 끝부산물(사전 v2 자동 병합)을 먼저 실행 |
| plan.md 있고 사전이 v3 미확정 (`<planning_dir>/domain-dictionary-delta.md`에 v2→v3 항목 없음) | Step 11 끝부산물(사전 v3 최종화)을 먼저 실행 — 사용자 multiSelect 1회 |

**판정 방법**: `<planning_dir>/domain-dictionary-delta.md`의 `## v1 → v2`, `## v2 → v3` 섹션 존재 여부로 진행 단계 추정. 델타가 없으면 마스터 사전이 어떤 버전인지 모르므로 안전하게 v1부터 다시 실행.

이 보정은 사용자가 Resume할 때 사전이 누락된 채로 다음 Phase가 진행되는 것을 막습니다.

8. Create TODO list with TodoWrite based on current state

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
STEP {N}/26: {STEP_NAME}
═══════════════════════════════════════════════════════════════
{details}
Step {N} complete: {summary}
───────────────────────────────────────────────────────────────
```

---

## Workflow

26단계는 **6 Phase**로 그룹화됩니다. Phase는 단순 라벨이며 Step 번호는 변경되지 않습니다. 다른 스킬이 "Phase X 후 호출"로 참조할 때 사용합니다.

| Phase | Step | 핵심 산출물 |
|-------|------|-------------|
| **Phase 1: Discovery** | 4-7 | research.md, interview.md |
| **Phase 2: Spec** | 8-9 | spec.md, personas-and-journeys.md, **domain-dictionary.md v1** |
| **Phase 3: Domain** | 10-11 | team-review.md, **domain-dictionary.md v3 (확정)** |
| **Phase 4: Plan** | 12-15 | plan.md, integration-notes.md |
| **Phase 5: Design** | 16-19 | db-schema.md, api-spec.md, flow-diagrams/, sections/ |
| **Phase 6: Validation** | 20-26 | section-*.md, operation-scenarios.md, qa-scenarios.md |

**도메인사전은 Step이 아니라 Step의 부산물입니다.** Step 8 끝에서 v1 초안, Step 10 끝에서 전문가 입력으로 v2 자동 병합, Step 11 끝에서 사용자 확인으로 v3 확정. 별도 단계가 추가되지 않으며, 각 Step 본문 끝의 평범한 단락으로 처리됩니다.

---

## Phase 1: Discovery

리서치와 인터뷰로 도메인을 파악하는 단계.

### 4. Research Decision

See [research-protocol.md](references/research-protocol.md).

1. Read the spec file
2. Extract potential research topics (technologies, patterns, integrations)
3. Ask user about: codebase research / GitHub similar projects / web research / academic papers / competitor analysis
4. Record which research types to perform in step 5

### 5. Execute Research

See [research-protocol.md](references/research-protocol.md).

Based on decisions from step 4, launch research subagents in parallel:
- **Codebase:** `Task(subagent_type=Explore)`
- **GitHub/Web/Academic/Competitor:** `Task(subagent_type=Explore)` with WebSearch

Subagents return findings (do NOT write files). Combine results → write to `<planning_dir>/research.md`.

Skip entirely if user chose no research in step 4.

### 6. Detailed Interview

See [interview-protocol.md](references/interview-protocol.md)

Run in main context (AskUserQuestion requires it). Informed by: initial spec + research findings.

### 7. Save Interview Transcript

Write Q&A to `<planning_dir>/interview.md`

---

## Phase 2: Spec

Spec과 Persona를 합성하고, 도메인사전 v1 초안을 자동 생성하는 단계.

### 8. Write Initial Spec (Spec Synthesis)

Combine into `<planning_dir>/spec.md`:
- Initial input + research findings + interview answers + Test Scenarios

**필수 포함: Context Map 섹션** — interview.md의 Gate 1 결과에서 가져옴:

```markdown
## Context Map

### 공유 전제
- 목표: {궁극적 목표}
- 산업: {산업} | 범위: {MVP/풀/리뉴얼}
- 성공 기준: {성공의 정의}

### 이해관계자
| 역할 | 설명 | 관련 섹션 |
|------|------|-----------|
| {역할} | {설명} | (Step 19에서 backfill) |

### 에코시스템 맵
| 시스템 | 대상 | 연동 방식 | 관련 섹션 |
|--------|------|-----------|-----------|
| {시스템} | {대상} | {내장/외부API/제외} | (Step 19에서 backfill) |

### 기존 환경
{기술 스택, 기존 코드, 인프라 요약}
```

**필수 포함: Problem Statement 섹션** — interview.md의 Gate 2 결과에서 가져옴:

```markdown
## Problem Statement

| # | 핵심 문제 | 영향 | 우선순위 | 해결 섹션 |
|---|-----------|------|----------|-----------|
| P1 | {문제} | {영향} | 🔴 필수 | (Step 19에서 backfill) |
| P2 | {문제} | {영향} | 🟠 중요 | (Step 19에서 backfill) |
```

> Context Map과 Problem Statement의 '관련 섹션'/'해결 섹션' 열은 Step 19에서 backfill됩니다.
> 이 두 섹션은 다운스트림(섹션 분할, argos 감리)에서 추적성 검증의 앵커로 사용됩니다.

**필수 포함: Risk Assessment 섹션**

| 위험 요소 | 영향도 | 발생 확률 | 완화 전략 |
|-----------|--------|-----------|-----------|
| {기술적 위험} | High/Med/Low | High/Med/Low | {대응 방안} |

**조건부 생성: Design System** — 인터뷰 Phase S-1(디자인 비전)이 수집된 경우:
See [design-system-guide.md](references/design-system-guide.md)
`<planning_dir>/design-system.md` 생성. UI/프론트엔드가 없는 프로젝트는 자동 건너뜀.

**필수 포함: Test Scenarios 섹션** — 각 주요 기능마다 정상/에러/엣지 케이스.
See [test-scenario-guide.md](references/test-scenario-guide.md)

**Step 8 끝부산물 — 도메인사전 v1 초안 생성** (사용자 개입 최소):
spec.md 작성 직후 `domain-dictionary` 스킬을 컨텍스트 모드로 자동 호출. 입력은 spec.md + interview.md. 글로벌 사전(`~/.claude/memory/domain-dictionaries/{도메인}.md`)이 있으면 후보 용어 multiSelect를 1회 진행(사용자 개입 1회 — 글로벌 → 프로젝트 시드). 글로벌이 비어있으면 사용자 개입 없음. 산출물은 마스터(`docs/domain-dictionary.md`, 신규 또는 갱신)와 델타(`<planning_dir>/domain-dictionary-delta.md`). 핵심 용어 5개 미만이면 자동 건너뜀. 자세한 절차는 [domain-dictionary/references/global-sync.md](../domain-dictionary/references/global-sync.md).

### 9. User Persona & Journey Map

See [persona-journey-guide.md](references/persona-journey-guide.md)

인터뷰와 리서치 결과를 기반으로 페르소나(2~4개)와 여정맵 생성.
UI/프론트엔드가 없는 프로젝트는 자동 건너뜀.

**출력:** `<planning_dir>/personas-and-journeys.md`

---

## Phase 3: Domain

전문가 분석으로 도메인을 깊이 이해하고, 사전을 v3까지 확정하는 단계.

### 10. Multi-Agent Team Analysis

See [team-review-protocol.md](references/team-review-protocol.md)

**⚠️ CONTEXT MANAGEMENT**: This step spawns 6 agents. Consider `/compact` before launching.

**Phase A — 4개 병렬:** UX Agent / Architecture Agent / Red Team Agent / Domain Researcher

**Phase B — 2개 병렬 (Phase A 완료 후):** Domain Process Expert / Domain Technical Expert

> Phase B 실행 CLI: Codex/Gemini 가용 여부에 따라 분배. 없으면 Claude Explore로 폴백.

**CRITICAL — Agent return protocol:** Each agent writes full results to files, returns ONLY 2-3 line summary.

**도메인사전 컨텍스트 주입:** 6명 전문가 모두에게 Step 8에서 생성된 사전 v1을 컨텍스트로 전달합니다. 전문가들은 같은 어휘로 분석하며, 분석 중 발견한 신규 용어/정의 다듬음/모호성을 결과물 끝 `## Dictionary Updates` 섹션에 기록합니다. 자세한 프롬프트는 [team-review-protocol.md](references/team-review-protocol.md) 참조.

Results → `<planning_dir>/team-reviews/` (개별 6개) + `<planning_dir>/team-review.md` (통합).

**Step 10 끝부산물 — 도메인사전 v2 자동 병합** (사용자 개입 없음):
6개 전문가의 `## Dictionary Updates` 섹션을 추출하여 v1 → v2로 자동 병합. ADD(신규 추가)/REFINE(정의 다듬음)/MERGE(동의어 통합)는 자동 적용, CONFLICT(전문가 간 의견 갈림)는 자동 병합하지 않고 Step 11로 미룸. 갱신 대상: `docs/domain-dictionary.md` + `<planning_dir>/domain-dictionary-delta.md`.

### 11. User Confirmation of Domain Expert Suggestions

See [domain-confirmation-guide.md](references/domain-confirmation-guide.md)

**Step 11은 세 가지 multiSelect를 한 번에 진행합니다:**

1. **도메인 전문가 추가 제안** (기존) — 채택된 항목만 Step 12 Plan에 반영
2. **사전 변경 제안** (신규) — Step 10 자동 병합 시 CONFLICT로 미뤄진 항목 + 사용자 검토가 필요한 핵심 용어
3. **글로벌 사전 반영 제안** (신규) — 이번 프로젝트에서 새로 정의/다듬어진 용어 중 글로벌 사전(`~/.claude/memory/domain-dictionaries/{도메인}.md`)에 추가할 것 선택

**Step 11 끝부산물 — 도메인사전 v3 최종화** (사용자 개입 끝, 자동 반영만):
사용자 결정을 반영하여 마스터(`docs/domain-dictionary.md`)를 v3로 확정, 델타에 최종 변경 이력 기록, 글로벌 반영 선택 항목을 `~/.claude/memory/domain-dictionaries/{도메인}.md`에 출처 메타데이터와 함께 추가.

**Phase 4 이후로 이 사전은 변경되지 않습니다.** Plan, DB Schema, API Spec, Sections는 모두 v3을 따릅니다.

---

## Phase 4: Plan

상세 구현 계획 수립 + 외부 LLM 리뷰 + 사용자 검토 단계.

### 12. Generate Implementation Plan

Create detailed plan → `<planning_dir>/plan.md`

**Inputs:** `spec.md` + `team-review.md` + `domain-process-analysis.md` + `domain-technical-analysis.md`

Address all "Critical Findings". Step 11에서 채택된 항목만 반영.
Write for an unfamiliar reader — fully self-contained document.

### 13. External Review

See [external-review.md](references/external-review.md)

Launch TWO subagents in parallel: **Gemini** via Bash + **Codex** via Bash.
Write results to `<planning_dir>/reviews/`.

### 14. Integrate External Feedback

Analyze `<planning_dir>/reviews/`. You are the authority on what to integrate.

1. Write `<planning_dir>/integration-notes.md` (통합/미통합 이유 기록)
2. Update `<planning_dir>/plan.md` with integrated changes

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

---

## Phase 5: Design

DB 스키마, API, 공정 도면, 섹션을 모두 도메인사전 v3에 따라 작성하는 단계.

### 16. Generate Database Schema

See [schema-design-guide.md](references/schema-design-guide.md)

**Inputs:** `domain-process-analysis.md` + `domain-technical-analysis.md` + `plan.md`
**Output:** `<planning_dir>/db-schema.md` (ERD + DDL + Design Rationale + Index Strategy)
**Process:** DB 감지 → 엔티티 추출 → 관계 분석 → DB 특성 반영 → 정규화 → ERD/DDL/인덱스

DB가 없는 프로젝트(CLI, 라이브러리, 정적사이트)는 자동 건너뜀.

### 17. Generate API Specification

See [api-spec-guide.md](references/api-spec-guide.md)

`plan.md` + `db-schema.md`에서 API 엔드포인트 추출 → `<planning_dir>/api-spec.md` 생성.
각 엔드포인트: Method + Path, Request/Response 스키마, Auth, Frontend Caller 포함.
API 없는 프로젝트(정적사이트, CLI)는 자동 건너뜀.

### 18. Generate Process Flow Diagrams (공정 도면) — MANDATORY

See [flow-diagrams-guide.md](references/flow-diagrams-guide.md)

> **⚠️ 이 단계는 건너뛸 수 없습니다.** 공정 도면이 없으면 다이달로스(workpm)가 기준선 없이 시공하게 됩니다.

`plan.md` + `api-spec.md` + `domain-process-analysis.md`에서 핵심 프로세스 추출 → Mermaid flowchart 작성.
서브에이전트로 각 프로세스 다이어그램 생성 → `<planning_dir>/flow-diagrams/`에 저장.
**출력:** `{process-name}.mmd` 파일들 + `flow-diagrams/index.md`

### 19. Create Section Index

**⚠️ GATE CHECK:** `flow-diagrams/index.md` 존재 여부 확인 → 없으면 Step 18로 돌아감.

See [section-index.md](references/section-index.md)

Read `plan.md`. Identify natural section boundaries → create `<planning_dir>/sections/index.md`.
**CRITICAL:** index.md MUST start with a SECTION_MANIFEST block.

**CPS Backfill:** SECTION_MANIFEST 생성 후, 반드시:
1. **에코시스템 커버리지 체크** — spec.md의 Context Map → 에코시스템 맵의 모든 시스템이 섹션에서 커버되는지 확인. See [section-index.md](references/section-index.md) Ecosystem Coverage Check.
2. **spec.md backfill** — Context Map의 '관련 섹션' 열과 Problem Statement의 '해결 섹션' 열을 실제 섹션명으로 업데이트.

---

## Phase 6: Validation

섹션 파일 작성, 운영/QA 시나리오, 후속 스킬 발견, 최종 보고 단계.

### 20. Write Section Files — Parallel Subagents

See [section-splitting.md](references/section-splitting.md)

1. Parse `sections/index.md`의 SECTION_MANIFEST
2. 각 섹션마다 Task 1개씩, **모든 Task를 한 메시지에서 병렬 실행**
3. 각 섹션 파일은 **완전 자립형** (Background, Requirements, Dependencies, Reference Libraries, Implementation, Test Scenarios, Implementation Strategy, Quality Gate, Risk & Rollback, Acceptance Criteria, Files 포함)

Wait for ALL subagents to complete before proceeding.

### 21. Generate Operation Scenarios — Subagent

See [operation-qa-guide.md](references/operation-qa-guide.md)

**출력:** `<planning_dir>/operation-scenarios.md` (역할 정의 + 메뉴별 시나리오 + E2E 시나리오 + 화면 흐름도)

### 22. Generate QA Scenarios Document — Subagent

See [operation-qa-guide.md](references/operation-qa-guide.md)

**운영 시나리오를 기반으로** QA 테스트 케이스 생성 → `<planning_dir>/qa-scenarios.md`
(메뉴별 테스트 + E2E + 통합 테스트 + Summary)

### 23. Final Status

Verify all files were created successfully:
- All section files from SECTION_MANIFEST
- `spec.md`에 `## Context Map`과 `## Problem Statement` 섹션이 있는지 확인
- Context Map/Problem Statement의 '관련 섹션'/'해결 섹션' 열이 backfill되었는지 확인
- `flow-diagrams/*.mmd` + `flow-diagrams/index.md` (**필수** — 없으면 Step 18 미실행)
- `api-spec.md` (API가 있는 프로젝트)
- `db-schema.md` (DB가 있는 프로젝트)
- `design-system.md` + `personas-and-journeys.md` (UI가 있는 프로젝트)
- `operation-scenarios.md` + `qa-scenarios.md`
- `team-reviews/domain-research.md` + `domain-process-analysis.md` + `domain-technical-analysis.md`

### 24. Output Summary

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

Design (design-system.md가 생성된 경우):
  /aphrodite <planning_dir>     → 디자인 시스템 정교화 (DB 기반 팔레트/폰트/스타일 매칭)

Other options:
  /estimate <planning_dir>      → 개발 견적서 (비용 산정이 필요한 경우)
```

### 25. Discover Implementation Skills

1. `plan.md`와 `sections/section-*.md`에서 기술 스택 키워드 추출
2. `Glob("skills/*/SKILL.md")`로 이미 설치된 스킬 확인 + 키워드 매칭
3. 미매칭 주요 키워드(최대 5개): `npx skills find "{keyword}"`
4. 이미 설치된 관련 스킬 + 새로 설치 가능한 스킬 목록 출력
5. AskUserQuestion(multiSelect)으로 설치 선택 ("건너뛰기" 포함)
   → 선택 시 `npx skills add {package} -g -y` 실행

> 검색 결과가 없거나 모든 관련 스킬이 설치되어 있으면 자동 건너뛰기.

### 26. 감리 안내

```
✅ 젭마인 설계 완료!

📦 산출물: operation-scenarios.md, qa-scenarios.md, sections/

👉 다음 단계 (선택):
  /aphrodite           → 디자인 시스템 정교화 (design-system.md가 있는 UI 프로젝트에서 권장)
  /agent-team          → 섹션 기반 병렬 구현 (Codex에서는 agent-team-codex로 해석, 권장)
  /chronos             → 자율 반복 구현 루프
  수동 구현             → 직접 코딩
  /argos <planning_dir> → 구현 후 감리 (설계 대비 준공검사)

📎 참고: docs/workflow-guide.md
```

> **참고:** 검증(감리)은 설계사와 감리의 역할 분리 원칙에 따라 `/argos`로 독립되었습니다.

---

## References

| 파일 | 내용 |
|------|------|
| [research-protocol.md](references/research-protocol.md) | Step 4-5 리서치 결정 기준, 서브에이전트 프롬프트 |
| [interview-protocol.md](references/interview-protocol.md) | Step 6 인터뷰 질문 목록, 카테고리별 질문 전략 |
| [test-scenario-guide.md](references/test-scenario-guide.md) | Step 8 테스트 시나리오 형식, 케이스 작성 기준 |
| [design-system-guide.md](references/design-system-guide.md) | Step 8 디자인 시스템 문서 구조 |
| [persona-journey-guide.md](references/persona-journey-guide.md) | Step 9 페르소나/여정맵 형식 상세 |
| [team-review-protocol.md](references/team-review-protocol.md) | Step 10 에이전트별 분석 프롬프트, Phase A/B 상세 |
| [domain-confirmation-guide.md](references/domain-confirmation-guide.md) | Step 11 도메인 전문가 제안 + 사전 변경 + 글로벌 반영 확인 절차 |
| [external-review.md](references/external-review.md) | Step 13 Gemini/Codex 외부 리뷰 프롬프트 |
| [schema-design-guide.md](references/schema-design-guide.md) | Step 16 DB 스키마 설계 절차, ERD/DDL 형식 |
| [api-spec-guide.md](references/api-spec-guide.md) | Step 17 API 명세 형식, 엔드포인트 작성 규칙 |
| [flow-diagrams-guide.md](references/flow-diagrams-guide.md) | Step 18 공정 도면 생성 절차, Mermaid 규칙 |
| [section-index.md](references/section-index.md) | Step 19 SECTION_MANIFEST 형식, 의존성 그래프 |
| [section-splitting.md](references/section-splitting.md) | Step 20 섹션 파일 완전 자립형 형식 |
| [operation-qa-guide.md](references/operation-qa-guide.md) | Step 21-22 운영/QA 시나리오 구조 |
