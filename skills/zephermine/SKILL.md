---
name: zephermine
description: Creates detailed, sectionized implementation plans through research, stakeholder interviews, and multi-LLM review. Verifies implementation against spec after coding. Use when planning features that need thorough pre-implementation analysis. Also known as 젭마인, 제퍼마인, 제퍼미네.
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
순서: Research → Interview → Spec → Team Review → Plan → External Review → Sections → Verify
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
   - `claude-integration-notes.md`
   - `claude-ralph-loop-prompt.md`
   - `claude-ralphy-prd.md`
   - `team-reviews/` directory
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
| + sections/index.md | resume | Step 15 (write sections) |
| all sections complete | resume | Step 16 (execution files) |
| + claude-ralph-loop-prompt.md + claude-ralphy-prd.md | resume | Step 19 (verify) |
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
STEP {N}/20: {STEP_NAME}
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
4. Ask user about web research needs (present derived topics as multi-select)
5. Record which research types to perform in step 5

### 5. Execute Research

See [research-protocol.md](references/research-protocol.md).

Based on decisions from step 4, launch research subagents:
- **Codebase research:** `Task(subagent_type=Explore)`
- **Web research:** `Task(subagent_type=Explore)` with WebSearch

If both are needed, launch both Task tools in parallel (single message with multiple tool calls).

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

This synthesizes the user's raw requirements into a complete specification.

### 9. Multi-Agent Team Analysis

See [team-review-protocol.md](references/team-review-protocol.md)

**⚠️ CONTEXT MANAGEMENT**: This step spawns 5 agents that return results. To prevent context overflow:
1. **Before launching agents**: Consider running `/compact` if conversation is already long
2. **Agent return value**: Each agent MUST write full results to files and return ONLY a 2-3 line summary
3. **If context limit hit**: User can `/compact` or `/clear`, then resume from Step 9 (team-reviews/ files already saved)

Launch FIVE Explore subagents in parallel — 고정 3명 + 도메인 전문가 2명:

**고정 에이전트:**
1. **UX Agent** — 사용자 경험, 사용성, 접근성
2. **Architecture Agent** — 확장성, 성능, 보안, 기술 부채
3. **Red Team Agent** — 가정 검증, 실패 모드, 엣지 케이스, 누락 항목

**도메인 전문가 (인터뷰에서 파악한 산업군 기반으로 동적 구성):**
4. **Domain Process Expert** — 해당 산업의 전체 업무 프로세스 관점
5. **Domain Technical Expert** — 해당 산업의 필수 기술/표준/규정 관점

All five receive `claude-spec.md` + `claude-interview.md` + `claude-research.md` (if exists).
도메인 전문가 프롬프트는 인터뷰의 `[Industry: {산업군}]` 태그를 기반으로 동적 생성.

**CRITICAL — Agent return protocol:**
Each agent must end with ONLY this format (NO full analysis in return text):
```
✅ {filename}.md 작성 완료. Critical: N건, Important: N건, Nice-to-Have: N건
```
Full analysis goes ONLY to `<planning_dir>/team-reviews/{filename}.md` files.
This prevents the 5 combined agent outputs from overflowing the main context.

Results → `<planning_dir>/team-reviews/` (개별 5개) + `<planning_dir>/claude-team-review.md` (통합).

The synthesized team review feeds into Step 10 (plan generation) as additional input.

### 10. Generate Implementation Plan

Create detailed plan → `<planning_dir>/claude-plan.md`

**Inputs:**
- `<planning_dir>/claude-spec.md`
- `<planning_dir>/claude-team-review.md` (team analysis findings)

**IMPORTANT**: Address all "Critical Findings" from the team review.
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

### 14. Create Section Index

See [section-index.md](references/section-index.md)

Read `claude-plan.md`. Identify natural section boundaries and create `<planning_dir>/sections/index.md`.

**CRITICAL:** index.md MUST start with a SECTION_MANIFEST block. See the reference for format requirements.

Write `index.md` before proceeding to section file creation.

### 15. Write Section Files — Parallel Subagents

See [section-splitting.md](references/section-splitting.md)

**Launch parallel subagents** - one Task per section for maximum efficiency:

1. First, parse `sections/index.md` to get the SECTION_MANIFEST list
2. Then launch ALL section Tasks in a single message (parallel execution):

