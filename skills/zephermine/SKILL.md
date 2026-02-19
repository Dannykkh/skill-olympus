---
name: zephermine
description: Creates detailed, sectionized implementation plans through research, stakeholder interviews, domain expert analysis, database schema design, and multi-LLM review. Verifies implementation against spec after coding. Use when planning features that need thorough pre-implementation analysis. Also known as 젭마인, 제퍼마인, 제퍼미네.
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
순서: Research → Interview → Spec → Team Review → Plan → External Review → DB Schema → Sections → QA Scenarios → Skill Discovery → Verify
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
   - `claude-research.md`
   - `claude-interview.md`
   - `claude-spec.md`
   - `claude-team-review.md`
   - `claude-plan.md`
   - `claude-api-spec.md`
   - `claude-db-schema.md`
   - `claude-integration-notes.md`
   - `claude-ralph-loop-prompt.md`
   - `claude-ralphy-prd.md`
   - `claude-qa-scenarios.md`
   - `team-reviews/` directory (domain-research.md, 개별 분석 파일)
   - `reviews/` directory
   - `sections/` directory

6. Determine mode and resume point:

| Files Found | Mode | Resume From |
|-------------|------|-------------|
| None | new | Step 4 |
| research only | resume | Step 6 (interview) |
| research + interview | resume | Step 8 (spec synthesis) |
| + spec | resume | Step 9 (team analysis) |
| + claude-team-review.md | resume | Step 10 (plan) |
| + plan | resume | Step 11 (external review) |
| + reviews | resume | Step 12 (integrate) |
| + integration-notes | resume | Step 13 (user review) |
| + claude-db-schema.md | resume | Step 15 (API spec) |
| + sections/index.md | resume | Step 16 (write sections) |
| all sections complete | resume | Step 17 (execution files) |
| + claude-ralph-loop-prompt.md + claude-ralphy-prd.md | resume | Step 23 (verify) |
| + claude-verify-report.md | complete | Done |

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
6. Record which research types to perform in step 5

### 5. Execute Research

See [research-protocol.md](references/research-protocol.md).

Based on decisions from step 4, launch research subagents:
- **Codebase research:** `Task(subagent_type=Explore)`
- **GitHub research:** `Task(subagent_type=Explore)` with WebSearch (`site:github.com`)
- **Web research:** `Task(subagent_type=Explore)` with WebSearch

If multiple are needed, launch all Task tools in parallel (single message with multiple tool calls).

**Important:** Subagents return their findings - they do NOT write files directly. After collecting results from all subagents, combine them and write to `<planning_dir>/claude-research.md`.

Skip this step entirely if user chose no research in step 4.

### 6. Detailed Interview

See [interview-protocol.md](references/interview-protocol.md)

Run in main context (AskUserQuestion requires it). The interview should be informed by:
- The initial spec
- Research findings (if any)

### 7. Save Interview Transcript

Write Q&A to `<planning_dir>/claude-interview.md`

### 8. Write Initial Spec (Spec Synthesis)

Combine into `<planning_dir>/claude-spec.md`:
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

**필수 포함: Test Scenarios 섹션** — 각 주요 기능(API, 화면, 로직)마다:
- 정상 케이스: 입력 → 기대 출력
- 에러 케이스: 잘못된 입력 → 기대 에러
- 엣지 케이스: 경계값, 빈 값, 최대값 등

See [test-scenario-guide.md](references/test-scenario-guide.md)

### 9. Multi-Agent Team Analysis

See [team-review-protocol.md](references/team-review-protocol.md)

**⚠️ CONTEXT MANAGEMENT**: This step spawns 6 agents (Phase A 4개 + Phase B 2개). To prevent context overflow:
1. **Before launching agents**: Consider running `/compact` if conversation is already long
2. **Agent return value**: Each agent MUST write full results to files and return ONLY a 2-3 line summary
3. **If context limit hit**: User can `/compact` or `/clear`, then resume from Step 9 (team-reviews/ files already saved)

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
> **spec에 없는 업무도 추가**: 해당 산업에서 필수인데 빠진 업무/역할/규제를 보완합니다.

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

Results → `<planning_dir>/team-reviews/` (개별 6개) + `<planning_dir>/claude-team-review.md` (통합).

The synthesized team review feeds into Step 10 (plan generation) as additional input.

### 10. Generate Implementation Plan

Create detailed plan → `<planning_dir>/claude-plan.md`

**Inputs:**
- `<planning_dir>/claude-spec.md`
- `<planning_dir>/claude-team-review.md` (team analysis findings)
- `<planning_dir>/team-reviews/domain-process-analysis.md` (업무 흐름표 — CRUD 권한, 역할, 입출력)
- `<planning_dir>/team-reviews/domain-technical-analysis.md` (기술 스택 매핑 — 연동, 규제, 솔루션)

