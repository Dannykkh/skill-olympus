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
5. Scan for existing planning files (research.md, interview.md, spec.md, team-review.md, plan.md, api-spec.md, db-schema.md, integration-notes.md, design-system.md, operation-scenarios.md, qa-scenarios.md, team-reviews/, reviews/, flow-diagrams/, sections/)

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

### 8. Write Initial Spec (Spec Synthesis)

Combine into `<planning_dir>/spec.md`:
- Initial input + research findings + interview answers + Test Scenarios

**필수 포함: Risk Assessment 섹션**

| 위험 요소 | 영향도 | 발생 확률 | 완화 전략 |
|-----------|--------|-----------|-----------|
| {기술적 위험} | High/Med/Low | High/Med/Low | {대응 방안} |

**조건부 생성: Design System** — 인터뷰 Category B(디자인 비전)가 수집된 경우:
See [design-system-guide.md](references/design-system-guide.md)
`<planning_dir>/design-system.md` 생성. UI/프론트엔드가 없는 프로젝트는 자동 건너뜀.

**필수 포함: Test Scenarios 섹션** — 각 주요 기능마다 정상/에러/엣지 케이스.
See [test-scenario-guide.md](references/test-scenario-guide.md)

### 9. User Persona & Journey Map

See [persona-journey-guide.md](references/persona-journey-guide.md)

인터뷰와 리서치 결과를 기반으로 페르소나(2~4개)와 여정맵 생성.
UI/프론트엔드가 없는 프로젝트는 자동 건너뜀.

**출력:** `<planning_dir>/personas-and-journeys.md`

### 10. Multi-Agent Team Analysis

See [team-review-protocol.md](references/team-review-protocol.md)

**⚠️ CONTEXT MANAGEMENT**: This step spawns 6 agents. Consider `/compact` before launching.

**Phase A — 4개 병렬:** UX Agent / Architecture Agent / Red Team Agent / Domain Researcher

**Phase B — 2개 병렬 (Phase A 완료 후):** Domain Process Expert / Domain Technical Expert

> Phase B 실행 CLI: Codex/Gemini 가용 여부에 따라 분배. 없으면 Claude Explore로 폴백.

**CRITICAL — Agent return protocol:** Each agent writes full results to files, returns ONLY 2-3 line summary.

Results → `<planning_dir>/team-reviews/` (개별 6개) + `<planning_dir>/team-review.md` (통합).

### 11. User Confirmation of Domain Expert Suggestions

See [domain-confirmation-guide.md](references/domain-confirmation-guide.md)

도메인 전문가 추가 제안을 AskUserQuestion(multiSelect)으로 사용자에게 확인.
채택된 항목만 Step 12 Plan에 반영. 미채택은 반영하지 않음.

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
| [domain-confirmation-guide.md](references/domain-confirmation-guide.md) | Step 11 도메인 전문가 제안 확인 절차 |
| [external-review.md](references/external-review.md) | Step 13 Gemini/Codex 외부 리뷰 프롬프트 |
| [schema-design-guide.md](references/schema-design-guide.md) | Step 16 DB 스키마 설계 절차, ERD/DDL 형식 |
| [api-spec-guide.md](references/api-spec-guide.md) | Step 17 API 명세 형식, 엔드포인트 작성 규칙 |
| [flow-diagrams-guide.md](references/flow-diagrams-guide.md) | Step 18 공정 도면 생성 절차, Mermaid 규칙 |
| [section-index.md](references/section-index.md) | Step 19 SECTION_MANIFEST 형식, 의존성 그래프 |
| [section-splitting.md](references/section-splitting.md) | Step 20 섹션 파일 완전 자립형 형식 |
| [operation-qa-guide.md](references/operation-qa-guide.md) | Step 21-22 운영/QA 시나리오 구조 |