```
# Launch all in ONE message for parallel execution:

Task(
  subagent_type="general-purpose",
  prompt="""
  Write section file: section-01-{name}

  Inputs:
  - <planning_dir>/claude-plan.md
  - <planning_dir>/sections/index.md

  Output: <planning_dir>/sections/section-01-{name}.md

  The section file must be COMPLETELY SELF-CONTAINED. Include:
  - Background (why this section exists)
  - Requirements (what must be true when complete)
  - Dependencies (requires/blocks)
  - Implementation details (from the plan)
  - Acceptance criteria (checkboxes)
  - Files to create/modify

  The implementer should NOT need to reference any other document.
  """
)

Task(
  subagent_type="general-purpose",
  prompt="Write section file: section-02-{name} ..."
)

Task(
  subagent_type="general-purpose",
  prompt="Write section file: section-03-{name} ..."
)

# ... one Task per section in the manifest
```

Wait for ALL subagents to complete before proceeding.

### 16. Generate Execution Files — Subagent

**Delegate to subagent** to reduce main context token usage:

```
Task(
  subagent_type="general-purpose",
  prompt="""
  Generate two execution files for autonomous implementation.

  Input files:
  - <planning_dir>/sections/index.md (has SECTION_MANIFEST)
  - <planning_dir>/sections/section-*.md (all section files)

  OUTPUT 1: <planning_dir>/claude-ralph-loop-prompt.md
  For ralph-loop plugin. EMBED all section content inline.

  Structure:
  - Mission statement
  - Full content of sections/index.md
  - Full content of EACH section file (embedded, not referenced)
  - Execution rules (dependency order, verify acceptance criteria)
  - Completion signal: <promise>ALL-SECTIONS-COMPLETE</promise>

  OUTPUT 2: <planning_dir>/claude-ralphy-prd.md
  For Ralphy CLI. REFERENCE section files (don't embed).

  Structure:
  - PRD header
  - How to use (ralphy --prd command)
  - Context explanation
  - Checkbox task list: one "- [ ] Section NN: {name}" per section

  Write both files.
  """
)
```

Wait for subagent completion before proceeding.

### 17. Final Status

Verify all files were created successfully:
- All section files from SECTION_MANIFEST
- `claude-ralph-loop-prompt.md`
- `claude-ralphy-prd.md`

### 18. Output Summary

Print generated files and next steps:
```
═══════════════════════════════════════════════════════════════
ZEPHERMINE: Planning Complete
═══════════════════════════════════════════════════════════════

Generated files:
  - claude-research.md (research findings)
  - claude-interview.md (Q&A transcript)
  - claude-spec.md (synthesized specification)
  - claude-team-review.md (multi-agent team analysis)
  - claude-plan.md (implementation plan)
  - claude-integration-notes.md (feedback decisions)
  - team-reviews/ (individual agent analyses)
  - reviews/ (external LLM feedback)
  - sections/ (implementation units)
  - claude-ralph-loop-prompt.md (for ralph-loop plugin)
  - claude-ralphy-prd.md (for Ralphy CLI)
  - claude-verify-report.md (implementation verification - after implementation)

How to implement:

Option A - Manual (recommended for learning/control):
  1. Read sections/index.md to understand dependencies
  2. Implement each section file in order
  3. Each section is self-contained with acceptance criteria

Option B - Autonomous with ralph-loop (Claude Code plugin):
  /ralph-loop @<planning_dir>/claude-ralph-loop-prompt.md --completion-promise "COMPLETE" --max-iterations 100

Option C - Autonomous with Ralphy (external CLI):
  ralphy --prd <planning_dir>/claude-ralphy-prd.md
  # Or: cp <planning_dir>/claude-ralphy-prd.md ./PRD.md && ralphy

Option D - Verify after implementation:
  /zephermine @<planning_dir>/your-spec.md
  (모든 계획 파일이 있으면 자동으로 verify 모드 진입)

Option E - Agent Teams로 병렬 실행 (권장):
  /agent-team <planning_dir>
  # 네이티브 Agent Teams로 섹션 의존성 분석 → Wave 병렬 실행
  # 요구사항: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
═══════════════════════════════════════════════════════════════
```

### 19. Verify Implementation

See [verify-protocol.md](references/verify-protocol.md)

구현 완료 후 claude-spec.md 대비 검증.
사용자가 `/zephermine @spec.md` 재실행 시 모든 계획 파일이 존재하면 자동 진입.

서브에이전트 2개 병렬 실행:
1. 기능 검증 (Explore) — 요구사항 vs 실제 코드
2. 품질 검증 (Explore) — 비기능 요구사항 + 코드 품질

결과 → `<planning_dir>/claude-verify-report.md`

### 20. Verification Report

검증 결과를 사용자에게 표시.

AskUserQuestion으로 다음 선택:
- "수정 후 재검증" → Step 19 반복
- "승인" → 완료