**IMPORTANT**: Address all "Critical Findings" from the team review.
도메인 전문가가 추가한 누락 업무/역할/규제를 plan에 반영합니다.
Write for an unfamiliar reader. The plan must be fully self-contained - an engineer or LLM with no prior context should understand *what* we're building, *why*, and *how* just from reading this document.

### 11. External Review

See [external-review.md](references/external-review.md)

Launch TWO subagents in parallel to review the plan:
1. **Gemini** via Bash
2. **Codex** via Bash

Both receive the plan content and return their analysis. Write results to `<planning_dir>/reviews/`.

### 12. Integrate External Feedback

Analyze the suggestions in `<planning_dir>/reviews/`.

You are the authority on what to integrate or not. It's OK if you decide to not integrate anything.

**Step 1:** Write `<planning_dir>/claude-integration-notes.md` documenting:
- What suggestions you're integrating and why
- What suggestions you're NOT integrating and why

**Step 2:** Update `<planning_dir>/claude-plan.md` with the integrated changes.

### 13. User Review of Integrated Plan

Use AskUserQuestion:
```
The plan has been updated with external feedback. You can now review and edit claude-plan.md.

If you want Claude's help editing the plan, open a separate Claude session - this session
is mid-workflow and can't assist with edits until the workflow completes.

When you're done reviewing, select "Done" to continue.
```

Options: "Done reviewing"

Wait for user confirmation before proceeding.

### 14. Generate Database Schema

See [schema-design-guide.md](references/schema-design-guide.md)

도메인 전문가의 업무 흐름표 + 기술 스택 매핑 + Plan에서 데이터 모델 추출 → `<planning_dir>/claude-db-schema.md` 생성.

**Inputs:** `domain-process-analysis.md` + `domain-technical-analysis.md` + `claude-plan.md`
**Output:** ERD (Mermaid) + DDL + Design Rationale + Index Strategy
**Process:** DB 감지 → 엔티티 추출 → 관계 분석 → DB 특성 반영 → 정규화 → ERD/DDL/인덱스

DB가 없는 프로젝트(CLI, 라이브러리, 정적사이트)는 자동 건너뜀.

### 15. Generate API Specification

See [api-spec-guide.md](references/api-spec-guide.md)

`claude-plan.md` + `claude-db-schema.md`에서 API 엔드포인트 추출 → `<planning_dir>/claude-api-spec.md` 생성.

각 엔드포인트: Method + Path, Request/Response 스키마, Auth, Frontend Caller 포함.
**구현 중 새 API 추가 시 반드시 이 문서에도 추가** (drift 방지).
API 없는 프로젝트(정적사이트, CLI)는 자동 건너뜀.

### 16. Create Section Index

See [section-index.md](references/section-index.md)

Read `claude-plan.md`. Identify natural section boundaries and create `<planning_dir>/sections/index.md`.

**CRITICAL:** index.md MUST start with a SECTION_MANIFEST block. See the reference for format requirements.

Write `index.md` before proceeding to section file creation.

### 17. Write Section Files — Parallel Subagents

See [section-splitting.md](references/section-splitting.md)

1. Parse `sections/index.md`의 SECTION_MANIFEST
2. 각 섹션마다 Task 1개씩, **모든 Task를 한 메시지에서 병렬 실행**
3. 각 섹션 파일은 **완전 자립형** (Background, Requirements, Dependencies, Reference Libraries, Implementation, Test Scenarios, Implementation Strategy, Quality Gate, Risk & Rollback, Acceptance Criteria, Files 포함)
4. 구현자가 다른 문서를 참조하지 않아도 되어야 함

Wait for ALL subagents to complete before proceeding.

### 18. Generate Execution Files — Subagent

서브에이전트에 위임하여 2개 파일 생성:

1. **`claude-ralph-loop-prompt.md`**: ralph-loop 플러그인용. 모든 섹션 내용을 **인라인 임베딩**. Completion signal: `<promise>ALL-SECTIONS-COMPLETE</promise>`
2. **`claude-ralphy-prd.md`**: Ralphy CLI용. 섹션 파일을 **참조** (임베딩 아님). 체크박스 태스크 리스트.

Wait for subagent completion before proceeding.

### 19. Generate QA Scenarios Document — Subagent

모든 섹션의 Test Scenarios를 통합하여 `<planning_dir>/claude-qa-scenarios.md` 생성.

**Inputs:** `claude-spec.md` + `claude-api-spec.md` + `sections/section-*.md`

**구조:**
- 섹션별 테스트 시나리오 (체크박스)
- Frontend ↔ Backend 통합 테스트 (api-spec 기반)
- Summary (총 테스트/단위/통합/에러 케이스 건수)

### 20. Final Status

