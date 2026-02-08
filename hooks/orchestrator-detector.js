#!/usr/bin/env node
/**
 * Orchestrator Mode Detector Hook
 *
 * Detects keywords in user prompt and injects mode instructions.
 *
 * Supported keywords:
 *   workpm      - PM (Project Manager) mode
 *   pmworker    - Worker mode
 *   agent-team  - Agent Teams Lead mode (대니즈팀)
 *   팀 실행      - Agent Teams Lead mode (한국어)
 *
 * Hook Type: UserPromptSubmit
 * Output: JSON with additionalContext
 */

// Patterns for detection
const WORKPM_PATTERN = /(?:^|\s)workpm(?:\s|$)/i;
const PMWORKER_PATTERN = /(?:^|\s)pmworker(?:\s|$)/i;
const AGENT_TEAM_PATTERN = /(?:^|\s)(?:agent[- ]?team|에이전트\s*팀|팀\s*실행|대니즈\s*팀)(?:\s|$)/i;

/**
 * Build PM mode context
 */
function buildPMContext() {
  return `
[PM MODE ACTIVATED]

You are the PM (Project Manager) of Multi-AI Orchestrator.

## Startup Procedure

1. **Detect AI Providers**
   Use orchestrator_detect_providers to check installed AI CLIs

2. **Load Plan File**
   Use orchestrator_get_latest_plan to auto-load latest plan
   Analyze plan file to extract task list

3. **Analyze Project**
   Use orchestrator_analyze_codebase to understand code structure

4. **Create Tasks**
   Use orchestrator_create_task to create tasks
   - Set dependencies (depends_on)
   - Specify scope (modifiable files)
   - Assign AI Provider (based on strengths)

5. **Monitor Progress**
   Use orchestrator_get_progress to check progress

## AI Assignment Guide

| Task Type | Recommended AI |
|-----------|----------------|
| Code generation | codex |
| Refactoring | claude |
| Code review | gemini |
| Documentation | claude |

## Worker Management

Use orchestrator_spawn_workers to auto-create workers:
\`\`\`
orchestrator_spawn_workers({ "count": 2 })
\`\`\`

Or manually run 'pmworker' in another terminal.

---
Start now by calling orchestrator_detect_providers.
`;
}

/**
 * Build Worker mode context
 */
function buildWorkerContext() {
  return `
[WORKER MODE ACTIVATED]

You are a Worker of Multi-AI Orchestrator.

## Auto Mode

1. Use orchestrator_get_available_tasks to check available tasks
2. Use orchestrator_claim_task to claim a task
3. Perform the task (write code, modify files, etc.)
4. Use orchestrator_complete_task or orchestrator_fail_task to report completion
5. Repeat

## Auto-Termination

When allTasksCompleted is true, terminate immediately.
When hasRemainingWork is false and no available tasks, wait and recheck.

## Important Rules

- ALWAYS call orchestrator_lock_file before modifying files
- All locks are auto-released on task completion
- Report errors with orchestrator_fail_task

---
Start now by calling orchestrator_get_available_tasks.
`;
}

/**
 * Build Agent Teams Lead context (대니즈팀)
 */
function buildAgentTeamContext() {
  return `
[AGENT TEAM MODE — 대니즈팀(Dannys Team) ACTIVATED]

You are the Lead of 대니즈팀, using native Claude Code Agent Teams (Opus 4.6).

## 즉시 실행

Read skills/agent-team/SKILL.md and follow the workflow.

**두 가지 모드 자동 판별:**

섹션 모드 (zephermine 산출물 있음):
  sections/index.md 파싱 → Wave Plan → Tasks → Execute → Verify → Report

자유 모드 (사용자 지시만 있음):
  사용자 지시 분석 → 코드베이스 탐색 → 태스크 분해 → Wave Plan → Execute → Verify → Report

## 전문가 팀원 구성

파일 패턴으로 자동 매칭 (expert-matching.md 참조):
- *.tsx, components/** → 프론트엔드 전문가 (frontend-react.md)
- api/**, controllers/** → 백엔드 전문가 (backend-spring.md)
- migrations/**, *.sql → DB 전문가 (database-postgresql.md)
- *.py → Python 전문가 (python-fastapi-guidelines.md)
- 매칭 안 됨 → 풀스택 (fullstack-coding-standards.md)

## 핵심 규칙

- 팀명: 대니즈팀(Dannys Team)
- Wave당 최대 5명 teammate
- teammate에게 섹션 전체 내용 + 전문가 역할 + 파일 소유권 전달
- Delegate 모드 권장 (Lead는 조율만, 코드는 teammate가 작성)
- 다른 teammate의 파일 수정 금지

---
Start now: Read skills/agent-team/SKILL.md
`;
}

/**
 * Main processing function
 */
function processPrompt(prompt) {
  // Detect agent-team (우선 체크 — workpm보다 먼저)
  if (AGENT_TEAM_PATTERN.test(prompt)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildAgentTeamContext(),
      },
    };
  }

  // Detect workpm
  if (WORKPM_PATTERN.test(prompt)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildPMContext(),
      },
    };
  }

  // Detect pmworker
  if (PMWORKER_PATTERN.test(prompt)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildWorkerContext(),
      },
    };
  }

  return null;
}

/**
 * Read input from stdin
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let input = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });

    process.stdin.on('end', () => {
      resolve(input);
    });

    process.stdin.on('error', reject);
  });
}

/**
 * Main entry point
 */
async function main() {
  try {
    const input = await readStdin();

    if (!input) {
      process.exit(0);
    }

    const data = JSON.parse(input);
    const prompt = data.prompt || '';

    const result = processPrompt(prompt);

    if (result) {
      console.log(JSON.stringify(result));
    }

    process.exit(0);
  } catch (error) {
    console.error(`Hook error: ${error.message}`);
    process.exit(1);
  }
}

// Handle empty stdin
process.stdin.on('close', () => {
  // Handled by readStdin Promise
});

// Run
main();