Verify all files were created successfully:
- All section files from SECTION_MANIFEST
- `claude-api-spec.md` (API가 있는 프로젝트)
- `claude-db-schema.md` (DB가 있는 프로젝트)
- `claude-ralph-loop-prompt.md`
- `claude-ralphy-prd.md`
- `claude-qa-scenarios.md`
- `team-reviews/domain-research.md` (도메인 리서치)
- `team-reviews/domain-process-analysis.md` (업무 흐름표)
- `team-reviews/domain-technical-analysis.md` (기술 스택 매핑)

### 21. Output Summary

Print generated files list and implementation options:
```
ZEPHERMINE: Planning Complete

Generated: claude-research/interview/spec/team-review/plan/api-spec/db-schema/
           integration-notes/ralph-loop-prompt/ralphy-prd/qa-scenarios.md
           + team-reviews/ + reviews/ + sections/

Implementation options:
  A. Manual: sections/index.md → 순서대로 구현
  B. ralph-loop: /ralph-loop @claude-ralph-loop-prompt.md
  C. Ralphy: ralphy --prd claude-ralphy-prd.md
  D. Verify: /zephermine @spec.md (계획 파일 있으면 자동 verify)
  E. Agent Teams: /agent-team <planning_dir> (병렬 실행, 권장)
```

### 22. Discover Implementation Skills

구현 시작 전, 프로젝트에 도움될 외부 스킬을 탐색합니다.

**1) 키워드 추출:** `claude-plan.md`와 `sections/section-*.md`를 읽고 기술 스택 키워드 추출 (예: React, Docker, PostgreSQL, Spring Boot, Playwright)

**2) 로컬 스킬 확인:** `Glob("skills/*/SKILL.md")`로 이미 설치된 스킬 목록 수집, 키워드와 매칭

**3) 외부 스킬 검색:** 매칭되지 않은 주요 키워드(최대 5개)로 Bash `npx skills find "{keyword}"` 실행

**4) 결과 표시:** 이미 설치된 관련 스킬 + 새로 설치 가능한 스킬 목록 출력

**5) 선택적 설치:** AskUserQuestion(multiSelect)으로 설치할 스킬 선택. "건너뛰기" 옵션 포함. 선택 시 `npx skills add {package} -g -y` 실행.

> 검색 결과가 없거나 모든 관련 스킬이 설치되어 있으면 자동 건너뛰기.

### 23. Verify Implementation

See [verify-protocol.md](references/verify-protocol.md)

구현 완료 후 claude-spec.md + claude-api-spec.md + claude-qa-scenarios.md 대비 검증.
사용자가 `/zephermine @spec.md` 재실행 시 모든 계획 파일이 존재하면 자동 진입.

**Phase 1 — 정적 검증** (서브에이전트 2개 병렬):
1. 기능 검증 (Explore) — 요구사항 vs 실제 코드
2. 품질 검증 (Explore) — 비기능 요구사항 + 코드 품질

**Phase 2 — 런타임 검증** (빌드/테스트 실행):
3. 빌드 검증 — `npm run build`, `mvn compile` 등 자동 감지
4. 단위 테스트 — `npm test`, `pytest` 등 실행 + 결과 파싱
5. E2E 테스트 — Playwright/Cypress 감지 시 실행 (미감지 시 건너뜀)

**Phase 3 — API 일치 검증** (claude-api-spec.md 있는 경우):
6. 코드의 실제 API 라우트 vs api-spec 문서 대조
7. 문서에 없는 새 API → ❌ 미등록 경고
8. 문서에는 있지만 미구현 API → ❌ 누락 경고
9. 이름/경로 중복 API 탐지 (같은 기능, 다른 이름)

**Phase 4 — QA 시나리오 검증**:
10. `claude-qa-scenarios.md`의 각 체크박스를 코드/테스트 결과 기반으로 ✅/❌ 마킹
11. 통과율 집계 (단위/통합/에러/엣지 케이스별)

결과 → `<planning_dir>/claude-verify-report.md` (API 일치 + QA 통과율 포함)

### 24. Verification Report

검증 결과를 사용자에게 표시.

AskUserQuestion으로 다음 선택:
- "수정 후 재검증" → Step 23 반복
- "승인" → 완료

---

## 다음 단계 안내

설계가 완료되면 사용자에게 다음 단계를 안내합니다:

```
✅ 젭마인 설계 완료!

📦 산출물: claude-ralph.md, claude-ralphy.md, claude-qa-scenarios.md, sections/

👉 다음 단계 (선택):
  /agent-team          → 섹션 기반 병렬 구현 (Claude 네이티브)
  workpm               → 멀티AI 병렬 구현 (Codex/Gemini 혼합)
  수동 구현             → 직접 코딩

📎 참고: docs/workflow-guide.md
```
